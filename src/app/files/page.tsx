import { redirect } from "next/navigation";

/* Files folded into the imports workbench (Documents tab). */
export default function FilesPage() {
  redirect("/imports?tab=documents");
}
