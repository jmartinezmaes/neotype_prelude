/// <reference types="vitest" />

import { defineConfig } from "vite";

export default defineConfig({
    test: {
        globals: true,
        include: ["**/*_test.ts"],
        coverage: {
            reporter: "text",
            exclude: ["**/*_test.ts"],
        },
    },
});
