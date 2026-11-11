import { fileURLToPath } from "node:url"

import * as NodeServices from "@effect/platform-node/NodeServices"
import { PgClient } from "@effect/sql-pg"
import { describe, expect, it, layer } from "@effect/vitest"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, Effect, Layer, Redacted, Schema } from "effect"
import { McpProtocol, McpTest } from "effect/ai"
import { HttpClient, HttpClientResponse } from "effect/http"

import { Citation, NAMESPACE } from "../src/Citations.ts"
import { PassageRepo } from "../src/PassageRepo.ts"
import { QueryEmbedder } from "../src/QueryEmbedder.ts"
import type { Search } from "../src/SearchConfig.ts"
import { SearchConfig } from "../src/SearchConfig.ts"
import { OllamaConfig } from "../src/SfDocsServerConfig.ts"
import { EmbeddingModelCheck, RegistrationsLive } from "../src/Server.ts"
import { EmbeddingModelUnavailable } from "../src/Tools.ts"

/** PostGIS with pgvector, which the search entries' embeddings need. */
const POSTGIS_IMAGE = "imresamu/postgis:17-3.5-bundle0-bookworm"
const FIXTURE = fileURLToPath(new URL("./fixtures/sf_docs.sql", import.meta.url))
const DIMENSIONS = 2560

const SEARCH: Search = {
  embeddingModel: "qwen3-embedding:4b",
  embeddingBuild: "df5bd2e3c74c",
  embeddingModelId: "qwen3-embedding:4b@df5bd2e3c74c",
  numCtx: 4096,
  subtreeChars: 300,
  queryInstruction: "Instruct: find the provisions\nQuery:"
}

/** A vector with the given weight at each 1-based position. */
const vector = (weights: Readonly<Record<number, number>>) => {
  const v = Array<number>(DIMENSIONS).fill(0)
  for (const [position, weight] of Object.entries(weights)) v[Number(position) - 1] = weight
  return v
}

/**
 * Query vectors for the fixture's one-hot entries: "relative" is nearest 37.9(a)(8)(ii)'s entry, then 37.9(a)'s
 * subtree entry, then 37.9(a)(1)'s. "down" stands for an unreachable embedding model.
 */
const FakeEmbedder = Layer.succeed(QueryEmbedder, {
  embed: (query: string) =>
    query === "down"
      ? Effect.fail(new EmbeddingModelUnavailable({ model: SEARCH.embeddingModelId }))
      : Effect.succeed(vector({ 1: 1, 2: 0.5, 3: 0.2 }))
})

class Database extends Context.Service<Database, { readonly url: string }>()("test/Database") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const container = yield* Effect.acquireRelease(
        Effect.tryPromise(() =>
          new PostgreSqlContainer(POSTGIS_IMAGE)
            .withCopyFilesToContainer([{ source: FIXTURE, target: "/docker-entrypoint-initdb.d/zz-policy-text.sql" }])
            .start()
        ),
        (started) => Effect.promise(() => started.stop())
      )
      return { url: container.getConnectionUri() }
    })
  )
}

/** The fixture database's client; layers are shared within one build, so every user gets the same container. */
const PgLive = Layer.unwrap(
  Effect.gen(function* () {
    const { url } = yield* Database
    return PgClient.layer({ url: Redacted.make(url) })
  })
).pipe(Layer.provide(Database.layer))

/** An in-memory MCP client for the server, over the fixture database. */
class TestServer extends Context.Service<TestServer, McpTest.Client>()("test/TestServer") {
  static readonly layer = Layer.effect(
    this,
    McpTest.makeClient(
      RegistrationsLive.pipe(
        Layer.provide(FakeEmbedder),
        Layer.provide(Layer.succeed(SearchConfig, SEARCH)),
        Layer.provide(PgLive)
      ),
      { protocols: [McpProtocol.v2026_07_28] }
    )
  )
}

/** A result's citations, decoded with the citation convention's schema, which checks their IDs. */
const citationsOf = (content: Readonly<Record<string, unknown>>) =>
  Schema.decodeUnknownSync(Schema.Array(Citation))(content["citations"])

/** A successful result's `structuredContent`, whose citations must follow the convention under this server's namespace. */
const structured = Effect.fn("structured")(function* (name: string, args: Record<string, unknown>) {
  const result = yield* (yield* TestServer).callTool({ name, arguments: args })
  expect(result.isError).toBe(false)
  const content = Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown))(result.structuredContent)
  for (const citation of citationsOf(content)) expect(citation.sourceId.startsWith(`${NAMESPACE}.`)).toBe(true)
  return content
})

/** An error result's error, which the server returns as JSON text content. */
const ErrorContent = Schema.Tuple([
  Schema.Struct({
    type: Schema.Literal("text"),
    text: Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown))
  })
])

const failure = Effect.fn("failure")(function* (name: string, args: Record<string, unknown>) {
  const result = yield* (yield* TestServer).callTool({ name, arguments: args })
  expect(result.isError).toBe(true)
  return Schema.decodeUnknownSync(ErrorContent)(result.content)[0].text
})

const Passages = Schema.Array(Schema.Struct({ provision: Schema.String, childCount: Schema.Number }))
const Outline = Schema.Array(
  Schema.Struct({ provision: Schema.String, summary: Schema.String, childCount: Schema.Number })
)
const provisionsOf = (value: unknown) => Schema.decodeUnknownSync(Passages)(value).map((p) => p.provision)

layer(Layer.merge(TestServer.layer, PgLive), { timeout: 180_000 })("sf-docs server", (it) => {
  it.effect("publishes the three tools with input and output schemas and titles", () =>
    Effect.gen(function* () {
      const { tools } = yield* (yield* TestServer).listTools()
      expect(tools.map((t) => t.name).sort()).toEqual(["get_provision", "list_provisions", "search_policy"])
      for (const tool of tools) {
        expect(tool.outputSchema).toBeDefined()
        expect(tool.annotations?.title).toEqual(expect.any(String))
      }
    })
  )

  it.effect("lists the loaded documents in its tool descriptions, with what each covers", () =>
    Effect.gen(function* () {
      const { tools } = yield* (yield* TestServer).listTools()
      const description = (name: string) => tools.find((t) => t.name === name)?.description ?? ""
      expect(description("search_policy")).toContain(
        "- rent_ordinance: Residential Rent Stabilization and Arbitration Ordinance (law, as of 2026-06-29). " +
          "A synthetic description: rent control and evictions."
      )
      for (const name of ["get_provision", "list_provisions"]) {
        expect(description(name)).toContain("rent_ordinance (Residential Rent Stabilization and Arbitration Ordinance)")
      }
    })
  )

  describe("search_policy", () => {
    it.effect("ranks each provision once, by its nearest search entry, with a citation quoting its text", () =>
      Effect.gen(function* () {
        const content = yield* structured("search_policy", { query: "relative", limit: 3 })
        expect(provisionsOf(content["passages"])).toEqual(["37.9(a)(8)(ii)", "37.9(a)", "37.9(a)(1)"])
        const [first] = citationsOf(content)
        expect(first?.citationId).toBe("sf_docs.rent_ordinance@2026-06-29#37.9(a)(8)(ii)")
        expect(first?.locator).toBe("Sec. 37.9(a)(8)(ii)")
        expect(first?.quote).toBe(
          "(ii) For the use or occupancy of the landlord's children as their principal place of residency."
        )
      })
    )

    it.effect("says how many children a result has, so the model knows to expand it", () =>
      Effect.gen(function* () {
        const content = yield* structured("search_policy", { query: "relative", limit: 2 })
        expect(Schema.decodeUnknownSync(Passages)(content["passages"])[1]).toMatchObject({
          provision: "37.9(a)",
          childCount: 2
        })
      })
    )

    it.effect("returns every match up to ten when no limit is given", () =>
      Effect.gen(function* () {
        const content = yield* structured("search_policy", { query: "relative", limit: null })
        expect(provisionsOf(content["passages"])).toHaveLength(7)
      })
    )

    it.effect("lists the loaded documents for an unknown document", () =>
      Effect.gen(function* () {
        const content = yield* failure("search_policy", { query: "relative", documentId: "planning_code" })
        expect(content).toMatchObject({ _tag: "UnknownValue", field: "documentId", validValues: ["rent_ordinance"] })
      })
    )

    it.effect("fails when the embedding model is unavailable, rather than searching another way", () =>
      Effect.gen(function* () {
        const content = yield* failure("search_policy", { query: "down" })
        expect(content).toMatchObject({ _tag: "EmbeddingModelUnavailable", model: SEARCH.embeddingModelId })
      })
    )
  })

  describe("get_provision", () => {
    it.effect("returns a provision with its descendants in document order", () =>
      Effect.gen(function* () {
        const content = yield* structured("get_provision", { documentId: "rent_ordinance", provision: "37.9(a)(8)" })
        expect(provisionsOf(content["passages"])).toEqual(["37.9(a)(8)", "37.9(a)(8)(ii)"])
        expect(content["outline"]).toBeNull()
        expect(citationsOf(content).map((c) => c.locator)).toEqual(["Sec. 37.9(a)(8)", "Sec. 37.9(a)(8)(ii)"])
      })
    )

    it.effect("returns an outline of the children of a provision over the size limit", () =>
      Effect.gen(function* () {
        const content = yield* structured("get_provision", { documentId: "rent_ordinance", provision: "37.9(a)" })
        expect(provisionsOf(content["passages"])).toEqual(["37.9(a)"])
        expect(Schema.decodeUnknownSync(Outline)(content["outline"])).toEqual([
          {
            provision: "37.9(a)(1)",
            summary: "(1) The tenant has failed to pay the rent to which the landlord is lawfully entitled;",
            childCount: 0
          },
          {
            provision: "37.9(a)(8)",
            summary:
              "(8) The landlord seeks to recover possession in good faith, without ulterior reasons and with honest intent;",
            childCount: 1
          }
        ])
      })
    )

    it.effect("reports a provision that is not in the document", () =>
      Effect.gen(function* () {
        const content = yield* failure("get_provision", { documentId: "rent_ordinance", provision: "37.99" })
        expect(content).toMatchObject({ _tag: "ProvisionNotFound", provision: "37.99" })
      })
    )
  })

  describe("list_provisions", () => {
    it.effect("lists a document's sections by their headings", () =>
      Effect.gen(function* () {
        const content = yield* structured("list_provisions", { documentId: "rent_ordinance" })
        expect(content["parent"]).toBeNull()
        expect(Schema.decodeUnknownSync(Outline)(content["outline"])).toEqual([
          { provision: "37.2", summary: "Sec. 37.2 Definitions", childCount: 1 },
          { provision: "37.9", summary: "Sec. 37.9 Evictions", childCount: 1 }
        ])
      })
    )

    it.effect("lists a provision's children, citing each by its summary", () =>
      Effect.gen(function* () {
        const content = yield* structured("list_provisions", { documentId: "rent_ordinance", provision: "37.9(a)" })
        expect(provisionsOf([content["parent"]])).toEqual(["37.9(a)"])
        expect(Schema.decodeUnknownSync(Outline)(content["outline"]).map((e) => e.provision)).toEqual([
          "37.9(a)(1)",
          "37.9(a)(8)"
        ])
        expect(citationsOf(content).map((c) => c.locator)).toEqual([
          "Sec. 37.9(a)",
          "Sec. 37.9(a)(1)",
          "Sec. 37.9(a)(8)"
        ])
      })
    )
  })

  it.effect("stops at startup when the stored vectors came from another model", () =>
    Effect.gen(function* () {
      const error = yield* Layer.build(EmbeddingModelCheck).pipe(
        Effect.provide(PassageRepo.layer),
        Effect.provide(Layer.succeed(SearchConfig, { ...SEARCH, embeddingModelId: "qwen3-embedding:0.6b@x" })),
        Effect.scoped,
        Effect.flip
      )
      expect(error).toMatchObject({
        _tag: "EmbeddingModelMismatch",
        configured: "qwen3-embedding:0.6b@x",
        stored: ["qwen3-embedding:4b@df5bd2e3c74c"]
      })
    })
  )
})

/** An Ollama that serves `digest` for the model and answers every embed request with `embedding`. */
const fakeOllama = (digest: string, embedding: ReadonlyArray<number>, requests: Array<unknown>) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => {
      if (request.url.endsWith("/api/tags")) {
        const body = { models: [{ name: "qwen3-embedding:4b", digest: `${digest}${"0".repeat(52)}` }] }
        return Effect.succeed(HttpClientResponse.fromWeb(request, Response.json(body)))
      }
      if (request.body._tag === "Uint8Array") requests.push(JSON.parse(new TextDecoder().decode(request.body.body)))
      return Effect.succeed(HttpClientResponse.fromWeb(request, Response.json({ embeddings: [embedding] })))
    })
  )

const embedWith = (digest: string, embedding: ReadonlyArray<number>, requests: Array<unknown> = []) =>
  Effect.gen(function* () {
    return yield* (yield* QueryEmbedder).embed("Can my landlord evict me?")
  }).pipe(
    Effect.provide(QueryEmbedder.ollama),
    Effect.provide(fakeOllama(digest, embedding, requests)),
    Effect.provide(Layer.succeed(SearchConfig, SEARCH)),
    Effect.provide(Layer.succeed(OllamaConfig, { url: "http://ollama.test" }))
  )

describe("config/search.yaml", () => {
  it.effect("decodes", () =>
    Effect.gen(function* () {
      const search = yield* SearchConfig
      expect(search.embeddingModelId).toBe("qwen3-embedding:4b@df5bd2e3c74c")
    }).pipe(Effect.provide(SearchConfig.layer()), Effect.provide(NodeServices.layer))
  )
})

describe("QueryEmbedder.ollama", () => {
  it.effect("prepends the instruction, never truncates and caps the context", () =>
    Effect.gen(function* () {
      const requests: Array<unknown> = []
      expect(yield* embedWith("df5bd2e3c74c", [0.5, 0.5], requests)).toEqual([0.5, 0.5])
      expect(requests).toEqual([
        {
          model: "qwen3-embedding:4b",
          input: ["Instruct: find the provisions\nQuery:Can my landlord evict me?"],
          truncate: false,
          options: { num_ctx: 4096 }
        }
      ])
    })
  )

  it.effect("refuses another build of the model", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(embedWith("ac6da0dfba84", [0.5]))
      expect(error._tag).toBe("EmbeddingModelUnavailable")
    })
  )

  it.effect("refuses an all-zero vector", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(embedWith("df5bd2e3c74c", [0, 0]))
      expect(error._tag).toBe("EmbeddingModelUnavailable")
    })
  )
})
