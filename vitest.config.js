import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*_test.ts"],
        coverage: {
            reporter: "text",
            exclude: ["**/*_test.ts", "**/_test/*"],
        },
    },
});
