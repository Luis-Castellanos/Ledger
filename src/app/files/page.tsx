import { MigrationPlaceholder } from "@/components/migration-placeholder";

export default function FilesPage() {
  return (
    <MigrationPlaceholder
      active="Files"
      description="Files will be ported from Gringotts with document storage, parse status, source provenance, preview, and deletion/rollback behavior."
      title="Files"
    />
  );
}
