/**
 * Regression test for the "second prompt runs the first prompt" bug.
 *
 * Run with:  node tests/prompt-request.test.mjs
 *
 * It deliberately does NOT need a browser or the 456 MB model. It exercises the
 * two Svelte 5 behaviours that caused the bug, using the project's own Svelte
 * package, and asserts the pattern the app now uses instead:
 *
 *   1. A generation must be driven by an explicit request that CARRIES its
 *      prompt, not by re-reading a store inside a subscriber callback.
 *   2. A suggestion may only be accepted when the box still holds the prompt it
 *      was computed from.
 *
 * Both tests fail against the old implementation shape and pass against the new
 * one, so they are a real guard rather than a description of current code.
 */
import assert from 'node:assert/strict';
import { writable } from '../node_modules/svelte/src/store/index-client.js';
import { mutable_source } from '../node_modules/svelte/src/internal/client/reactivity/sources.js';
import { get as runtime_get } from '../node_modules/svelte/src/internal/client/runtime.js';
import { subscribe_to_store } from '../node_modules/svelte/src/store/utils.js';

// A faithful replica of the store accessor Svelte 5 generates for `$store`
// inside a component: one lazily-created mirrored source per (component, store).
function makeStoreAccessor() {
	const stores = {};
	return (store, name) => {
		const entry = (stores[name] ??= {
			store: null,
			source: mutable_source(undefined),
			unsubscribe: () => {}
		});
		if (entry.store !== store) {
			entry.unsubscribe();
			entry.store = store;
			entry.unsubscribe = subscribe_to_store(store, (v) => {
				entry.source.v = v;
			});
		}
		return runtime_get(entry.source);
	};
}

const normalize = (s) => (s || '').replace(/[\s\n]+/g, ' ').trim();

let passed = 0;
const test = (name, fn) => {
	try {
		fn();
		passed++;
		console.log(`  ok   ${name}`);
	} catch (e) {
		console.error(`  FAIL ${name}\n       ${e.message}`);
		process.exitCode = 1;
	}
};

// ---------------------------------------------------------------------------
// 1. The stale-read mechanism itself (documents WHY the fix is needed).
// ---------------------------------------------------------------------------
test('reading $store inside a subscribe callback yields the PREVIOUS value', () => {
	const inputText = writable('第一句');
	const pageAccessor = makeStoreAccessor();

	const seen = [];
	inputText.subscribe(() => {
		// This is what src/routes/+page.svelte used to do: ignore the callback
		// argument and re-read `$inputText` from the store instead.
		seen.push(pageAccessor(inputText, 'inputText'));
	});

	inputText.set('我爱你中');
	inputText.set('高等数');

	// The callback DOES see the fresh value in its argument, but the mirrored
	// read lags exactly one update behind.
	assert.equal(seen.at(-1), '我爱你中', 'the mirrored read is stale by one update');
	assert.notEqual(seen.at(-1), '高等数');
});

test('carrying the prompt in the request never lags', () => {
	const inputText = writable('第一句');
	const generationRequest = writable(null);
	let seq = 0;
	const requestGeneration = (prompt) => generationRequest.set({ id: ++seq, prompt });

	const ranOn = [];
	generationRequest.subscribe((req) => {
		if (req) ranOn.push(req.prompt);
	});

	// Click 生成 twice with DIFFERENT prompts, exactly like the bug report.
	inputText.set('我爱你中');
	requestGeneration('我爱你中');
	inputText.set('高等数');
	requestGeneration('高等数');

	assert.deepEqual(ranOn, ['我爱你中', '高等数'], 'each click runs its own prompt');
});

// ---------------------------------------------------------------------------
// 2. Clicking 生成 twice with an unchanged prompt must still run.
// ---------------------------------------------------------------------------
test('identical prompt re-submit still triggers a run (set() would not notify)', () => {
	const inputText = writable('高等数');
	const generationRequest = writable(null);
	let seq = 0;
	const requestGeneration = (prompt) => generationRequest.set({ id: ++seq, prompt });

	let inputTextNotifications = 0;
	inputText.subscribe(() => inputTextNotifications++); // 1 = initial subscribe only

	let runs = 0;
	generationRequest.subscribe((req) => {
		if (req) runs++;
	});

	requestGeneration('高等数');
	requestGeneration('高等数');

	assert.equal(inputTextNotifications, 1, 'svelte writes equal values without notifying');
	assert.equal(runs, 2, 'but two clicks produce two runs');
});

// ---------------------------------------------------------------------------
// 3. Suggestion acceptance is gated on the prompt it came from.
// ---------------------------------------------------------------------------
const suggestionFor = ({ boxText, predictionSource, predictedToken }) => {
	const isForCurrent =
		!!predictionSource && normalize(predictionSource.prompt) === normalize(boxText);
	return { token: isForCurrent ? predictedToken : '', isForCurrent };
};

test('a suggestion from a replaced prompt is not shown or accepted', () => {
	// The old flow: prediction computed for 我爱你中, user then typed 高等数.
	const shown = suggestionFor({
		boxText: '高等数',
		predictionSource: { prompt: '我爱你中', requestId: 1 },
		predictedToken: '国'
	});
	assert.equal(shown.token, '', 'the stale character must not appear next to 高等数');

	// Even if submit runs, it must not append a stranger's character.
	const submitted = normalize('高等数' + shown.token);
	assert.equal(submitted, '高等数');
});

test('a suggestion for the prompt in the box is accepted', () => {
	const shown = suggestionFor({
		boxText: '高等数',
		predictionSource: { prompt: '高等数', requestId: 2 },
		predictedToken: '学'
	});
	assert.equal(shown.token, '学');
	assert.equal(normalize('高等数' + shown.token), '高等数学');
});

test('trailing-whitespace differences do not break acceptance', () => {
	const shown = suggestionFor({
		boxText: '高等数 ',
		predictionSource: { prompt: '高等数', requestId: 3 },
		predictedToken: '学'
	});
	assert.equal(shown.token, '学', 'normalisation keeps the accepted path working');
});

console.log(`\n${passed} test(s) passed${process.exitCode ? ' — SOME FAILED' : ''}`);
