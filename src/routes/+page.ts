// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = true;

// The app runs GPT-2 with onnxruntime-web and Web APIs only in the browser.
// Disabling SSR also keeps the Node-only `sharp` dependency out of the build.
export const ssr = false;
