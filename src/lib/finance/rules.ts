import { z } from "zod";

export const categoryFlowTypeSchema = z.enum(["expense", "income", "transfer"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  flowType: categoryFlowTypeSchema.default("expense"),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#57b89d"),
});

const updateCategoryBaseSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  flowType: categoryFlowTypeSchema.optional(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isArchived: z.boolean().optional(),
});
export const updateCategorySchema = updateCategoryBaseSchema.refine(
  (value) => value.name !== undefined || value.flowType !== undefined || value.color !== undefined || value.isArchived !== undefined,
  {
    message: "At least one category field is required.",
  },
);
export const updateCategoryApiSchema = updateCategoryBaseSchema.extend({
  id: z.string().uuid(),
}).refine((value) => value.name !== undefined || value.flowType !== undefined || value.color !== undefined || value.isArchived !== undefined, {
  message: "At least one category field is required.",
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
export const createMerchantRuleApiSchema = createMerchantRuleSchema.extend({
  categoryId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
});

export const updateMerchantRuleApiSchema = z
  .object({
    id: z.string().uuid(),
    isActive: z.boolean().optional(),
    priority: z.number().int().min(1).max(1_000).optional(),
    action: z.enum(["delete"]).optional(),
  })
  .refine((value) => value.isActive !== undefined || value.priority !== undefined || value.action !== undefined, {
    message: "At least one rule field is required.",
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateMerchantRuleInput = z.infer<typeof createMerchantRuleSchema>;

export type MerchantRuleMatcher = {
  accountId?: string | null;
  categoryId: string;
  matchType: z.infer<typeof merchantRuleMatchTypeSchema> | string;
  normalizedMatchValue: string;
};

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

export function findMatchingMerchantRule(description: string, rules: MerchantRuleMatcher[], accountId?: string) {
  const normalizedDescription = normalizeRuleMatchValue(description);

  return rules.find((rule) => {
    if (rule.accountId && rule.accountId !== accountId) {
      return false;
    }

    if (rule.matchType === "exact") {
      return normalizedDescription === rule.normalizedMatchValue;
    }

    if (rule.matchType === "starts_with") {
      return normalizedDescription.startsWith(rule.normalizedMatchValue);
    }

    return normalizedDescription.includes(rule.normalizedMatchValue);
  });
}
