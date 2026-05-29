DROP INDEX "documents_ledger_file_sha_unique";--> statement-breakpoint
DROP INDEX "merchants_ledger_normalized_unique";--> statement-breakpoint
DROP INDEX "transactions_ledger_account_dedupe_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "documents_ledger_file_sha_unique" ON "documents" USING btree ("ledger_id","file_sha256") WHERE "documents"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_ledger_normalized_unique" ON "merchants" USING btree ("ledger_id","normalized_name") WHERE "merchants"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_ledger_account_dedupe_unique" ON "transactions" USING btree ("ledger_id","account_id","dedupe_key") WHERE "transactions"."deleted_at" is null;