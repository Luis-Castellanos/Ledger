import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, isNull, lt, ne, sql } from "drizzle-orm";
import { getOrCreateCurrentLedger } from "@/lib/auth/current-ledger";
import { getDb } from "@/lib/db/client";
import { auditEvents, budgets, categories, transactions } from "@/lib/db/schema";
import { budgetMonthBounds, budgetMonthSchema, deleteBudgetSchema, rollUpSpending, upsertBudgetSchema } from "@/lib/finance/budget";
import { parseJsonRequest } from "@/lib/http/request";
import { checkUserMutationRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthParam = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const month = budgetMonthSchema.safeParse(monthParam);
  if (!month.success) {
    return NextResponse.json({ error: "Invalid budgets month" }, { status: 400 });
  }

  const { start, end } = budgetMonthBounds(month.data);
  const db = getDb();

  const [budgetRows, categoryRows, spentRows] = await Promise.all([
    db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        amountMinor: budgets.amountMinor,
        notes: budgets.notes,
      })
      .from(budgets)
      .where(and(eq(budgets.ledgerId, context.ledger.id), eq(budgets.month, start), isNull(budgets.deletedAt))),
    db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        name: categories.name,
        color: categories.color,
        icon: categories.icon,
        flowType: categories.flowType,
      })
      .from(categories)
      .where(and(eq(categories.ledgerId, context.ledger.id), isNull(categories.deletedAt))),
    db
      .select({
        categoryId: transactions.categoryId,
        spentMinor: sql<number>`coalesce(sum(case when ${transactions.amountMinor} < 0 then -${transactions.amountMinor} else 0 end), 0)::bigint`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.ledgerId, context.ledger.id),
          isNull(transactions.deletedAt),
          ne(transactions.reviewStatus, "excluded"),
          eq(transactions.transferStatus, "none"),
          gte(transactions.date, start),
          lt(transactions.date, end),
        ),
      )
      .groupBy(transactions.categoryId),
  ]);

  const spentByCategoryId = new Map<string, number>();
  let uncategorizedSpentMinor = 0;
  for (const row of spentRows) {
    if (row.categoryId) {
      spentByCategoryId.set(row.categoryId, Number(row.spentMinor));
    } else {
      uncategorizedSpentMinor = Number(row.spentMinor);
    }
  }

  const budgetedCategoryIds = new Set(budgetRows.map((row) => row.categoryId));
  const rolledUp = rollUpSpending(categoryRows, spentByCategoryId, budgetedCategoryIds);
  const categoryById = new Map(categoryRows.map((row) => [row.id, row]));

  const rows = budgetRows
    .map((row) => {
      const category = categoryById.get(row.categoryId);
      const spentMinor = rolledUp.get(row.categoryId) ?? 0;
      return {
        id: row.id,
        categoryId: row.categoryId,
        category: category?.name ?? "Unknown",
        color: category?.color ?? null,
        icon: category?.icon ?? null,
        amountMinor: Number(row.amountMinor),
        spentMinor,
        remainingMinor: Number(row.amountMinor) - spentMinor,
        notes: row.notes,
      };
    })
    .sort((left, right) => right.amountMinor - left.amountMinor);

  /* spending in expense categories that have no budget this month (own spending only) */
  const unbudgeted = categoryRows
    .filter((category) => !budgetedCategoryIds.has(category.id) && category.flowType === "expense")
    .map((category) => ({
      categoryId: category.id,
      category: category.name,
      spentMinor: spentByCategoryId.get(category.id) ?? 0,
    }))
    .filter((entry) => entry.spentMinor > 0)
    .sort((left, right) => right.spentMinor - left.spentMinor);

  return NextResponse.json({
    data: {
      month: month.data,
      rows,
      unbudgeted,
      uncategorizedSpentMinor,
      totals: {
        budgetedMinor: rows.reduce((sum, row) => sum + row.amountMinor, 0),
        spentMinor: rows.reduce((sum, row) => sum + row.spentMinor, 0),
      },
    },
  });
}

export async function POST(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "budgets");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, upsertBudgetSchema, "budget");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, parsed.data.categoryId), eq(categories.ledgerId, context.ledger.id), isNull(categories.deletedAt)))
    .limit(1);

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const { start } = budgetMonthBounds(parsed.data.month);
  const [existing] = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.ledgerId, context.ledger.id),
        eq(budgets.categoryId, parsed.data.categoryId),
        eq(budgets.month, start),
        isNull(budgets.deletedAt),
      ),
    )
    .limit(1);

  const budget = existing
    ? (
        await db
          .update(budgets)
          .set({ amountMinor: parsed.data.amount, notes: parsed.data.notes, updatedAt: new Date() })
          .where(and(eq(budgets.id, existing.id), eq(budgets.ledgerId, context.ledger.id)))
          .returning()
      )[0]
    : (
        await db
          .insert(budgets)
          .values({
            ledgerId: context.ledger.id,
            categoryId: parsed.data.categoryId,
            month: start,
            amountMinor: parsed.data.amount,
            currency: context.ledger.defaultCurrency ?? "USD",
            notes: parsed.data.notes,
          })
          .returning()
      )[0];

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: existing ? "budget.updated" : "budget.created",
    entityType: "budget",
    entityId: budget.id,
    before: existing ?? null,
    after: budget,
  });

  return NextResponse.json({ budget }, { status: existing ? 200 : 201 });
}

export async function DELETE(request: Request) {
  const context = await getOrCreateCurrentLedger();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkUserMutationRateLimit(context.user.id, "budgets");
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const parsed = await parseJsonRequest(request, deleteBudgetSchema, "budget delete");
  if (!parsed.ok) {
    return parsed.response;
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, parsed.data.id), eq(budgets.ledgerId, context.ledger.id), isNull(budgets.deletedAt)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  const [budget] = await db
    .update(budgets)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(budgets.id, parsed.data.id), eq(budgets.ledgerId, context.ledger.id)))
    .returning();

  await db.insert(auditEvents).values({
    ledgerId: context.ledger.id,
    actorUserId: context.user.id,
    action: "budget.deleted",
    entityType: "budget",
    entityId: budget.id,
    before: existing,
    after: budget,
  });

  return NextResponse.json({ budget });
}
