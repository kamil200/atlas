import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration tests share one database, so they must not run at once.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
