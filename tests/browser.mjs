/**
 * Shared browser bootstrap for the e2e tests.
 *
 * The e2e tests are optional tooling — the app itself has no browser
 * dependency. If no browser is available they fail with a clear message
 * instead of a stack trace.
 *
 * Resolution order for the Chrome binary:
 *   1. $CHROME_PATH                       (explicit override)
 *   2. the Playwright-managed download under ~/.cache/ms-playwright
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

const CANDIDATE_SHELLS = [
	process.env.CHROME_PATH,
	process.env.HOME &&
		path.join(process.env.HOME, '.cache/ms-playwright/chromium_headless_shell-1248/chrome-linux/headless_shell')
].filter(Boolean);

const CANDIDATE_PLAYWRIGHT = [
	// Installed as a devDependency of this project
	() => require.resolve('playwright-core')
];

export function loadPlaywright() {
	for (const resolve of CANDIDATE_PLAYWRIGHT) {
		try {
			const p = resolve();
			if (existsSync(p)) return require(p);
		} catch {
			// try the next candidate
		}
	}
	throw new Error(
		'e2e tests need playwright-core.\n' +
			'  Install it with:  npm install --legacy-peer-deps --no-save playwright-core\n' +
			'  Then re-run this script.'
	);
}

export function findChrome() {
	const found = CANDIDATE_SHELLS.find((p) => existsSync(p));
	if (!found) {
		throw new Error(
			'e2e tests need a headless Chrome build.\n' +
				'  Install one with:  npx playwright-core install chromium-headless-shell\n' +
				'  or point $CHROME_PATH at an existing chrome-headless-shell binary.'
		);
	}
	return found;
}

export async function launchBrowser() {
	const { chromium } = loadPlaywright();
	return chromium.launch({
		executablePath: findChrome(),
		args: ['--no-sandbox', '--disable-dev-shm-usage']
	});
}

// Keep the import used even if the caller only wants the helpers.
export { pathToFileURL };
