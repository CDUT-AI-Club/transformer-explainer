// Opt-in runtime trace for diagnosing "which prompt actually ran?" questions.
//
// Enable it by adding `?debug=1` (or `?trace=1`) to the page URL. Every step of
// a generation — submit, request, tokenize, inference, animation, publish — is
// then logged with the prompt it belongs to, so a stale run is visible in the
// console instead of only being inferable from the picture on screen.
//
// It is a no-op in normal use, so it costs nothing for the exhibition build.
let enabled: boolean | null = null;
let seq = 0;

export const isTraceEnabled = (): boolean => {
	if (enabled !== null) return enabled;
	if (typeof window === 'undefined') return false;
	try {
		const params = new URLSearchParams(window.location.search);
		enabled = params.has('debug') || params.has('trace');
		if (enabled) {
			(window as any).__teTrace = [];
		}
	} catch {
		enabled = false;
	}
	return enabled;
};

export const trace = (event: string, data?: Record<string, unknown>) => {
	if (!isTraceEnabled()) return;
	const entry = { t: Math.round(performance.now()), seq: ++seq, event, ...data };
	// Keep a buffer on window so the whole chain can be copied from the console
	// (or dumped by an automated check) instead of only watching it stream by.
	(window as any).__teTrace?.push(entry);
	// eslint-disable-next-line no-console
	console.log(`[trace] ${event}`, data ?? '');
};

// Read the collected trace, e.g. `copy(__teTraceDump())` in the console.
if (typeof window !== 'undefined') {
	(window as any).__teTraceDump = () => (window as any).__teTrace ?? [];
}
