/**
 * End-to-end proof of the bug, run against ANY build (old or new).
 *
 *   node tests/e2e-prompt-switch.mjs [url] [--legacy]
 *
 * Ground truth is the token list the model actually consumed: it is rendered in
 * the embedding column (`.token-string .label`), so it works on the old build
 * too, which has no trace instrumentation.
 *
 * Scenario (exactly the reported bug):
 *   1. type 我爱你中        → 生成 → embedding shows 我爱你中
 *   2. replace with 高等数  → 生成 → embedding MUST show 高等数
 *
 * With --legacy the assertions are inverted, so the same script DEMONSTRATES the
 * bug on the pre-fix build instead of verifying the fix.
 */
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const args = process.argv.slice(2);
const LEGACY = args.includes('--legacy');
const urlArg = args.find((a) => a.startsWith('http'));
const URL_BASE = urlArg ?? 'http://127.0.0.1:4173/';

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(`pageerror: ${e.message}`));

await page.goto(`${URL_BASE}${URL_BASE.includes('?') ? '&' : '?'}debug=1`, {
	waitUntil: 'domcontentloaded'
});

await page.waitForSelector('[data-click="generate-btn"]', { timeout: 120_000 });

// What the model actually ran on: the rendered token labels.
const shownTokens = () =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('.embedding .token-string .label')).map((el) =>
			el.textContent.trim()
		)
	);

const box = page.locator('[data-click="text-input"] .text-box');

// Wait until the app is idle (button enabled) so a click cannot be swallowed.
const waitIdle = async (timeout = 300_000) => {
	await page.waitForFunction(
		() => {
			const btn = document.querySelector('[data-click="generate-btn"]');
			return btn && !btn.disabled;
		},
		{ timeout }
	);
};

const setPrompt = async (text) => {
	await box.click();
	await page.keyboard.press('Control+A');
	await page.keyboard.press('Delete');
	await box.evaluate((el, t) => {
		el.innerText = t;
		el.dispatchEvent(new InputEvent('input', { bubbles: true }));
	}, text);
};

const generate = async () => {
	await waitIdle();
	const before = (await shownTokens()).join('');
	await page.locator('[data-click="generate-btn"]').click();
	// Generation is async; wait until the token column settles to a new value.
	await page.waitForFunction(
		(prev) => {
			const now = Array.from(document.querySelectorAll('.embedding .token-string .label'))
				.map((el) => el.textContent.trim())
				.join('');
			const btn = document.querySelector('[data-click="generate-btn"]');
			return now !== prev && btn && !btn.disabled;
		},
		before,
		{ timeout: 180_000 }
	);
	return (await shownTokens()).join('');
};

console.log(`target: ${URL_BASE}   mode: ${LEGACY ? 'LEGACY (expect the bug)' : 'FIXED (expect correct)'}`);

// First generation establishes the app as ready.
await setPrompt('我爱你中');
const first = await generate();
console.log(`  step 1: typed 我爱你中  -> model ran on ${JSON.stringify(first)}`);

// The reported scenario.
await setPrompt('高等数');
const second = await generate();
console.log(`  step 2: typed 高等数    -> model ran on ${JSON.stringify(second)}`);

const secondIsFresh = second.startsWith('高等数');
console.log(`\n  second run used the NEW prompt? ${secondIsFresh}`);

await browser.close();

if (LEGACY) {
	if (secondIsFresh) {
		console.log('  ⚠ expected the old build to show the stale prompt, but it did not.');
	} else {
		console.log('  ✔ reproduced: the second run reused the FIRST prompt (the reported bug).');
	}
	process.exit(0);
}

assert.ok(first.startsWith('我爱你中'), `first run should use 我爱你中, got ${first}`);
assert.ok(secondIsFresh, `second run must use 高等数, got ${JSON.stringify(second)}`);
console.log('\nE2E PASSED: each 生成 ran on the prompt in the box.');

if (pageErrors.length) {
	console.log('page errors:');
	for (const e of pageErrors.slice(0, 5)) console.log('  -', e);
}
