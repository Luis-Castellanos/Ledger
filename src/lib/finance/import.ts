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
  savedMappingId: z.string().uuid().optional(),
  rows: z.array(stageImportRowSchema).min(1).max(1_000),
});
export const stageImportApiSchema = stageImportSchema.extend({
  accountId: z.string().uuid(),
});

export const savedImportMappingSchema = z.object({
  accountId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(120),
  mapping: z
    .object({
      date: z.string().trim().min(1).max(120),
      description: z.string().trim().min(1).max(120),
      amount: z.string().trim().max(120).optional(),
      debit: z.string().trim().max(120).optional(),
      credit: z.string().trim().max(120).optional(),
      category: z.string().trim().max(120).optional(),
    })
    .refine((mapping) => Boolean(mapping.amount || mapping.debit || mapping.credit), {
      message: "Map either amount or debit/credit columns.",
      path: ["amount"],
    }),
});
export const savedImportMappingApiSchema = savedImportMappingSchema.extend({
  accountId: z.string().uuid().optional(),
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
export type SavedImportMappingInput = z.infer<typeof savedImportMappingSchema>;
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
