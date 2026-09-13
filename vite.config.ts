import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// GitHub Pages serves a project site under /<repo>/, not /. The deploy
// workflow sets GITHUB_PAGES so only that build gets the sub-path; local dev
// and any other host stay at "/".
export const base = process.env.GITHUB_PAGES ? "/monovella-poc/" : "/";

export default defineConfig({
	base,
	plugins: [tailwindcss(), reactRouter()],
	resolve: {
		tsconfigPaths: true,
	},
});
