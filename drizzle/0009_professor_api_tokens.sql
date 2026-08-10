-- Personal access tokens for the professor API / MCP server.
CREATE TABLE IF NOT EXISTS "professor_api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professor_api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professor_api_tokens" ADD CONSTRAINT "professor_api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professor_api_tokens_user_idx" ON "professor_api_tokens" ("user_id");
