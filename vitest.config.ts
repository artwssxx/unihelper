import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(process.cwd()), "server-only": path.resolve(process.cwd(), "scripts/vitest-empty.mjs") } },
  test: { include: ["lib/**/*.test.ts"] },
});
