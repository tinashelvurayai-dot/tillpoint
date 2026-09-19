import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import {
  ClipboardList,
  Plus,
  Check,
  Trash2,
  ArrowLeft,
  Sparkles,
  Clock,
  Package,
  PackageCheck,
  Info,
  Zap,
  ListChecks,
  CheckCircle2,
  Hash,
  Ruler,
  User,
  StickyNote,
  Boxes,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { useEffect, useState } from "react";
import { isManagerMode } from "@/lib/session-mode";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

// Parses "2x 1kg Salt Red Seal" -> { quantity: 2, unit: "1kg", product_name: "Salt Red Seal" }
function parseEntry(raw: string): {
  quantity: number | null;
  unit: string | null;
  product_name: string;
} {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(\d+)\s*x?\s+(\S+)?\s*(.+)?$/i);
  if (!m) return { quantity: null, unit: null, product_name: trimmed };
  const quantity = Number(m[1]);
  const rest = (m[3] ?? "").trim();
  const maybeUnit = m[2] ?? "";
  const isUnit =
    /\d/.test(maybeUnit) || /^(kg|g|ml|l|lt|pcs|pack|packs|box|boxes)$/i.test(maybeUnit);
  return {
    quantity,
    unit: isUnit ? maybeUnit : null,
    product_name: isUnit ? rest : `${maybeUnit} ${rest}`.trim() || trimmed,
  };
}

function OrdersPage() {
  const [manager, setManager] = useState(false);
  useEffect(() => {
    setManager(isManagerMode());
  }, []);
  const qc = useQueryClient();
  const { session, role } = useAuth();
  const [entry, setEntry] = useState("");
  const [notes, setNotes] = useState("");

  const orders = useQuery({
    queryKey: ["restock-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restock_orders")
        .select(
          "id, entry, quantity, unit, product_name, status, requested_at, fulfilled_at, notes, requested_by",
        )
        .order("requested_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!entry.trim()) throw new Error("Enter an item");
      const parsed = parseEntry(entry);
      const { error } = await supabase.from("restock_orders").insert({
        entry: entry.trim(),
        quantity: parsed.quantity,
        unit: parsed.unit,
        product_name: parsed.product_name,
        notes: notes || null,
        requested_by: session?.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added to orders");
      setEntry("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["restock-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fulfill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("restock_orders")
        .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["restock-orders"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("restock_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["restock-orders"] }),
  });

  const pending = (orders.data ?? []).filter((o) => o.status !== "fulfilled");
  const done = (orders.data ?? []).filter((o) => o.status === "fulfilled");

  const backTo = manager || role === "manager" ? "/manager" : "/cashier";
  const isManager = role === "manager";

  // Live preview of the parsed entry
  const preview = entry.trim() ? parseEntry(entry) : null;

  return (
    <div className="relative min-h-screen">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-20 blur-md" />
              <div className="relative"><BrandLogo /></div>
            </div>
            <div className="hidden border-l border-slate-200 pl-3 sm:block">
              <div className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-[10px] font-bold uppercase tracking-wider text-transparent">
                  Restock Orders
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-900">Items that have run out</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={backTo}>
              <Button
                variant="outline"
                size="sm"
                className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </Link>
            <SignOutButton variant="outline" />
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-5xl p-4 md:p-10">
        {/* Page title */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
            <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
              Restock orders
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Log items that have run out so they can be reordered.
            </p>
          </div>
        </div>

        {/* Add item card */}
        <Card className="relative mb-6 overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
          <div className="p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                <Plus className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Add an item that has run out
                </h2>
                <p className="text-[11px] text-slate-500">
                  Quantity and unit are parsed automatically
                </p>
              </div>
            </div>

            {/* Format hint */}
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-indigo-100/60 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-orange-50/40 p-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <p className="text-[11px] text-slate-600">
                Use the format:{" "}
                <span className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-indigo-700 shadow-sm">
                  2x 1kg Salt Red Seal
                </span>
                . The system parses quantity, unit, and product name automatically and timestamps
                the entry.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
                <Input
                  placeholder="e.g. 2x 1kg Salt Red Seal"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !add.isPending && add.mutate()}
                  className="border-indigo-100 bg-white pl-9 text-base shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <Button
                onClick={() => add.mutate()}
                disabled={add.isPending || !entry.trim()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-purple-500/40"
              >
                {add.isPending ? (
                  <>
                    <Sparkles className="mr-1 h-4 w-4 animate-pulse" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </>
                )}
              </Button>
            </div>

            {/* Live parse preview */}
            {preview && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-indigo-200/60 bg-gradient-to-r from-indigo-50/40 to-purple-50/30 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Preview
                </span>
                {preview.quantity !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-indigo-500/25">
                    <Hash className="h-2.5 w-2.5" />
                    {preview.quantity}x
                  </span>
                )}
                {preview.unit && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-700 shadow-sm">
                    <Ruler className="h-2.5 w-2.5" />
                    {preview.unit}
                  </span>
                )}
                {preview.product_name && (
                  <span className="truncate text-[11px] font-semibold text-slate-700">
                    {preview.product_name}
                  </span>
                )}
              </div>
            )}

            <Textarea
              placeholder="Optional notes (supplier, urgency, etc.)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-3 border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </Card>

        {/* Pending card */}
        <Card className="relative mb-6 overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-md shadow-amber-500/25">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Pending</h2>
                  <p className="text-[11px] text-slate-500">Items waiting to be reordered</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50/60 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                  <ListChecks className="h-3 w-3" />
                  {pending.length} item{pending.length === 1 ? "" : "s"}
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50/60 text-emerald-700"
                >
                  <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </Badge>
              </div>
            </div>

            <ul className="space-y-2.5">
              {pending.map((o) => (
                <li
                  key={o.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-amber-400/10 to-orange-400/10 blur-xl transition-opacity group-hover:opacity-100" />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 opacity-30 blur-sm" />
                        <div className="relative grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-md shadow-amber-500/25">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {o.quantity && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-indigo-500/25">
                              <Hash className="h-2.5 w-2.5" />
                              {o.quantity}x
                            </span>
                          )}
                          {o.unit && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-700 shadow-sm">
                              <Ruler className="h-2.5 w-2.5" />
                              {o.unit}
                            </span>
                          )}
                          <span className="truncate text-sm font-bold text-slate-900">
                            {o.product_name || o.entry}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-500" />
                            Added {formatDate(o.requested_at)}
                          </span>
                        </div>
                        {o.notes && (
                          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
                            <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                            <span className="text-[11px] italic text-slate-600">{o.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isManager && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => fulfill.mutate(o.id)}
                          title="Mark fulfilled"
                          className="h-8 w-8 hover:bg-emerald-50"
                        >
                          <Check className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => del.mutate(o.id)}
                          title="Delete"
                          className="h-8 w-8 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}

              {pending.length === 0 && (
                <li className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-2xl" />
                      <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
                        <PackageCheck className="h-7 w-7 text-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Nothing pending</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Everything&apos;s in stock.
                      </p>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </Card>

        {/* Fulfilled card */}
        {done.length > 0 && (
          <Card className="relative overflow-hidden border-slate-200/60 bg-white/60 shadow-sm backdrop-blur-sm">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/25">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-700">Fulfilled</h2>
                    <p className="text-[11px] text-slate-500">Completed orders</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  {done.length} item{done.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="divide-y divide-slate-100">
                {done.slice(0, 20).map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-emerald-50/30"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-emerald-100 to-teal-100">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <span className="truncate text-sm text-slate-500 line-through">
                        {o.entry}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-slate-400">
                      {o.fulfilled_at ? formatDate(o.fulfilled_at) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}

        {/* Info footer */}
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-slate-200 bg-white/60 p-3">
          <Boxes className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="text-[11px] text-slate-600">
            {isManager
              ? "Managers can mark items fulfilled or delete entries. Fulfilled items are kept here for reference."
              : "Add items as they run out. Your manager will review and fulfil these orders."}
          </p>
        </div>
      </div>
    </div>
  );
}
