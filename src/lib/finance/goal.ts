import { z } from "zod";
import { parseDollarAmount } from "./money";

const dollarAmount = (options: { allowZero?: boolean } = {}) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((value, context) => {
      try {
        const minor = parseDollarAmount(value);
        if (minor < 0 || (!options.allowZero && minor === 0)) {
          context.addIssue({ code: "custom", message: "Enter a positive dollar amount." });
          return z.NEVER;
        }
        return minor;
      } catch {
        context.addIssue({ code: "custom", message: "Enter a valid dollar amount." });
        return z.NEVER;
      }
    });

export const goalStatusSchema = z.enum(["active", "achieved", "archived"]);

export const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmount: dollarAmount(),
  accountId: z.string().uuid().nullable().optional(),
  startingAmount: dollarAmount({ allowZero: true }).optional(),
  targetDate: z.string().date().nullable().optional(),
  color: z.string().trim().max(32).nullable().optional(),
});

export const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  targetAmount: dollarAmount().optional(),
  accountId: z.string().uuid().nullable().optional(),
  targetDate: z.string().date().nullable().optional(),
  status: goalStatusSchema.optional(),
  color: z.string().trim().max(32).nullable().optional(),
  /* adds to manual progress (no linked account) — negative withdraws */
  contribute: z
    .string()
    .trim()
    .min(1)
    .transform((value, context) => {
      try {
        return parseDollarAmount(value);
      } catch {
        context.addIssue({ code: "custom", message: "Enter a valid dollar amount." });
        return z.NEVER;
      }
    })
    .optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export type GoalProgressInput = {
  accountId: string | null;
  startingAmountMinor: number;
  manualProgressMinor: number;
  targetAmountMinor: number;
};

/*
 * Linked goals read progress from the account's latest balance relative to
 * where it started; unlinked goals track manual contributions.
 */
export function goalProgressMinor(goal: GoalProgressInput, latestAccountBalanceMinor: number | null): number {
  if (goal.accountId && latestAccountBalanceMinor !== null) {
    return Math.max(0, latestAccountBalanceMinor - goal.startingAmountMinor);
  }
  return Math.max(0, goal.manualProgressMinor);
}

export function goalPercent(progressMinor: number, targetAmountMinor: number): number {
  if (targetAmountMinor <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((progressMinor / targetAmountMinor) * 100));
}
