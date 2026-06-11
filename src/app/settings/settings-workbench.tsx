"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Download, Moon, Sun } from "lucide-react";
import { AuthControls } from "@/components/auth-controls";
import { ExportButton } from "@/components/export-button";
import { PageHeader } from "@/components/page-header";
import { ErrorState, PageSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api/client";
import { useAuditEvents, useMe, useUpdateLedger, useUpdateProfile } from "@/lib/api/queries/settings";
import { cn } from "@/lib/utils";

export function SettingsWorkbench() {
  const me = useMe();
  const unauthorized = me.error instanceof ApiError && me.error.status === 401;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-8 md:py-8">
      <PageHeader eyebrow="Configuration" title="Settings" />

      {unauthorized ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Sign in to manage settings</p>
          <AuthControls />
        </div>
      ) : me.isPending ? (
        <PageSkeleton rows={5} />
      ) : me.isError ? (
        <ErrorState message={me.error.message} onRetry={() => void me.refetch()} />
      ) : (
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="data">Data &amp; audit</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="pt-2">
            <ProfileTab email={me.data.user.email} initialName={me.data.user.displayName ?? ""} />
          </TabsContent>
          <TabsContent value="appearance" className="pt-2">
            <AppearanceTab />
          </TabsContent>
          <TabsContent value="ledger" className="pt-2">
            <LedgerTab initialName={me.data.ledger.name} currency={me.data.ledger.defaultCurrency} />
          </TabsContent>
          <TabsContent value="data" className="pt-2">
            <DataTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ProfileTab({ email, initialName }: { email: string; initialName: string }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(initialName);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-caps font-sans">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label className="label-caps">Email</Label>
          <Input value={email} disabled className="max-w-sm" />
          <p className="text-xs text-muted-foreground">Managed by your sign-in provider.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="profile-name" className="label-caps">
            Display name
          </Label>
          <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} className="max-w-sm" />
        </div>
        <Button
          size="sm"
          disabled={update.isPending || name === initialName}
          onClick={() =>
            update.mutate(
              { name: name.trim() },
              {
                onSuccess: () => toast.success("Profile saved"),
                onError: (error) => toast.error(error.message || "Could not save the profile"),
              },
            )
          }
        >
          {update.isPending ? "Saving…" : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AppearanceTab() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-caps font-sans">Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {(
            [
              { key: "dark", label: "Green ink", icon: Moon, description: "Dark, the house default" },
              { key: "light", label: "Paper", icon: Sun, description: "Warm light" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setTheme(option.key)}
              className={cn(
                "flex flex-1 flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors",
                resolvedTheme === option.key ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50",
              )}
              aria-pressed={resolvedTheme === option.key}
            >
              <option.icon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LedgerTab({ initialName, currency }: { initialName: string; currency: string }) {
  const update = useUpdateLedger();
  const [name, setName] = useState(initialName);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="label-caps font-sans">Ledger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="ledger-name" className="label-caps">
            Ledger name
          </Label>
          <Input
            id="ledger-name"
            placeholder="Personal ledger"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="label-caps">Default currency</Label>
          <Input value={currency} disabled className="max-w-24 font-money" />
          <p className="text-xs text-muted-foreground">Multi-currency support is a later chapter.</p>
        </div>
        <Button
          size="sm"
          disabled={update.isPending || !name.trim() || name === initialName}
          onClick={() =>
            update.mutate(
              { name: name.trim() },
              {
                onSuccess: () => toast.success("Ledger saved"),
                onError: (error) => toast.error(error.message || "Could not save the ledger"),
              },
            )
          }
        >
          {update.isPending ? "Saving…" : "Save ledger"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DataTab() {
  const audit = useAuditEvents();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="label-caps font-sans">Exports</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ExportButton
            aria-label="Export transactions CSV"
            format="transactions_csv"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Download size={14} /> Transactions CSV
          </ExportButton>
          <ExportButton
            aria-label="Export backup package"
            format="backup_package"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Download size={14} /> Backup package
          </ExportButton>
          <p className="w-full text-xs text-muted-foreground">
            Everything in your ledger, downloadable any time — your data never has a hostage clause.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="label-caps font-sans">Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          {audit.isPending ? (
            <PageSkeleton rows={4} />
          ) : audit.isError ? (
            <ErrorState message={audit.error.message} onRetry={() => void audit.refetch()} />
          ) : audit.data.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No control events recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {audit.data.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline" className="h-4 shrink-0 px-1 font-money text-[10px]">
                      {event.entityType}
                    </Badge>
                    <span className="truncate">{event.action.replaceAll(".", " · ").replaceAll("_", " ")}</span>
                  </span>
                  <span className="shrink-0 font-money text-xs text-muted-foreground">
                    {format(new Date(event.createdAt), "MMM d, HH:mm")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
