import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { cachedQuery } from "@/lib/cached-query";
import {
  Undo2,
  Ban,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  TrendingDown,
  Receipt,
  History,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PackageCheck,
  PackageX,
  Info,
  ArrowUpRight,
  Clock,
  User,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/manager/refunds")({
  component: RefundsPage,
});

type SaleRow = {
  id: string;
  created_at: string;
  cashier_name: string | null;
  total_amount: number;
  payment_type: string;
  status: string;
};

const paymentIcon = (type: string) => {
  switch (type) {
    case "cash":
      return Banknote;
    case "card":
      return CreditCard;
    case "mobile":
      return Smartphone;
    default:
      return Wallet;
  }
};

function RefundsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<SaleRow | null>(null);
  const [kind, setKind] = useState<"refund" | "void">("refund");
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);

  const sales = useQuery({
    queryKey: ["refund-sales"],
    ...cachedQuery<SaleRow[]>("refund-sales", async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, created_at, cashier_name, total_amount, payment_type, status")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as SaleRow[];
    }),
  });

  const refunds = useQuery({
    queryKey: ["refunds"],
    ...cachedQuery<any[]>("refunds", async () => {
      const { data, error } = await (supabase as any)
        .from("refunds")
        .select("id, sale_id, kind, reason, amount, restocked, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    }),
  });

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

  const toggleAuto = useMutation({
    mutationFn: async (next: boolean) => {
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("id", true)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase
          .from("app_settings")
          .insert({ id: true, auto_approve_refunds: next });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .update({ auto_approve_refunds: next, updated_at: new Date().toISOString() })
          .eq("id", true);
        if (error) throw error;
      }
      return next;
    },
    onSuccess: (next) => {
      toast.success(
        next
          ? "Auto-approve is on - cashiers can complete refunds themselves"
          : "Auto-approve is off - only managers can reverse a sale",
      );
      qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("Choose a sale");
      const { error } = await (supabase as any).rpc("refund_sale", {
        p_sale_id: target.id,
        p_kind: kind,
        p_reason: reason.trim() || null,
        p_restock: restock,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(kind === "void" ? "Sale voided" : "Sale refunded");
      setTarget(null);
      setReason("");
      ["refund-sales", "refunds", "sales", "stock", "products", "cashier"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (sales.data ?? []).filter(
      (s) =>
        !q ||
        `${s.cashier_name ?? ""} ${s.payment_type} ${s.status} ${s.id}`.toLowerCase().includes(q),
    );
  }, [sales.data, search]);

  const refundTotal = (refunds.data ?? []).reduce((t: number, r: any) => t + Number(r.amount), 0);

  const stats = [
    {
      label: "Reversals recorded",
      value: String(refunds.data?.length ?? 0),
      icon: History,
      gradient: "from-indigo-500 to-purple-500",
      shadow: "shadow-indigo-500/30",
      textGradient: "from-indigo-700 to-purple-700",
      caption: "All-time refund & void events",
    },
    {
      label: "Value reversed",
      value: formatCurrency(refundTotal),
      icon: TrendingDown,
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/30",
      textGradient: "from-rose-700 to-red-700",
      caption: "Removed from takings",
    },
    {
      label: "Recent sales loaded",
      value: String(sales.data?.length ?? 0),
      icon: Receipt,
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/30",
      textGradient: "from-blue-700 to-cyan-700",
      caption: "Available for reversal",
    },
  ];

  return (
    <div className="relative p-6 md:p-10">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-rose-400/10 to-red-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/30">
                <Undo2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Refunds & Voids
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Reverse a mistaken sale. A refund returns money to the customer; a void cancels a
                sale entered by mistake. Both can put the items back into stock.
              </p>
            </div>
          </div>
        </header>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card
                key={s.label}
                className="group relative overflow-hidden border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`}
                />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {s.label}
                    </span>
                    <div
                      className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${s.gradient} shadow-md ${s.shadow}`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div
                      className={`bg-gradient-to-br ${s.textGradient} bg-clip-text text-2xl font-extrabold tabular-nums text-transparent`}
                    >
                      {s.value}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <ArrowUpRight className="h-3 w-3" />
                    {s.caption}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Auto-approve toggle */}
        <Card
          className={`relative mt-6 overflow-hidden shadow-sm backdrop-blur-sm transition-all duration-300 ${
            autoApprove
              ? "border-emerald-100/60 bg-gradient-to-r from-white via-emerald-50/40 to-teal-50/40"
              : "border-slate-200 bg-gradient-to-r from-white via-slate-50/60 to-slate-50/40"
          }`}
        >
          <div
            className={`h-1 w-full bg-gradient-to-r ${
              autoApprove
                ? "from-emerald-500 via-teal-500 to-emerald-500"
                : "from-slate-300 via-slate-400 to-slate-300"
            }`}
          />
          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-md ${
                    autoApprove
                      ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                      : "bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20"
                  }`}
                >
                  {autoApprove ? (
                    <ShieldCheck className="h-5 w-5 text-white" />
                  ) : (
                    <ShieldOff className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      Auto-approve refunds
                    </span>
                    <Badge
                      className={`border-0 shadow-sm ${
                        autoApprove
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25"
                          : "bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-slate-500/25"
                      }`}
                    >
                      {autoApprove ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Manager only
                        </>
                      )}
                    </Badge>
                  </div>
                  <p
                    className={`mt-1.5 text-sm ${
                      autoApprove ? "text-emerald-900/80" : "text-slate-500"
                    }`}
                  >
                    Switch this on when you are away or in a meeting. Cashiers can then complete a
                    refund or void from their own Refunds page and it goes through immediately, with
                    stock returned and the sale removed from the day&apos;s takings. Switch it off and
                    only you can reverse a sale.
                  </p>
                </div>
              </div>
              <Switch
                checked={autoApprove}
                disabled={toggleAuto.isPending}
                onCheckedChange={(v) => toggleAuto.mutate(v)}
                aria-label="Auto-approve refunds"
              />
            </div>
          </div>
        </Card>

        {/* Sales list */}
        <Card className="relative mt-6 overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
          <div className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Recent sales</h2>
                  <p className="text-[11px] text-slate-500">
                    Pick a transaction to refund or void
                  </p>
                </div>
              </div>
              <div className="relative min-w-[240px] sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
                <Input
                  placeholder="Search by cashier, payment or status"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-indigo-100 bg-white pl-9 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto rounded-lg border border-slate-100">
              <ul className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const reversed = s.status === "refunded" || s.status === "voided";
                  const PayIcon = paymentIcon(s.payment_type);
                  return (
                    <li
                      key={s.id}
                      className={`group flex flex-wrap items-center justify-between gap-3 px-3 py-3.5 transition-colors ${
                        reversed
                          ? "bg-gradient-to-r from-rose-50/40 via-rose-50/20 to-transparent hover:from-rose-100/50"
                          : "hover:bg-gradient-to-r hover:from-indigo-50/40 hover:via-purple-50/20 hover:to-transparent"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative shrink-0">
                          <div
                            className={`absolute inset-0 rounded-full opacity-30 blur-sm ${
                              reversed
                                ? "bg-gradient-to-br from-rose-500 to-red-500"
                                : "bg-gradient-to-br from-indigo-500 to-purple-500"
                            }`}
                          />
                          <div
                            className={`relative grid h-10 w-10 place-items-center rounded-full text-[12px] font-bold text-white shadow-sm ${
                              reversed
                                ? "bg-gradient-to-br from-rose-500 to-red-500"
                                : "bg-gradient-to-br from-indigo-600 to-purple-600"
                            }`}
                          >
                            {(s.cashier_name ?? "C").charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-bold text-slate-900">
                              {s.cashier_name ?? "Cashier"}
                            </span>
                            <Badge
                              className={`border-0 capitalize shadow-sm ${
                                reversed
                                  ? "bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-slate-500/20"
                                  : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-500/20"
                              }`}
                            >
                              <PayIcon className="mr-1 h-3 w-3" />
                              {s.payment_type}
                            </Badge>
                            {reversed && (
                              <Badge className="border-0 bg-gradient-to-r from-rose-500 to-red-500 capitalize text-white shadow-sm shadow-rose-500/20">
                                <XCircle className="mr-1 h-3 w-3" />
                                {s.status}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Clock className="h-2.5 w-2.5 text-slate-400" />
                            {formatDate(s.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-base font-extrabold tabular-nums text-transparent">
                          {formatCurrency(s.total_amount)}
                        </span>
                        {reversed ? (
                          <Badge className="border-0 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 shadow-sm">
                            Reversed
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTarget(s);
                                setKind("refund");
                                setRestock(true);
                              }}
                              className="border-indigo-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                              Refund
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setTarget(s);
                                setKind("void");
                                setRestock(true);
                              }}
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Ban className="mr-1.5 h-3.5 w-3.5" />
                              Void
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                        <Receipt className="h-7 w-7 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">No sales found</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Try a different search term.
                        </p>
                      </div>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>

        {/* Reversal history */}
        <Card className="relative mt-6 overflow-hidden border-rose-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />
          <div className="p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 shadow-md shadow-rose-500/25">
                <History className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Reversal history</h2>
                <p className="text-[11px] text-slate-500">
                  Every refund and void ever recorded
                </p>
              </div>
            </div>

            <ul className="divide-y divide-slate-100">
              {(refunds.data ?? []).map((r: any) => {
                const isVoid = r.kind === "void";
                return (
                  <li
                    key={r.id}
                    className="group flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-gradient-to-r hover:from-rose-50/30 hover:to-transparent"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg shadow-sm ${
                          isVoid
                            ? "bg-gradient-to-br from-rose-500 to-red-500 shadow-rose-500/20"
                            : "bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/20"
                        }`}
                      >
                        {isVoid ? (
                          <Ban className="h-4 w-4 text-white" />
                        ) : (
                          <Undo2 className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-bold capitalize ${
                              isVoid ? "text-rose-700" : "text-orange-700"
                            }`}
                          >
                            {r.kind}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="h-2.5 w-2.5 text-slate-400" />
                            {formatDate(r.created_at)}
                          </span>
                        </div>
                        {r.reason && (
                          <div className="mt-0.5 flex items-start gap-1.5 text-[11px] text-slate-500">
                            <Info className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">{r.reason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 text-right">
                      <span className="bg-gradient-to-r from-rose-700 to-red-700 bg-clip-text text-sm font-extrabold tabular-nums text-transparent">
                        −{formatCurrency(r.amount)}
                      </span>
                      <Badge
                        className={`border-0 capitalize shadow-sm ${
                          r.restocked
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20"
                            : "bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-slate-500/20"
                        }`}
                      >
                        {r.restocked ? (
                          <>
                            <PackageCheck className="mr-1 h-3 w-3" />
                            Restocked
                          </>
                        ) : (
                          <>
                            <PackageX className="mr-1 h-3 w-3" />
                            Not restocked
                          </>
                        )}
                      </Badge>
                    </div>
                  </li>
                );
              })}
              {(refunds.data ?? []).length === 0 && (
                <li className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Nothing reversed yet</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        All sales are still standing.
                      </p>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </Card>
      </div>

      {/* Reversal dialog */}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-lg border-rose-100 bg-gradient-to-b from-white to-rose-50/30">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`grid h-11 w-11 place-items-center rounded-xl shadow-md ${
                  kind === "void"
                    ? "bg-gradient-to-br from-rose-500 to-red-500 shadow-rose-500/30"
                    : "bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/30"
                }`}
              >
                {kind === "void" ? (
                  <Ban className="h-5 w-5 text-white" />
                ) : (
                  <Undo2 className="h-5 w-5 text-white" />
                )}
              </div>
              <DialogTitle
                className={`bg-clip-text text-transparent ${
                  kind === "void"
                    ? "bg-gradient-to-r from-rose-700 to-red-700"
                    : "bg-gradient-to-r from-orange-700 to-amber-700"
                }`}
              >
                {kind === "void" ? "Void sale" : "Refund sale"}
              </DialogTitle>
            </div>
          </DialogHeader>

          {target && (
            <div className="space-y-4">
              {/* Sale summary */}
              <div
                className={`relative overflow-hidden rounded-xl border p-4 ${
                  kind === "void"
                    ? "border-rose-100/60 bg-gradient-to-r from-rose-50/60 via-red-50/40 to-rose-50/60"
                    : "border-orange-100/60 bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-orange-50/60"
                }`}
              >
                <div
                  className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl ${
                    kind === "void"
                      ? "bg-gradient-to-br from-rose-400/20 to-red-400/20"
                      : "bg-gradient-to-br from-orange-400/20 to-amber-400/20"
                  }`}
                />
                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <User className="h-2.5 w-2.5" />
                      {target.cashier_name ?? "Cashier"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDate(target.created_at)}
                    </div>
                  </div>
                  <span
                    className={`bg-clip-text text-xl font-extrabold tabular-nums text-transparent ${
                      kind === "void"
                        ? "bg-gradient-to-r from-rose-700 to-red-700"
                        : "bg-gradient-to-r from-orange-700 to-amber-700"
                    }`}
                  >
                    {formatCurrency(target.total_amount)}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="reason"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
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
              <div
                className={`relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border p-4 transition-all ${
                  restock
                    ? "border-emerald-100/60 bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-emerald-50/60"
                    : "border-slate-200 bg-gradient-to-r from-slate-50/60 to-slate-50/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg shadow-md ${
                      restock
                        ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                        : "bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20"
                    }`}
                  >
                    {restock ? (
                      <PackageCheck className="h-4 w-4 text-white" />
                    ) : (
                      <PackageX className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Return items to stock</div>
                    <div className="text-[11px] text-slate-500">
                      Adds the sold quantities back to each product.
                    </div>
                  </div>
                </div>
                <Switch checked={restock} onCheckedChange={setRestock} />
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
              className={
                kind === "void"
                  ? "bg-gradient-to-r from-rose-600 to-red-600 shadow-md shadow-rose-500/30 hover:shadow-lg hover:shadow-rose-500/40"
                  : "bg-gradient-to-r from-orange-600 to-amber-600 shadow-md shadow-orange-500/30 hover:shadow-lg hover:shadow-orange-500/40"
              }
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
