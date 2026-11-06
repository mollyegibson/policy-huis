import { RegistryProvider } from "@effect/atom-react"
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "./App.tsx"

const root = document.getElementById("root")
if (root === null) throw new Error("index.html has no #root element")

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={createTheme()}>
      <CssBaseline />
      <RegistryProvider>
        <App />
      </RegistryProvider>
    </ThemeProvider>
  </StrictMode>
)
