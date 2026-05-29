CREATE TABLE "ledger_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger_settings" ADD CONSTRAINT "ledger_settings_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_settings_ledger_key_unique" ON "ledger_settings" USING btree ("ledger_id","key");--> statement-breakpoint
CREATE INDEX "ledger_settings_ledger_idx" ON "ledger_settings" USING btree ("ledger_id");