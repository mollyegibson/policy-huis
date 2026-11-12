# PolicyHuis: Browser App Plan

Draft, November 5, 2026.

The browser app sends a question to the backend and shows the answer as it streams in: the agent's lookups while it works, the answer text, and the sources behind each claim. Like the agent loop, it is the same for every city; it knows a city only through the lookups and citations the backend streams to it.

This plan covers the Phase 1 prototype, enough to show the agent working, built to be iterated on. It builds on the [Agent Loop Plan](agent-loop.md), whose [API contract](agent-loop.md#api-contract) defines everything the app receives. The full web app design (pages, Dutch originals beside machine translations, hosting, the energy dashboard) remains the MVP plan's [follow-up](mvp-technical-plan.md#follow-up).

The app is built as described here; the code below is excerpted from it or simplified, and `browser-app/README.md` lists its files.

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

Exact package versions are pinned when the workspace is created.

## How it follows the reference app

The design follows the reference project's browser app (`browser-sdk-internal`) where its patterns fit, and departs from it where this app is simpler:

| Reference app | This app | Why |
|---|---|---|
| A state atom updated by pure, exported reducers (`onMessageReducer`), unit-tested on their own | The same: one pure `reduce(state, event)` per event, unit-tested | The core of both designs |
| Tool-call lifecycle kept apart from message text, updated by `callId` (`upsertToolCall`) | The same, by `lookupId` | Lookup events must never leak into the answer |
| Chunks carry the accumulated text, so the newer chunk replaces the text | `TextChunk` carries a delta, so the reducer appends it | Our protocol streams deltas |
| An `Atom.fn` writes to a separate state atom through the registry, guarded by a `streamGeneration` counter so a stale stream cannot write | The atom function returns a stream of states (`Stream.scan(() => initialState, reduce)`), so its value is the latest state; asking again interrupts the previous run | One question at a time and no threads, so there is no stale stream to guard against. In Effect 4, writing a new argument to an `Atom.fn` interrupts the computation it replaces, and `Atom.Interrupt` cancels it |
| `@effect-atom/atom-react` on Effect 3 | `effect/reactivity` and `@effect/atom-react` on Effect 4 | The atoms moved into Effect 4 |
| `ToolsUsed`: a "Used N tools" toggle once the message is committed | A live list of lookups while the agent works, collapsing to "Made N lookups" when the answer is complete | Shows progress during the 10 to 60 seconds an answer can take |
| `humanizeToolName` strips the provider prefix | Tags the lookup with its server's label and shows the tool's title, both of which the backend sends in `LookupStarted` (`SF Data · Planning pipeline totals`) | A tool from the wrong city's server stands out, and the browser never parses tool names |
| A private Markdown component | `react-markdown`, with citation markers turned into links before parsing | The private component is not available |
| Client-side tools, approvals, interrupts, threads, artifacts, generated UI, auth, analytics | None | Not part of this app |

## Files

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

## Page state

Everything the page shows comes from one value, folded from the event stream:

```ts
// src/questions/QuestionState.ts
import type { Citation } from "@policyhuis/protocol/Citation"
import type { AgentStreamEvent, Complete, LookupOutcome, LookupSource } from "@policyhuis/protocol/QuestionsApi"

export type LookupStatus = "running" | LookupOutcome | "unfinished"

export interface LookupView {
  readonly lookupId: string
  /** The server the lookup went to, as the backend named it; null when no server offered the tool. */
  readonly source: LookupSource | null
  /** The name the model called, with its server's prefix. */
  readonly tool: string
  readonly title: string
  readonly arguments: unknown
  readonly status: LookupStatus
  /** The tool's `structuredContent`, shown as it is; null until it succeeds. Citations are never read from it. */
  readonly result: unknown
  /** The failure's type only, such as `UnknownValue`; null unless it failed or its server was unavailable. */
  readonly error: string | null
}

/** Everything the page shows about one question, folded from its event stream. */
export interface QuestionState {
  readonly answer: string
  readonly lookups: ReadonlyArray<LookupView>
  /** Every citation received so far in `Sources`, by `citationId`. */
  readonly citations: ReadonlyMap<string, Citation>
  /** Set by `Complete`, the last event of every stream that is not interrupted. */
  readonly complete: Complete | null
}

export const initialState: QuestionState = { answer: "", lookups: [], citations: new Map(), complete: null }

const updateLookup = (
  lookups: ReadonlyArray<LookupView>,
  lookupId: string,
  update: (lookup: LookupView) => LookupView
): ReadonlyArray<LookupView> => lookups.map((lookup) => (lookup.lookupId === lookupId ? update(lookup) : lookup))

export const reduce = (state: QuestionState, event: AgentStreamEvent): QuestionState => {
  switch (event._tag) {
    case "TextChunk":
      return { ...state, answer: state.answer + event.text }
    case "LookupStarted":
      return {
        ...state,
        lookups: [
          ...state.lookups,
          {
            lookupId: event.lookupId,
            source: event.source,
            tool: event.tool,
            title: event.title,
            arguments: event.arguments,
            status: "running",
            result: null,
            error: null
          }
        ]
      }
    case "LookupEnded":
      return {
        ...state,
        lookups: updateLookup(state.lookups, event.lookupId, (lookup) => ({
          ...lookup,
          status: event.outcome,
          result: event.result,
          error: event.error
        }))
      }
    case "Sources":
      return {
        ...state,
        citations: new Map([...state.citations, ...event.citations.map((c): [string, Citation] => [c.citationId, c])])
      }
    case "Keepalive":
      return state
    case "Complete":
      return {
        ...state,
        complete: event,
        lookups: state.lookups.map((lookup) =>
          lookup.status === "running" ? { ...lookup, status: "unfinished" } : lookup
        )
      }
  }
}
```

The `switch` is exhaustive over `AgentStreamEvent`, so a new event in `protocol/` fails the type check here until it is handled.

## Asking a question

The API client is a service, so the atom runtime provides it once:

```ts
// src/api/ApiClient.ts
import { Context, Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/http"
import { HttpApiClient } from "effect/http-api"

import { PolicyHuisApi } from "@policyhuis/protocol/QuestionsApi"

/** The typed client for the backend's API, on the app's own origin, where the dev server proxies `/api`. */
const makeClient = HttpApiClient.make(PolicyHuisApi, { baseUrl: window.location.origin })

export class ApiClient extends Context.Service<ApiClient, Effect.Success<typeof makeClient>>()(
  "browser-app/ApiClient"
) {
  static readonly layer = Layer.effect(this, makeClient).pipe(Layer.provide(FetchHttpClient.layer))
}
```

The ask atom is a function atom whose computation is a stream of states:

```ts
// src/questions/askAtom.ts
import { Effect, Stream } from "effect"
import { Atom } from "effect/reactivity"

import { QuestionRequest } from "@policyhuis/protocol/QuestionsApi"

import { ApiClient } from "../api/ApiClient.ts"
import { initialState, reduce } from "./QuestionState.ts"

const runtime = Atom.runtime(ApiClient.layer)

/**
 * The current question's state, as a stream of states folded from the backend's events. Writing a question starts a
 * new answer and interrupts the one before it; writing `Atom.Interrupt` stops it.
 */
export const askAtom = runtime.fn((question: string) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const client = yield* ApiClient
      return yield* client.questions.ask({ payload: QuestionRequest.make({ question }) })
    })
  ).pipe(Stream.scan(() => initialState, reduce))
)
```

- **While streaming**, the atom's value is `AsyncResult.Success` with the latest `QuestionState` and `waiting: true`. It starts with `initialState`, so the page clears at once.
- **When the stream ends**, `waiting` turns false and the value holds the final state, with `complete` set.
- **A `503`** fails the stream with `AgentUnavailable`, whose `message` the page shows.
- **An unreachable backend, or a stream that breaks before `Complete`,** fails with an `HttpClientError`, and the page shows the offline notice. A failed stream atom keeps its last state as `previousSuccess` (`effect/reactivity`, 4.1.2), so a broken or stopped stream still shows the partial answer and lookups.

Components reach the atom through one hook, as the style guide requires:

```ts
// src/questions/useAsk.ts
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { useCallback, useMemo } from "react"
import { Atom } from "effect/reactivity"

import { askAtom } from "./askAtom.ts"
import { questionView } from "./notices.ts"

/** The current question for components: what to show, and how to ask or stop. */
export const useAsk = () => {
  const result = useAtomValue(askAtom)
  const write = useAtomSet(askAtom)
  const view = useMemo(() => questionView(result), [result])
  const ask = useCallback(
    (question: string) => {
      write(question)
    },
    [write]
  )
  const stop = useCallback(() => {
    write(Atom.Interrupt)
  }, [write])
  return { ...view, ask, stop }
}
```

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

```ts
// src/questions/citations.ts (excerpt)
import type { Citation } from "@policyhuis/protocol/Citation"

/** A citation marker: a `citationId`, which is `<sourceId>#<part>`, in square brackets. */
const MARKER_SOURCE = String.raw`\[([^[\]\s]+@[^[\]\s]+#[^[\]\s]+)\]`
const MARKER = new RegExp(MARKER_SOURCE, "g")

/** Markers in a row, separated only by spaces or tabs, never by a line break or other text. */
const MARKER_RUN = new RegExp(`${MARKER_SOURCE}(?:[ \t]*${MARKER_SOURCE})*`, "g")

/** The link target of a marker whose ID matches no citation received. */
export const MISSING_CITATION = "#cite-missing"

/** The link target of the chip for source number `n`. */
export const citationHref = (n: number) => `#cite-${String(n)}`

/** Source numbers in order of first use in the answer, by `sourceId`. */
export const sourceNumbers = (
  answer: string,
  citations: ReadonlyMap<string, Citation>
): ReadonlyMap<string, number> => {
  const numbers = new Map<string, number>()
  for (const [, citationId] of answer.matchAll(MARKER)) {
    const citation = citationId === undefined ? undefined : citations.get(citationId)
    if (citation !== undefined && !numbers.has(citation.sourceId)) numbers.set(citation.sourceId, numbers.size + 1)
  }
  return numbers
}

/**
 * Replaces markers with Markdown links that the answer's link component renders as citation chips: to the source's
 * number, or to `MISSING_CITATION`, titled with the unmatched ID, when no citation has that ID. Markers in a row that
 * lead to the same chip (two queries of one source, or one ID repeated) become one chip; markers apart keep their own.
 */
export const linkCitations = (
  answer: string,
  citations: ReadonlyMap<string, Citation>,
  numbers: ReadonlyMap<string, number>
): string =>
  answer.replace(MARKER_RUN, (run) => {
    const links = [...run.matchAll(MARKER)].map(([, citationId = ""]) => {
      const citation = citations.get(citationId)
      const n = citation === undefined ? undefined : numbers.get(citation.sourceId)
      return n === undefined ? `[?](${MISSING_CITATION} "${citationId}")` : `[${String(n)}](${citationHref(n)})`
    })
    return [...new Set(links)].join(" ")
  })
```

## Running locally

`browser-app/.env` (gitignored, with a `.env.example`) holds `BACKEND_URL`, for example `http://localhost:8080`. The Vite dev server proxies `/api` to it, so the browser calls the backend on the app's own origin and no CORS setup is needed while developing:

```ts
// browser-app/vite.config.ts
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "")
  return {
    plugins: [react()],
    server: { proxy: { "/api": { target: env.BACKEND_URL, changeOrigin: true } } }
  }
})
```

The proxy passes server-sent events through as they arrive, checked on November 5, 2026 against a test server sending one every 0.7 seconds. `BACKEND_URL` is required only by the dev server; `vite build` does not need it. `yarn dev` at the repo root starts the browser app with the backend, and with each city's servers named by `--include`. Serving the built app from another origin needs CORS on the backend, decided with hosting.

## Testing

Pure modules carry the logic, so most tests need no browser:

- **Notices:** which notice each result shows, including Stop (an interruption) as "Stopped." rather than the offline notice.
- **`reduce`:** recorded event sequences: lookups that succeed, fail, find their server unavailable and never finish; lookups finishing out of order; text arriving after every lookup, in one chunk and in several; citations collected from `Sources` and never from a result; every `Complete` outcome; unavailable servers.
- **`linkCitations` and `sourceNumbers`:** markers for known and unknown IDs; several markers for one source; a marker followed by `(`; a marker cut off mid-stream.
- **Decoding:** the recorded event sequences are decoded with `AgentStreamEvent`, so a backend change that breaks the contract fails these tests.

`Answer` and `Sources` are tested by rendering them with `react-dom/server`: a Markdown table becomes a table with citation chips in its cells, and each cited source lists its locators and quotes. Other component tests (for example, that rows collapse when `Complete` arrives) are added if the components grow logic of their own.
