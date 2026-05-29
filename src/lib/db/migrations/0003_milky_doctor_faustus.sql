CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"account_id" uuid,
	"uploaded_by_user_id" uuid,
	"file_name" text NOT NULL,
	"mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"byte_size" bigint DEFAULT 0 NOT NULL,
	"file_sha256" text NOT NULL,
	"detected_type" text DEFAULT 'unknown' NOT NULL,
	"detected_issuer" text,
	"statement_period" text,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"storage_key" text,
	"parse_error" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documents_ledger_file_sha_unique" ON "documents" USING btree ("ledger_id","file_sha256");--> statement-breakpoint
CREATE INDEX "documents_ledger_status_idx" ON "documents" USING btree ("ledger_id","status");--> statement-breakpoint
CREATE INDEX "documents_ledger_account_idx" ON "documents" USING btree ("ledger_id","account_id");