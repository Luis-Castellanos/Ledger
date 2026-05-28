import { createHash } from "node:crypto";
import { z } from "zod";
import { parseDollarAmount } from "./money";

export const importRowStatusSchema = z.enum(["accepted", "needs_review", "duplicate", "rejected"]);

export const stageImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  date: z.string().date(),
  description: z.string().trim().min(1).max(500),
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
  category: z.string().trim().min(1).max(120).default("Uncategorized"),
  status: importRowStatusSchema.default("needs_review"),
});

export const stageImportSchema = z.object({
  accountId: z.string().min(1),
  filename: z.string().trim().min(1).max(240),
  rows: z.array(stageImportRowSchema).min(1).max(1_000),
});

export const updateImportRowSchema = z.object({
  id: z.string().uuid(),
  category: z.string().trim().min(1).max(120).optional(),
  status: importRowStatusSchema.optional(),
});

export const importActionParamsSchema = z.object({
  id: z.string().uuid(),
});

export type StageImportInput = z.input<typeof stageImportSchema>;
export type StageImportRow = z.infer<typeof stageImportRowSchema>;
export type UpdateImportRowInput = z.infer<typeof updateImportRowSchema>;
export type ImportActionParams = z.infer<typeof importActionParamsSchema>;

export function buildImportFingerprint(input: { accountId: string; filename: string; rows: StageImportRow[] }) {
  const hash = createHash("sha256");
  hash.update(input.accountId);
  hash.update(input.filename);
  for (const row of input.rows) {
    hash.update(`${row.rowNumber}|${row.date}|${row.description}|${row.amount}|${row.category}|${row.status}`);
  }
  return hash.digest("hex");
}
