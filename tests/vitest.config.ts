import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  root: __dirname,
  test: {
    include: ["**/*.test.ts"],
    environment: "node",
    globals: false,
  },
  resolve: {
    alias: {
      "@dnd-table/shared": path.resolve(__dirname, "../packages/shared/src/index.ts"),
    },
  },
});
