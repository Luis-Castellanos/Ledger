import { z } from "zod";

export const updateLedgerSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
});

export type UpdateLedgerSettingsInput = z.infer<typeof updateLedgerSettingsSchema>;
