import { z } from "zod";

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

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
