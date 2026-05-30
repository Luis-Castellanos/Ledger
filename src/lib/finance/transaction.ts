import { createHash } from "node:crypto";
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
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().transform(normalizeTags),
});
export const createManualTransactionApiSchema = createManualTransactionSchema.extend({
  accountId: z.string().uuid(),
});

export const updateTransactionReviewSchema = z.object({
  id: z.string().uuid(),
  date: z.string().date().optional(),
  merchant: z.string().trim().min(1).max(240).optional(),
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
    })
    .optional(),
  notes: z.string().trim().max(2_000).optional(),
  reviewStatus: transactionStatusSchema.optional(),
  transferStatus: transactionTransferStatusSchema.optional(),
  categoryName: z.string().trim().min(1).max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().transform((tags) => (tags ? normalizeTags(tags) : undefined)),
  action: z.enum(["delete", "restore"]).optional(),
});

export type CreateManualTransactionInput = z.infer<typeof createManualTransactionSchema>;
export type UpdateTransactionReviewInput = z.infer<typeof updateTransactionReviewSchema>;
export type TransactionTransferStatus = z.infer<typeof transactionTransferStatusSchema>;

type TransactionDedupeIdentity = {
  ledgerId: string;
  accountId: string;
  date: string;
  amountMinor: number;
  rawDescription: string;
};

export function buildTransactionDedupeKey(input: {
  ledgerId: string;
  accountId: string;
  date: string;
  amountMinor: number;
  rawDescription: string;
}) {
  const payload = [
    input.ledgerId,
    input.accountId,
    input.date,
    input.amountMinor.toString(),
    normalizeDedupeDescription(input.rawDescription),
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

export function buildUpdatedTransactionDedupeKey(
  current: TransactionDedupeIdentity,
  patch: Partial<Omit<TransactionDedupeIdentity, "ledgerId">>,
) {
  return buildTransactionDedupeKey({
    ledgerId: current.ledgerId,
    accountId: patch.accountId ?? current.accountId,
    date: patch.date ?? current.date,
    amountMinor: patch.amountMinor ?? current.amountMinor,
    rawDescription: patch.rawDescription ?? current.rawDescription,
  });
}

export function parseTagList(value: string) {
  return normalizeTags(value.split(","));
}

function normalizeDedupeDescription(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeTags(tags: string[] | undefined) {
  if (!tags) {
    return undefined;
  }

  const normalized = tags.map((tag) => tag.trim()).filter(Boolean);
  return Array.from(new Set(normalized));
}
