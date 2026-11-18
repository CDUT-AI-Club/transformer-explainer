import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'node:path';

const variablesFile = path.resolve('src/styles/variables.scss').replaceAll('\\', '/');

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@import '${variablesFile}';`
			}
		}
	},
	server: {
		fs: {
			// Allow serving files from one level up to the project root
			allow: ['..']
		}
	}
});
