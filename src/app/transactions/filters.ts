/*
 * Filter state for the transactions register. The URL carries account and
 * category by display name (human-readable, and legacy deep links like
 * /transactions?account=Operating%20Checking&direction=inflow keep working);
 * names resolve to ids client-side before hitting the server API.
 */

export type RegisterSort = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "merchant_asc" | "merchant_desc";

export type RegisterFilters = {
  q: string;
  account: string;
  category: string;
  status: "all" | "needs_review" | "reviewed" | "excluded";
  transfer: "all" | "none" | "transfer";
  direction: "all" | "inflow" | "outflow";
  tag: string;
  sort: RegisterSort;
};

export const defaultRegisterFilters: RegisterFilters = {
  q: "",
  account: "",
  category: "",
  status: "all",
  transfer: "all",
  direction: "all",
  tag: "",
  sort: "date_desc",
};

const SORTS: readonly RegisterSort[] = ["date_desc", "date_asc", "amount_desc", "amount_asc", "merchant_asc", "merchant_desc"];

export function parseRegisterFilters(params: Record<string, string | string[] | undefined>): RegisterFilters {
  const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const status = single(params.status);
  const transfer = single(params.transfer);
  const direction = single(params.direction);
  const sort = single(params.sort);

  return {
    q: single(params.q),
    account: single(params.account),
    category: single(params.category),
    status: status === "needs_review" || status === "reviewed" || status === "excluded" ? status : "all",
    transfer: transfer === "none" || transfer === "transfer" ? transfer : "all",
    direction: direction === "inflow" || direction === "outflow" ? direction : "all",
    tag: single(params.tag),
    sort: SORTS.includes(sort as RegisterSort) ? (sort as RegisterSort) : "date_desc",
  };
}

export function registerFiltersToSearch(filters: RegisterFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.account) params.set("account", filters.account);
  if (filters.category) params.set("category", filters.category);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.transfer !== "all") params.set("transfer", filters.transfer);
  if (filters.direction !== "all") params.set("direction", filters.direction);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.sort !== "date_desc") params.set("sort", filters.sort);
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}
