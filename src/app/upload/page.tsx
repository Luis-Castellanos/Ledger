import { MigrationPlaceholder } from "@/components/migration-placeholder";

export default function UploadPage() {
  return (
    <MigrationPlaceholder
      active="Upload"
      description="Upload will be ported from Gringotts with statement upload, parsing status, duplicate detection, and document-to-transaction import provenance."
      title="Upload"
    />
  );
}
