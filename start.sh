#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-4173}"

if [ ! -f build/index.html ]; then
  echo "No production build found; building first..."
  npm run build
fi

# Fail with a readable message instead of a Python traceback. A stale
# serve.py from an earlier session is the usual cause; the port stays bound
# even after its terminal is closed.
if ss -ltnp 2>/dev/null | grep -q ":${PORT} "; then
  echo
  echo "端口 ${PORT} 已被占用，无法启动。"
  holder=$(ss -ltnp 2>/dev/null | grep ":${PORT} " | head -1)
  echo "  占用者: ${holder}"
  echo
  echo "处理方法（二选一）："
  echo "  1) 结束占用进程:  fuser -k ${PORT}/tcp"
  echo "  2) 换个端口启动:  PORT=$((PORT + 1)) ./start.sh"
  exit 1
fi

echo
echo "Transformer 可视化讲解（本地离线版）"
echo "  http://127.0.0.1:${PORT}/"
echo
echo "首次打开会下载 456 MB 的中文模型（仅一次），之后走浏览器缓存。"
echo "按 Ctrl+C 结束。"
echo

exec python3 serve.py --port "${PORT}" --bind 127.0.0.1
