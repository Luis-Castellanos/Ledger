import { z } from "zod";
import { parseDollarAmount } from "./money";

export const transactionStatusSchema = z.enum(["needs_review", "reviewed", "excluded"]);
export const transactionTransferStatusSchema = z.enum(["none", "transfer"]);

export const createManualTransactionSchema = z.object({
  date: z.string().date(),
  accountId: z.string().min(1),
  merchant: z.string().trim().min(1).max(240),
  categoryName: z.string().trim().min(1).max(120).optional(),
  amount: z
    .string()
    .trim()
    .min(1)
    .transform((value, context) => {
      try {
        return parseDollarAmount(value);
      } catch {
        context.addIssue({ code: "custom", message: "Enter a valid signed dollar amount." });
        return z.NEVER;
      }
    }),
  notes: z.string().trim().max(2_000).optional(),
});

export const updateTransactionReviewSchema = z.object({
  id: z.string().uuid(),
  reviewStatus: transactionStatusSchema.optional(),
  transferStatus: transactionTransferStatusSchema.optional(),
  categoryName: z.string().trim().min(1).max(120).optional(),
  action: z.enum(["delete", "restore"]).optional(),
});

export type CreateManualTransactionInput = z.infer<typeof createManualTransactionSchema>;
export type UpdateTransactionReviewInput = z.infer<typeof updateTransactionReviewSchema>;
export type TransactionTransferStatus = z.infer<typeof transactionTransferStatusSchema>;
