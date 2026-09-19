import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ArrowLeft,
  Undo2,
  Ban,
  Search,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Receipt,
  Wallet,
  Minus,
  Plus,
  Package,
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/refunds")({
  component: CashierRefundsPage,
  head: () => ({
    meta: [
      { title: "Refunds · TillPoint Till" },
      {
        name: "description",
        content: "Reverse a mistaken sale from the till when the manager allows auto-approved refunds.",
      },
      { property: "og:title", content: "Refunds · TillPoint Till" },
      {
        property: "og:description",
        content: "Cashier refunds and voids, kept in step with stock and the sales ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type SaleRow = {
  id: string;
  created_at: string;
  cashier_name: string | null;
  total_amount: number;
  payment_type: string;
  status: string;
};

function CashierRefundsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<SaleRow | null>(null);
  const [kind, setKind] = useState<"refund" | "void">("refund");
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [picked, setPicked] = useState<Record<string, number>>({});

  const settings = useQuery({
    queryKey: ["app-settings", "auto-approve-refunds"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("auto_approve_refunds")
        .eq("id", true)
        .maybeSingle();
      return data ?? { auto_approve_refunds: false };
    },
  });
  const autoApprove = settings.data?.auto_approve_refunds === true;

  const sales = useQuery({
    queryKey: ["cashier-refund-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, created_at, cashier_name, total_amount, payment_type, status")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as SaleRow[];
    },
  });

  const lines = useQuery({
    queryKey: ["refund-sale-lines", target?.id],
    enabled: !!target,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_items")
        .select(
          "id, quantity, unit_price, variant_id, product_variants(variant_name, products(name))",
        )
        .eq("sale_id", target!.id);
      if (error) throw error;
      const items = (data ?? []) as unknown as Array<{
        id: string;
        quantity: number;
        unit_price: number;
        product_variants: { variant_name: string; products: { name: string } | null } | null;
      }>;
      const { data: done } = await supabase
        .from("refund_items")
        .select("sale_item_id, quantity")
        .in(
          "sale_item_id",
          items.map((i) => i.id),
        );
      const already = new Map<string, number>();
      for (const r of (done ?? []) as Array<{ sale_item_id: string; quantity: number }>) {
        already.set(r.sale_item_id, (already.get(r.sale_item_id) ?? 0) + Number(r.quantity));
      }
      return items.map((i) => ({
        id: i.id,
        name: i.product_variants?.products?.name ?? "Item",
        variant: i.product_variants?.variant_name ?? "",
        unit_price: Number(i.unit_price),
        remaining: Number(i.quantity) - (already.get(i.id) ?? 0),
      }));
    },
  });

  useEffect(() => {
    if (!lines.data) return;
    setPicked(Object.fromEntries(lines.data.map((l) => [l.id, l.remaining])));
  }, [lines.data]);

  const refundTotal = (lines.data ?? []).reduce(
    (sum, l) => sum + (picked[l.id] ?? 0) * l.unit_price,
    0,
  );

  const apply = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("Choose a sale");
      const items = (lines.data ?? [])
        .filter((l) => (picked[l.id] ?? 0) > 0)
        .map((l) => ({ sale_item_id: l.id, quantity: picked[l.id] }));
      if (kind === "refund" && items.length === 0) throw new Error("Choose at least one item");
      const { error } = await supabase.rpc("refund_sale_items", {
        p_sale_id: target.id,
        p_kind: kind,
        p_reason: reason.trim() || undefined,
        p_restock: restock,
        p_items: kind === "void" ? undefined : items,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(kind === "void" ? "Sale voided" : "Sale refunded");
      setTarget(null);
      setReason("");
      ["cashier-refund-sales", "refund-sales", "refunds", "sales", "stock", "cashier"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (sales.data ?? []).filter(
      (s) => !q || `${s.cashier_name ?? ""} ${s.payment_type} ${s.status}`.toLowerCase().includes(q),
    );
  }, [sales.data, search]);

  const paymentGradients: Record<string, string> = {
    cash: "from-emerald-500 to-teal-500",
    mobile: "from-blue-500 to-indigo-500",
    ecocash: "from-blue-500 to-indigo-500",
    card: "from-violet-500 to-purple-500",
    other: "from-orange-500 to-amber-500",
  };
  const getPaymentGradient = (p: string) => paymentGradients[p.toLowerCase()] ?? "from-slate-500 to-slate-600";

  return (
    <div className="relative min-h-screen p-4 sm:p-8">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-rose-400/10 to-red-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/30">
                <Undo2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-rose-900 to-orange-900 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                Refunds
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Reverse a sale you entered by mistake, or give a customer their money back. Every
                reversal here appears on the manager&apos;s Refunds &amp; Voids page and is removed
                from the day&apos;s sales totals.
              </p>
            </div>
          </div>
          <Link to="/cashier">
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to till
            </Button>
          </Link>
        </header>

        {/* Auto-approve status banner */}
        <Card
          className={`relative mb-6 overflow-hidden border p-4 shadow-sm ${
            autoApprove
              ? "border-emerald-100/60 bg-gradient-to-r from-white via-emerald-50/50 to-teal-50/40"
              : "border-amber-100/60 bg-gradient-to-r from-white via-amber-50/50 to-orange-50/40"
          }`}
        >
          <div
            className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl ${
              autoApprove
                ? "bg-gradient-to-br from-emerald-400/20 to-teal-400/20"
                : "bg-gradient-to-br from-amber-400/20 to-orange-400/20"
            }`}
          />
          <div className="relative flex items-start gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-md ${
                autoApprove
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
              }`}
            >
              {autoApprove ? (
                <ShieldCheck className="h-5 w-5 text-white" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="text-sm">
              <div
                className={`flex items-center gap-1.5 font-bold ${
                  autoApprove ? "text-emerald-900" : "text-amber-900"
                }`}
              >
                {autoApprove ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Auto-approve refunds is ON
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Refunds need manager approval
                  </>
                )}
              </div>
              <p className={`mt-0.5 ${autoApprove ? "text-emerald-700/80" : "text-amber-700/80"}`}>
                {autoApprove
                  ? "You can complete a refund or void on your own. It is recorded with your name."
                  : "The manager has to carry out reversals, or switch auto-approve on from Refunds & Voids."}
              </p>
            </div>
          </div>
        </Card>

        {/* Sales list */}
        <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
          <div className="p-4 sm:p-5">
            {/* Search */}
            <div className="mb-5 flex items-center gap-3">
              <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
                <Input
                  placeholder="Search by cashier, payment or status"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-indigo-100 bg-white pl-9 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
                {search.length > 0 && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="ml-auto hidden items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/60 px-2.5 py-1 sm:inline-flex">
                <Receipt className="h-3 w-3 text-indigo-600" />
                <span className="text-[11px] font-bold text-indigo-700">
                  {filtered.length} sale{filtered.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* List */}
            <ul className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const reversed = s.status === "refunded" || s.status === "voided";
                const paymentGradient = getPaymentGradient(s.payment_type);
                return (
                  <li
                    key={s.id}
                    className={`group flex flex-wrap items-center justify-between gap-3 py-3.5 transition-colors ${
                      reversed
                        ? "opacity-75"
                        : "hover:bg-gradient-to-r hover:from-indigo-50/40 hover:via-purple-50/20 hover:to-transparent"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="relative shrink-0">
                        <div
                          className={`absolute inset-0 rounded-lg bg-gradient-to-br ${paymentGradient} opacity-30 blur-sm`}
                        />
                        <div
                          className={`relative grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${paymentGradient} shadow-md`}
                        >
                          <Wallet className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {s.cashier_name ?? "Cashier"}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 capitalize">
                            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                            {s.payment_type}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span>{formatDate(s.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`shrink-0 bg-clip-text text-sm font-extrabold tabular-nums text-transparent bg-gradient-to-r ${
                          reversed
                            ? "from-slate-500 to-slate-600"
                            : "from-indigo-700 to-purple-700"
                        }`}
                      >
                        {formatCurrency(s.total_amount)}
                      </span>

                      {reversed ? (
                        <Badge
                          className={`border-0 capitalize ${
                            s.status === "refunded"
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30"
                              : "bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-sm shadow-slate-500/30"
                          }`}
                        >
                          {s.status === "refunded" ? (
                            <Undo2 className="mr-1 h-3 w-3" />
                          ) : (
                            <Ban className="mr-1 h-3 w-3" />
                          )}
                          {s.status}
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!autoApprove}
                            onClick={() => {
                              setTarget(s);
                              setKind("refund");
                              setRestock(true);
                            }}
                            className="border-amber-200 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                          >
                            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                            Refund
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!autoApprove}
                            onClick={() => {
                              setTarget(s);
                              setKind("void");
                              setRestock(true);
                            }}
                            className="hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                          >
                            <Ban className="mr-1.5 h-3.5 w-3.5" />
                            Void
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                      <Receipt className="h-7 w-7 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {sales.isLoading ? "Loading sales..." : "No sales found"}
                      </p>
                      {!sales.isLoading && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Try adjusting your search.
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </Card>
      </div>

      {/* Refund / Void dialog */}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-indigo-100 bg-gradient-to-b from-white to-indigo-50/40">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`grid h-11 w-11 place-items-center rounded-xl shadow-md ${
                  kind === "void"
                    ? "bg-gradient-to-br from-rose-500 to-red-500 shadow-rose-500/30"
                    : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
                }`}
              >
                {kind === "void" ? (
                  <Ban className="h-5 w-5 text-white" />
                ) : (
                  <Undo2 className="h-5 w-5 text-white" />
                )}
              </div>
              <DialogTitle
                className={`bg-clip-text text-transparent bg-gradient-to-r ${
                  kind === "void"
                    ? "from-rose-700 to-red-700"
                    : "from-amber-700 to-orange-700"
                }`}
              >
                {kind === "void" ? "Void sale" : "Refund sale"}
              </DialogTitle>
            </div>
          </DialogHeader>

          {target && (
            <div className="space-y-4">
              {/* Sale summary */}
              <div className="relative overflow-hidden rounded-xl border border-indigo-100/60 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-orange-50/40 p-3.5">
                <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-xl" />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                      <Receipt className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                        Original sale
                      </div>
                      <div className="text-xs text-slate-600">{formatDate(target.created_at)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      Total
                    </div>
                    <div className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-lg font-extrabold tabular-nums text-transparent">
                      {formatCurrency(target.total_amount)}
                    </div>
                  </div>
                </div>
              </div>

              {kind === "refund" && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-indigo-500" />
                    <Label className="text-xs font-bold text-slate-700">
                      Which items are coming back?
                    </Label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Set the quantity for each item. Leave an item at 0 if the customer is keeping
                    it.
                  </p>

                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white/60">
                    {(lines.data ?? []).map((l) => {
                      const pickedQty = picked[l.id] ?? 0;
                      return (
                        <li
                          key={l.id}
                          className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-indigo-50/30"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {l.name}
                              {l.variant && (
                                <span className="text-slate-400"> · {l.variant}</span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="font-semibold text-indigo-700">
                                {formatCurrency(l.unit_price)}
                              </span>
                              <span>each</span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span>{l.remaining} refundable</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              aria-label="Decrease"
                              onClick={() =>
                                setPicked((p) => ({
                                  ...p,
                                  [l.id]: Math.max(0, (p[l.id] ?? 0) - 1),
                                }))
                              }
                              disabled={pickedQty === 0}
                              className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold tabular-nums text-slate-800">
                              {pickedQty}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase"
                              onClick={() =>
                                setPicked((p) => ({
                                  ...p,
                                  [l.id]: Math.min(l.remaining, (p[l.id] ?? 0) + 1),
                                }))
                              }
                              disabled={pickedQty >= l.remaining}
                              className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                    {lines.isLoading && (
                      <li className="p-4 text-center text-sm text-slate-500">
                        Loading items...
                      </li>
                    )}
                  </ul>

                  {/* Refund total */}
                  <div className="relative overflow-hidden rounded-xl border border-amber-100/60 bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-amber-50/80 p-3.5">
                    <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-400/20 blur-xl" />
                    <div className="relative flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                        Amount to refund
                      </span>
                      <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-xl font-extrabold tabular-nums text-transparent">
                        {formatCurrency(refundTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {kind === "void" && (
                <div className="relative overflow-hidden rounded-xl border border-rose-100/60 bg-gradient-to-r from-rose-50/80 via-red-50/60 to-rose-50/80 p-4">
                  <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-rose-400/20 to-red-400/20 blur-xl" />
                  <div className="relative flex items-start gap-2.5">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-red-500 shadow-sm shadow-rose-500/25">
                      <AlertTriangle className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="text-xs text-rose-900">
                      <div className="font-bold">This voids the entire sale</div>
                      <p className="mt-0.5 text-rose-700/80">
                        All items on this sale will be reversed and removed from today&apos;s
                        totals. This cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs font-bold text-slate-700">
                  Reason
                </Label>
                <Textarea
                  id="reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Wrong item, customer returned goods, entered twice..."
                  className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Restock toggle */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100/60 bg-gradient-to-r from-white to-indigo-50/40 p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/25">
                    <Package className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Return items to stock</div>
                    <div className="text-[11px] text-slate-500">
                      Adds the sold quantities back to each product.
                    </div>
                  </div>
                </div>
                <Switch checked={restock} onCheckedChange={setRestock} />
              </div>

              {/* Info footer */}
              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p className="text-[11px] text-slate-600">
                  This reversal is recorded with your name and shows on the manager&apos;s Refunds
                  &amp; Voids page.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTarget(null)}
              className="border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => apply.mutate()}
              disabled={apply.isPending}
              className={`shadow-md hover:shadow-lg ${
                kind === "void"
                  ? "bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-500/30 hover:shadow-rose-500/40"
                  : "bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-500/30 hover:shadow-orange-500/40"
              }`}
            >
              {apply.isPending ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                  Working...
                </>
              ) : kind === "void" ? (
                <>
                  <Ban className="mr-2 h-4 w-4" />
                  Void sale
                </>
              ) : (
                <>
                  <Undo2 className="mr-2 h-4 w-4" />
                  Refund sale
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
