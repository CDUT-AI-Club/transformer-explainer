#!/usr/bin/env python3
"""Serve the static production build with a threaded, HTTP/1.1 server.

The browser fetches the 63 GPT-2 shards in parallel, so the stock
single-threaded ``http.server`` is not enough for a smooth first load.
"""

from __future__ import annotations

import argparse
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self) -> None:
        # self.path does not exist yet when we respond to a malformed request
        # line (send_error -> end_headers), so this attribute is optional.
        path = getattr(self, "path", "")

        if "/model-v2/" in path:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif path.startswith("/_app/immutable/"):
            # Vite emits content-hashed filenames here, so they can be cached
            # forever. A rebuild changes the hash, which busts the cache by name.
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif path.startswith("/model-zh/") or path.startswith("/ort/"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            # index.html and everything else must be revalidated on every load,
            # otherwise a rebuilt bundle keeps being masked by a stale page and
            # code changes appear not to take effect.
            self.send_header("Cache-Control", "no-cache")

        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:  # quieter logs
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def parse_request(self) -> bool:
        # The port-forward layer intermittently injects padding before the
        # request line, e.g. b"\t\x00"*12 + b"GET /model-zh/...". http.server
        # would reject those as a bad/unsupported request line (HTTP 501/400)
        # and the shard would never be served. Strip the junk prefix and let
        # the request be parsed normally.
        self.raw_requestline = self.raw_requestline.lstrip(b"\x00 \t\r\n\v\f")
        return super().parse_request()

    def copyfile(self, source, outputfile) -> None:
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            # The body was truncated mid-response. Keep-alive would leave this
            # handler waiting for another request while the client waits for
            # the missing bytes, so close the connection instead.
            self.close_connection = True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--dir", default=os.path.join(os.path.dirname(__file__), "build"))
    args = parser.parse_args()

    handler = partial(Handler, directory=args.dir)
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    server.daemon_threads = True
    print(f"Serving {args.dir} at http://{args.bind}:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
