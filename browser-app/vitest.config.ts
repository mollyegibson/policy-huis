import { defineConfig } from "vitest/config"

/** Tests run the pure modules in Node; they need no dev server, proxy or `BACKEND_URL`. */
export default defineConfig({
  test: { include: ["src/**/*.unit.test.{ts,tsx}"] }
})
