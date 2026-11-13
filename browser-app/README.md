# Browser app

The React app that sends a question to the backend and shows the answer as it streams in: the agent's lookups, the answer with linked citations, and its sources. The design is the [Browser App Plan](../docs/plans/browser-app.md).

| File | Contents |
|---|---|
| `src/main.tsx` | Mounts `App` inside MUI's `ThemeProvider` and `CssBaseline`, and the atom `RegistryProvider` |
| `src/App.tsx` | The page layout |
| `src/api/ApiClient.ts` | The `ApiClient` service and its layer: the typed client for `PolicyHuisApi` |
| `src/questions/QuestionState.ts` | `QuestionState`, `initialState` and the pure `reduce` |
| `src/api/runtime.ts` | The atom runtime that provides `ApiClient` |
| `src/questions/askAtom.ts` | `askAtom`: one question and the model configuration to answer it |
| `src/models/modelsAtom.ts`, `src/models/useModelChoice.ts` | The offered model configurations, and the viewer's choice among them |
| `src/models/models.ts` | Which configuration to ask with, and how an answer names its model |
| `src/components/ModelChoice.tsx` | One toggle button for each offered configuration, beside Ask |
| `src/questions/useAsk.ts` | The hook components use: the page's view of the result, `ask` and `stop` |
| `src/questions/notices.ts` | `questionView`: the latest state, whether it is streaming, and the notices, from the atom's result |
| `src/questions/useQuestionDraft.ts`, `src/hooks/useDisclosure.ts` | The draft question, and open or closed sections, as the style guide puts all state in hooks |
| `src/questions/citations.ts` | Linking markers, numbering sources and grouping the sources cited in the answer |
| `src/components/QuestionForm.tsx` | The question box and Ask button |
| `src/components/Lookups.tsx`, `LookupRow.tsx` | The lookup list and each expandable row |
| `src/components/Answer.tsx` | The answer as Markdown with linked citation markers |
| `src/components/Sources.tsx` | The sources list |
| `src/components/Notices.tsx` | Incomplete answers, unreachable servers, busy and offline states, and the logging note |
| `*.unit.test.ts` | Beside each module they test, with `src/questions/fixtures.ts` building events as the browser receives them; `vitest.config.ts` runs them without the dev server |

## Run

```sh
cp .env.example .env   # BACKEND_URL, for example http://localhost:8080; .env is gitignored
yarn workspace @policyhuis/browser-app start
```

Then open the URL Vite prints (`http://localhost:5173` by default). The backend must be running; `yarn dev` at the repo root starts it, the data server and this app together. `yarn workspace @policyhuis/browser-app build` writes the static files to `dist/`.

## Check

From the repo root: `yarn lint && yarn format:check && yarn typecheck && yarn test`. The browser app's tests need no backend.
