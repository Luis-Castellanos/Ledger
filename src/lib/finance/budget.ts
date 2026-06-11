import { z } from "zod";
import { parseDollarAmount } from "./money";

export const budgetMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");

const positiveAmount = z
  .string()
  .trim()
  .min(1)
  .transform((value, context) => {
    try {
      const minor = parseDollarAmount(value);
      if (minor <= 0) {
        context.addIssue({ code: "custom", message: "Budgets must be a positive amount." });
        return z.NEVER;
      }
      return minor;
    } catch {
      context.addIssue({ code: "custom", message: "Enter a valid dollar amount." });
      return z.NEVER;
    }
  });

export const upsertBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  month: budgetMonthSchema,
  amount: positiveAmount,
  notes: z.string().trim().max(500).optional(),
});

export const deleteBudgetSchema = z.object({
  id: z.string().uuid(),
});

export const copyBudgetsSchema = z
  .object({
    fromMonth: budgetMonthSchema,
    toMonth: budgetMonthSchema,
  })
  .refine((value) => value.fromMonth !== value.toMonth, { message: "Choose two different months." });

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;

/* first day of month + exclusive upper bound, for date-range queries */
export function budgetMonthBounds(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${month}-01`;
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { start, end };
}

type CategoryNode = { id: string; parentId: string | null };

/*
 * Spending rolls up child categories into their parent so a budget set on
 * "Food" covers "Groceries" and "Restaurants" without double counting:
 * the rolled-up figure only counts children that don't carry their own budget.
 */
export function rollUpSpending(
  categories: CategoryNode[],
  spentByCategoryId: Map<string, number>,
  budgetedCategoryIds: Set<string>,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const category of categories) {
    result.set(category.id, spentByCategoryId.get(category.id) ?? 0);
  }
  for (const category of categories) {
    if (!category.parentId) {
      continue;
    }
    if (budgetedCategoryIds.has(category.id)) {
      continue;
    }
    const own = spentByCategoryId.get(category.id) ?? 0;
    if (own !== 0 && result.has(category.parentId)) {
      result.set(category.parentId, (result.get(category.parentId) ?? 0) + own);
    }
  }
  return result;
}
