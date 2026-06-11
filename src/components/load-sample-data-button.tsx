"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLoadSampleData } from "@/lib/api/queries/sample-data";

export function LoadSampleDataButton({
  variant = "default",
  size = "default",
  label = "Load sample data",
}: {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  label?: string;
}) {
  const load = useLoadSampleData();

  return (
    <Button
      variant={variant}
      size={size}
      disabled={load.isPending}
      onClick={() =>
        load.mutate(undefined, {
          onSuccess: (result) =>
            toast.success(
              `Sample ledger loaded — ${result.data.transactions} transactions across ${result.data.accounts} accounts`,
            ),
          onError: (error) => toast.error(error.message || "Could not load sample data"),
        })
      }
    >
      <Sparkles />
      {load.isPending ? "Loading…" : label}
    </Button>
  );
}
