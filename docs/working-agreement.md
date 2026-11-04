# Working Agreement

- **Status:** living document; amend by PR when the team agrees a rule has changed
- **Companion:** [Domain-Driven Design and Hexagonal Architecture](./domain-driven-design.md), the reasoning behind these rules

The short, citable form of what we hold each other to in review.

## Architecture

1. **Adapters translate; they don't decide.** An `HttpApi` handler, MCP tool registration or pipeline command that contains a business rule is a bug.
2. **Every upstream response is decoded through a parser or schema we own.** That includes source files, model tool-call arguments and MCP tool results. Raw JSON never crosses into domain code.
3. **Persistence, network and model access stay in adapters.** The agent loop and tool handlers depend on services, not on clients or SDKs.
4. **Dependencies form a DAG rooted in the domain.** No cycles, no domain → adapter imports.
5. **Contexts share published contracts, never code.** Pipelines publish the city data and passage schemas, servers publish MCP tools, the agent publishes the backend API. The shared contract package holds only schemas.
6. **No server reads another server's schema**, and the agent reads no server schema at all; it calls tools.
7. **Numbers come from data, not from the model.** Every number in an answer comes from a tool result backed by a tested query.
8. **Every claim carries a citation object from a tool result.** The agent never writes a citation from the model's text.
9. **Tool errors are returned as tool results**, typed by the shared contract, never thrown as transport failures.
10. **One model layer.** The agent loop depends only on `LanguageModel`; the configuration chooses which layer provides it. No conditional imports per model.
11. **Skip the layer when it earns nothing.** No substitution needed and no adapter calling it? Write a function.
12. **A new term in the code is a new row in the [Ubiquitous Language](./ubiquitous-language.md)**, in the same PR.

## Data

13. **`raw_*` is never edited by hand.** Every change is a load recorded in the manifest, with its filters recorded and its source file in the archive.
14. **No hand-entered data.** Every value in the database comes from a source through a loader, or from checked-in code (a dbt model or macro, or a Python generator). Seeds are generated, never edited; declared choices live in `config/`. See CLAUDE.md, Data Provenance.
15. **Original text is kept; translations are labeled.** Every translated passage stores the original, the translation and the translation model's identifier. Citations quote the original.
16. **Embeddings record their model.** Every embedding row stores its model identifier, and a server refuses to start if its configured model differs.
17. **Migrations are append-only once applied.** A change to an applied migration goes in a new migration, with a sequential id. The database owner applies them.

## Configuration and secrets

18. **Secrets live only in `.env` (gitignored) or a platform secret store.** Never in `config/`, code, docs, manifest params, traces or logs. Type them as secrets (`SecretStr` in Python, `Redacted` in Effect).
19. **Required configuration fails loudly when unset.** No plausible defaults for values that differ between environments or people, such as a model endpoint or a database URL.

## Quality

20. **Never disable type checking or linting**: no `# noqa`, `# type: ignore`, `// @ts-ignore`, `// eslint-disable`, `as any` or `as unknown as T`. Fix the code instead.
21. **Tests and lint pass before a PR is opened.**
22. **Integration tests run against a throwaway database**, never a shared one.
