<script>
	import katex from 'katex';
	import { base } from '$app/paths';

	export let math;
	export let displayMode = false;
	export let style;

	const options = {
		displayMode,
		throwOnError: false,
		style
	};

	$: katexString = katex.renderToString(math, options);
</script>

<svelte:head>
	<link rel="stylesheet" href={`${base}/katex/katex.min.css`} />
</svelte:head>

{@html katexString}
