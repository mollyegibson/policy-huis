# Legal-text passage pipeline

A Python library every legal-text corpus installs: it splits a section of law into passages along its enumerated subsections, builds and embeds the search entries for them, and writes a document, its passages and its search entries into a corpus schema such as `policy_text_sf`. It knows no city; each corpus project supplies the rules for its own documents (which lines are page furniture, where sections start) and calls `split_section` for each section. The design is in the [San Francisco Plan](../../../docs/plans/sf-plan.md#policy_text_sf-phase-2).

| Module | Contents |
|---|---|
| `outline.py` | `split_section`: one passage per subsection, nested as (a), (1), (A), (i) and (I), each with its parent and the lead-in text of the provisions above it as `context` |
| `summary.py` | Each passage's one-line summary for outlines: a section's heading, or the first sentence of its text |
| `search_entries.py` | The text embedded for search: one entry per passage, and one per provision with children (its descendants' text, or an outline of its children above the size limit), as [spike S4](../../../docs/plans/spikes/s4-embeddings.md#decision) decided |
| `embed.py` | `OllamaEmbedder`: embeds with one pinned Ollama model build, never truncating, refusing unusable vectors |
| `store.py` | `write_document`: replaces a document, its passages and its search entries in one transaction, with passage IDs stable across rebuilds |

## Check

```sh
uv sync
uv run ruff check . && uv run ruff format --check . && uv run pytest
```
