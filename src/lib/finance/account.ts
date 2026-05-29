import { z } from "zod";
import { parseDollarAmount } from "./money";

export const accountTypeSchema = z.enum(["checking", "savings", "credit_card", "cash", "brokerage", "loan", "mortgage", "other"]);
export const assetClassSchema = z.enum(["asset", "liability"]);

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  institution: z.string().trim().max(120).optional(),
  mask: z.string().trim().regex(/^\d{2,6}$/).optional(),
  type: accountTypeSchema,
  assetClass: assetClassSchema,
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  openedOn: z.string().date().optional(),
  notes: z.string().trim().max(2_000).optional(),
  isHidden: z.boolean().default(false),
});

export const updateAccountLifecycleSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["close", "reopen"]),
  closedOn: z.string().date().optional(),
});

export const createBalanceSnapshotSchema = z.object({
  accountId: z.string().min(1),
  asOfDate: z.string().date(),
  balance: z
    .string()
    .trim()
    .min(1)
    .transform((value, context) => {
      try {
        return parseDollarAmount(value);
      } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid balance amount" });
        return z.NEVER;
      }
    }),
});
export const createBalanceSnapshotApiSchema = createBalanceSnapshotSchema.extend({
  accountId: z.string().uuid(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountLifecycleInput = z.infer<typeof updateAccountLifecycleSchema>;
export type CreateBalanceSnapshotInput = z.infer<typeof createBalanceSnapshotSchema>;
