# Front-end Code Style

Conventions for the React web app. The app's design (pages, components, how citations are displayed, hosting) is planned separately; see [MVP Technical Plan § Follow-up](./plans/mvp-technical-plan.md#follow-up). These rules apply from its first commit.

- Strict type safety (`any` can only be used in type constraints).
- Functional programming patterns take precedence over OOP.
- All state is extracted into standalone hook files, except tight-loop animation-like state, which can be inline in components.
- Always define and program against interfaces rather than implementations. Components talk to the backend API through a client typed by the shared contract package, never with ad hoc `fetch` calls and hand-written types.
- Validate everything the backend sends with Effect `Schema`, including each streamed event. See [Effect Style](./effect-style.md).
- No mock implementations in production code paths. A hook or service that falls back to fake data when a precondition isn't met (the agent host unreachable, missing config) must fail clearly instead: return a value whose methods reject with a real error message the caller can catch and surface, not one that pretends to work. If a mock is genuinely useful for local development, gate it behind an explicit dev-only flag, not a runtime condition ordinary users can hit. An unreachable agent host is a real, expected state: the agent runs on a team laptop that may be asleep.
- Never render an answer's claims without their citations, and always label machine-translated text as machine translation, beside the original.
- Show energy figures with their basis: measured (local) or estimated (cloud), with the estimate's uncertainty, and next to the accuracy they came with.
- Colocate a module's `*.unit.test.ts` in the same folder as the file it tests, not in a shared `hooks/`-style catch-all directory.
- Prefer `Schema.decodeUnknownSync(schema)(value)` over `Effect.runSync(Schema.decodeUnknownEffect(schema)(value))` when decoding outside an Effect generator. See [Effect Style § Prefer Schema.decodeUnknownSync outside an Effect context](./effect-style.md#prefer-schemadecodeunknownsync-outside-an-effect-context).
- **Handle failure and reset UI state in `finally`, not just on the success path.** A handler that only handles success leaves the UI stuck (a spinner that never stops, an input that never re-enables) when the stream fails partway, with no feedback the user can act on. Surface the error with a message the user can read; don't let it become an unhandled promise rejection:

  ```tsx
  const handleAsk = useCallback(async () => {
    setAsking(true);
    try {
      await answers.ask(question, { onEvent: appendEvent });
    } catch {
      setError('The answer could not be completed. The agent host may be offline; try again shortly.');
    } finally {
      setAsking(false);
    }
  }, [question, answers, appendEvent]);
  ```
