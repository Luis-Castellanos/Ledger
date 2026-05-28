import { relations, sql } from "drizzle-orm";
import { bigint, boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authProvider: text("auth_provider").notNull().default("clerk"),
    authProviderSubject: text("auth_provider_subject").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (table) => ({
    authSubjectUnique: uniqueIndex("users_auth_subject_unique").on(table.authProvider, table.authProviderSubject),
    emailIdx: index("users_email_idx").on(table.email),
  }),
);

export const ledgers = pgTable(
  "ledgers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id),
    name: text("name").notNull(),
    defaultCurrency: text("default_currency").notNull().default("USD"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    ownerActiveUnique: uniqueIndex("ledgers_owner_active_unique").on(table.ownerUserId).where(sql`${table.deletedAt} is null`),
    ownerIdx: index("ledgers_owner_user_idx").on(table.ownerUserId),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    name: text("name").notNull(),
    institution: text("institution"),
    mask: text("mask"),
    type: text("type").notNull(),
    assetClass: text("asset_class").notNull(),
    currency: text("currency").notNull().default("USD"),
    openedOn: date("opened_on"),
    closedOn: date("closed_on"),
    isActive: boolean("is_active").notNull().default(true),
    isHidden: boolean("is_hidden").notNull().default(false),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    activeIdx: index("accounts_ledger_active_idx").on(table.ledgerId, table.isActive),
    typeIdx: index("accounts_ledger_type_idx").on(table.ledgerId, table.type),
  }),
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    flowType: text("flow_type").notNull(),
    color: text("color"),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    isSystem: boolean("is_system").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    slugUnique: uniqueIndex("categories_ledger_slug_unique").on(table.ledgerId, table.slug),
    parentIdx: index("categories_ledger_parent_idx").on(table.ledgerId, table.parentId),
  }),
);

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    websiteUrl: text("website_url"),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    normalizedUnique: uniqueIndex("merchants_ledger_normalized_unique").on(table.ledgerId, table.normalizedName),
  }),
);

export const merchantRules = pgTable(
  "merchant_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    accountId: uuid("account_id").references(() => accounts.id),
    categoryId: uuid("category_id").notNull().references(() => categories.id),
    merchantId: uuid("merchant_id").references(() => merchants.id),
    name: text("name").notNull(),
    matchType: text("match_type").notNull(),
    matchValue: text("match_value").notNull(),
    normalizedMatchValue: text("normalized_match_value").notNull(),
    priority: integer("priority").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    lastAppliedAt: timestamp("last_applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    lookupIdx: index("merchant_rules_lookup_idx").on(table.ledgerId, table.isActive, table.matchType),
    accountIdx: index("merchant_rules_account_idx").on(table.ledgerId, table.accountId),
  }),
);

export const savedImportMappings = pgTable(
  "saved_import_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    accountId: uuid("account_id").references(() => accounts.id),
    name: text("name").notNull(),
    sourceKind: text("source_kind").notNull().default("csv"),
    mapping: jsonb("mapping").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ledgerIdx: index("saved_import_mappings_ledger_idx").on(table.ledgerId),
  }),
);

export const imports = pgTable(
  "imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    accountId: uuid("account_id").notNull().references(() => accounts.id),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
    savedMappingId: uuid("saved_mapping_id").references(() => savedImportMappings.id),
    sourceKind: text("source_kind").notNull().default("csv"),
    originalFilename: text("original_filename").notNull(),
    fileSha256: text("file_sha256").notNull(),
    status: text("status").notNull().default("staged"),
    rowCount: integer("row_count").notNull().default(0),
    acceptedRowCount: integer("accepted_row_count").notNull().default(0),
    rejectedRowCount: integer("rejected_row_count").notNull().default(0),
    committedAt: timestamp("committed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    fileUnique: uniqueIndex("imports_ledger_account_file_unique").on(table.ledgerId, table.accountId, table.fileSha256),
    statusIdx: index("imports_ledger_status_idx").on(table.ledgerId, table.status),
  }),
);

export const importRows = pgTable(
  "import_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importId: uuid("import_id").notNull().references(() => imports.id),
    rowNumber: integer("row_number").notNull(),
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull(),
    parsedDate: date("parsed_date"),
    parsedAmountMinor: bigint("parsed_amount_minor", { mode: "number" }),
    parsedDescription: text("parsed_description"),
    proposedCategoryId: uuid("proposed_category_id").references(() => categories.id),
    proposedMerchantId: uuid("proposed_merchant_id").references(() => merchants.id),
    validationStatus: text("validation_status").notNull().default("pending"),
    validationMessage: text("validation_message"),
    committedTransactionId: uuid("committed_transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    importRowUnique: uniqueIndex("import_rows_import_row_unique").on(table.importId, table.rowNumber),
    statusIdx: index("import_rows_import_status_idx").on(table.importId, table.validationStatus),
  }),
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    accountId: uuid("account_id").notNull().references(() => accounts.id),
    categoryId: uuid("category_id").references(() => categories.id),
    merchantId: uuid("merchant_id").references(() => merchants.id),
    date: date("date").notNull(),
    postedDate: date("posted_date"),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("USD"),
    rawDescription: text("raw_description").notNull(),
    displayName: text("display_name").notNull(),
    notes: text("notes"),
    tags: text("tags").array(),
    reviewStatus: text("review_status").notNull().default("needs_review"),
    transferStatus: text("transfer_status").notNull().default("none"),
    source: text("source").notNull().default("manual"),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    dedupeUnique: uniqueIndex("transactions_ledger_account_dedupe_unique").on(table.ledgerId, table.accountId, table.dedupeKey),
    dateIdx: index("transactions_ledger_date_idx").on(table.ledgerId, table.date),
    accountDateIdx: index("transactions_ledger_account_date_idx").on(table.ledgerId, table.accountId, table.date),
    reviewIdx: index("transactions_ledger_review_idx").on(table.ledgerId, table.reviewStatus),
  }),
);

export const balanceSnapshots = pgTable(
  "balance_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    accountId: uuid("account_id").notNull().references(() => accounts.id),
    asOfDate: date("as_of_date").notNull(),
    balanceMinor: bigint("balance_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("USD"),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountDateUnique: uniqueIndex("balance_snapshots_account_date_unique").on(table.accountId, table.asOfDate),
    ledgerDateIdx: index("balance_snapshots_ledger_date_idx").on(table.ledgerId, table.asOfDate),
  }),
);

export const exportJobs = pgTable(
  "export_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
    status: text("status").notNull().default("queued"),
    format: text("format").notNull().default("zip"),
    includeAuditEvents: boolean("include_audit_events").notNull().default(true),
    filters: jsonb("filters").$type<Record<string, unknown>>(),
    artifactUrl: text("artifact_url"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    statusIdx: index("export_jobs_ledger_status_idx").on(table.ledgerId, table.status),
  }),
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdIdx: index("audit_events_ledger_created_idx").on(table.ledgerId, table.createdAt),
  }),
);

export const userRelations = relations(users, ({ many }) => ({
  ledgers: many(ledgers),
}));

export const ledgerRelations = relations(ledgers, ({ one, many }) => ({
  owner: one(users, { fields: [ledgers.ownerUserId], references: [users.id] }),
  accounts: many(accounts),
  categories: many(categories),
  merchants: many(merchants),
  merchantRules: many(merchantRules),
  imports: many(imports),
  transactions: many(transactions),
  balanceSnapshots: many(balanceSnapshots),
  exportJobs: many(exportJobs),
}));
