import { redirect } from "next/navigation";

/* Payroll folded into cashflow reporting (income view). */
export default function PayrollPage() {
  redirect("/cashflow");
}
