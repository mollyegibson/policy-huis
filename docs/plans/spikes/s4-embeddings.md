# Spike S4: Embedding Model and Search

Started November 9, 2026. Question from the [MVP Technical Plan](../mvp-technical-plan.md#spikes): which embedding model, and does each search (keyword, vector) add value? This record covers the San Francisco half: English questions over the Rent Ordinance. The Dutch half (embedding the Dutch original or its English translation) runs once spike S3 picks a translation model and a Dutch sample is loaded.

## Method

- **Corpus:** the 727 passages of the Rent Board's copy of Chapter 37, amended through June 29, 2026, as loaded into what was then `sf-legal-text` (`policy_text_sf.passages`, now `sf-docs` and `sf_docs.passages`). Each passage is searched as its `context` (section heading and the lead-in of the provisions above it) followed by its `text`.
- **Questions:** [`s4-questions.yaml`](s4-questions.yaml), 50 questions, 45 of them answerable. Each lists the provisions that bear on it, graded 2 (answers it; a question can have several) or 1 (bears on the answer), with a quote from each that the harness checks against the passage's text before scoring. Questions the ordinance does not answer have no provisions and are left out of the scores. Each question's `wording` is `everyday`, `legal` or `term` (a section number, defined term or named law); five needs are asked in both everyday and legal wording, linked by `pair`. Questions were drafted from the passages; the first 34 were corrected by the San Francisco owner before any model was scored, and q35–q50 have not yet been reviewed. `--review <file>` writes every labelled provision's full text for review.
- **Searches**, each returning its top 100:
  - keyword, all words: `websearch_to_tsquery('english', question)`, as the plan specifies, ranked by `ts_rank`;
  - keyword, any word: the same terms joined with OR, to see whether requiring every word of a natural-language question finds too little;
  - vector: cosine similarity between the question's and each passage's embedding, from Ollama's `/api/embed`, with the model card's query instruction prepended to questions where it gives one;
  - hybrid: reciprocal rank fusion of a keyword search and the vector search, `k = 60`, as the plan specifies.
- **Measures**, over the answerable questions, each with a 95% bootstrap interval over questions:
  - hit@5 and hit@10: a grade-2 provision is in the top 5 or 10 (10 is the most `search_policy` returns);
  - near hit@5 and near hit@10: a grade-2 provision, its parent or one of its children is in the top 5 or 10, so the answer is one `get_provision` step away;
  - nDCG@10 over the grades (gain 2^grade − 1);
  - mean reciprocal rank of the first graded provision.

  Each hybrid search is compared with each of its parts, question by question: hit@10 by an exact McNemar test, and nDCG@10 by its mean difference with a bootstrap interval. Measures are also split by wording, and for the paired questions alone.
- **Embedding checks:** every vector is refused if it is all zeros or holds NaN, which Ollama has been reported to return with HTTP 200, and inputs are sent with `truncate: false`, so a passage longer than the model's limit fails instead of being cut silently.
- **Harness:** removed from the repository once the decision was made; it is at commit `eecb55a` in `san-francisco/legal-text/spikes/s4/`. `scoring.py` (hit@k, near hit@k, nDCG, MRR, bootstrap intervals, McNemar) and `cache.py` (an on-disk embedding cache) know no city and can be reused for the Amsterdam embedding spike; `search.py` reads San Francisco's schema, and `entries.py` is superseded by the passage pipeline's search entries.
- **Run (at that commit):** `uv run python spikes/s4/search.py --model <ollama tag>` in `san-francisco/legal-text`. It reads the database and writes nothing to it. `--provider voyage` embeds with Voyage AI through MongoDB Atlas's endpoint (passages as `document`, questions as `query`, truncation off), and `--voyage-limits 3 10000` paces requests to the limits of an account without a payment method. Vectors are cached in `spikes/s4/.cache/` (gitignored), keyed by provider, model and build, request options, input type and the exact text, so a rerun embeds only text it has not seen.

## Candidates

From published model cards, papers and Ollama's library, checked November 6, 2026. Constraints: served locally by Ollama beside a 13 GB chat model on a 24 GB machine; permissively licensed; multilingual including Dutch, for the Amsterdam half; at most 4,000 dimensions, pgvector's limit for an HNSW index on `halfvec` ([pgvector](https://github.com/pgvector/pgvector)).

| Model / Ollama tag | License | Size | Dimensions | Max tokens | Query instruction | MMTEB v2 retrieval | MTEB-NL retrieval | MLEB (legal, English) |
|---|---|---|---|---|---|---|---|---|
| Qwen3-Embedding-0.6B / `qwen3-embedding:0.6b` | Apache 2.0 | 639 MB (Q8_0) | 1,024 (truncatable) | 32K | Yes, queries only | 64.64 | 57.1 | 77.13 |
| Qwen3-Embedding-4B / `qwen3-embedding:4b` | Apache 2.0 | 2.5 GB (Q4_K_M) | 2,560 (truncatable) | 32K | Yes, queries only | 69.60 | 64.2 | 81.96 |
| EmbeddingGemma 2, text-only / `embeddinggemma-2:270m-q8_0-text` | Apache 2.0 | 304 MB | 768 (512, 256, 128) | 8,192 | Yes, queries and documents | not published | not published | not published |
| BGE-M3 / `bge-m3:567m` | MIT | 1.2 GB | 1,024 | 8,192 | None | 54.60 | 60.0 | 69.44 |
| Snowflake Arctic Embed L v2.0 / `snowflake-arctic-embed2:568m` | Apache 2.0 | 1.2 GB | 1,024 (256) | 8,192 | Yes, queries only | not published | 59.0 | 74.08 |
| multilingual-e5-large-instruct / community uploads only | MIT | about 560M parameters | 1,024 | 512 | Yes, queries only | 57.12 | 61.4 | 68.11 |

Sources: [Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B) and [4B](https://huggingface.co/Qwen/Qwen3-Embedding-4B) cards; [EmbeddingGemma 2 card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2) and [paper](https://arxiv.org/html/2509.20354); [BGE-M3](https://huggingface.co/BAAI/bge-m3); [Arctic Embed L v2.0](https://huggingface.co/Snowflake/snowflake-arctic-embed-l-v2.0); [multilingual-e5-large-instruct](https://huggingface.co/intfloat/multilingual-e5-large-instruct); [MTEB-NL](https://arxiv.org/html/2509.12340v1) (Dutch); [MLEB](https://arxiv.org/html/2510.19365v1) (legal, English only); [Ollama library](https://ollama.com/library). Scores are as published, at full precision; Ollama's default tags are quantized. No benchmark found covers English questions over Dutch passages, Amsterdam's case.

- **Tested first:** `qwen3-embedding:0.6b`, the smallest model with published scores on all three benchmarks, chosen to fit beside the chat model.
- **Not tested, by the San Francisco owner's choice:** `qwen3-embedding:4b`. Open Ollama issues report it hanging ([#17428](https://github.com/ollama/ollama/issues/17428)) and crashing ([#17509](https://github.com/ollama/ollama/issues/17509)) on Apple Silicon, and it showed 8.7 GB loaded at a 32,768-token context.
- **Excluded:** Qwen3-Embedding-8B (4,096 dimensions, over the HNSW limit unless truncated), a non-commercial license (jina v3), and a model Ollama cannot serve yet (granite multilingual r2, a ModernBERT model).

### A cloud baseline

Anthropic offers no embedding model; its documentation points to Voyage AI ([Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings), checked November 9, 2026). Voyage gives every account free tokens: 200 million for `voyage-4-large` and `voyage-4`, 50 million for `voyage-law-2`, a legal-domain model ([pricing](https://docs.voyageai.com/docs/pricing)). Embedding Chapter 37 and the questions uses a small fraction of that. It would show whether low scores come from the local model or from the passages and questions. Voyage also offers `voyage-context-4`, which embeds each chunk with its whole document in view, and `voyage-4-nano`, open-weight (Apache 2.0) but not in Ollama's library. Whether to run this baseline is an open question below.

## Pass thresholds

Set by the San Francisco owner on November 9, 2026, before any model was scored on the question set:

- **Pass:** hybrid search finds the primary provision in the top 5 for at least 80% of answerable questions (primary hit@5 ≥ 0.80), and recall@5 ≥ 0.70.
- **Each search adds value** if hybrid beats both keyword-only and vector-only on primary hit@5; otherwise the server uses the better single search alone.
- **If `qwen3-embedding:0.6b` falls short,** `qwen3-embedding:4b` is tested next.

These were set on the run 1 measures (single primary provision, recall@5), which the harness no longer computes; the [Decision](#decision) replaces them with near hit@10 ≥ 0.85.

## Results

### Run 1: `qwen3-embedding:0.6b`, drafted questions (provisional)

November 9, 2026. Provisional: the question set had not yet been reviewed, and is rerun once it has. Embedding requests used a 2,048-token context (`num_ctx`), about twice the longest passage with its context (987 tokens); the 727 passages embedded in 31 seconds on a 24 GB M4 Pro, and the loaded model used 988 MB, against 4.7 GB at Ollama's global 32,000-token context.

| Search | recall@5 | primary hit@5 | MRR |
|---|---|---|---|
| Keyword, all words | 0.04 | 0.00 | 0.04 |
| Keyword, any word | 0.27 | 0.26 | 0.27 |
| Vector | 0.34 | 0.42 | 0.47 |
| Hybrid (all words + vector) | 0.34 | 0.39 | 0.48 |
| Hybrid (any word + vector) | 0.34 | 0.42 | 0.42 |

- **Below the thresholds** on every search: the best primary hit@5 is 0.42 against 0.80, and the best recall@5 0.34 against 0.70.
- **Requiring every word does not work for questions.** `websearch_to_tsquery` matched the primary provision of no question in its top 100, because a whole question's words rarely all appear in one provision; with it, hybrid search is vector search with noise. Any-word keyword search finds something for most questions.
- **Hybrid search adds nothing over vector search here:** neither hybrid beats vector on primary hit@5, so by the rule above the server would use vector search alone, unless a later run changes that.
- **Questions vector search misses entirely** (primary not in the top 100): q01 (a relative moving in, 37.9(a)(8)(ii)), q06 (the grounds for eviction, labelled at the parent 37.9(a), whose own text is only its lead-in), q15 (a new owner) and q30 (a motel room after 32 days). Per-question ranks are printed by the harness.

### Run 2: `qwen3-embedding:0.6b`, graded questions (provisional)

November 9, 2026. The same model and settings as run 1, scored on the graded set of 50 questions (45 answerable), of which q35–q50 are not yet reviewed.

| Search | hit@5 | hit@10 | near hit@10 | nDCG@10 | MRR |
|---|---|---|---|---|---|
| Keyword, all words | 0.04 [0.00, 0.11] | 0.09 [0.02, 0.18] | 0.09 [0.02, 0.18] | 0.05 [0.01, 0.11] | 0.05 [0.00, 0.12] |
| Keyword, any word | 0.36 [0.22, 0.49] | 0.38 [0.24, 0.51] | 0.49 [0.33, 0.62] | 0.25 [0.15, 0.35] | 0.31 [0.20, 0.42] |
| Vector | 0.42 [0.29, 0.58] | 0.58 [0.42, 0.71] | 0.64 [0.51, 0.78] | 0.37 [0.27, 0.48] | 0.45 [0.33, 0.57] |
| Hybrid (all words + vector) | 0.47 [0.31, 0.62] | 0.60 [0.44, 0.73] | 0.64 [0.49, 0.78] | 0.40 [0.29, 0.51] | 0.48 [0.35, 0.60] |
| Hybrid (any word + vector) | 0.44 [0.31, 0.60] | 0.53 [0.38, 0.67] | 0.62 [0.49, 0.76] | 0.35 [0.25, 0.45] | 0.42 [0.30, 0.53] |

- **No hybrid search is distinguishable from vector search:** on hit@10, all words + vector differs from vector on 1 question (p = 1.00), any word + vector on 6 (2 against 4, p = 0.69).
- **Wording matters more than the search.** Over the five paired needs, vector search hits@10 on 1 in everyday wording and 3 in legal wording. q01 (everyday) is not in vector search's top 100, and its legal twin q35 ranks first.
- **Keyword search helps some questions vector search misses:** q39 (hotel room, legal wording) is first for keyword search and 34th for vector search; q15 and q30 are found only by keyword search.
- **No search finds a grade-2 provision in the top 10 for 15 questions:** q01, q06 and its twin q36 (the grounds for eviction), q09, q10, q13, q16, q22, q28, q42 and q43 (two of the four exact-term queries), q44 (a single-family house), q45 (an in-law unit), q46 and q47 (the landlord's questions).

### Runs 3 and 4: the cloud baseline, `voyage-4-large` and `voyage-law-2`

November 9, 2026. The same question set and passages as run 2, embedded through MongoDB Atlas's endpoint (passages as `document`, questions as `query`), paced to an account without a payment method; each model's 727 passages took about 24 minutes, all of it waiting on the rate limit. Keyword search is unchanged from run 2.

| Vector search | hit@5 | hit@10 | near hit@10 | nDCG@10 | MRR |
|---|---|---|---|---|---|
| `qwen3-embedding:0.6b` (run 2) | 0.42 [0.29, 0.58] | 0.58 [0.42, 0.71] | 0.64 [0.51, 0.78] | 0.37 [0.27, 0.48] | 0.45 [0.33, 0.57] |
| `voyage-law-2` | 0.71 [0.58, 0.84] | 0.82 [0.71, 0.93] | 0.91 [0.82, 0.98] | 0.53 [0.43, 0.62] | 0.53 [0.42, 0.65] |
| `voyage-4-large` | 0.84 [0.73, 0.93] | 0.89 [0.80, 0.98] | 0.93 [0.84, 1.00] | 0.62 [0.53, 0.71] | 0.68 [0.58, 0.78] |

- **Most of run 2's shortfall is the local model,** not the passages or the labels: the same passages and labels reach hit@5 of 0.84 with `voyage-4-large`, above the 0.80 set before run 1.
- **The wording gap mostly closes:** `voyage-4-large` hits@10 on 0.93 of everyday questions (Qwen 0.52). q01, q03, q10, q12 and q28, outside Qwen's top 10, rank first.
- **The legal-domain model is not better here:** `voyage-law-2` is below `voyage-4-large` on every measure, though on hit@10 they differ on only 3 questions (q28, q42, q47), all in `voyage-4-large`'s favour.
- **Keyword search adds nothing with either model:** all words + vector differs from vector on no question's hit@10; any word + vector loses 11 (`voyage-4-large`) and 10 (`voyage-law-2`) questions vector search finds, and gains none (p < 0.01).
- **What `voyage-4-large` still misses is mostly the parent and child problem:** q06 and q36 (the grounds for eviction, answered by the lead-in 37.9(a)) rank 61 and 44, q09 (capital improvement passthroughs) 83 and q43 (amortization schedules) 21; q44 (a single-family house) ranks 14.

### Runs 5 to 7: `qwen3-embedding:4b`, and the text embedded for each provision

November 9, 2026. The same question set. `--form` sets what is embedded for each provision (`spikes/s4/entries.py`):

- `context`: the stored context (heading and every ancestor's lead-in) and the text, as in runs 1 to 4;
- `short`: the section heading and the nearest ancestor's own text (not the section's amendment history), and the text;
- `subtree`: the `short` entries, plus one entry for each of the 151 provisions with children: its text with all its descendants' (141 provisions, up to 10,000 characters), or its text and the first sentence of each child (10 provisions, among them 37.9(a)). A search ranks each provision by its best entry.

`qwen3-embedding:4b` (build `df5bd2e3c74c`, Ollama 0.40.15) ran without the hangs reported on Apple Silicon; it held 2,971 MB loaded at a 4,096-token context and embedded the 727 passages in 217 seconds.

| Vector search | hit@5 | hit@10 | near hit@10 | nDCG@10 | MRR |
|---|---|---|---|---|---|
| Qwen 0.6B, `context` | 0.42 | 0.58 | 0.64 | 0.37 | 0.45 |
| Qwen 0.6B, `short` | 0.47 | 0.60 | 0.69 | 0.39 | 0.47 |
| Qwen 0.6B, `subtree` | 0.49 | 0.64 | 0.76 | 0.39 | 0.42 |
| Qwen 4B, `context` | 0.56 | 0.62 | 0.73 | 0.41 | 0.47 |
| Qwen 4B, `short` | 0.56 | 0.71 | 0.82 | 0.45 | 0.50 |
| Qwen 4B, `subtree` | 0.56 | 0.71 | 0.89 | 0.41 | 0.44 |
| Voyage 4-large, `context` | 0.84 | 0.89 | 0.93 | 0.62 | 0.68 |
| Voyage 4-large, `short` | 0.80 | 0.89 | 0.96 | 0.63 | 0.68 |
| Voyage 4-large, `subtree` | 0.82 | 0.93 | 0.96 | 0.65 | 0.69 |

- **`subtree` finds the questions answered by a lead-in:** q06 and q36 (the grounds for eviction, 37.9(a)) rank 1 and 1 with Qwen 4B (not in the top 100 with `context`), and 2 and 7 with Voyage (61 and 44).
- **With Qwen, parent entries can outrank the exact provision:** `subtree` raises near hit@10 (0.82 to 0.89 for 4B) but lowers nDCG and MRR, since the search more often lands one level above the answer. With `get_provision` returning a provision's descendants, near hit is the measure that matches the tools; Voyage gains on both.
- **A shorter context helps Qwen and is neutral for Voyage.**
- **Qwen 4B with `subtree` comes within 0.04 of Voyage's `context` run on near hit@10,** but stays well behind on hit@5 (0.56 against 0.84) and on everyday wording.
- **Keyword search still adds nothing:** for every model and form, all words + vector differs from vector on at most two questions' hit@10, and never significantly.
- **Missed by every model and form:** q09 (capital improvement passthroughs, ranks 40 to 88). q43 (amortization schedules) ranks 5 to 21.
- Differences between forms are a few questions on 45, mostly inside the intervals; the harness does not yet compare two forms question by question.

## Findings for the design

These hold whichever model is chosen, and apply to the passage pipeline and the docs server alike:

- **One embedding path.** Embeddings match only when the pipeline and the server call the same Ollama server, version and pinned model build over its HTTP API: published issues show Ollama's output differing from the model's reference library (sentence-transformers) and between Ollama versions ([#7085](https://github.com/ollama/ollama/issues/7085)), and between runtimes on the same file ([#11375](https://github.com/ollama/ollama/issues/11375)). The Python pipeline therefore calls Ollama's `/api/embed`, never a Python copy of the model, and the stored model identifier is the Ollama tag with its build ID (`qwen3-embedding:0.6b`, `ac6da0dfba84`).
- **Check every vector.** Ollama has been reported to return all-zero vectors under load ([#17878](https://github.com/ollama/ollama/issues/17878)) and NaN on some inputs ([#15582](https://github.com/ollama/ollama/issues/15582)) with HTTP 200, and truncates long inputs by default. Ingestion refuses a vector that is all zeros or holds NaN, and sends `truncate: false`.
- **Cap the embedding model's context.** Ollama applies its global context length (32,000 tokens, set for the chat model) to every model it loads, so the embedding model held 4.7 GB. Requests send `options.num_ctx` sized to the longest passage, which cut it to 988 MB; with `truncate: false` a longer passage fails instead of being cut.
- **Keyword search cannot require every word of a question.** In run 1, `websearch_to_tsquery` found no question's primary provision; matching any word found some. The plan's keyword search changes to any-word matching unless a later run says otherwise.
- **A provision often carries its meaning in its children.** 37.9(a)(8)'s own text is "The landlord seeks to recover possession in good faith, without ulterior reasons and with honest intent"; that this means the landlord or a relative moving in is in its sub-items, 37.9(a)(8)(i) and (ii). Each passage already carries its ancestors' lead-ins as `context`, but not its children's text, so a search for "move in" cannot find 37.9(a)(8) itself. Ways to fix it, from least to most change:
  1. search each provision with its descendants' text added, up to a token budget, keeping its own `text` for quoting; provisions too large for the budget keep their own text, and their children are found instead;
  2. merge a provision whose own text is only a lead-in with its children into one passage, at the cost of coarser citations;
  3. contextual retrieval: a model writes a short note situating each passage before it is indexed; Anthropic reports retrieval failures falling 35% with embeddings and 49% with embeddings and keyword search ([Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval), September 19, 2024), but the notes are model output, so they would need archiving to stay reproducible;
  4. an embedding model that reads the whole document, such as Voyage's `voyage-context-4`, cloud only.
- **Memory beside the chat model.** With the cap, the embedding model adds about 1 GB to the chat model's 13 GB. Ollama unloads idle models after a few minutes, so the first question after a pause also waits for it to reload.

## Question set review

Found while reviewing the drafted questions, and made before run 2:

- **q02 (yearly rent increases):** 37.3(a)(1)'s cap of 60% of CPI, at most 7%, applies only to units under the rent increase limits; 37.3(d)(1)(A) (Costa-Hawkins, separately alienable units) and 37.3(g)(1) (units first occupied after June 13, 1979) let owners set rents freely, with exceptions. Both are added at grade 1.
- **q03 (relocation payments):** the quote for 37.9C(e)(2) stopped before its point, an additional $3,000 for tenants 60 or older, disabled, or in a household with a child under 18; it now includes it. `--review` prints every labelled provision's full text.
- **q06 (grounds for eviction):** its answer is 37.9(a), whose own text is only a lead-in; the near-hit measures credit any of its 17 children.
- **Several provisions answer q08, q11, q15 and q25,** which each had one primary chosen by judgment; each answering provision is now grade 2.
- **Added:** everyday or legal twins of q01, q06, q10, q14 and q30 (q35–q39); exact-term queries (q40–q43), which keyword search is for; questions on unit coverage in words the ordinance does not use (q44 "single-family", q45 "in-law"), a landlord's questions (q46, q47), COVID-era rent (q48), and two more the ordinance does not answer (q49 entry notice, q50 housing vouchers).
- **Not yet covered:** questions on the other corpus documents (the Civil Code sections, the inclusionary, Article 38 and all-electric ordinances, the reports), including the state-versus-local questions in the [San Francisco Plan](../sf-plan.md#users-and-questions), once they are loaded.

## Open questions

1. **Keyword search for exact terms:** with 4 term questions against 29 in everyday wording, the set cannot show where keyword search helps. Adding about 10 term questions (section and ordinance numbers, case names, defined terms) and scoring a BM25 or identifier-only keyword search on `qwen3-embedding:4b` would settle whether `search_policy` should add it back for such queries.
2. **Everyday wording:** `qwen3-embedding:4b` finds the exact provision for fewer everyday questions than Voyage. Whether the agent rewriting a question into the ordinance's vocabulary before searching closes that gap is untested.
3. **Label review:** q35–q50 have not been reviewed by the San Francisco owner.

## Decision

Recorded November 9, 2026, by the San Francisco owner, after runs 1 to 7:

- **Threshold:** near hit@10 ≥ 0.85 for vector search: a provision that answers the question, its parent or one of its children in the top 10, matching a `get_provision` that returns a provision with its descendants. It replaces primary hit@5 ≥ 0.80 and recall@5 ≥ 0.70, which were set on run 1's measures before the tool design returned descendants.
- **Model:** `qwen3-embedding:4b`, served locally by Ollama (build `df5bd2e3c74c`), at near hit@10 0.89 [0.78, 0.98] with the `subtree` form (run 7). Voyage's `voyage-4-large` scored higher (0.96) but would send every search query to MongoDB Atlas and make search depend on an outside service.
- **What is embedded:** the `subtree` form: each provision's text with the section heading and its nearest ancestor's lead-in, and, for each provision with children, an entry with its descendants' text up to 10,000 characters or an outline of its children above that. Ollama's context for the embedding model is 4,096 tokens.
- **Search is vector only.** Keyword search added nothing on the question set with any model or form (runs 2 to 7). The `tsv` column and its index stay in the schema, so keyword search can be added back if open question 1 shows it helps exact-term queries.
- **Served through OpenRouter, amended November 12, 2026.** To deploy without a self-hosted model, the same model, `qwen/qwen3-embedding-4b`, is served through OpenRouter from one pinned host (DeepInfra), which does not publish its quantization. On one test query its vector had cosine similarity 0.985 with the Ollama build's, so the corpus was re-embedded through OpenRouter rather than mixed. The scores above were measured on the Ollama build and have not been rerun on the hosted one. This gives up the reason Voyage was set aside: every search query now goes to an outside service.
- **When the embedding model is unavailable,** a search fails with a data error and the answer says the law could not be searched; there is no keyword search to fall back to.

Caveats: 45 answerable questions give intervals of about ±0.1; q35–q50 are not yet reviewed; differences between forms are mostly inside the intervals.
