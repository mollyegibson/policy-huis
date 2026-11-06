import { defineConfig } from "drizzle-kit"

/** `drizzle-kit generate` writes a migration for each schema change to `drizzle/`; applied migrations never change. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["app"]
})
