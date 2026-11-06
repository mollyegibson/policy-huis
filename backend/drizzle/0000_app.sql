CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TABLE "app"."requests" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"question" text NOT NULL,
	"model_config" text NOT NULL,
	"model_id" text NOT NULL,
	"prompt_version" text NOT NULL,
	"outcome" text NOT NULL,
	"steps" integer NOT NULL,
	"model_retries" integer NOT NULL,
	"error_detail" text,
	"unavailable_servers" text[] NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"answer_text" text NOT NULL,
	CONSTRAINT "requests_outcome_check" CHECK ("app"."requests"."outcome" IN ('answered', 'step_limit', 'context_limit', 'truncated', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "app"."tool_calls" (
	"request_id" uuid NOT NULL,
	"call_id" text NOT NULL,
	"step" integer NOT NULL,
	"tool" text NOT NULL,
	"arguments" jsonb NOT NULL,
	"outcome" text NOT NULL,
	"result" jsonb NOT NULL,
	"latency_ms" integer NOT NULL,
	CONSTRAINT "tool_calls_request_id_call_id_pk" PRIMARY KEY("request_id","call_id"),
	CONSTRAINT "tool_calls_outcome_check" CHECK ("app"."tool_calls"."outcome" IN ('success', 'failure'))
);
--> statement-breakpoint
ALTER TABLE "app"."tool_calls" ADD CONSTRAINT "tool_calls_request_id_requests_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "app"."requests"("request_id") ON DELETE no action ON UPDATE no action;