# PolicyHuis: Browser App Plan

The browser app sends a question to the backend and shows the answer as it streams in: the agent's lookups while it works, the answer text, and the sources behind each claim. Like the agent loop, it is the same for every city; it knows a city only through the lookups and citations the backend streams to it.

This plan covers the Phase 1 prototype, enough to show the agent working, built to be iterated on. It builds on the [Agent Loop Plan](agent-loop.md), whose [API contract](agent-loop.md#api-contract) defines everything the app receives. The full web app design (pages, Dutch originals beside machine translations, hosting, the energy dashboard) remains the MVP plan's [follow-up](mvp-technical-plan.md#follow-up).

## Scope

A React app in `browser-app/`, following [Front-end Code Style](../front-end-code-style.md). It:

- talks only to the backend's `POST /api/v1/questions` and `GET /api/v1/models`, through `HttpApiClient` and `protocol/`'s `PolicyHuisApi`, decoding every event with `AgentStreamEvent`;
- holds one question and its answer in memory, and asking again replaces the previous answer; the only thing stored in the browser is the viewer's model choice (see [Model choice](#model-choice)).

Not in Phase 1: accounts, history, follow-up questions in a thread, maps, and hosting beyond the local dev server.

## Stack

| Concern | Choice |
|---|---|
| UI | React 19 and MUI (`@mui/material`), with MUI's default theme |
| State | Effect atoms (`effect/reactivity`) with `@effect/atom-react`, whose version matches `effect` |
| API client | `HttpApiClient.make(PolicyHuisApi)` over `FetchHttpClient` |
| Markdown | `react-markdown`, which renders no raw HTML, with `remark-gfm` for GitHub-style tables, which render as MUI tables |
| Build and dev server | Vite with `@vitejs/plugin-react` |
| Checks | The repo's TypeScript, ESLint, Prettier and Vitest setup, like every other workspace |

## Design

The state follows one pattern: a pure, unit-tested `reduce(state, event)` folds each event into the page state, keeping lookups apart from the answer text and updating each by `lookupId`. The ask atom's value is the stream of states (`Stream.scan(() => initialState, reduce)`), so asking again interrupts the previous run and no stale stream can write. While the agent works, the lookups show as a live list, collapsing to "Made N lookups" when the answer is complete.

## Files

[`browser-app/README.md`](../../browser-app/README.md) lists the app's files.

## Page state

Everything the page shows comes from one value, `QuestionState`, folded from the event stream by the pure `reduce` in [`src/questions/QuestionState.ts`](../../browser-app/src/questions/QuestionState.ts): the answer text (each `TextChunk` appended), the lookups in `LookupStarted` order (each updated by its `LookupEnded`: status, `result` and error type), every citation received in `Sources` by `citationId`, and `Complete`, which also marks any lookup still running as `unfinished`. A lookup's `result` is the tool's `structuredContent`, kept for display; citations are never read from it.

The `switch` is exhaustive over `AgentStreamEvent`, so a new event in `protocol/` fails the type check there until it is handled.

## Asking a question

- **The client:** `ApiClient` ([`src/api/ApiClient.ts`](../../browser-app/src/api/ApiClient.ts)) is the typed `HttpApiClient` for `PolicyHuisApi` on the app's own origin, where the dev server proxies `/api`; the atom runtime in [`src/api/runtime.ts`](../../browser-app/src/api/runtime.ts) provides it once.
- **The ask atom** ([`src/questions/askAtom.ts`](../../browser-app/src/questions/askAtom.ts)) is a function atom taking the question and the chosen model configuration, or none for the backend's default. Its computation posts a `QuestionRequest` and scans the event stream into `QuestionState`s. Writing a new question starts a new answer and interrupts the one before it; writing `Atom.Interrupt` stops it.
- **While streaming**, the atom's value is `AsyncResult.Success` with the latest `QuestionState` and `waiting: true`. It starts with `initialState`, so the page clears at once.
- **When the stream ends**, `waiting` turns false and the value holds the final state, with `complete` set.
- **A `503`** fails the stream with `AgentUnavailable`, whose `message` the page shows.
- **An unreachable backend, or a stream that breaks before `Complete`,** fails with an `HttpClientError`, and the page shows the offline notice. A failed stream atom keeps its last state as `previousSuccess` (`effect/reactivity`), so a broken or stopped stream still shows the partial answer and lookups.
- **Components reach the atom through one hook**, as the style guide requires: `useAsk` ([`src/questions/useAsk.ts`](../../browser-app/src/questions/useAsk.ts)) returns the page's view of the result (`questionView` in `notices.ts`), `ask(question, model)` and `stop`.

Stop, asking a new question, and leaving the page all interrupt the stream, which closes the connection. The backend's loop runs inside the response stream, so closing it interrupts the model call and any tool calls in flight, frees the question's slot and records the question as `cancelled`. Tokens the model has already generated are still billed.

## What the page shows

From top to bottom:

1. **The question box** (`QuestionForm`): a multi-line field of 1 to 2,000 characters, matching `QuestionRequest`, with an Ask button. While an answer streams, the button becomes Stop (`stop`).
2. **Lookups** (see [Lookups](#lookups)).
3. **The answer**, rendered as Markdown as it arrives, with any table the model writes (a GitHub-style Markdown table) shown as an MUI `Table`, with citation markers as links (see [Citations](#citations)). The backend never sends text from a turn that called a tool, so the answer comes after the lookups. It usually arrives when its turn finishes; an answer written at a limit (`step_limit`, `context_limit`) streams as it is written (see [Narration](agent-loop.md#runagentloop)).
4. **Sources**, grouped by source (see [Citations](#citations)).
5. **Notices** (`Notices`), from the state and the result:

| Condition | Notice |
|---|---|
| `complete.outcome` is not `answered` | `complete.message`, as it is; the backend writes every message (see [Messages for the user](agent-loop.md#messages-for-the-user)) |
| A server in `complete.unavailableServers` | "The {server} server could not be reached, so this answer may be missing its data." |
| The result failed with `AgentUnavailable` | Its `message` |
| The result failed with `UnknownModel` | Its `message` |
| The result was interrupted by Stop (`Cause.hasInterruptsOnly`) | "Stopped.", below the partial answer and lookups |
| The result failed any other way | "The agent host could not be reached. It may be offline; try again shortly." |
| Always | "Questions you ask are logged." |

## Model choice

The backend offers more than one model configuration (`backend/config/agent.yaml`); a question may name one, and a question that names none goes to the default.

- **The list** comes from `GET /api/v1/models` once per page load (`modelsAtom`): each configuration's key, label and model ID, and the default.
- **The toggle** (`ModelChoice`) shows one button per configuration, labeled with its label and titled with its model ID, to the left of Ask. It is disabled while an answer streams.
- **The choice** is remembered in `localStorage` under `policyhuis.model`. A stored choice the backend no longer offers falls back to the default (`chosenModel`). When storage is blocked, the choice lasts until the page reloads.
- **Asking** sends the choice as `model`. Until the list arrives, or when it cannot be fetched, the question names no model and goes to the backend's default; the page says so in place of the toggle.
- **The answer** is labeled "Answered by {label} ({model ID})" from `Complete.model`, so the label names the model that actually answered.
- **A model the backend refuses** (`400 UnknownModel`, for example after `agent.yaml` changed while the page was open) shows the backend's message.

## Lookups

A lookup is one tool call: the agent consulting a server. A question can make several in each of up to `maxSteps` steps (model turns). While the agent works, each lookup is a row, so the user sees progress; when `Complete` arrives, the rows collapse under a "Made N lookups" toggle, so the answer leads.

| Status | Row | Expanded |
|---|---|---|
| `running` | Source label, title and a progress spinner | Tool name and arguments |
| `succeeded` | Source label, title and a done mark | Tool name, arguments, and `result` (the tool's `structuredContent`) as formatted JSON |
| `failed` | Source label, title and a failed mark | Tool name, arguments, and the error type (for example `UnknownValue`) |
| `unavailable` | Source label, title and an unavailable mark | Tool name, arguments, and the error type (`TransportError`, `ClosedError` or `DatabaseUnavailable`) |
| `unfinished` | Source label, title and "did not finish" | Tool name and arguments |

- **Labels** come from the backend: `LookupStarted.source` carries the label of the server the backend routed the call to, from `backend/config/servers.yaml`, and `LookupStarted.title` the tool's title as its server publishes it. `sf_data_development_pipeline_summary` on `sf-data` shows as "SF Data · Planning pipeline totals", and `sf_docs_search_policy` on `sf-docs` as "SF Documents · Search the documents". A call no server offered has no source label, and its title is the name the model called. The browser never parses a tool name.
- **Order** is the order of `LookupStarted` events. Lookups from the same turn run at once, and each `LookupEnded` updates its own row by `lookupId`.
- **Results are for display only.** `result` is decoded as `Schema.Unknown` and shown as formatted JSON in a scrolling block with a fixed maximum height; the browser never reads citations from it. A list result holds at most what the server returns (`sf-data` returns up to 50 projects).

## Citations

- **Source of citations:** `Sources` events only. The backend reads each lookup's citations from its result, drops any that break the citation convention, and sends each `citationId` once per question; `reduce` keeps them by `citationId`.
- **Markers:** the model writes each `citationId` in square brackets. Before the text goes to `react-markdown`, `linkCitations` replaces each marker with a Markdown link to `#cite-<n>`, numbered by source in order of first use, and the link component renders it as a small numbered chip that scrolls to the source. A marker whose ID matches no citation becomes a muted "?" chip, titled with the unmatched ID. Markers in a row (separated only by spaces) that lead to the same chip become one chip, so two queries of one source cited together show a single number. Replacing markers before Markdown parsing also keeps a marker followed by `(` from being read as a link.
- **While streaming,** a marker cut off mid-ID stays as plain text until the rest arrives.
- **Sources list:** citations grouped by `sourceId` (one dataset or document version), numbered to match the chips, each showing the title, publisher, version and a link to `sourceUrl`, and underneath each citation's `locator` (the provision, or the data selected, in words) and its `quote`, when it has one.
- **Versions:** each source shows the version cited and notes that the live link may show newer data, since users can open only the publisher's live link, not our archived copy.

The marker matching, source numbering and linking are in [`src/questions/citations.ts`](../../browser-app/src/questions/citations.ts).

## Running locally

`browser-app/.env` (gitignored, with a `.env.example`) holds `BACKEND_URL`, for example `http://localhost:8080`. The Vite dev server ([`vite.config.ts`](../../browser-app/vite.config.ts)) proxies `/api` to it, so the browser calls the backend on the app's own origin and no CORS setup is needed while developing; it refuses to start without `BACKEND_URL`, and `vite build` does not read it. The proxy passes server-sent events through as they arrive. `yarn dev` at the repo root starts the browser app with the backend, and with each city's servers named by `--include`. Serving the built app from another origin needs CORS on the backend, decided with hosting.

## Testing

Pure modules carry the logic, so most tests need no browser:

- **Notices:** which notice each result shows, including Stop (an interruption) as "Stopped." rather than the offline notice.
- **`reduce`:** recorded event sequences: lookups that succeed, fail, find their server unavailable and never finish; lookups finishing out of order; text arriving after every lookup, in one chunk and in several; citations collected from `Sources` and never from a result; every `Complete` outcome; unavailable servers.
- **`linkCitations` and `sourceNumbers`:** markers for known and unknown IDs; several markers for one source; a marker followed by `(`; a marker cut off mid-stream.
- **Decoding:** the recorded event sequences are decoded with `AgentStreamEvent`, so a backend change that breaks the contract fails these tests.

`Answer` and `Sources` are tested by rendering them with `react-dom/server`: a Markdown table becomes a table with citation chips in its cells, and each cited source lists its locators and quotes. Other component tests (for example, that rows collapse when `Complete` arrives) are added if the components grow logic of their own.
