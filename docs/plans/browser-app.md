# PolicyHuis: Browser App Plan

Draft, November 5, 2026.

The browser app sends a question to the backend and shows the answer as it streams in: the agent's tool calls while it works, the answer text, and the sources behind each claim. Like the agent loop, it is the same for every city; it knows a city only through the tools and citations the backend streams to it.

This plan covers the Phase 1 prototype, enough to show the agent working. It builds on the [Agent Loop Plan](agent-loop.md), whose [API contract](agent-loop.md#api-contract) defines everything the app receives. The full web app design (pages, Dutch originals beside machine translations, hosting, the energy dashboard) remains the MVP plan's [follow-up](mvp-technical-plan.md#follow-up).

## Scope

A minimal React app in `browser-app/`, following [Front-end Code Style](../front-end-code-style.md). It:

- talks only to the backend's `POST /api/v1/questions`, through `HttpApiClient` and `protocol/`'s `QuestionsApi`, decoding every event with `AgentStreamEvent`;
- keeps one question and its answer in memory; nothing is stored in the browser.

Not in Phase 1: accounts, history, maps, and friendlier labels for tool names.

## What the page shows

- **One question box** and the answer streaming in below it, from `TextChunk` events.
- **The agent's tool calls**, one entry per call, collapsed by default (see [Tool calls](#tool-calls)).
- **Citations** linked from the markers in the answer (see [Citations](#citations)).
- **Incomplete answers:** the `message` from `Complete` when the outcome is `step_limit`, `context_limit`, `truncated` or `failed`, shown as it is; the backend writes every message (see [Messages for the user](agent-loop.md#messages-for-the-user)).
- **Unreachable data servers:** a note for each server in `Complete.unavailableServers`: "The {server} data server could not be reached, so this answer may be missing its data."
- **A busy backend:** the `message` from a `503 AgentUnavailable`.
- **An unreachable backend:** an "agent host offline" state when the request cannot be sent or the stream breaks before `Complete`.
- **A note that questions are logged**, since every trace stores the question as asked.

`Keepalive` events are ignored.

## Tool calls

The backend sends a `ToolStart` when the agent begins a tool call and a `ToolEnd` when it finishes, so the page can show the agent working while the answer is still to come. A question can make anywhere from no tool calls to several in each of up to `maxSteps` steps, so entries stay collapsed unless the user opens one.

| Event | Collapsed entry | Expanded entry |
|---|---|---|
| `ToolStart` | The tool name, as the backend sends it (for example `sf_development_pipeline_summary`), and a "running" status | The call's arguments |
| `ToolEnd`, `outcome: "success"` | The tool name and a "done" status | The arguments, and the full result (`ToolEnd.result`, the tool's `structuredContent`) as formatted JSON |
| `ToolEnd`, `outcome: "failure"` | The tool name and a "failed" status | The arguments and the error type (`ToolEnd.error`, for example `UnknownValue` or `TransportError`); the backend never sends the error's details |
| No `ToolEnd` by `Complete` | The tool name and a "did not finish" status | The arguments |

- **Order:** entries appear in the order their `ToolStart` events arrive. Calls the model makes in the same turn run at once, so their `ToolEnd` events may arrive in any order; each updates its own entry by `callId`.
- **Placement:** the entries sit above the answer, so the answer stays easy to read, and remain after the answer is complete.
- **Size:** a list result holds at most what the server returns (`sf-housing` returns up to 50 projects), so the expanded view needs scrolling but no paging.

## Citations

- **Source of citations:** each successful `ToolEnd`'s `result.citations`, decoded with `protocol/`'s `Citation` schema. A result whose citations fail to decode contributes none, and markers that point to them show as unlinked.
- **Markers:** the model marks each claim with a `citationId` in square brackets. The app parses markers out of the text before rendering it as Markdown, since a marker followed by `(` would otherwise read as a link, and links each marker to the citation with that `citationId` among the results received so far.
- **Sources list:** citations are grouped by `sourceId` (one dataset version or document version), showing the title, publisher and source link, with each query or provision used underneath. A marker that matches no citation is shown as unlinked.
- **Versions:** each source shows the version cited and notes that the live link may show newer data, since users can open only the publisher's live link (`sourceUrl`), not our archived copy.

## Testing

- **Event handling:** a reducer from `AgentStreamEvent`s to page state, tested with recorded event sequences: tool calls that succeed, fail and never finish; calls finishing out of order; every `Complete` outcome; unavailable servers.
- **Markers:** marker parsing and linking, including unlinked markers and markers next to Markdown links.
- **Decoding:** every event and citation shape decodes with `protocol/`'s schemas, so a backend change that breaks the contract fails the browser app's tests.
