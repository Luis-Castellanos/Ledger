export type DefaultCategorySeed = {
  color: string;
  flowType: "expense" | "income" | "transfer";
  icon: string;
  name: string;
  slug: string;
  children?: DefaultCategorySeed[];
};

export const defaultCategoryTree = [
  {
    name: "Income",
    slug: "income",
    flowType: "income",
    color: "#57b89d",
    icon: "banknote",
    children: [
      { name: "Payroll", slug: "income-payroll", flowType: "income", color: "#57b89d", icon: "briefcase" },
      { name: "Interest", slug: "income-interest", flowType: "income", color: "#57b89d", icon: "percent" },
      { name: "Other Income", slug: "income-other", flowType: "income", color: "#57b89d", icon: "plus" },
    ],
  },
  {
    name: "Housing",
    slug: "housing",
    flowType: "expense",
    color: "#d76b64",
    icon: "home",
    children: [
      { name: "Mortgage or Rent", slug: "housing-mortgage-rent", flowType: "expense", color: "#d76b64", icon: "home" },
      { name: "Utilities", slug: "housing-utilities", flowType: "expense", color: "#d76b64", icon: "plug" },
      { name: "Maintenance", slug: "housing-maintenance", flowType: "expense", color: "#d76b64", icon: "wrench" },
    ],
  },
  {
    name: "Food",
    slug: "food",
    flowType: "expense",
    color: "#d5b96a",
    icon: "utensils",
    children: [
      { name: "Groceries", slug: "food-groceries", flowType: "expense", color: "#d5b96a", icon: "shopping-basket" },
      { name: "Restaurants", slug: "food-restaurants", flowType: "expense", color: "#d5b96a", icon: "utensils" },
      { name: "Coffee", slug: "food-coffee", flowType: "expense", color: "#d5b96a", icon: "coffee" },
    ],
  },
  {
    name: "Transportation",
    slug: "transportation",
    flowType: "expense",
    color: "#3f8cc8",
    icon: "car",
    children: [
      { name: "Fuel", slug: "transportation-fuel", flowType: "expense", color: "#3f8cc8", icon: "fuel" },
      { name: "Insurance", slug: "transportation-insurance", flowType: "expense", color: "#3f8cc8", icon: "shield" },
      { name: "Transit", slug: "transportation-transit", flowType: "expense", color: "#3f8cc8", icon: "train" },
    ],
  },
  {
    name: "Lifestyle",
    slug: "lifestyle",
    flowType: "expense",
    color: "#7860ad",
    icon: "sparkles",
    children: [
      { name: "Shopping", slug: "lifestyle-shopping", flowType: "expense", color: "#7860ad", icon: "shopping-bag" },
      { name: "Subscriptions", slug: "lifestyle-subscriptions", flowType: "expense", color: "#7860ad", icon: "repeat" },
      { name: "Travel", slug: "lifestyle-travel", flowType: "expense", color: "#7860ad", icon: "plane" },
    ],
  },
  {
    name: "Transfers",
    slug: "transfers",
    flowType: "transfer",
    color: "#7f8a86",
    icon: "arrow-left-right",
    children: [
      { name: "Internal Transfer", slug: "transfers-internal", flowType: "transfer", color: "#7f8a86", icon: "arrow-left-right" },
      { name: "Credit Card Payment", slug: "transfers-credit-card-payment", flowType: "transfer", color: "#7f8a86", icon: "credit-card" },
    ],
  },
] satisfies DefaultCategorySeed[];
