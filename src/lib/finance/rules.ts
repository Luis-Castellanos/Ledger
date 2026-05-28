import { z } from "zod";

export const categoryFlowTypeSchema = z.enum(["expense", "income", "transfer"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  flowType: categoryFlowTypeSchema.default("expense"),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#57b89d"),
});

export const merchantRuleMatchTypeSchema = z.enum(["contains", "exact", "starts_with"]);

export const createMerchantRuleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  categoryId: z.string().trim().min(1),
  accountId: z.string().trim().min(1).optional(),
  matchType: merchantRuleMatchTypeSchema.default("contains"),
  matchValue: z.string().trim().min(2).max(240),
  priority: z.number().int().min(1).max(1_000).default(100),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateMerchantRuleInput = z.infer<typeof createMerchantRuleSchema>;

export function slugifyCategoryName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "category"
  );
}

export function normalizeRuleMatchValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
