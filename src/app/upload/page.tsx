import { redirect } from "next/navigation";

/* Upload folded into the imports workbench (Documents tab). */
export default function UploadPage() {
  redirect("/imports?tab=documents");
}
