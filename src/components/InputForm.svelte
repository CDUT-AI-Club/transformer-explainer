<script lang="ts">
	import { Dropdown, DropdownItem, ButtonGroup } from 'flowbite-svelte';
	import Temperature from './Temperature.svelte';

	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import {
		inputText,
		isModelRunning,
		predictedToken,
		inputTextExample,
		isFetchingModel,
		modelLoadError,
		expandedBlock,
		selectedExampleIdx,
		isLoaded,
		isOnAnimation,
		isMobile,
		weightPopover,
		sampling,
		attentionHeadIdx,
		blockIdx,
		temperature,
		tokenIds,
		userId,
		predictionSource,
		requestGeneration
	} from '~/store';
	import LoadingDots from './common/LoadingDots.svelte';
	import { onMount } from 'svelte';
	import classNames from 'classnames';
	import Sampling from './Sampling.svelte';
	import { completeCurrentAnimation } from '~/utils/animation';
	import { textPages } from '~/utils/textbookPages';
	import { trace } from '~/utils/trace';

	let inputRef: HTMLDivElement;
	let predictRef: HTMLDivElement;

	let useCustomInput = false;

	// The editable box is deliberately UNCONTROLLED.
	//
	// Rendering `{inputTextTemp}` inside a contenteditable makes Svelte own that
	// text node, so every state write re-serialises the box. That resets the caret
	// on each keystroke (Backspace then deletes nothing because it operates at
	// offset 0) and, worse, overwrites freshly composed IME text with the stale
	// value the state still holds — which is what wiped the prompt entirely.
	//
	// So the DOM is the single source of truth while typing, and we only write to
	// it from state on explicit events (example picked, prediction accepted,
	// prompt submitted).
	let inputTextTemp = '';

	const readPromptFromDom = () => (inputRef ? inputRef.innerText : inputTextTemp);

	const writePromptToDom = (text: string) => {
		inputTextTemp = text;
		if (inputRef && inputRef.innerText !== text) {
			inputRef.innerText = text;
		}
	};

	onMount(() => {
		// Seed the box with the initial prompt once the element exists.
		writePromptToDom($inputText || '');
	});

	// The example dropdown keeps raw newlines and the contenteditable can hold
	// trailing spaces, so compare prompts with whitespace collapsed.
	const normalizePrompt = (text: string) => (text || '').replace(/[\s\n]+/g, ' ').trim();

	// ---- Suggestion display -------------------------------------------------
	// `predictedToken` is only a character; it does not say which prompt produced
	// it. `predictionSource` does. A suggestion is only shown (and can only be
	// accepted) while the box still holds exactly the prompt it was computed
	// from — otherwise it visibly belongs to text the user has already replaced,
	// which is what made a newly typed prompt look like it had an extra
	// character glued on.
	$: suggestionIsForCurrentPrompt =
		!!$predictionSource &&
		normalizePrompt($predictionSource.prompt) === normalizePrompt(inputTextTemp);

	$: predictedTokenTemp = suggestionIsForCurrentPrompt ? $predictedToken?.token || '' : '';

	// Token budget, not word count: Chinese has no spaces, so splitting on
	// whitespace would let a whole paragraph through and blow up the matrices.
	const wordLimit = 12;

	// Rough per-character estimate, refined by the real tokenizer before running.
	// CJK: 1 char ~ 1 token; Latin: ~4 chars per token.
	const estimateTokens = (text: string): number => {
		const cjk = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
		const rest = text.replace(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, ' ').trim();
		const latinWords = rest.length ? rest.split(/\s+/).filter(Boolean).length : 0;
		return cjk + latinWords;
	};

	$: estimatedTokens = estimateTokens(inputTextTemp);
	$: exceedLimit = estimatedTokens > wordLimit;

	// Text input

	// Fold the pending prediction into the prompt. This is the "accept the
	// suggestion" action, so it may only run while that suggestion still
	// describes what is in the box (predictedTokenTemp is already gated above).
	const acceptPrediction = () => {
		let formattedString = (readPromptFromDom() + predictedTokenTemp).replace(/[\s\n]+/g, ' ');

		writePromptToDom(formattedString);
		// Keep the caret at the end so continued typing appends.
		moveCursorToEnd(inputRef);

		return formattedString;
	};

	// Focusing the box must NOT absorb the suggestion: the user is usually about
	// to edit or replace the prompt, and silently appending a stale character is
	// exactly the surprise this component used to cause. Only an explicit click on
	// the suggestion chip (or a submit that still matches the predicted prompt)
	// accepts it.
	const onFocusInput = (e) => {
		inputTextTemp = readPromptFromDom();
	};

	const onInput = (e) => {
		// While the IME is composing, the DOM holds provisional text (pinyin
		// candidates). Mirroring it into state would later be written back over the
		// committed characters, so wait for compositionend.
		if (isComposing || e.isComposing) return;
		inputTextTemp = readPromptFromDom();
	};

	const handleSubmit = (e) => {
		// Read the box, not a store: the DOM is the source of truth while typing,
		// and during IME composition the mirrored state is intentionally behind it.
		const pendingText = readPromptFromDom();

		// A suggestion may only be folded in when it belongs to exactly this text.
		// (predictionIsStale used to be computed against $inputText, which the
		// previous submit had already overwritten with a different prompt — so a
		// stale character looked fresh and got appended.)
		const submittedText = acceptPrediction();

		inputTextTemp = submittedText;

		textPages.find((page) => page.id === 'how-transformers-work')?.complete();

		// Keep the store in sync for the rest of the UI, but the generation is
		// driven by the request below — never by the store changing.
		inputText.set(submittedText);

		trace('submit', {
			typed: pendingText,
			submitted: submittedText,
			acceptedSuggestion: normalizePrompt(submittedText) !== normalizePrompt(pendingText)
		});

		// ONE click == ONE generation, even if the text did not change. The old
		// code relied on `inputText.set()` notifying subscribers, and Svelte skips
		// the notification when the value is equal — so clicking 生成 twice on the
		// same prompt silently did nothing.
		completeCurrentAnimation();
		requestGeneration(submittedText);

		window.dataLayer?.push({
			event: 'generate-next-token',
			attn_head_num: $attentionHeadIdx,
			transformer_block_num: $blockIdx,
			sampling_type: $sampling.type,
			sampling_value: $sampling.value,
			temperature_value: $temperature,
			current_token_length: $tokenIds.length,
			input_word_count: submittedText
				.trim()
				.split(/\s+/)
				.filter((word) => word.length > 0).length,
			use_custom_input: useCustomInput,
			user_id: $userId
		});
	};

	// IME composition state. Chinese/Japanese/Korean input fires Enter to commit a
	// candidate; without this guard, picking a character would launch generation.
	let isComposing = false;
	const onCompositionStart = () => {
		isComposing = true;
	};
	const onCompositionEnd = () => {
		// The committed characters are in the DOM now — adopt them immediately so
		// the box and the state agree before any submit can read a stale value.
		inputTextTemp = readPromptFromDom();
		// Chrome/Safari fire keydown(Enter) before compositionend, so release the
		// flag on the next frame to avoid treating that Enter as a submit.
		setTimeout(() => {
			isComposing = false;
		}, 0);
	};

	const handleKeyDown = (e) => {
		// keyCode 229 is the legacy "IME is processing" signal (Safari).
		if (isComposing || e.isComposing || e.keyCode === 229) return;
		if (e.key === 'Enter') {
			e.preventDefault();
			if (disabled || exceedLimit) return;
			handleSubmit(e);
			return;
		}
		useCustomInput = true;
	};

	// Example select box
	let dropdownOpen = false;
	const onSelectExample = (d, i) => {
		if ($isFetchingModel) {
			textPages.find((page) => page.id === 'how-transformers-work')?.complete();
		}

		dropdownOpen = false;

		selectedExampleIdx.set(i);

		writePromptToDom(d);
		moveCursorToEnd(inputRef);
		inputText.set(d.trim());
		useCustomInput = false;

		// Picking an example is a submit as well: it must run that example, not
		// wait for the store to notice a change (which it would not do when the
		// same example is picked twice in a row).
		trace('select-example', { index: i, prompt: d.trim() });
		completeCurrentAnimation();
		requestGeneration(d.trim());
	};

	const moveCursorToEnd = (element) => {
		const range = document.createRange();
		const sel = window.getSelection();
		range.selectNodeContents(element);
		range.collapse(false);
		sel.removeAllRanges();
		sel.addRange(range);
		element.focus();
	};

	$: isLoading = $isFetchingModel || $isModelRunning;
	$: disabled =
		$isFetchingModel ||
		!!$modelLoadError ||
		// $isModelRunning ||
		$expandedBlock.id !== null ||
		!!$weightPopover;
	$: selectDisabled = $isModelRunning || $expandedBlock.id !== null || !!$weightPopover;
	$: parameterDisabled = !!$weightPopover;
</script>

<div class="input-area" data-click="input-area">
	<form class="input-form" data-click="input-form" on:submit|preventDefault>
		<ButtonGroup class="input-btn-group" size="sm">
			<button
				data-click="dropdown-btn"
				type="button"
				disabled={selectDisabled}
				class:selectDisabled
				class="select-button inline-flex shrink-0 items-center justify-center border border-s-0 border-gray-200 bg-white px-3 py-2 text-center text-xs font-medium text-gray-900 first:rounded-s-lg first:border-s last:rounded-e-lg"
			>
				示例<ChevronDownOutline class="pointer-events-none h-4 w-4 text-gray-500" />
			</button>
			<Dropdown bind:open={dropdownOpen} class="example-dropdown">
				{#each inputTextExample as text, index}
					<DropdownItem
						data-click={`dropdown-item-${index}`}
						class={$selectedExampleIdx === index && 'active'}
						on:click={() => {
							onSelectExample(text, index);
						}}>{text}</DropdownItem
					>
				{/each}
			</Dropdown>

			<div
				data-click="text-input"
				class="input-container"
				class:disabled
				role="none"
				on:keydown={(e) => {
					e.stopPropagation();
					// Only pull focus in if it is not already inside the box: calling
					// focus() on every keystroke interrupts IME composition.
					if (document.activeElement !== inputRef) inputRef.focus();
				}}
				on:click={(e) => {
					e.stopPropagation();
					if (document.activeElement !== inputRef) inputRef.focus();
				}}
			>
				<div class={`editable ${!$isModelRunning ? 'w-full' : ''}`}>
					<!--
						Intentionally empty: this is an UNCONTROLLED contenteditable. Any
						expression here would make Svelte own the text node and rewrite it
						on every state change, which resets the caret (breaking Backspace)
						and clobbers in-flight IME composition. Content is written
						imperatively via writePromptToDom() instead.
					-->
					<div
						bind:this={inputRef}
						contenteditable={!disabled}
						class="text-box"
						placeholder="输入一句中文，比如：人工智能正在改变"
						on:focus={onFocusInput}
						on:input={onInput}
						on:keydown={handleKeyDown}
						on:compositionstart={onCompositionStart}
						on:compositionend={onCompositionEnd}
						on:click={(e) => {
							e.stopPropagation();
						}}
						role="input"
					></div>
					{#if !$isModelRunning}
						<div
							bind:this={predictRef}
							class="predicted"
							role="none"
							on:click={(e) => {
								e.stopPropagation();
								// Clicking the suggestion is the explicit "accept" gesture.
								acceptPrediction();
								inputRef.focus();
								moveCursorToEnd(inputRef);
							}}
						>
							<span>{predictedTokenTemp}</span>
						</div>
					{/if}
				</div>
				{#if $isModelRunning}
					<div class="loading"><LoadingDots /></div>
				{/if}
				{#if $isMobile}
					<span class="helper-text"
						>可以先用示例体验。若要输入自己的文字，请使用桌面电脑打开本页面。</span
					>
				{:else if exceedLimit}
					<!-- Actionable state first: with a character-level tokenizer 13 Chinese
					characters already exceed the budget, and the download notice would otherwise
					mask why Generate is greyed out. -->
					<span class="helper-text"
						>最多 {wordLimit} 个词元，当前约 {estimatedTokens} 个。</span
					>
				{:else if $modelLoadError}
					<span class="helper-text">中文模型下载失败，请刷新页面重试（已下载的分片会复用缓存）。</span>
				{:else if $isLoaded && $isFetchingModel}
					<span class="helper-text"
						>中文模型（约 400MB）正在下载，可先用示例体验。</span
					>
				{/if}
			</div>
		</ButtonGroup>
		<button
			data-click="generate-btn"
			disabled={disabled || exceedLimit || exceedLimit}
			class={classNames('generate-button rounded-lg text-center text-sm shadow-sm', {
				disabled: disabled || exceedLimit,
				active: !(disabled || exceedLimit)
			})}
			type="submit"
			on:click={handleSubmit}
		>
			生成
		</button>
	</form>
	<div class="parameters" data-click="input-parameters">
		<Temperature disabled={parameterDisabled} />
		<Sampling disabled={parameterDisabled} />
	</div>
</div>

<style lang="scss">
	.parameters {
		display: flex;
		gap: 1rem;
	}
	.input-area {
		width: 100%;
		flex-shrink: 0;
		display: flex;
		gap: 1rem;
		padding-left: 1rem;
		padding-right: 1.25rem;

		.input-form {
			width: 100%;
			flex: 1 0 0;
			display: flex;
			align-items: center;
			gap: 0.5rem;

			:global(.input-btn-group) {
				flex: 1 0 0;
				display: flex;
			}
		}
	}
	.input-container {
		position: relative;
		display: flex;
		flex: 1 0 0;
		align-items: center;

		border: 1px solid theme('colors.gray.300');
		color: theme('colors.gray.900');
		border-left: none;
		border-start-end-radius: 0.5rem;
		border-end-end-radius: 0.5rem;
		font-size: 1rem;
		line-height: 1rem;
		padding: 0.5rem;
		white-space: pre-wrap;
		gap: 0.3rem;

		width: 10px; // to keep input box width

		.editable {
			overflow-y: hidden;
			justify-content: end; // to show the last word

			display: flex;
			align-items: center;
			overflow-x: hidden;
			white-space: nowrap;

			.text-box {
				white-space: nowrap;
				br {
					display: none;
				}

				&:focus {
					outline: none;
				}

				// The box is uncontrolled, so the placeholder attribute does not apply
				// to a contenteditable. Render it as an empty-state pseudo element.
				&:empty::before {
					content: attr(placeholder);
					color: theme('colors.gray.400');
					pointer-events: none;
				}
			}
			.predicted {
				flex: 1 0 0;
				color: var(--predicted-color);
				font-weight: 600;
				span {
					white-space: pre;
				}
			}
		}

		&.disabled {
			cursor: not-allowed;
		}

		.loading {
			flex-shrink: 0;
		}
	}

	.select-button {
		flex-shrink: 0;
		font-size: 0.9rem;
		border: 1px solid theme('colors.gray.300');
		color: theme('colors.gray.900');
		&:hover {
			background-color: theme('colors.gray.100');
		}
		&:focus {
			outline: none;
		}
		&.disabled {
			cursor: not-allowed;
		}
	}
	:global(.example-dropdown) {
		:global(.active) {
			background-color: theme('colors.gray.100') !important;
		}
	}
	.helper-text {
		position: absolute;
		bottom: 0;
		right: 0;
		padding: 0.3rem 0;
		transform: translate(0, 100%);
		color: theme('colors.gray.400');
		font-size: 0.9rem;
	}
	:global(.generate-button) {
		padding: 0.4rem 0.8rem;
		border: 1px solid theme('colors.gray.300');
		color: theme('colors.gray.900');
		transition: all 0.2s;
		flex-shrink: 0;
	}
	:global(.generate-button.active) {
		&:hover {
			border: 1px solid var(--predicted-color);
			color: var(--predicted-color);
		}
	}
	:global(.generate-button.disabled) {
		opacity: 1;
		background-color: theme('colors.gray.100');
		color: theme('colors.gray.400');
		cursor: not-allowed;
	}

	:global(.generate-button):focus {
		border: 1px solid var(--predicted-color);
		color: var(--predicted-color);
	}
</style>
