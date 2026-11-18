import { writable, derived, readable } from 'svelte/store';
import * as ort from 'onnxruntime-web';
import tailwindConfig from '../../tailwind.config';
import resolveConfig from 'tailwindcss/resolveConfig';
import { ex0 } from '~/constants/examples';
import { textPages } from '~/utils/textbookPages';

const { theme } = resolveConfig(tailwindConfig);

export const attentionHeadIdxTemp = writable(0);
export const attentionHeadIdx = writable(0);
export const blockIdxTemp = writable(0);
export const blockIdx = writable(0);
export const isOnBlockTransition = writable(false);

export const isOnAnimation = writable(false);

// Textbook state management
export const textbookCurrentPage = writable<number>(0);
export const textbookPreviousPage = writable<number>(-1);
export const textbookCurrentPageId = writable<string>(textPages[0].id);
export const textbookPreviousPageId = writable<string>('');
export const isTextbookOpen = writable<boolean>(true);

// is transformer running?
export const isModelRunning = writable(false);
export const isFetchingModel = writable(true);
// Set when the Chinese checkpoint could not be fetched even after retries, so
// the UI can show an actionable error instead of an endless "downloading" hint.
export const modelLoadError = writable<string | null>(null);
export const isLoaded = writable(false);

// ---------------------------------------------------------------------------
// Generation requests
// ---------------------------------------------------------------------------
// A generation is an EVENT (the user clicked 生成 / picked an example), not a
// property of a store. So each click publishes an explicit request that carries
// the prompt it is for.
//
// Why this matters — the old code drove generation from
// `inputText.subscribe(...)` and then read `$inputText` inside that callback:
//
//   1. `$inputText` compiles to `store_get(inputText, "$inputText", stores)`,
//      which mirrors the store into a component-local source. That mirror is
//      created lazily, on the FIRST read of `$inputText` — which happened
//      *inside the subscribe callback itself*, i.e. it got appended to the end
//      of the subscriber set. So on every `set()`, the page callback ran first
//      (mirror still holding the previous value) and only afterwards did the
//      mirror update. Every run therefore used the PREVIOUS prompt.
//   2. `writable.set` uses `safe_not_equal`, so submitting identical text did
//      not notify at all — "clicking 生成 does nothing".
//
// Carrying the prompt in the request removes both failure modes: the model
// never has to re-read a store to find out what to run.
export type GenerationRequest = { id: number; prompt: string };

let generationRequestSeq = 0;
export const generationRequest = writable<GenerationRequest | null>(null);

export const requestGeneration = (prompt: string) => {
	generationRequest.set({ id: ++generationRequestSeq, prompt });
};

// The prompt that the current `predictedToken` was actually computed from.
// A suggestion may only be folded into the box while the box still holds this
// exact prompt; otherwise the character somebody typed gets a stranger's
// prediction appended to it.
export const predictionSource = writable<{ prompt: string; requestId: number } | null>(null);

// Order must match src/constants/examples/ex*.js — the dropdown index selects the
// cached fixture shown while the weights are still downloading.
export const inputTextExample = [
	'人工智能正在改变我们',
	'数据可视化让读者一眼看懂',
	'在那个遥远的星球上，他们发现了',
	'今天天气很好，我们一起去',
	'机器学习的核心思想是从数据中'
];

const initialExIdx = 0;
export const selectedExampleIdx = writable<number>(initialExIdx);

export const modelSession = writable<ort.InferenceSession>();

// transformer model output
export const modelData = writable<ModelData>(ex0);
export const predictedToken = writable<Probability>();
export const tokens = writable<string[]>(ex0?.tokens);
export const tokenIds = writable<number[]>(ex0?.tokenIds);

export const modelMetaMap: Record<string, ModelMetaData> = {
	gpt2: { layer_num: 12, attention_head_num: 12, dimension: 768, chunkTotal: 63, vocab_size: 50257 },
	// Chinese char-level GPT-2 (uer/gpt2-chinese-cluecorpussmall). Same 12x12x768
	// shape as GPT-2 small, so every viewer component works unchanged; only the
	// vocabulary (21,128) and the shard count differ.
	'gpt2-zh': { layer_num: 12, attention_head_num: 12, dimension: 768, chunkTotal: 46, vocab_size: 21128 },
	'gpt2-medium': { layer_num: 24, attention_head_num: 16, dimension: 1024 },
	'gpt2-large': { layer_num: 36, attention_head_num: 20, dimension: 1280 }
};

// selected token vector
export const highlightedToken = writable<HighlightedToken>({
	index: null,
	value: null,
	fix: false
});

export const highlightedHead = writable<HighlightedToken>({
	index: null,
	value: null,
	fix: false
});

// expanded block
export const expandedBlock = writable<ExpandedBlock>({ id: null });
export const isExpandOrCollapseRunning = writable(false);

// user input text
export const inputText = writable(inputTextExample[initialExIdx]);
// export const tokens = derived(inputText, ($inputText) => $inputText.trim().split(' '));

// selected model and meta data
// The Chinese checkpoint is the one this build ships and loads.
const initialSelectedModel = 'gpt2-zh';
export const selectedModel = writable(initialSelectedModel);
export const modelMeta = derived(selectedModel, ($selectedModel) => modelMetaMap[$selectedModel]);

// Temperature setting
export const initialTemperature = 0.8;
export const temperature = writable(initialTemperature);

// Sampling
export const sampling = writable<Sampling>({ type: 'top-k', value: 5 });

// Prediction visual
export const highlightedIndex = writable(null);
export const finalTokenIndex = writable(null);

// Visual element style
export const rootRem = 16;
export const minVectorHeight = 12;
export const maxVectorHeight = 30;
export const maxVectorScale = 3.4;

export const vectorHeight = writable(0);
export const headContentHeight = writable(0);
export const headGap = { x: 5, y: 8, scale: 0 };

export const isBoundingBoxActive = writable(false);

export const predictedColor = theme.colors.purple[600];

// Interactivity
export const hoveredPath = writable();
export const hoveredMatrixCell = writable({ row: null, col: null });
export const weightPopover = writable();
export const tooltip = writable();

export const isMobile = readable(false, (set) => {
	if (typeof window !== 'undefined') {
		// Only run in browser environment
		const userAgent = navigator.userAgent.toLowerCase();
		set(/android|iphone|ipad|ipod/i.test(userAgent));
	}
	return () => {}; // Cleanup function
});

// User identification
export const userId = writable<string | null>(null);