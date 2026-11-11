"""Spike S4: how well keyword, vector and hybrid search find the Chapter 37 provisions that answer a question.

Reads the passages from the `sf-legal-text` database (read-only), checks the question set's labels against them,
embeds the passages and the questions with one model, served by Ollama or by Voyage AI's API, and scores each
search against `docs/plans/spikes/s4-questions.yaml`. Embeddings stay in memory; nothing is written to the database.

    uv run python spikes/s4/search.py --model qwen3-embedding:0.6b
    uv run python spikes/s4/search.py --provider voyage --model voyage-4-large   # needs VOYAGE_API_KEY in .env
    uv run python spikes/s4/search.py --review labels.md     # the labelled provisions' full text, without scoring

Results print as tables: each measure per search with its 95% bootstrap interval, paired comparisons of each
hybrid search with its parts, the measures by wording, and each question's rank of its first grade-2 provision.
"""

import argparse
import json
import math
import os
import time
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import psycopg
from cache import EmbeddingCache
from entries import FORMS, Entry, Passage, best_per_provision, entries
from psycopg import sql
from scoring import (
    NDCG_DEPTH,
    WORDINGS,
    Question,
    Tree,
    bootstrap_interval,
    first_answer_rank,
    hit,
    label_errors,
    load_questions,
    mcnemar_p,
    measures,
    ndcg,
)

from sf_legal_text.settings import CORPUS_SCHEMA, Settings

QUESTIONS_FILE = Path(__file__).resolve().parents[4] / "docs" / "plans" / "spikes" / "s4-questions.yaml"
POOL = 100
RRF_K = 60
# About twice the longest passage with its context (987 tokens with qwen3-embedding:0.6b on November 9, 2026);
# `truncate: false` makes a longer input fail rather than be cut.
NUM_CTX = 2048
CACHE_DIR = Path(__file__).resolve().parent / ".cache"
# Keys issued through MongoDB Atlas use Atlas's endpoint; keys from Voyage AI's own dashboard use
# https://api.voyageai.com/v1/embeddings.
VOYAGE_URL = "https://ai.mongodb.com/v1/embeddings"
VOYAGE_ATTEMPTS = 8

QUERY_INSTRUCTIONS = {
    "qwen3-embedding": "Instruct: Given a question about San Francisco's Rent Ordinance, retrieve the provisions of "
    "the ordinance that answer it\nQuery:",
}

HYBRIDS = {
    "hybrid (all words + vector)": ("keyword (all words)", "vector"),
    "hybrid (any word + vector)": ("keyword (any word)", "vector"),
}


def unit_vectors(model: str, vectors: list[list[float]]) -> list[list[float]]:
    """Normalizes each vector, refusing any that is all zeros or holds NaN, which Ollama can return with HTTP 200."""
    normalized = []
    for vector in vectors:
        norm = math.sqrt(sum(x * x for x in vector))
        if not norm or any(math.isnan(x) for x in vector):
            raise ValueError(f"{model} returned an unusable vector")
        normalized.append([x / norm for x in vector])
    return normalized


def ollama_build(client: httpx.Client, ollama: str, model: str) -> str:
    """The model's build ID, the first 12 characters of its digest, so a re-pulled tag is not mistaken for the old
    one."""
    response = client.get(f"{ollama}/api/tags")
    response.raise_for_status()
    digest = next((m["digest"] for m in response.json()["models"] if m["name"] == model), None)
    if digest is None:
        raise ValueError(f"Ollama at {ollama} has no model {model}")
    return digest[:12]


def embed_ollama(client: httpx.Client, ollama: str, model: str, num_ctx: int, texts: list[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    for start in range(0, len(texts), 32):
        body = {"model": model, "input": texts[start : start + 32], "truncate": False, "options": {"num_ctx": num_ctx}}
        response = client.post(f"{ollama}/api/embed", json=body)
        response.raise_for_status()
        vectors += unit_vectors(model, response.json()["embeddings"])
    return vectors


@dataclass
class VoyagePace:
    """A per-minute request and token budget, for accounts on Voyage's reduced rate limits. Batches are sized to
    `tokens_per_minute` by a conservative estimate of three characters per token, and each request waits until
    the past minute's requests and reported tokens leave room for it."""

    requests_per_minute: int
    tokens_per_minute: int
    sent: list[tuple[float, int]] = field(default_factory=list)

    def batches(self, texts: list[str]) -> list[list[str]]:
        budget = int(self.tokens_per_minute * 0.8)
        batches: list[list[str]] = [[]]
        used = 0
        for text in texts:
            estimate = len(text) // 3 + 1
            if batches[-1] and (used + estimate > budget or len(batches[-1]) == 32):
                batches.append([])
                used = 0
            batches[-1].append(text)
            used += estimate
        return batches

    def wait(self, estimate: int) -> None:
        while True:
            now = time.monotonic()
            self.sent = [(t, n) for t, n in self.sent if now - t < 60]
            if len(self.sent) < self.requests_per_minute and sum(n for _, n in self.sent) + estimate <= (
                self.tokens_per_minute
            ):
                return
            time.sleep(60 - (now - self.sent[0][0]) + 0.5)


def embed_voyage(
    client: httpx.Client,
    url: str,
    api_key: str,
    model: str,
    texts: list[str],
    input_type: str,
    pace: VoyagePace | None,
) -> list[list[float]]:
    """Embeds texts with a Voyage AI model at `url` as `query` or `document`, with truncation off so an input over
    the model's limit fails. Retries rate-limited and server-error responses, waiting longer each time."""
    vectors: list[list[float]] = []
    batches = pace.batches(texts) if pace else [texts[start : start + 32] for start in range(0, len(texts), 32)]
    for number, batch in enumerate(batches, start=1):
        body = {"model": model, "input": batch, "input_type": input_type, "truncation": False}
        if pace:
            pace.wait(sum(len(text) // 3 + 1 for text in batch))
            print(f"Voyage {input_type} batch {number} of {len(batches)}", flush=True)
        for attempt in range(VOYAGE_ATTEMPTS):
            response = client.post(url, json=body, headers={"Authorization": f"Bearer {api_key}"})
            if response.status_code != 429 and response.status_code < 500:
                break
            wait = float(response.headers.get("retry-after") or min(60, 5 * 2**attempt))
            print(f"Voyage returned {response.status_code}; retrying in {wait:.0f} s")
            time.sleep(wait)
        if response.is_error:
            raise RuntimeError(f"Voyage returned {response.status_code} for {model}: {response.text[:500]}")
        result = response.json()
        if pace:
            pace.sent.append((time.monotonic(), result["usage"]["total_tokens"]))
        data = sorted(result["data"], key=lambda d: d["index"])
        vectors += unit_vectors(model, [d["embedding"] for d in data])
    return vectors


def query_prefix(model: str) -> str:
    return next((prefix for family, prefix in QUERY_INSTRUCTIONS.items() if model.startswith(family)), "")


def keyword_ranking(conn: psycopg.Connection, question: str, mode: str) -> list[str]:
    """Provisions ranked by `ts_rank`. `all` matches passages with every word of the question
    (`websearch_to_tsquery`, as the plan specifies); `any` matches passages with any of them."""
    query = (
        sql.SQL("websearch_to_tsquery('english', %s)")
        if mode == "all"
        else sql.SQL("replace(plainto_tsquery('english', %s)::text, ' & ', ' | ')::tsquery")
    )
    rows = conn.execute(
        sql.SQL(
            "SELECT provision FROM {}, (SELECT {} AS q) AS query WHERE tsv @@ query.q "
            "ORDER BY ts_rank(tsv, query.q) DESC, ordinal LIMIT %s"
        ).format(sql.Identifier(CORPUS_SCHEMA, "passages"), query),
        (question, POOL),
    ).fetchall()
    return [row[0] for row in rows]


def rrf(*rankings: list[str]) -> list[str]:
    """Reciprocal rank fusion: each provision scores the sum of 1 / (k + rank) over the rankings that hold it."""
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, provision in enumerate(ranking, start=1):
            scores[provision] = scores.get(provision, 0.0) + 1 / (RRF_K + rank)
    return sorted(scores, key=lambda p: -scores[p])


def write_review(path: Path, questions: Sequence[Question], texts: Mapping[str, str]) -> None:
    """Writes each question with the full text of every provision labelled for it, for reviewing the labels."""
    lines = ["# S4 labelled provisions\n"]
    for q in questions:
        lines.append(f"## {q.id} ({q.wording}): {q.question}\n")
        if not q.grades:
            lines.append("Not answered by the corpus.\n")
        for provision, grade in q.grades.items():
            lines.append(f"**{provision}** (grade {grade})\n\n> {texts[provision]}\n")
    path.write_text("\n".join(lines))


def table(header: Sequence[str], rows: Sequence[Sequence[str]]) -> str:
    return "\n".join(
        [
            "| " + " | ".join(header) + " |",
            "|" + "---|" * len(header),
            *("| " + " | ".join(row) + " |" for row in rows),
        ]
    )


def report(questions: Sequence[Question], searches: Mapping[str, Mapping[str, list[str]]], tree: Tree) -> None:
    answerable = [q for q in questions if q.grades]
    named = measures(tree)
    per_question = {
        search: {m: [f(q, rankings[q.id]) for q in answerable] for m, f in named.items()}
        for search, rankings in searches.items()
    }

    print(f"{len(answerable)} answerable questions; 95% bootstrap intervals over questions in square brackets\n")
    rows = []
    for search, values in per_question.items():
        cells = []
        for v in values.values():
            low, high = bootstrap_interval(v)
            cells.append(f"{sum(v) / len(v):.2f} [{low:.2f}, {high:.2f}]")
        rows.append([search, *cells])
    print(table(["Search", *named], rows))

    print("\nPaired comparisons: hit@10 by exact McNemar test, and the mean nDCG difference with its interval\n")
    rows = []
    for hybrid, parts in HYBRIDS.items():
        for part in parts:
            a, b, p = mcnemar_p(per_question[hybrid]["hit@10"], per_question[part]["hit@10"])
            diff = [
                x - y
                for x, y in zip(
                    per_question[hybrid][f"nDCG@{NDCG_DEPTH}"], per_question[part][f"nDCG@{NDCG_DEPTH}"], strict=True
                )
            ]
            low, high = bootstrap_interval(diff)
            rows.append(
                [
                    f"{hybrid} vs {part}",
                    str(a),
                    str(b),
                    f"{p:.2f}",
                    f"{sum(diff) / len(diff):+.2f} [{low:+.2f}, {high:+.2f}]",
                ]
            )
    print(table(["Comparison", "only hybrid hits", "only other hits", "p", f"nDCG@{NDCG_DEPTH} difference"], rows))

    print(f"\nBy wording: hit@10 / nDCG@{NDCG_DEPTH}\n")
    groups = {w: [q for q in answerable if q.wording == w] for w in WORDINGS}
    paired = [q for q in answerable if q.pair or any(o.pair == q.id for o in answerable)]
    groups |= {f"{w}, paired only": [q for q in paired if q.wording == w] for w in ("everyday", "legal")}
    header = [f"{name} (n={len(qs)})" for name, qs in groups.items()]
    rows = []
    for search, rankings in searches.items():
        cells = []
        for qs in groups.values():
            if not qs:
                cells.append("n/a")
                continue
            hits = sum(hit(q, rankings[q.id], 10) for q in qs) / len(qs)
            gains = sum(ndcg(q, rankings[q.id]) for q in qs) / len(qs)
            cells.append(f"{hits:.2f} / {gains:.2f}")
        rows.append([search, *cells])
    print(table(["Search", *header], rows))

    print(f"\nRank of each question's first grade-2 provision (- when not in the top {POOL}):\n")
    rows = [
        [q.id, q.wording, *(str(first_answer_rank(q, s[q.id]) or "-") for s in searches.values())] for q in answerable
    ]
    print(table(["Question", "Wording", *searches], rows))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", help="an embedding model, such as qwen3-embedding:0.6b or voyage-4-large")
    parser.add_argument("--provider", choices=("ollama", "voyage"), default="ollama")
    parser.add_argument("--voyage-url", default=VOYAGE_URL, help="the Voyage embeddings endpoint for this key")
    parser.add_argument(
        "--voyage-limits",
        nargs=2,
        type=int,
        metavar=("RPM", "TPM"),
        help="pace Voyage requests to these per-minute limits, such as 3 10000 before a payment method is added",
    )
    parser.add_argument("--form", choices=FORMS, default="context", help="the text embedded for each provision")
    parser.add_argument(
        "--num-ctx", type=int, default=NUM_CTX, help="Ollama's context for embedding; raise it for the subtree form"
    )
    parser.add_argument("--ollama", default=os.environ.get("OLLAMA_URL", "http://localhost:11434"))
    parser.add_argument("--questions", type=Path, default=QUESTIONS_FILE, help="the question set to score")
    parser.add_argument("--json", type=Path, help="also write every ranking to this file")
    parser.add_argument("--cache", type=Path, default=CACHE_DIR, help="where embeddings are cached between runs")
    parser.add_argument("--review", type=Path, help="write the labelled provisions' full text here and stop")
    args = parser.parse_args()
    if not args.model and not args.review:
        parser.error("--model is required unless --review is given")

    questions = load_questions(args.questions)
    settings = Settings()
    if args.provider == "voyage" and not args.review and settings.voyage_api_key is None:
        parser.error("--provider voyage needs VOYAGE_API_KEY in this project's .env")
    with psycopg.connect(settings.sf_legal_text_database_url.get_secret_value()) as conn:
        passages = conn.execute(
            sql.SQL("SELECT provision, parent_provision, heading, context, text FROM {} ORDER BY ordinal").format(
                sql.Identifier(CORPUS_SCHEMA, "passages")
            )
        ).fetchall()
        texts = {row[0]: row[4] for row in passages}
        if errors := label_errors(args.questions, texts):
            raise SystemExit("The question set's labels do not match the passages:\n" + "\n".join(errors))
        if args.review:
            write_review(args.review, questions, texts)
            return
        keyword_all = {q.id: keyword_ranking(conn, q.question, "all") for q in questions}
        keyword_any = {q.id: keyword_ranking(conn, q.question, "any") for q in questions}

    tree = Tree({row[0]: row[1] for row in passages})
    search_entries = entries([Passage(*row) for row in passages], args.form)
    documents = [e.text for e in search_entries]
    with httpx.Client(timeout=600) as client:
        started = time.monotonic()
        if settings.voyage_api_key is not None and args.provider == "voyage":
            key = settings.voyage_api_key.get_secret_value()
            pace = VoyagePace(*args.voyage_limits) if args.voyage_limits else None
            cache = EmbeddingCache(args.cache, f"voyage/{args.model}")
            passage_vectors, computed = cache.embed(
                documents,
                "document",
                lambda texts: embed_voyage(client, args.voyage_url, key, args.model, texts, "document", pace),
            )
            passage_seconds = time.monotonic() - started
            question_vectors, _ = cache.embed(
                [q.question for q in questions],
                "query",
                lambda texts: embed_voyage(client, args.voyage_url, key, args.model, texts, "query", pace),
            )
        else:
            build = ollama_build(client, args.ollama, args.model)
            cache = EmbeddingCache(args.cache, f"ollama/{args.model}@{build}/num_ctx={args.num_ctx}")
            passage_vectors, computed = cache.embed(
                documents,
                "document",
                lambda texts: embed_ollama(client, args.ollama, args.model, args.num_ctx, texts),
            )
            passage_seconds = time.monotonic() - started
            prefix = query_prefix(args.model)
            question_vectors, _ = cache.embed(
                [prefix + q.question for q in questions],
                "query",
                lambda texts: embed_ollama(client, args.ollama, args.model, args.num_ctx, texts),
            )

    vector = {}
    for q, qv in zip(questions, question_vectors, strict=True):
        scores = [sum(a * b for a, b in zip(qv, pv, strict=True)) for pv in passage_vectors]
        ranked: list[Entry] = [search_entries[i] for i in sorted(range(len(scores)), key=lambda i: -scores[i])]
        vector[q.id] = best_per_provision(ranked, POOL)

    searches: dict[str, dict[str, list[str]]] = {
        "keyword (all words)": keyword_all,
        "keyword (any word)": keyword_any,
        "vector": vector,
    }
    for hybrid, parts in HYBRIDS.items():
        searches[hybrid] = {q.id: rrf(*(searches[part][q.id] for part in parts)) for q in questions}

    print(
        f"model {args.model} ({args.provider}), form {args.form}: {computed} of {len(documents)} entries "
        f"for {len(passages)} provisions embedded in "
        f"{passage_seconds:.0f} s, the rest cached; "
        f"{len(passage_vectors[0])} dimensions\n"
    )
    report(questions, searches, tree)

    if args.json:
        args.json.write_text(json.dumps(searches, indent=1))


if __name__ == "__main__":
    main()
