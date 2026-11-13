# Spike S4: Embedding Model and Search

Question from the [MVP Technical Plan](../mvp-technical-plan.md#spikes): which embedding model, and does each search (keyword, vector) add value? This record covers the San Francisco half: English questions over the Rent Ordinance. The Dutch half (embedding the Dutch original or its English translation) runs once spike S3 picks a translation model and a Dutch sample is loaded.

## Method

- **Corpus:** the 727 passages of the Rent Board's copy of Chapter 37, amended through June 29, 2026.
- **Questions:** [`s4-questions.yaml`](s4-questions.yaml), 50 questions, 45 of them answerable. Each lists the provisions that bear on it, graded 2 (answers it) or 1 (bears on the answer), with a quote from each checked against the passage's text. Each question's `wording` is `everyday`, `legal` or `term`; five needs are asked in both everyday and legal wording, linked by `pair`. These questions are also `sf-rent-01` to `sf-rent-50` in the [evaluation](../evaluation.md#the-question-set).
- **Searches and measures:** keyword search (all words, and any word), vector search by cosine similarity, and their reciprocal rank fusion (`k = 60`), each scored over the answerable questions with 95% bootstrap intervals on hit@5, hit@10, near hit@10 (a grade-2 provision, its parent or one of its children in the top 10, so the answer is one `get_provision` step away), nDCG@10 and mean reciprocal rank, and each hybrid compared with its parts question by question.
- **Harness:** removed from the repository once the decision was made; it is at commit `eecb55a` in `san-francisco/legal-text/spikes/s4/`.

## Results

Vector search, with the best form of what is embedded tested for each model (`subtree`: each provision's text with its section heading and nearest ancestor's lead-in, plus, for each provision with children, an entry with its descendants' text). Runs 1 to 7, November 9, 2026; the full runs are in the git history of this file.

| Vector search | hit@5 | hit@10 | near hit@10 | nDCG@10 | MRR |
|---|---|---|---|---|---|
| `qwen3-embedding:0.6b`, `subtree` | 0.49 | 0.64 | 0.76 | 0.39 | 0.42 |
| `qwen3-embedding:4b`, `subtree` | 0.56 | 0.71 | 0.89 | 0.41 | 0.44 |
| `voyage-law-2`, `context` | 0.71 | 0.82 | 0.91 | 0.53 | 0.53 |
| `voyage-4-large`, `subtree` | 0.82 | 0.93 | 0.96 | 0.65 | 0.69 |

- **Keyword search added nothing** with any model or form: hybrid search differed from vector search on at most a few questions' hit@10, never significantly, and requiring every word of a question found almost nothing.
- **A provision often carries its meaning in its children** (37.9(a)(8)'s own text says only "in good faith"; its sub-items say who may move in), which the `subtree` form addresses.
- **Wording matters:** the Qwen models find the exact provision for fewer everyday-worded questions than Voyage.

## Decision

Recorded November 9, 2026, by the San Francisco owner:

- **Threshold:** near hit@10 ≥ 0.85 for vector search.
- **Model:** `qwen3-embedding:4b`, at near hit@10 0.89 [0.78, 0.98] with the `subtree` form. Voyage's `voyage-4-large` scored higher (0.96) but would send every search query to an outside service.
- **What is embedded:** the `subtree` form, with descendants' text up to 10,000 characters, or an outline of the children above that.
- **Search is vector only.** The `tsv` column and its index stay in the schema, so keyword search can be added back if open question 1 shows it helps exact-term queries.
- **Served through OpenRouter, amended November 12, 2026.** To deploy without a self-hosted model, the same model, `qwen/qwen3-embedding-4b`, is served through OpenRouter from one pinned host (DeepInfra), which does not publish its quantization. On one test query its vector had cosine similarity 0.985 with the Ollama build's, so the corpus was re-embedded through OpenRouter rather than mixed. The scores above were measured on the Ollama build and have not been rerun on the hosted one. This gives up the reason Voyage was set aside: every search query now goes to an outside service.
- **When the embedding model is unavailable,** a search fails with a data error and the answer says the law could not be searched.

Caveats: 45 answerable questions give intervals of about ±0.1, and differences between forms are mostly inside them.

## Open questions

1. **Keyword search for exact terms:** with 4 term questions against 29 in everyday wording, the set cannot show where keyword search helps. About 10 more term questions (section and ordinance numbers, case names, defined terms) would settle whether `search_policy` should add it back for such queries.
2. **Everyday wording:** whether the agent rewriting a question into the ordinance's vocabulary before searching closes the gap with Voyage is untested.
3. **Label review:** q35–q50 have not been reviewed by the San Francisco owner.
4. **The hosted model's scores:** rerunning the set on `qwen/qwen3-embedding-4b` through OpenRouter, which needs the harness restored from `eecb55a`. Now that search depends on an outside service anyway, `voyage-4-large` could be reconsidered on its scores.
