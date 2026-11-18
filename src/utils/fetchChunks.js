const CACHE_PREFIX = 'onnx-model-cache';
// Bumped for the Chinese checkpoint: the old cache holds GPT-2 small shards,
// and serving those to the new session would fail at create().
const CACHE_NAME = `${CACHE_PREFIX}-zh-v1`;

// Fetching 46 shards at once occasionally trips up the transport (through the
// VS Code port-forward we saw HTTP 501s with NUL bytes injected into the
// request line, plus connections dropped mid-body). Without retries a single
// bad shard rejects the whole load and the page waits forever.
const FETCH_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 400;

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBufferWithRetry(url) {
	let lastError;

	for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
		try {
			const response = await fetch(url, { cache: 'no-store' });
			if (!response.ok) {
				throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
			}
			// Retry covers a body that dies mid-stream too: a truncated shard
			// throws here, and re-fetching is the only way to recover it.
			return await response.arrayBuffer();
		} catch (error) {
			lastError = error;
			if (attempt < FETCH_ATTEMPTS) {
				console.warn(`Retrying ${url} (attempt ${attempt + 1}/${FETCH_ATTEMPTS})`, error);
				await delay(RETRY_BASE_DELAY_MS * attempt);
			}
		}
	}

	throw lastError;
}

async function fetchModelChunks(chunkUrls) {
	await clearOldCaches();

	let hasCache = false;
	const cache = await caches.open(CACHE_NAME);
	const cachedResponses = await Promise.all(chunkUrls.map((url) => cache.match(url)));

	// add cache
	const fetchPromises = chunkUrls.map((url, index) => {
		if (!cachedResponses[index]) {
			// console.log(`Fetching and caching: ${url}`);
			return fetchBufferWithRetry(url).then(async (buffer) => {
				try {
					await cache.put(
						url,
						new Response(buffer, { headers: { 'Content-Type': 'application/octet-stream' } })
					);
				} catch (error) {
					// Caching is best-effort: a full disk / quota error must not
					// fail the model download itself.
					console.warn(`Failed to cache ${url}`, error);
				}
				return buffer;
			});
		} else {
			hasCache = true;
			// console.log(`Using cached version: ${url}`);
			return cachedResponses[index].arrayBuffer();
		}
	});

	const modelBuffers = await Promise.all(fetchPromises);
	return { hasCache, modelBuffers };
}

export async function fetchAndMergeChunks(urls) {
	const { hasCache, modelBuffers: chunks } = await fetchModelChunks(urls);
	const totalSize = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
	const mergedArray = new Uint8Array(totalSize);
	let offset = 0;
	for (const chunk of chunks) {
		mergedArray.set(new Uint8Array(chunk), offset);
		offset += chunk.byteLength;
	}
	return { hasCache, mergedArray: mergedArray.buffer };
}

async function clearOldCaches() {
	const cacheNames = await caches.keys();
	await Promise.all(
		cacheNames.map((name) => {
			if (name !== CACHE_NAME && name.includes(CACHE_PREFIX)) {
				console.log(`Deleting old cache: ${name}`);
				return caches.delete(name);
			}
		})
	);
}
