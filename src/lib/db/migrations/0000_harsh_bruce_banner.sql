CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"name" text NOT NULL,
	"institution" text,
	"mask" text,
	"type" text NOT NULL,
	"asset_class" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"opened_on" date,
	"closed_on" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balance_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"as_of_date" date NOT NULL,
	"balance_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"flow_type" text NOT NULL,
	"color" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"requested_by_user_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"format" text DEFAULT 'zip' NOT NULL,
	"include_audit_events" boolean DEFAULT true NOT NULL,
	"filters" jsonb,
	"artifact_url" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"raw" jsonb NOT NULL,
	"parsed_date" date,
	"parsed_amount_minor" bigint,
	"parsed_description" text,
	"proposed_category_id" uuid,
	"proposed_merchant_id" uuid,
	"validation_status" text DEFAULT 'pending' NOT NULL,
	"validation_message" text,
	"committed_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid,
	"saved_mapping_id" uuid,
	"source_kind" text DEFAULT 'csv' NOT NULL,
	"original_filename" text NOT NULL,
	"file_sha256" text NOT NULL,
	"status" text DEFAULT 'staged' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"accepted_row_count" integer DEFAULT 0 NOT NULL,
	"rejected_row_count" integer DEFAULT 0 NOT NULL,
	"committed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledgers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "merchant_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"account_id" uuid,
	"category_id" uuid NOT NULL,
	"merchant_id" uuid,
	"name" text NOT NULL,
	"match_type" text NOT NULL,
	"match_value" text NOT NULL,
	"normalized_match_value" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"website_url" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_import_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"account_id" uuid,
	"name" text NOT NULL,
	"source_kind" text DEFAULT 'csv' NOT NULL,
	"mapping" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"merchant_id" uuid,
	"date" date NOT NULL,
	"posted_date" date,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"raw_description" text NOT NULL,
	"display_name" text NOT NULL,
	"notes" text,
	"tags" text[],
	"review_status" text DEFAULT 'needs_review' NOT NULL,
	"transfer_status" text DEFAULT 'none' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_provider" text DEFAULT 'clerk' NOT NULL,
	"auth_provider_subject" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_proposed_category_id_categories_id_fk" FOREIGN KEY ("proposed_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_proposed_merchant_id_merchants_id_fk" FOREIGN KEY ("proposed_merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_saved_mapping_id_saved_import_mappings_id_fk" FOREIGN KEY ("saved_mapping_id") REFERENCES "public"."saved_import_mappings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_import_mappings" ADD CONSTRAINT "saved_import_mappings_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_import_mappings" ADD CONSTRAINT "saved_import_mappings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_ledger_active_idx" ON "accounts" USING btree ("ledger_id","is_active");--> statement-breakpoint
CREATE INDEX "accounts_ledger_type_idx" ON "accounts" USING btree ("ledger_id","type");--> statement-breakpoint
CREATE INDEX "audit_events_ledger_created_idx" ON "audit_events" USING btree ("ledger_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "balance_snapshots_account_date_unique" ON "balance_snapshots" USING btree ("account_id","as_of_date");--> statement-breakpoint
CREATE INDEX "balance_snapshots_ledger_date_idx" ON "balance_snapshots" USING btree ("ledger_id","as_of_date");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_ledger_slug_unique" ON "categories" USING btree ("ledger_id","slug");--> statement-breakpoint
CREATE INDEX "categories_ledger_parent_idx" ON "categories" USING btree ("ledger_id","parent_id");--> statement-breakpoint
CREATE INDEX "export_jobs_ledger_status_idx" ON "export_jobs" USING btree ("ledger_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "import_rows_import_row_unique" ON "import_rows" USING btree ("import_id","row_number");--> statement-breakpoint
CREATE INDEX "import_rows_import_status_idx" ON "import_rows" USING btree ("import_id","validation_status");--> statement-breakpoint
CREATE UNIQUE INDEX "imports_ledger_account_file_unique" ON "imports" USING btree ("ledger_id","account_id","file_sha256");--> statement-breakpoint
CREATE INDEX "imports_ledger_status_idx" ON "imports" USING btree ("ledger_id","status");--> statement-breakpoint
CREATE INDEX "ledgers_owner_user_idx" ON "ledgers" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "merchant_rules_lookup_idx" ON "merchant_rules" USING btree ("ledger_id","is_active","match_type");--> statement-breakpoint
CREATE INDEX "merchant_rules_account_idx" ON "merchant_rules" USING btree ("ledger_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_ledger_normalized_unique" ON "merchants" USING btree ("ledger_id","normalized_name");--> statement-breakpoint
CREATE INDEX "saved_import_mappings_ledger_idx" ON "saved_import_mappings" USING btree ("ledger_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_ledger_account_dedupe_unique" ON "transactions" USING btree ("ledger_id","account_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "transactions_ledger_date_idx" ON "transactions" USING btree ("ledger_id","date");--> statement-breakpoint
CREATE INDEX "transactions_ledger_account_date_idx" ON "transactions" USING btree ("ledger_id","account_id","date");--> statement-breakpoint
CREATE INDEX "transactions_ledger_review_idx" ON "transactions" USING btree ("ledger_id","review_status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_subject_unique" ON "users" USING btree ("auth_provider","auth_provider_subject");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");