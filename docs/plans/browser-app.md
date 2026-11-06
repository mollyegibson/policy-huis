# PolicyHuis: Browser App Plan

Draft, November 5, 2026.

The browser app sends a question to the backend and shows the answer as it streams in: the agent's tool calls while it works, the answer text, and the sources behind each claim. Like the agent loop, it is the same for every city; it knows a city only through the tools and citations the backend streams to it.

This plan covers the Phase 1 prototype, enough to show the agent working, built to be iterated on. It builds on the [Agent Loop Plan](agent-loop.md), whose [API contract](agent-loop.md#api-contract) defines everything the app receives. The full web app design (pages, Dutch originals beside machine translations, hosting, the energy dashboard) remains the MVP plan's [follow-up](mvp-technical-plan.md#follow-up).

The app is built as described here; the code below is excerpted from it or simplified, and `browser-app/README.md` lists its files.

## Scope

A React app in `browser-app/`, following [Front-end Code Style](../front-end-code-style.md). It:

- talks only to the backend's `POST /api/v1/questions`, through `HttpApiClient` and `protocol/`'s `PolicyHuisApi`, decoding every event with `AgentStreamEvent`;
- holds one question and its answer in memory; nothing is stored in the browser, and asking again replaces the previous answer.

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
| Tool-call lifecycle kept apart from message text, updated by `callId` (`upsertToolCall`) | The same | Tool events must never leak into the answer |
| Chunks carry the accumulated text, so the newer chunk replaces the text | `TextChunk` carries a delta, so the reducer appends it | Our protocol streams deltas |
| An `Atom.fn` writes to a separate state atom through the registry, guarded by a `streamGeneration` counter so a stale stream cannot write | The atom function returns a stream of states (`Stream.scan(() => initialState, reduce)`), so its value is the latest state; asking again interrupts the previous run | One question at a time and no threads, so there is no stale stream to guard against. In Effect 4, writing a new argument to an `Atom.fn` interrupts the computation it replaces, and `Atom.Interrupt` cancels it |
| `@effect-atom/atom-react` on Effect 3 | `effect/reactivity` and `@effect/atom-react` on Effect 4 | The atoms moved into Effect 4 |
| `ToolsUsed`: a "Used N tools" toggle once the message is committed | A live list while the agent works, collapsing to "Used N tools" when the answer is complete | Shows progress during the 10 to 60 seconds an answer can take |
| `humanizeToolName` strips the provider prefix | Humanizes the name but keeps the server prefix as a tag (`SF · Development pipeline summary`) | A tool from the wrong city's server stands out |
| A private Markdown component | `react-markdown`, with citation markers turned into links before parsing | The private component is not available |
| Client-side tools, approvals, interrupts, threads, artifacts, generated UI, auth, analytics | None | Not part of this app |

## Files

| File | Contents |
|---|---|
| `src/main.tsx` | Mounts `App` inside MUI's `ThemeProvider` and `CssBaseline`, and the atom `RegistryProvider` |
| `src/App.tsx` | The page layout |
| `src/api/ApiClient.ts` | The `ApiClient` service and its layer: the typed client for `PolicyHuisApi` |
| `src/questions/QuestionState.ts` | `QuestionState`, `initialState` and the pure `reduce` |
| `src/questions/askAtom.ts` | The atom runtime and `askAtom` |
| `src/questions/useAsk.ts` | The hook components use: the page's view of the result, `ask` and `stop` |
| `src/questions/notices.ts` | `questionView`: the latest state, whether it is streaming, and the notices, from the atom's result |
| `src/questions/useQuestionDraft.ts`, `src/hooks/useDisclosure.ts` | The draft question, and open or closed sections, as the style guide puts all state in hooks |
| `src/questions/citations.ts` | Linking markers, numbering sources and grouping the sources cited in the answer; `reduce` decodes the citations |
| `src/questions/toolLabels.ts` | `toolLabel`: the server tag and humanized name |
| `src/components/QuestionForm.tsx` | The question box and Ask button |
| `src/components/ToolCalls.tsx`, `ToolCallRow.tsx` | The tool call list and each expandable row |
| `src/components/Answer.tsx` | The answer as Markdown with linked citation markers |
| `src/components/Sources.tsx` | The sources list |
| `src/components/Notices.tsx` | Incomplete answers, unreachable servers, busy and offline states, and the logging note |
| `*.unit.test.ts` | Beside each module they test, with `src/questions/fixtures.ts` building events as the browser receives them; `vitest.config.ts` runs them without the dev server |

## Page state

Everything the page shows comes from one value, folded from the event stream:

```ts
// src/questions/QuestionState.ts
import { Option, Schema } from "effect"

import { Citation } from "@policyhuis/protocol/Citation"
import type { AgentStreamEvent, Complete } from "@policyhuis/protocol/QuestionsApi"

export type ToolCallStatus = "running" | "done" | "failed" | "unfinished"

export interface ToolCallView {
  readonly callId: string
  readonly tool: string
  readonly arguments: unknown
  readonly status: ToolCallStatus
  /** The tool's `structuredContent`; null until it succeeds. */
  readonly result: unknown
  /** The failure's type only, such as `UnknownValue`; null unless it failed. */
  readonly error: string | null
}

export interface QuestionState {
  readonly answer: string
  readonly toolCalls: ReadonlyArray<ToolCallView>
  /** Every citation received so far, by `citationId`. */
  readonly citations: ReadonlyMap<string, Citation>
  /** Set by `Complete`, the last event of every stream that is not interrupted. */
  readonly complete: Complete | null
}

export const initialState: QuestionState = { answer: "", toolCalls: [], citations: new Map(), complete: null }

const ResultCitations = Schema.Struct({ citations: Schema.Array(Citation) })

/** A successful result's citations; none when its `citations` field is missing or fails to decode. */
const citationsOf = (result: unknown): ReadonlyArray<Citation> =>
  Option.match(Schema.decodeUnknownOption(ResultCitations)(result), {
    onNone: () => [],
    onSome: ({ citations }) => citations
  })

const updateCall = (calls: ReadonlyArray<ToolCallView>, callId: string, update: (call: ToolCallView) => ToolCallView) =>
  calls.map((call) => (call.callId === callId ? update(call) : call))

export const reduce = (state: QuestionState, event: AgentStreamEvent): QuestionState => {
  switch (event._tag) {
    case "TextChunk":
      return { ...state, answer: state.answer + event.text }
    case "ToolStart":
      return {
        ...state,
        toolCalls: [
          ...state.toolCalls,
          { callId: event.callId, tool: event.tool, arguments: event.arguments, status: "running", result: null, error: null }
        ]
      }
    case "ToolEnd": {
      const citations = new Map(state.citations)
      for (const citation of event.outcome === "success" ? citationsOf(event.result) : []) {
        citations.set(citation.citationId, citation)
      }
      return {
        ...state,
        citations,
        toolCalls: updateCall(state.toolCalls, event.callId, (call) => ({
          ...call,
          status: event.outcome === "success" ? "done" : "failed",
          result: event.result,
          error: event.error
        }))
      }
    }
    case "Keepalive":
      return state
    case "Complete":
      return {
        ...state,
        complete: event,
        toolCalls: state.toolCalls.map((call) => (call.status === "running" ? { ...call, status: "unfinished" } : call))
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
- **An unreachable backend, or a stream that breaks before `Complete`,** fails with an `HttpClientError`, and the page shows the offline notice. A failed stream atom keeps its last state as `previousSuccess` (`effect/reactivity`, 4.1.2), so a broken or stopped stream still shows the partial answer and tool calls.

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
2. **Tool calls** (see [Tool calls](#tool-calls)).
3. **The answer**, rendered as Markdown as it arrives, with any table the model writes (a GitHub-style Markdown table) shown as an MUI `Table`, with citation markers as links (see [Citations](#citations)). The backend never sends text from a turn that called a tool, so the answer comes after the tool calls. It usually arrives when its turn finishes; an answer written at a limit (`step_limit`, `context_limit`) streams as it is written (see [Narration](agent-loop.md#runagentloop)).
4. **Sources**, grouped by source.
5. **Notices** (`Notices`), from the state and the result:

| Condition | Notice |
|---|---|
| `complete.outcome` is not `answered` | `complete.message`, as it is; the backend writes every message (see [Messages for the user](agent-loop.md#messages-for-the-user)) |
| A server in `complete.unavailableServers` | "The {server} data server could not be reached, so this answer may be missing its data." |
| The result failed with `AgentUnavailable` | Its `message` |
| The result was interrupted by Stop (`Cause.hasInterruptsOnly`) | "Stopped.", below the partial answer and tool calls |
| The result failed any other way | "The agent host could not be reached. It may be offline; try again shortly." |
| Always | "Questions you ask are logged." |

## Tool calls

A question can make several tool calls in each of up to `maxSteps` steps. While the agent works, each call is a row, so the user sees progress; when `Complete` arrives, the rows collapse under a "Used N tools" toggle, so the answer leads.

| Status | Row | Expanded |
|---|---|---|
| `running` | Label and a progress spinner | Tool name and arguments |
| `done` | Label and a done mark | Tool name, arguments, and `result` (the tool's `structuredContent`) as formatted JSON |
| `failed` | Label and a failed mark | Tool name, arguments, and the error type (for example `UnknownValue`) |
| `unfinished` | Label and "did not finish" | Tool name and arguments |

- **Labels** keep the server prefix as a tag, so a call to the wrong city's server is visible: `sf_development_pipeline_summary` shows as "SF · Development pipeline summary". The full tool name appears when the row is expanded.
- **Order** is the order of `ToolStart` events. Calls from the same turn run at once, and each `ToolEnd` updates its own row by `callId`.
- **Size:** results are formatted JSON in a scrolling block with a fixed maximum height, like the reference app's argument view; a list result holds at most what the server returns (`sf-housing` returns up to 50 projects).

```ts
// src/questions/toolLabels.ts
/** "sf_development_pipeline_summary" → { tag: "SF", name: "Development pipeline summary" }. */
export const toolLabel = (tool: string): { readonly tag: string | null; readonly name: string } => {
  const match = /^([a-z][a-z0-9]*)_(.+)$/.exec(tool)
  const [tag, rest] = match === null ? [null, tool] : [match[1].toUpperCase(), match[2]]
  const words = rest.replace(/_/g, " ")
  return { tag, name: words.charAt(0).toUpperCase() + words.slice(1) }
}
```

The prefix rule matches the server directory's, so every prefix the backend can send splits the same way.

## Citations

- **Source of citations:** each successful `ToolEnd`'s `result.citations`, decoded with `protocol/`'s `Citation` schema in `reduce`. A result whose citations fail to decode contributes none.
- **Markers:** the model writes each `citationId` in square brackets. Before the text goes to `react-markdown`, `linkCitations` replaces each marker with a Markdown link to `#cite-<n>`, numbered by source in order of first use, and the link component renders it as a small numbered chip that scrolls to the source. A marker whose ID matches no citation becomes a muted "?" chip, titled with the unmatched ID. Markers in a row (separated only by spaces) that lead to the same chip become one chip, so two queries of one source cited together show a single number. Replacing markers before Markdown parsing also keeps a marker followed by `(` from being read as a link.
- **While streaming,** a marker cut off mid-ID stays as plain text until the rest arrives.
- **Sources list:** citations grouped by `sourceId` (one dataset or document version), numbered to match the chips, each showing the title, publisher and a link to `sourceUrl`, and underneath each query (dataset citations: the tool and its parameters) or provision (document citations) cited.
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

The proxy passes server-sent events through as they arrive, checked on November 5, 2026 against a test server sending one every 0.7 seconds. `BACKEND_URL` is required only by the dev server; `vite build` does not need it. `yarn dev` at the repo root gains the browser app, so the data server, the backend and the app start together. Serving the built app from another origin needs CORS on the backend, decided with hosting.

## Testing

Pure modules carry the logic, so most tests need no browser:

- **Notices:** which notice each result shows, including Stop (an interruption) as "Stopped." rather than the offline notice.
- **`reduce`:** recorded event sequences: tool calls that succeed, fail and never finish; calls finishing out of order; text arriving after every tool call, in one chunk and in several; every `Complete` outcome; unavailable servers; a result whose citations fail to decode.
- **`linkCitations` and `sourceNumbers`:** markers for known and unknown IDs; several markers for one source; a marker followed by `(`; a marker cut off mid-stream.
- **`toolLabel`:** prefixed and unprefixed names.
- **Decoding:** the recorded event sequences are decoded with `AgentStreamEvent`, so a backend change that breaks the contract fails these tests.

`Answer` is tested by rendering it with `react-dom/server`: a Markdown table becomes a table with citation chips in its cells. Other component tests (for example, that rows collapse when `Complete` arrives) are added if the components grow logic of their own.
