import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, KeyRound } from "lucide-react";
import {
  listCashiers,
  createCashier,
  updateCashier,
  deleteCashier,
} from "@/lib/cashier-auth.functions";

export const Route = createFileRoute("/_authenticated/manager/cashiers")({
  component: CashiersPage,
});

type Row = {
  id: string;
  name: string;
  code1: string;
  code2: string;
  active: boolean;
  sale_permission: boolean;
  created_at: string;
};

type Draft = { id: string | null; name: string; code1: string; code2: string; active: boolean; sale_permission: boolean };

const emptyDraft: Draft = { id: null, name: "", code1: "", code2: "", active: true, sale_permission: false };

function CashiersPage() {
  const qc = useQueryClient();
  const load = useServerFn(listCashiers);
  const add = useServerFn(createCashier);
  const edit = useServerFn(updateCashier);
  const remove = useServerFn(deleteCashier);

  const [draft, setDraft] = useState<Draft | null>(null);

  const cashiers = useQuery({
    queryKey: ["cashier-accounts"],
    queryFn: async () => (await load({ data: undefined as never })) as unknown as Row[],
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (d.id) {
        await edit({
          data: { id: d.id, name: d.name, code1: d.code1, code2: d.code2, active: d.active, sale_permission: d.sale_permission },
        });
      } else {
        await add({ data: { name: d.name, code1: d.code1, code2: d.code2 } });
      }
    },
    onSuccess: () => {
      toast.success("Cashier saved");
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["cashier-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await remove({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Cashier removed");
      void qc.invalidateQueries({ queryKey: ["cashier-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cashiers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add each cashier and give them their own pair of access codes. They sign in on the home
            page with those two codes only.
          </p>
        </div>
        <Button onClick={() => setDraft({ ...emptyDraft })}>
          <Plus className="mr-2 h-4 w-4" /> Add cashier
        </Button>
      </header>

      {cashiers.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : cashiers.error ? (
        <p className="text-sm text-destructive">{(cashiers.error as Error).message}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(cashiers.data ?? []).map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div
                    className={`mt-1 text-xs font-medium ${c.active ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {c.active ? "Active" : "Switched off"} · Sale Permission {c.sale_permission ? "Enabled" : "Disabled"}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setDraft({
                        id: c.id,
                        name: c.name,
                        code1: c.code1,
                        code2: c.code2,
                        active: c.active,
                        sale_permission: c.sale_permission,
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Remove ${c.name}?`)) del.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <KeyRound className="h-3.5 w-3.5" /> Access codes
                </div>
                <div className="font-mono">{c.code1}</div>
                <div className="font-mono">{c.code2}</div>
              </div>
            </Card>
          ))}
          {(cashiers.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No cashiers yet.</p>
          )}
        </div>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit cashier" : "Add cashier"}</DialogTitle>
            <DialogDescription>
              The two codes are what the cashier types on the sign-in screen.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(draft);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="cname">Cashier name</Label>
                <Input
                  id="cname"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ccode1">Access code 1</Label>
                <Input
                  id="ccode1"
                  value={draft.code1}
                  onChange={(e) => setDraft({ ...draft, code1: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ccode2">Access code 2</Label>
                <Input
                  id="ccode2"
                  value={draft.code2}
                  onChange={(e) => setDraft({ ...draft, code2: e.target.value.toUpperCase() })}
                />
              </div>
              {draft.id && (
                <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div><div className="text-sm font-medium">Account active</div><div className="text-xs text-muted-foreground">Controls access to the account.</div></div>
                    <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div><div className="text-sm font-medium">Sale Permission</div><div className="text-xs text-muted-foreground">Enable selling for this cashier.</div></div>
                    <Switch checked={draft.sale_permission} onCheckedChange={(v) => setDraft({ ...draft, sale_permission: v })} />
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending ? "Saving..." : "Save cashier"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
