import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

loadEnvFile(".env.local");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const categories = [
  { name: "Income", slug: "income", flowType: "income", color: "#57b89d", icon: "banknote", children: [
    { name: "Payroll", slug: "income-payroll", flowType: "income", color: "#57b89d", icon: "briefcase" },
    { name: "Interest", slug: "income-interest", flowType: "income", color: "#57b89d", icon: "percent" },
    { name: "Other Income", slug: "income-other", flowType: "income", color: "#57b89d", icon: "plus" },
  ] },
  { name: "Housing", slug: "housing", flowType: "expense", color: "#d76b64", icon: "home", children: [
    { name: "Mortgage or Rent", slug: "housing-mortgage-rent", flowType: "expense", color: "#d76b64", icon: "home" },
    { name: "Utilities", slug: "housing-utilities", flowType: "expense", color: "#d76b64", icon: "plug" },
    { name: "Maintenance", slug: "housing-maintenance", flowType: "expense", color: "#d76b64", icon: "wrench" },
  ] },
  { name: "Food", slug: "food", flowType: "expense", color: "#d5b96a", icon: "utensils", children: [
    { name: "Groceries", slug: "food-groceries", flowType: "expense", color: "#d5b96a", icon: "shopping-basket" },
    { name: "Restaurants", slug: "food-restaurants", flowType: "expense", color: "#d5b96a", icon: "utensils" },
    { name: "Coffee", slug: "food-coffee", flowType: "expense", color: "#d5b96a", icon: "coffee" },
  ] },
  { name: "Transportation", slug: "transportation", flowType: "expense", color: "#3f8cc8", icon: "car", children: [
    { name: "Fuel", slug: "transportation-fuel", flowType: "expense", color: "#3f8cc8", icon: "fuel" },
    { name: "Insurance", slug: "transportation-insurance", flowType: "expense", color: "#3f8cc8", icon: "shield" },
    { name: "Transit", slug: "transportation-transit", flowType: "expense", color: "#3f8cc8", icon: "train" },
  ] },
  { name: "Lifestyle", slug: "lifestyle", flowType: "expense", color: "#7860ad", icon: "sparkles", children: [
    { name: "Shopping", slug: "lifestyle-shopping", flowType: "expense", color: "#7860ad", icon: "shopping-bag" },
    { name: "Subscriptions", slug: "lifestyle-subscriptions", flowType: "expense", color: "#7860ad", icon: "repeat" },
    { name: "Travel", slug: "lifestyle-travel", flowType: "expense", color: "#7860ad", icon: "plane" },
  ] },
  { name: "Transfers", slug: "transfers", flowType: "transfer", color: "#7f8a86", icon: "arrow-left-right", children: [
    { name: "Internal Transfer", slug: "transfers-internal", flowType: "transfer", color: "#7f8a86", icon: "arrow-left-right" },
    { name: "Credit Card Payment", slug: "transfers-credit-card-payment", flowType: "transfer", color: "#7f8a86", icon: "credit-card" },
  ] },
];

const sampleAccounts = [
  { name: "Operating Checking", institution: "Chase", mask: "1842", type: "checking", assetClass: "asset", balanceMinor: 1829041, sortOrder: 10 },
  { name: "High Yield Reserve", institution: "Ally", mask: "4209", type: "savings", assetClass: "asset", balanceMinor: 4829012, sortOrder: 20 },
  { name: "Rewards Card", institution: "Amex", mask: "9001", type: "credit_card", assetClass: "liability", balanceMinor: -284122, sortOrder: 30 },
  { name: "Taxable Brokerage", institution: "Fidelity", mask: "7310", type: "brokerage", assetClass: "asset", balanceMinor: 12783455, sortOrder: 40 },
];

const sampleTransactions = [
  { key: "payroll", date: "2026-05-27", merchant: "Payroll deposit", raw: "PAYROLL DIRECT DEP", account: "Operating Checking", category: "Payroll", amountMinor: 544000, status: "reviewed", tags: ["payroll"], transferStatus: "none" },
  { key: "mortgage", date: "2026-05-26", merchant: "Mortgage payment", raw: "ACH MORTGAGE PAYMENT", account: "Operating Checking", category: "Mortgage or Rent", amountMinor: -285000, status: "reviewed", tags: ["housing"], transferStatus: "none" },
  { key: "costco", date: "2026-05-25", merchant: "Costco", raw: "COSTCO WHSE #481", account: "Rewards Card", category: "Shopping", amountMinor: -10088, status: "needs_review", tags: ["household", "bulk"], transferStatus: "none" },
  { key: "apple", date: "2026-05-24", merchant: "Apple Music", raw: "APPLE.COM/BILL", account: "Rewards Card", category: "Subscriptions", amountMinor: -999, status: "needs_review", tags: ["subscription"], transferStatus: "none" },
  { key: "interest", date: "2026-05-23", merchant: "Ally Interest", raw: "ALLY BANK INTEREST", account: "High Yield Reserve", category: "Interest", amountMinor: 4218, status: "reviewed", tags: ["interest"], transferStatus: "none" },
  { key: "transfer-out", date: "2026-05-22", merchant: "Internal transfer", raw: "ONLINE TRANSFER TO SAV", account: "Operating Checking", category: "Internal Transfer", amountMinor: -150000, status: "reviewed", tags: ["transfer"], transferStatus: "transfer" },
  { key: "groceries", date: "2026-05-21", merchant: "Trader Joe's", raw: "TRADER JOE'S #239", account: "Rewards Card", category: "Groceries", amountMinor: -4218, status: "needs_review", tags: ["food"], transferStatus: "none" },
  { key: "coffee", date: "2026-05-20", merchant: "Blue Bottle Coffee", raw: "BLUE BOTTLE COFFEE", account: "Rewards Card", category: "Coffee", amountMinor: -684, status: "needs_review", tags: ["coffee"], transferStatus: "none" },
  { key: "utility", date: "2026-05-19", merchant: "PG&E", raw: "PG&E WEB PAYMENT", account: "Operating Checking", category: "Utilities", amountMinor: -14873, status: "reviewed", tags: ["utilities"], transferStatus: "none" },
  { key: "brokerage-dividend", date: "2026-05-18", merchant: "Dividend reinvestment", raw: "FIDELITY DIVIDEND", account: "Taxable Brokerage", category: "Interest", amountMinor: 8821, status: "reviewed", tags: ["investment"], transferStatus: "none" },
];

const sampleDocuments = [
  { fileName: "Fidelity_Brokerage_2026-05.pdf", detectedType: "investment", issuer: "Fidelity", period: "05/01/2026 - 05/31/2026", account: "Taxable Brokerage", status: "uploaded", bytes: 418_000 },
  { fileName: "Chase_Credit_Card_2026-04.pdf", detectedType: "credit_card", issuer: "Chase", period: "04/02/2026 - 05/01/2026", account: "Rewards Card", status: "deferred", bytes: 305_000 },
  { fileName: "Paystub_2026-05-15.pdf", detectedType: "paystub", issuer: "Employer Payroll", period: "05/01/2026 - 05/15/2026", account: "Operating Checking", status: "deferred", bytes: 226_000 },
];

async function main() {
  const [targetUser] = await sql`
    select id, email
    from users
    order by created_at desc
    limit 1
  `;

  if (!targetUser) {
    throw new Error("No users exist yet. Sign in once before seeding demo data.");
  }

  const ledger = await getOrCreateLedger(targetUser.id);
  const categoryByName = await seedCategories(ledger.id);
  const accountByName = await seedAccounts(ledger.id);
  await seedBalanceSnapshots(ledger.id, accountByName);
  const merchantByName = await seedMerchants(ledger.id);
  await seedTransactions(ledger.id, accountByName, categoryByName, merchantByName);
  await seedFilesAndImports(ledger.id, targetUser.id, accountByName, categoryByName);
  await seedRules(ledger.id, accountByName, categoryByName, merchantByName);
  await seedAuditEvent(ledger.id, targetUser.id);

  const [counts] = await sql`
    select
      (select count(*) from accounts where ledger_id = ${ledger.id} and deleted_at is null) as accounts,
      (select count(*) from transactions where ledger_id = ${ledger.id} and deleted_at is null) as transactions,
      (select count(*) from documents where ledger_id = ${ledger.id} and deleted_at is null) as documents,
      (select count(*) from imports where ledger_id = ${ledger.id}) as imports,
      (select count(*) from merchant_rules where ledger_id = ${ledger.id} and deleted_at is null) as rules
  `;

  console.log(`Seeded ${ledger.name} for ${targetUser.email}.`);
  console.log(`Counts: ${counts.accounts} accounts, ${counts.transactions} transactions, ${counts.documents} files, ${counts.imports} imports, ${counts.rules} rules.`);
}

async function getOrCreateLedger(userId) {
  const [existing] = await sql`
    select id, name
    from ledgers
    where owner_user_id = ${userId} and deleted_at is null
    limit 1
  `;

  if (existing) return existing;

  const [created] = await sql`
    insert into ledgers (owner_user_id, name, default_currency)
    values (${userId}, 'Personal ledger', 'USD')
    returning id, name
  `;
  return created;
}

async function seedCategories(ledgerId) {
  const parentIdBySlug = new Map();

  for (const [index, category] of categories.entries()) {
    const [row] = await sql`
      insert into categories (ledger_id, name, slug, flow_type, color, icon, sort_order, is_system)
      values (${ledgerId}, ${category.name}, ${category.slug}, ${category.flowType}, ${category.color}, ${category.icon}, ${index}, true)
      on conflict (ledger_id, slug) do update set
        name = excluded.name,
        flow_type = excluded.flow_type,
        color = excluded.color,
        icon = excluded.icon,
        updated_at = now()
      returning id, name, slug
    `;
    parentIdBySlug.set(category.slug, row.id);
  }

  for (const [parentIndex, parent] of categories.entries()) {
    for (const [childIndex, child] of (parent.children ?? []).entries()) {
      await sql`
        insert into categories (ledger_id, parent_id, name, slug, flow_type, color, icon, sort_order, is_system)
        values (${ledgerId}, ${parentIdBySlug.get(parent.slug)}, ${child.name}, ${child.slug}, ${child.flowType}, ${child.color}, ${child.icon}, ${parentIndex * 100 + childIndex}, true)
        on conflict (ledger_id, slug) do update set
          name = excluded.name,
          parent_id = excluded.parent_id,
          flow_type = excluded.flow_type,
          color = excluded.color,
          icon = excluded.icon,
          updated_at = now()
      `;
    }
  }

  const rows = await sql`select id, name from categories where ledger_id = ${ledgerId} and deleted_at is null`;
  return new Map(rows.map((row) => [row.name, row.id]));
}

async function seedAccounts(ledgerId) {
  const byName = new Map();

  for (const account of sampleAccounts) {
    const [existing] = await sql`
      select id
      from accounts
      where ledger_id = ${ledgerId} and name = ${account.name} and deleted_at is null
      limit 1
    `;

    const accountId = existing?.id ?? randomUUID();

    if (existing) {
      await sql`
        update accounts
        set institution = ${account.institution},
            mask = ${account.mask},
            type = ${account.type},
            asset_class = ${account.assetClass},
            currency = 'USD',
            is_active = true,
            is_hidden = false,
            sort_order = ${account.sortOrder},
            updated_at = now()
        where id = ${accountId}
      `;
    } else {
      await sql`
        insert into accounts (id, ledger_id, name, institution, mask, type, asset_class, currency, sort_order, notes)
        values (${accountId}, ${ledgerId}, ${account.name}, ${account.institution}, ${account.mask}, ${account.type}, ${account.assetClass}, 'USD', ${account.sortOrder}, 'Demo account seeded for UI review.')
      `;
    }

    byName.set(account.name, accountId);
  }

  return byName;
}

async function seedBalanceSnapshots(ledgerId, accountByName) {
  for (const account of sampleAccounts) {
    const accountId = accountByName.get(account.name);
    await sql`
      insert into balance_snapshots (ledger_id, account_id, as_of_date, balance_minor, currency, source)
      values (${ledgerId}, ${accountId}, '2026-05-31', ${account.balanceMinor}, 'USD', 'demo_seed')
      on conflict (account_id, as_of_date) do update set
        balance_minor = excluded.balance_minor,
        currency = excluded.currency,
        source = excluded.source
    `;
  }
}

async function seedMerchants(ledgerId) {
  const byName = new Map();
  const names = [...new Set(sampleTransactions.map((transaction) => transaction.merchant))];

  for (const name of names) {
    const normalized = normalize(name);
    const [row] = await sql`
      insert into merchants (ledger_id, name, normalized_name)
      values (${ledgerId}, ${name}, ${normalized})
      on conflict (ledger_id, normalized_name) where deleted_at is null do update set
        name = excluded.name,
        updated_at = now()
      returning id, name
    `;
    byName.set(name, row.id);
  }

  return byName;
}

async function seedTransactions(ledgerId, accountByName, categoryByName, merchantByName) {
  for (const transaction of sampleTransactions) {
    const accountId = accountByName.get(transaction.account);
    const categoryId = categoryByName.get(transaction.category);
    const merchantId = merchantByName.get(transaction.merchant);
    const dedupeKey = `demo:${transaction.key}`;

    await sql`
      insert into transactions (
        ledger_id, account_id, category_id, merchant_id, date, posted_date, amount_minor, currency,
        raw_description, display_name, notes, tags, review_status, transfer_status, source, dedupe_key
      )
      values (
        ${ledgerId}, ${accountId}, ${categoryId}, ${merchantId}, ${transaction.date}, ${transaction.date}, ${transaction.amountMinor}, 'USD',
        ${transaction.raw}, ${transaction.merchant}, 'Seeded demo transaction.', ${transaction.tags}, ${transaction.status}, ${transaction.transferStatus}, 'demo_seed', ${dedupeKey}
      )
      on conflict (ledger_id, account_id, dedupe_key) where deleted_at is null do update set
        category_id = excluded.category_id,
        merchant_id = excluded.merchant_id,
        date = excluded.date,
        posted_date = excluded.posted_date,
        amount_minor = excluded.amount_minor,
        raw_description = excluded.raw_description,
        display_name = excluded.display_name,
        tags = excluded.tags,
        review_status = excluded.review_status,
        transfer_status = excluded.transfer_status,
        source = excluded.source,
        updated_at = now()
    `;
  }
}

async function seedFilesAndImports(ledgerId, userId, accountByName, categoryByName) {
  for (const document of sampleDocuments) {
    const accountId = accountByName.get(document.account);
    const hash = sha256(`demo:${document.fileName}`);
    await sql`
      insert into documents (
        ledger_id, account_id, uploaded_by_user_id, file_name, mime_type, byte_size, file_sha256,
        detected_type, detected_issuer, statement_period, status, transaction_count, storage_key, metadata
      )
      values (
        ${ledgerId}, ${accountId}, ${userId}, ${document.fileName}, 'application/pdf', ${document.bytes}, ${hash},
        ${document.detectedType}, ${document.issuer}, ${document.period}, ${document.status}, 0, ${`demo/${document.fileName}`}, ${JSON.stringify({ seeded: true })}
      )
      on conflict (ledger_id, file_sha256) where deleted_at is null do update set
        account_id = excluded.account_id,
        detected_type = excluded.detected_type,
        detected_issuer = excluded.detected_issuer,
        statement_period = excluded.statement_period,
        status = excluded.status,
        updated_at = now()
    `;
  }

  const accountId = accountByName.get("Operating Checking");
  const mappingId = await seedImportMapping(ledgerId, accountId);
  const fileHash = sha256("demo:chase-checking-may.csv");
  const [importBatch] = await sql`
    insert into imports (
      ledger_id, account_id, uploaded_by_user_id, saved_mapping_id, source_kind, original_filename,
      file_sha256, status, row_count, accepted_row_count, rejected_row_count
    )
    values (${ledgerId}, ${accountId}, ${userId}, ${mappingId}, 'csv', 'chase-checking-may.csv', ${fileHash}, 'staged', 5, 2, 1)
    on conflict (ledger_id, account_id, file_sha256) do update set
      status = excluded.status,
      row_count = excluded.row_count,
      accepted_row_count = excluded.accepted_row_count,
      rejected_row_count = excluded.rejected_row_count,
      updated_at = now()
    returning id
  `;

  const importRows = [
    { row: 12, date: "2026-05-24", description: "APPLE.COM/BILL", category: "Subscriptions", amount: -999, status: "accepted" },
    { row: 13, date: "2026-05-24", description: "COSTCO WHSE #481", category: "Shopping", amount: -10088, status: "needs_review" },
    { row: 14, date: "2026-05-23", description: "ONLINE TRANSFER TO SAV", category: "Internal Transfer", amount: -150000, status: "accepted" },
    { row: 15, date: "2026-05-22", description: "POS 7 ELEVEN 39148", category: "Groceries", amount: -518, status: "duplicate" },
    { row: 16, date: null, description: "", category: "Uncategorized", amount: 0, status: "rejected", message: "Missing date and description." },
  ];

  for (const row of importRows) {
    await sql`
      insert into import_rows (
        import_id, row_number, raw, parsed_date, parsed_amount_minor, parsed_description,
        proposed_category_id, validation_status, validation_message
      )
      values (
        ${importBatch.id}, ${row.row}, ${JSON.stringify(row)}, ${row.date}, ${row.amount}, ${row.description},
        ${categoryByName.get(row.category) ?? null}, ${row.status}, ${row.message ?? null}
      )
      on conflict (import_id, row_number) do update set
        raw = excluded.raw,
        parsed_date = excluded.parsed_date,
        parsed_amount_minor = excluded.parsed_amount_minor,
        parsed_description = excluded.parsed_description,
        proposed_category_id = excluded.proposed_category_id,
        validation_status = excluded.validation_status,
        validation_message = excluded.validation_message
    `;
  }
}

async function seedImportMapping(ledgerId, accountId) {
  const [existing] = await sql`
    select id
    from saved_import_mappings
    where ledger_id = ${ledgerId} and name = 'Standard CSV'
    limit 1
  `;

  if (existing) return existing.id;

  const [created] = await sql`
    insert into saved_import_mappings (ledger_id, account_id, name, source_kind, mapping)
    values (${ledgerId}, ${accountId}, 'Standard CSV', 'csv', ${JSON.stringify({
      date: "Date",
      description: "Description",
      amount: "Amount",
      category: "Category",
    })})
    returning id
  `;
  return created.id;
}

async function seedRules(ledgerId, accountByName, categoryByName, merchantByName) {
  const rules = [
    { name: "Apple subscriptions", matchType: "contains", matchValue: "APPLE.COM/BILL", category: "Subscriptions", merchant: "Apple Music", priority: 40 },
    { name: "Costco shopping", matchType: "contains", matchValue: "COSTCO", category: "Shopping", merchant: "Costco", priority: 70 },
    { name: "Payroll deposits", matchType: "contains", matchValue: "PAYROLL", category: "Payroll", merchant: "Payroll deposit", priority: 20, account: "Operating Checking" },
  ];

  for (const rule of rules) {
    const [existing] = await sql`
      select id
      from merchant_rules
      where ledger_id = ${ledgerId} and name = ${rule.name} and deleted_at is null
      limit 1
    `;

    if (existing) {
      await sql`
        update merchant_rules
        set account_id = ${rule.account ? accountByName.get(rule.account) : null},
            category_id = ${categoryByName.get(rule.category)},
            merchant_id = ${merchantByName.get(rule.merchant) ?? null},
            match_type = ${rule.matchType},
            match_value = ${rule.matchValue},
            normalized_match_value = ${normalize(rule.matchValue)},
            priority = ${rule.priority},
            is_active = true,
            updated_at = now()
        where id = ${existing.id}
      `;
    } else {
      await sql`
        insert into merchant_rules (
          ledger_id, account_id, category_id, merchant_id, name, match_type, match_value,
          normalized_match_value, priority, is_active
        )
        values (
          ${ledgerId}, ${rule.account ? accountByName.get(rule.account) : null}, ${categoryByName.get(rule.category)},
          ${merchantByName.get(rule.merchant) ?? null}, ${rule.name}, ${rule.matchType}, ${rule.matchValue},
          ${normalize(rule.matchValue)}, ${rule.priority}, true
        )
      `;
    }
  }
}

async function seedAuditEvent(ledgerId, userId) {
  await sql`
    insert into audit_events (ledger_id, actor_user_id, action, entity_type, entity_id, after, metadata)
    values (${ledgerId}, ${userId}, 'demo.seeded', 'ledger', ${ledgerId}, ${JSON.stringify({ seeded: true })}, ${JSON.stringify({ source: "scripts/seed-demo-ledger.mjs" })})
  `;
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function loadEnvFile(path) {
  let contents = "";
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^"|"$/g, "");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
