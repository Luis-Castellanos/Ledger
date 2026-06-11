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
  categoryId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().transform((tags) => (tags ? normalizeTags(tags) : undefined)),
  action: z.enum(["delete", "restore"]).optional(),
});

export type CreateManualTransactionInput = z.infer<typeof createManualTransactionSchema>;
export type UpdateTransactionReviewInput = z.infer<typeof updateTransactionReviewSchema>;
export type TransactionTransferStatus = z.infer<typeof transactionTransferStatusSchema>;

export const transactionSortSchema = z.enum([
  "date_desc",
  "date_asc",
  "amount_desc",
  "amount_asc",
  "merchant_asc",
  "merchant_desc",
]);
export type TransactionSort = z.infer<typeof transactionSortSchema>;

export const transactionListQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  uncategorized: z.enum(["true"]).optional(),
  status: transactionStatusSchema.optional(),
  transfer: transactionTransferStatusSchema.optional(),
  direction: z.enum(["inflow", "outflow"]).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  sort: transactionSortSchema.default("date_desc"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  cursor: z.string().max(600).optional(),
});
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

export type TransactionCursor = {
  /* primary sort value: date string, amountMinor number, or merchant name */
  v: string | number;
  /* createdAt ISO tiebreak, only present for date sorts */
  c?: string;
  id: string;
};

export function encodeTransactionCursor(cursor: TransactionCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeTransactionCursor(raw: string): TransactionCursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.id !== "string") {
      return null;
    }
    if (typeof candidate.v !== "string" && typeof candidate.v !== "number") {
      return null;
    }
    if (candidate.c !== undefined && typeof candidate.c !== "string") {
      return null;
    }
    return { v: candidate.v, c: candidate.c as string | undefined, id: candidate.id };
  } catch {
    return null;
  }
}

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
