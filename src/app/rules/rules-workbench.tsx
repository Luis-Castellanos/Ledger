"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Archive, BadgeCheck, GitBranch, Play, Plus, Save, Search, Tags } from "lucide-react";
import { defaultCategoryTree } from "@/lib/finance/default-categories";
import { createCategorySchema, createMerchantRuleSchema, updateCategorySchema, type CreateCategoryInput } from "@/lib/finance/rules";

const fallbackCategories = defaultCategoryTree.flatMap((parent) => [
  {
    id: parent.slug,
    name: parent.name,
    slug: parent.slug,
    flowType: parent.flowType,
    color: parent.color,
    isSystem: true,
    isArchived: false,
  },
  ...(parent.children ?? []).map((child) => ({
    id: child.slug,
    name: child.name,
    slug: child.slug,
    flowType: child.flowType,
    color: child.color,
    isSystem: true,
    isArchived: false,
  })),
]);

const fallbackRules: MerchantRuleRow[] = [
  {
    id: "rule_apple",
    name: "Apple subscriptions",
    matchType: "contains",
    matchValue: "APPLE.COM/BILL",
    priority: 40,
    isActive: true,
    categoryId: "lifestyle-subscriptions",
    categoryName: "Subscriptions",
    accountId: null,
    accountName: null,
  },
  {
    id: "rule_costco",
    name: "Costco shopping",
    matchType: "contains",
    matchValue: "COSTCO",
    priority: 70,
    isActive: true,
    categoryId: "lifestyle-shopping",
    categoryName: "Shopping",
    accountId: null,
    accountName: null,
  },
];

const matchTypes = [
  { label: "Contains", value: "contains" },
  { label: "Exact", value: "exact" },
  { label: "Starts with", value: "starts_with" },
] as const;

const flowTypes = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Transfer", value: "transfer" },
] satisfies { label: string; value: CreateCategoryInput["flowType"] }[];

export function RulesWorkbench() {
  const [categories, setCategories] = useState<CategoryRow[]>(fallbackCategories);
  const [rules, setRules] = useState<MerchantRuleRow[]>(fallbackRules);
  const hasLocalEdits = useRef(false);
  const [query, setQuery] = useState("");
  const [dataSource, setDataSource] = useState<"database" | "demo">("demo");
  const [error, setError] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [isApplyingRules, setIsApplyingRules] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", flowType: "expense" as CreateCategoryInput["flowType"], color: "#57b89d" });
  const [categoryEdits, setCategoryEdits] = useState<Record<string, CategoryEditState>>({});
  const [ruleForm, setRuleForm] = useState({
    name: "",
    matchType: "contains",
    matchValue: "",
    categoryId: fallbackCategories[0]?.id ?? "",
    priority: 100,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadRules() {
      try {
        const [categoriesResponse, rulesResponse] = await Promise.all([
          fetch("/api/categories", { headers: { Accept: "application/json" } }),
          fetch("/api/merchant-rules", { headers: { Accept: "application/json" } }),
        ]);

        if (!categoriesResponse.ok || !rulesResponse.ok) {
          throw new Error("Rules APIs unavailable");
        }

        const categoriesPayload = (await categoriesResponse.json()) as { categories: CategoryRow[] };
        const rulesPayload = (await rulesResponse.json()) as { rules: MerchantRuleRow[] };

        if (isMounted && !hasLocalEdits.current) {
          setCategories(categoriesPayload.categories);
          setRules(rulesPayload.rules);
          setRuleForm((current) => ({ ...current, categoryId: categoriesPayload.categories[0]?.id ?? current.categoryId }));
          setDataSource("database");
        }
      } catch {
        if (isMounted) {
          setDataSource("demo");
        }
      }
    }

    void loadRules();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return rules;
    }

    return rules.filter((rule) =>
      [rule.name, rule.matchValue, rule.categoryName, rule.accountName ?? ""].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, rules]);

  const customCategories = useMemo(() => categories.filter((category) => !category.isSystem), [categories]);

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createCategorySchema.safeParse(categoryForm);

    if (!parsed.success) {
      setError("Category needs a name and valid hex color.");
      return;
    }

    hasLocalEdits.current = true;

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        throw new Error("Category API unavailable");
      }

      const payload = (await response.json()) as { category: CategoryRow };
      setCategories((current) => [payload.category, ...current]);
      setRuleForm((current) => ({ ...current, categoryId: payload.category.id }));
      setDataSource("database");
      setError(null);
    } catch {
      const localCategory = {
        id: `local_category_${Date.now()}`,
        name: parsed.data.name,
        slug: parsed.data.name.toLowerCase().replace(/\s+/g, "-"),
        flowType: parsed.data.flowType,
        color: parsed.data.color,
        isSystem: false,
        isArchived: false,
      };

      setCategories((current) => [localCategory, ...current]);
      setRuleForm((current) => ({ ...current, categoryId: localCategory.id }));
      setDataSource("demo");
      setError("Saved locally. Configure Clerk and DATABASE_URL to persist categories.");
    }

    setCategoryForm({ name: "", flowType: "expense", color: "#57b89d" });
  }

  async function updateCategory(id: string, patch: Partial<CategoryEditState> & { isArchived?: boolean }) {
    const currentCategory = categories.find((category) => category.id === id);
    const currentEdit = categoryEdits[id];

    if (!currentCategory) {
      return;
    }

    const payload = {
      id,
      name: patch.name ?? currentEdit?.name ?? currentCategory.name,
      flowType: patch.flowType ?? currentEdit?.flowType ?? currentCategory.flowType,
      color: patch.color ?? currentEdit?.color ?? currentCategory.color ?? "#57b89d",
      isArchived: patch.isArchived ?? currentCategory.isArchived,
    };
    const parsed = updateCategorySchema.safeParse(payload);

    if (!parsed.success) {
      setError("Category update needs a name, flow type, and valid hex color.");
      return;
    }

    hasLocalEdits.current = true;

    try {
      const response = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        throw new Error("Category update API unavailable");
      }

      const result = (await response.json()) as { category: CategoryRow };
      setCategories((current) => current.map((category) => (category.id === result.category.id ? result.category : category)));
      setCategoryEdits((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setDataSource("database");
      setError(null);
    } catch {
      setCategories((current) => current.map((category) => (category.id === id ? { ...category, ...parsed.data } : category)));
      setCategoryEdits((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setDataSource("demo");
      setError("Category update stayed local. Configure Clerk and DATABASE_URL to persist category edits.");
    }
  }

  async function handleRuleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createMerchantRuleSchema.safeParse(ruleForm);

    if (!parsed.success) {
      setError("Rule needs a name, category, match text, and numeric priority.");
      return;
    }

    hasLocalEdits.current = true;
    const selectedCategory = categories.find((category) => category.id === parsed.data.categoryId);

    try {
      const response = await fetch("/api/merchant-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        throw new Error("Rule API unavailable");
      }

      const payload = (await response.json()) as { rule: MerchantRuleRow };
      setRules((current) => [payload.rule, ...current]);
      setDataSource("database");
      setError(null);
    } catch {
      setRules((current) => [
        {
          id: `local_rule_${Date.now()}`,
          name: parsed.data.name,
          matchType: parsed.data.matchType,
          matchValue: parsed.data.matchValue,
          priority: parsed.data.priority,
          isActive: true,
          categoryId: parsed.data.categoryId,
          categoryName: selectedCategory?.name ?? "Uncategorized",
          accountId: null,
          accountName: null,
        },
        ...current,
      ]);
      setDataSource("demo");
      setError("Saved locally. Configure Clerk and DATABASE_URL to persist merchant rules.");
    }

    setRuleForm((current) => ({ ...current, name: "", matchValue: "", priority: 100 }));
  }

  async function applyRulesToTransactions() {
    hasLocalEdits.current = true;
    setIsApplyingRules(true);

    try {
      const response = await fetch("/api/merchant-rules/apply", {
        method: "POST",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("Rule application API unavailable");
      }

      const payload = (await response.json()) as { appliedCount: number };
      setApplyMessage(`${payload.appliedCount} unreviewed transactions updated.`);
      setError(null);
      setDataSource("database");
    } catch {
      setApplyMessage("Demo preview only. Configure Clerk and DATABASE_URL to apply rules to transactions.");
      setDataSource("demo");
    } finally {
      setIsApplyingRules(false);
    }
  }

  return (
    <div className="accounts-grid">
      <section className="accounts-main">
        <div className="grid grid-cols-1 border-b border-[var(--line)] md:grid-cols-3">
          <RuleMetric label="Categories" value={`${categories.length}`} icon={<Tags size={17} />} tone="green" />
          <RuleMetric label="Active rules" value={`${rules.filter((rule) => rule.isActive).length}`} icon={<GitBranch size={17} />} tone="violet" />
          <RuleMetric label="System categories" value={`${categories.filter((category) => category.isSystem).length}`} icon={<BadgeCheck size={17} />} tone="gold" />
        </div>

        <section className="panel accounts-table-panel">
          <div className="panel-header accounts-toolbar">
            <div>
              <p className="panel-label">Merchant rules</p>
              <h2 className="panel-title">Classification control file</h2>
            </div>
            <span className={dataSource === "database" ? "status-chip status-chip-live" : "status-chip"}>{dataSource === "database" ? "DB backed" : "Demo mode"}</span>
            <label className="search-field">
              <Search size={16} />
              <input aria-label="Search rules" placeholder="Search rules" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <button className="secondary-action" type="button" onClick={applyRulesToTransactions} disabled={isApplyingRules}>
              <Play size={16} />
              {isApplyingRules ? "Applying" : "Apply rules"}
            </button>
          </div>
          {applyMessage ? <p className="form-success">{applyMessage}</p> : null}

          <div className="accounts-table" role="table" aria-label="Merchant rules">
            <div className="accounts-table-head" role="row">
              <span>Rule</span>
              <span>Match</span>
              <span>Category</span>
              <span>Priority</span>
            </div>
            {filteredRules.map((rule) => (
              <div className="accounts-table-row" role="row" key={rule.id}>
                <div className="account-name-cell">
                  <div className="account-icon">
                    <GitBranch size={17} />
                  </div>
                  <div className="min-w-0">
                    <p>{rule.name}</p>
                    <span>{rule.isActive ? "Active" : "Inactive"}</span>
                  </div>
                </div>
                <span className="account-pill">
                  {rule.matchType.replace("_", " ")}: {rule.matchValue}
                </span>
                <span>{rule.categoryName}</span>
                <strong className="font-mono">{rule.priority}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>

      <aside className="accounts-side">
        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">New rule</p>
              <h2 className="panel-title">Merchant matcher</h2>
            </div>
            <div className="summary-icon">
              <Plus size={17} />
            </div>
          </div>

          <form className="account-form" onSubmit={handleRuleSubmit}>
            <label>
              <span>Name</span>
              <input required value={ruleForm.name} onChange={(event) => setRuleForm((current) => ({ ...current, name: event.target.value }))} placeholder="Apple subscriptions" />
            </label>
            <label>
              <span>Match text</span>
              <input required value={ruleForm.matchValue} onChange={(event) => setRuleForm((current) => ({ ...current, matchValue: event.target.value }))} placeholder="APPLE.COM/BILL" />
            </label>
            <div className="account-form-grid">
              <label>
                <span>Type</span>
                <select value={ruleForm.matchType} onChange={(event) => setRuleForm((current) => ({ ...current, matchType: event.target.value }))}>
                  {matchTypes.map((type) => (
                    <option value={type.value} key={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Priority</span>
                <input
                  inputMode="numeric"
                  value={ruleForm.priority}
                  onChange={(event) => setRuleForm((current) => ({ ...current, priority: Number(event.target.value) }))}
                />
              </label>
            </div>
            <label>
              <span>Category</span>
              <select value={ruleForm.categoryId} onChange={(event) => setRuleForm((current) => ({ ...current, categoryId: event.target.value }))}>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="primary-action" type="submit">
              <Save size={16} />
              Save rule
            </button>
          </form>
        </section>

        <section className="panel account-form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">New category</p>
              <h2 className="panel-title">Classification bucket</h2>
            </div>
          </div>
          <form className="account-form" onSubmit={handleCategorySubmit}>
            <label>
              <span>Name</span>
              <input required value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="Professional Dues" />
            </label>
            <div className="account-form-grid">
              <label>
                <span>Flow</span>
                <select value={categoryForm.flowType} onChange={(event) => setCategoryForm((current) => ({ ...current, flowType: event.target.value as CreateCategoryInput["flowType"] }))}>
                  {flowTypes.map((flowType) => (
                    <option value={flowType.value} key={flowType.value}>
                      {flowType.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Color</span>
                <input value={categoryForm.color} onChange={(event) => setCategoryForm((current) => ({ ...current, color: event.target.value }))} />
              </label>
            </div>
            <button className="secondary-action" type="submit">
              <Plus size={16} />
              Add category
            </button>
          </form>
        </section>

        <section className="panel account-form-panel" aria-label="Custom categories">
          <div className="panel-header">
            <div>
              <p className="panel-label">Categories</p>
              <h2 className="panel-title">Custom buckets</h2>
            </div>
            <div className="summary-icon">
              <Tags size={17} />
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {customCategories.length > 0 ? (
              customCategories.map((category) => {
                const edit = categoryEdits[category.id] ?? {
                  color: category.color ?? "#57b89d",
                  flowType: category.flowType,
                  name: category.name,
                };

                return (
                  <div className="category-edit-row" key={category.id}>
                    <input
                      aria-label={`Name for ${category.name}`}
                      value={edit.name}
                      onChange={(event) => setCategoryEdits((current) => ({ ...current, [category.id]: { ...edit, name: event.target.value } }))}
                    />
                    <select
                      aria-label={`Flow for ${category.name}`}
                      value={edit.flowType}
                      onChange={(event) =>
                        setCategoryEdits((current) => ({ ...current, [category.id]: { ...edit, flowType: event.target.value as CategoryEditState["flowType"] } }))
                      }
                    >
                      {flowTypes.map((flowType) => (
                        <option value={flowType.value} key={flowType.value}>
                          {flowType.label}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`Color for ${category.name}`}
                      value={edit.color}
                      onChange={(event) => setCategoryEdits((current) => ({ ...current, [category.id]: { ...edit, color: event.target.value } }))}
                    />
                    <div className="flex gap-2">
                      <button className="secondary-action" type="button" onClick={() => updateCategory(category.id, edit)}>
                        <Save size={16} />
                        Save
                      </button>
                      <button className="secondary-action" type="button" onClick={() => updateCategory(category.id, { ...edit, isArchived: !category.isArchived })}>
                        <Archive size={16} />
                        {category.isArchived ? "Restore" : "Archive"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty-copy">Custom categories you create will appear here for edit and archive controls.</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

type CategoryRow = {
  color: string | null;
  flowType: "expense" | "income" | "transfer";
  id: string;
  isArchived: boolean;
  isSystem: boolean;
  name: string;
  slug: string;
};

type CategoryEditState = {
  color: string;
  flowType: CreateCategoryInput["flowType"];
  name: string;
};

type MerchantRuleRow = {
  accountId: string | null;
  accountName: string | null;
  categoryId: string;
  categoryName: string;
  id: string;
  isActive: boolean;
  matchType: string;
  matchValue: string;
  name: string;
  priority: number;
};

function RuleMetric({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "green" | "violet" | "gold" }) {
  return (
    <article className="stat-panel account-metric">
      <div className={`account-metric-icon account-metric-${tone}`}>{icon}</div>
      <p className="panel-label">{label}</p>
      <p className="panel-title">{value}</p>
    </article>
  );
}
