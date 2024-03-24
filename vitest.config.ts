import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		coverage: {
			reporter: "text",
			include: ["src/**/*.ts"],
			exclude: ["src/async.ts"],
		},
	},
});
