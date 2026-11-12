# Browser app

The React app that sends a question to the backend and shows the answer as it streams in: the agent's tool calls, the answer with linked citations, and its sources. The design is the [Browser App Plan](../docs/plans/browser-app.md).

| Path | Contents |
|---|---|
| `src/main.tsx`, `src/App.tsx` | The page, inside MUI's theme and the atom registry |
| `src/api/ApiClient.ts`, `src/api/runtime.ts` | The typed client for `protocol/`'s `PolicyHuisApi`, and the atom runtime that provides it |
| `src/models/` | The offered model configurations, the viewer's choice (remembered in `localStorage`) and the answer's model label |
| `src/questions/` | The page state and its reducer, the ask atom and `useAsk`, citations, tool labels and notices; pure modules with `*.unit.test.ts` beside them |
| `src/components/` | The question form, model choice, tool calls, answer, sources and notices |
| `src/hooks/` | Small UI state hooks |
| `vite.config.ts` | The build, and the dev server's `/api` proxy to `BACKEND_URL` |

## Run

```sh
cp .env.example .env   # BACKEND_URL, for example http://localhost:8080; .env is gitignored
yarn workspace @policyhuis/browser-app start
```

Then open the URL Vite prints (`http://localhost:5173` by default). The backend must be running; `yarn dev` at the repo root starts it, the data server and this app together. `yarn workspace @policyhuis/browser-app build` writes the static files to `dist/`.

## Check

From the repo root: `yarn lint && yarn format:check && yarn typecheck && yarn test`. The browser app's tests need no backend.
