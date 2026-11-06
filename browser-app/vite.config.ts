import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

/**
 * Builds the app, and in development serves it with `/api` proxied to the backend at `BACKEND_URL`, so the browser
 * calls the backend on the app's own origin.
 */
export default defineConfig(({ command, mode }) => {
  if (command === "build") return { plugins: [react()] }
  const backendUrl = loadEnv(mode, import.meta.dirname, "")["BACKEND_URL"]
  if (backendUrl === undefined || backendUrl === "") {
    throw new Error("BACKEND_URL is missing: copy browser-app/.env.example to browser-app/.env and set it")
  }
  return {
    plugins: [react()],
    server: { proxy: { "/api": { target: backendUrl, changeOrigin: true } } }
  }
})
