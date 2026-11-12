ALTER TABLE "app"."requests" ADD COLUMN "model_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."requests" ADD COLUMN "evaluation_run_id" uuid;