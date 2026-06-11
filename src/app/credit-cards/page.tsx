import { redirect } from "next/navigation";

/*
 * Credit cards folded into the accounts workbench as a type filter view —
 * this route survives only for old links.
 */
export default function CreditCardsPage() {
  redirect("/accounts?type=credit_card");
}
