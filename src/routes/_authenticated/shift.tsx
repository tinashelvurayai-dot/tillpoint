import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BrandLogo } from "@/components/brand-logo";
import { SyncIndicator } from "@/components/sync-indicator";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ArrowLeft,
  Download,
  Lock as LockIcon,
  Sparkles,
  Receipt,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  FileText,
  History,
  Calendar,
  User,
  Coins,
  CreditCard,
  Smartphone,
  Info,
  ShieldCheck,
  DollarSign,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { subscribeLog, type TxLogEntry } from "@/lib/transaction-log";
import {
  closeShift,
  currentShiftEntries,
  hydrateReports,
  subscribeReports,
  summarise,
  type ShiftReport,
} from "@/lib/shift-report";
import { isManagerMode, CASHIER_NAME } from "@/lib/session-mode";
import { printZReport } from "@/lib/z-report";
import { cachedQuery } from "@/lib/cached-query";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/shift")({
  head: () => ({
    meta: [
      { title: "Shift Close & Z-Report - TillPoint" },
      { name: "description", content: "Cash up the till: totals by payment type, counted cash and variance for the current shift." },
      { property: "og:title", content: "Shift Close & Z-Report - TillPoint" },
      { property: "og:description", content: "Cash up the till: totals by payment type, counted cash and variance for the current shift." },
    ],
  }),
  component: ShiftPage,
});

function ShiftPage() {
  const [, setLog] = useState<TxLogEntry[]>([]);
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [manager, setManager] = useState(false);

  const expenses = useQuery({
    queryKey: ["shift-expenses"],
    ...cachedQuery<Array<{ expense_date: string; amount: number; category: string }>>(
      "shift-expenses",
      async () => {
        const { data, error } = await supabase
          .from("expenses")
          .select("expense_date, amount, category")
          .order("expense_date", { ascending: false })
          .limit(500);
        if (error) throw error;
        return data ?? [];
      },
    ),
  });

  function expensesFor(iso: string) {
    const day = iso.slice(0, 10);
    const list = (expenses.data ?? []).filter((e) => e.expense_date === day);
    return {
      total: list.reduce((t, e) => t + Number(e.amount), 0),
      lines: list.map((e) => ({ label: e.category, amount: Number(e.amount) })),
    };
  }

  useEffect(() => {
    setManager(isManagerMode());
    void hydrateReports();
    const offLog = subscribeLog(setLog);
    const offRep = subscribeReports(setReports);
    return () => { offLog(); offRep(); };
  }, []);

  const entries = useMemo(() => currentShiftEntries(), [reports, setLog]);
  const s = summarise(entries);
  const expectedCash = s.by_payment["cash"] ?? 0;
  const countedNum = counted.trim() === "" ? null : Number(counted);
  const variance = countedNum === null || Number.isNaN(countedNum) ? null : countedNum - expectedCash;

  function doClose() {
    if (entries.length === 0) return toast.error("No sales in this shift yet");
    if (s.queued > 0 && !confirm(`${s.queued} sale(s) are still waiting to sync. Close the shift anyway?`)) return;
    const r = closeShift({
      cashier_name: manager ? "Manager" : CASHIER_NAME,
      counted_cash: countedNum !== null && !Number.isNaN(countedNum) ? countedNum : null,
      note: note.trim(),
    });
    setCounted("");
    setNote("");
    toast.success(`Shift closed - ${formatCurrency(r.total)} over ${r.sale_count} sale(s)`);
  }

  function downloadZ(r: ShiftReport) {
    const lines = [
      "TILLPOINT Z-REPORT",
      `Closed: ${new Date(r.closed_at).toLocaleString()}`,
      `Opened: ${new Date(r.opened_at).toLocaleString()}`,
      `Operator: ${r.cashier_name}`,
      `Sales: ${r.sale_count}`,
      ...Object.entries(r.by_payment).map(([k, v]) => `${k}: ${v.toFixed(2)}`),
      `TOTAL: ${r.total.toFixed(2)}`,
      `Counted cash: ${r.counted_cash === null ? "n/a" : r.counted_cash.toFixed(2)}`,
      `Variance: ${r.variance === null ? "n/a" : r.variance.toFixed(2)}`,
      r.note ? `Note: ${r.note}` : "",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `z-report-${r.closed_at.slice(0, 19).replace(/[:T]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const paymentIcons: Record<string, any> = {
    cash: Coins,
    card: CreditCard,
    mobile: Smartphone,
    other: Wallet,
  };

  const paymentGradients: Record<string, { gradient: string; shadow: string; text: string }> = {
    cash: {
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
      text: "from-emerald-700 to-teal-700",
    },
    card: {
      gradient: "from-blue-500 to-indigo-500",
      shadow: "shadow-blue-500/25",
      text: "from-blue-700 to-indigo-700",
    },
    mobile: {
      gradient: "from-violet-500 to-purple-500",
      shadow: "shadow-violet-500/25",
      text: "from-violet-700 to-purple-700",
    },
    other: {
      gradient: "from-orange-500 to-amber-500",
      shadow: "shadow-orange-500/25",
      text: "from-orange-600 to-amber-600",
    },
  };

  const varianceState =
    variance === null
      ? "none"
      : variance === 0
        ? "balanced"
        : variance > 0
          ? "over"
          : "short";

  const varianceStyles: Record<string, { gradient: string; shadow: string; label: string; icon: any }> = {
    none: {
      gradient: "from-slate-400 to-slate-500",
      shadow: "shadow-slate-500/20",
      label: "Not yet counted",
      icon: Clock,
    },
    balanced: {
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
      label: "Balanced",
      icon: CheckCircle2,
    },
    over: {
      gradient: "from-blue-500 to-indigo-500",
      shadow: "shadow-blue-500/25",
      label: "Over",
      icon: TrendingUp,
    },
    short: {
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/25",
      label: "Short",
      icon: AlertTriangle,
    },
  };

  const vs = varianceStyles[varianceState];
  const VsIcon = vs.icon;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-orange-50/20">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/20 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div className="hidden border-l border-slate-200 pl-3 sm:block">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gradient-to-r from-orange-500 to-amber-500" />
                <div className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-[10px] font-bold uppercase tracking-wider text-transparent">
                  Shift close
                </div>
              </div>
              <div className="text-sm font-bold text-slate-900">Z-Report</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncIndicator />
            <Link to={manager ? "/manager" : "/cashier"}>
              <Button
                variant="outline"
                size="sm"
                className="border-indigo-200 bg-white/80 backdrop-blur-sm hover:border-indigo-300 hover:bg-indigo-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="relative p-4 sm:p-6 md:p-10">
        {/* Page title */}
        <div className="mb-8 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 opacity-30 blur-md" />
            <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30">
              <LockIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
              Shift close
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Cash up the till, reconcile variance, and issue a Z-Report.
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="group relative overflow-hidden border-indigo-100/60 bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Sales this shift
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-3xl font-extrabold tabular-nums text-transparent">
                  {s.sale_count}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  transaction{s.sale_count === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600/70">
                <Sparkles className="h-3 w-3" />
                Since shift opened
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-400/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Shift total
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <div className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-3xl font-extrabold tabular-nums text-transparent">
                  {formatCurrency(s.total)}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700/70">
                <TrendingUp className="h-3 w-3" />
                Total sales value
              </div>
            </div>
          </Card>

          <Card
            className={`group relative overflow-hidden p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
              s.queued > 0
                ? "border-amber-100/60 bg-gradient-to-br from-white via-amber-50/50 to-orange-50/50 hover:shadow-amber-500/10"
                : "border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 hover:shadow-emerald-500/10"
            }`}
          >
            <div
              className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${
                s.queued > 0
                  ? "bg-gradient-to-br from-amber-400/20 to-orange-400/20"
                  : "bg-gradient-to-br from-emerald-400/20 to-teal-400/20"
              }`}
            />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    s.queued > 0 ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  Waiting to sync
                </span>
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg shadow-md ${
                    s.queued > 0
                      ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
                      : "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                  }`}
                >
                  {s.queued > 0 ? (
                    <Clock className="h-4 w-4 text-white" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className={`bg-clip-text text-3xl font-extrabold tabular-nums text-transparent ${
                    s.queued > 0
                      ? "bg-gradient-to-r from-amber-600 to-orange-600"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600"
                  }`}
                >
                  {s.queued}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  sale{s.queued === 1 ? "" : "s"}
                </span>
              </div>
              <div
                className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${
                  s.queued > 0 ? "text-amber-700/70" : "text-emerald-700/70"
                }`}
              >
                {s.queued > 0 ? "Awaiting upload" : "All sales synced"}
              </div>
            </div>
          </Card>

          <Card
            className={`group relative overflow-hidden p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg border-${varianceState === "short" ? "rose" : varianceState === "over" ? "blue" : "emerald"}-100/60`}
          >
            <div
              className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${vs.gradient} opacity-15 blur-2xl`}
            />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cash variance
                </span>
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${vs.gradient} shadow-md ${vs.shadow}`}
                >
                  <VsIcon className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                {variance === null ? (
                  <div className="bg-gradient-to-r from-slate-500 to-slate-600 bg-clip-text text-3xl font-extrabold tabular-nums text-transparent">
                    —
                  </div>
                ) : (
                  <div
                    className={`bg-gradient-to-r ${vs.gradient} bg-clip-text text-3xl font-extrabold tabular-nums text-transparent`}
                  >
                    {formatCurrency(variance)}
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <VsIcon className={`h-3 w-3 ${varianceState === "short" ? "text-rose-500" : varianceState === "over" ? "text-blue-500" : varianceState === "balanced" ? "text-emerald-500" : "text-slate-400"}`} />
                {vs.label}
              </div>
            </div>
          </Card>
        </div>

        {/* Payment breakdown */}
        <Card className="relative mb-6 overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
          <div className="p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Breakdown by payment</h2>
                <p className="text-[11px] text-slate-500">
                  Totals for the current shift, per tender type
                </p>
              </div>
            </div>

            {Object.keys(s.by_payment).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                  <Wallet className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No sales yet in this shift</p>
                <p className="text-xs text-slate-500">
                  Payment breakdown will appear after the first sale.
                </p>
              </div>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {Object.entries(s.by_payment).map(([k, v]) => {
                  const Icon = paymentIcons[k] ?? Wallet;
                  const pg = paymentGradients[k] ?? paymentGradients.other;
                  const percentage = s.total > 0 ? (v / s.total) * 100 : 0;
                  return (
                    <li
                      key={k}
                      className="group relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/60 p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md"
                    >
                      <div
                        className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${pg.gradient} opacity-10 blur-xl transition-opacity group-hover:opacity-20`}
                      />
                      <div className="relative flex items-center gap-3">
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${pg.gradient} shadow-md ${pg.shadow}`}
                        >
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              {k}
                            </span>
                            <span
                              className={`bg-gradient-to-r ${pg.text} bg-clip-text text-base font-extrabold tabular-nums text-transparent`}
                            >
                              {formatCurrency(v)}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${pg.gradient} transition-all duration-500`}
                              style={{ width: `${Math.max(4, percentage)}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[10px] font-medium text-slate-400">
                            {percentage.toFixed(1)}% of shift total
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Cash up form */}
        <Card className="relative mb-8 overflow-hidden border-orange-100/60 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/30 shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />
          <div className="p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/25">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Cash up</h2>
                <p className="text-[11px] text-slate-500">
                  Reconcile physical cash against expected till balance
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="counted"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                >
                  <Coins className="h-3.5 w-3.5 text-orange-500" />
                  Counted cash in drawer
                </Label>
                <Input
                  id="counted"
                  inputMode="decimal"
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  placeholder="0.00"
                  className="border-orange-100 bg-white shadow-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                />

                {/* Expected vs counted summary */}
                <div className="mt-2 space-y-1.5 rounded-lg border border-orange-100/60 bg-gradient-to-r from-orange-50/60 to-amber-50/40 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">Expected cash</span>
                    <span className="font-bold tabular-nums text-slate-700">
                      {formatCurrency(expectedCash)}
                    </span>
                  </div>
                  {variance !== null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-500">Variance</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow-sm ${`bg-gradient-to-r ${vs.gradient} ${vs.shadow}`}`}
                      >
                        <VsIcon className="h-2.5 w-2.5" />
                        {formatCurrency(variance)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="note"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  Note (optional)
                </Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Anything unusual during this shift?"
                  className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <Button
              className="mt-5 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40 sm:w-auto"
              onClick={doClose}
            >
              <LockIcon className="mr-2 h-4 w-4" />
              Close shift & issue Z-Report
            </Button>
          </div>
        </Card>

        {/* Past shifts */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
            <History className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Past shifts</h2>
            <p className="text-[11px] text-slate-500">
              Closed shifts on this device with downloadable reports
            </p>
          </div>
          {reports.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/60 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
              <Sparkles className="h-3 w-3" />
              {reports.length} report{reports.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {reports.length === 0 ? (
          <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 p-12 text-center shadow-sm backdrop-blur-sm">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                <History className="h-7 w-7 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  No shifts closed on this device yet
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Past shift reports will appear here after the first cash-up.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const repVarianceState =
                r.variance === null || r.variance === undefined
                  ? "none"
                  : r.variance === 0
                    ? "balanced"
                    : r.variance > 0
                      ? "over"
                      : "short";
              const rvs = varianceStyles[repVarianceState];
              const RvsIcon = rvs.icon;
              return (
                <Card
                  key={r.id}
                  className="group relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${rvs.gradient}`} />

                  <div className="p-4 pl-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${rvs.gradient} shadow-md ${rvs.shadow}`}
                        >
                          <RvsIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {formatDate(r.closed_at)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm bg-gradient-to-r ${rvs.gradient} ${rvs.shadow}`}
                            >
                              <RvsIcon className="h-2.5 w-2.5" />
                              {rvs.label}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3 text-indigo-500" />
                              {r.cashier_name}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="inline-flex items-center gap-1">
                              <Receipt className="h-3 w-3 text-purple-500" />
                              {r.sale_count} sale{r.sale_count === 1 ? "" : "s"}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-orange-500" />
                              {new Date(r.opened_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-xl font-extrabold tabular-nums text-transparent">
                          {formatCurrency(r.total)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              const e = expensesFor(r.closed_at);
                              printZReport(r, { expenses: e.total, expenseLines: e.lines });
                            }}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-purple-500/40"
                          >
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            Z-Report PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadZ(r)}
                            className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
                          >
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Text
                          </Button>
                        </div>
                      </div>
                    </div>

                    {(r.counted_cash !== null || r.note) && (
                      <div className="mt-3 rounded-lg border border-slate-100 bg-gradient-to-r from-slate-50/60 to-indigo-50/30 p-2.5">
                        {r.counted_cash !== null && (
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <Coins className="h-3 w-3 text-emerald-500" />
                              Counted
                              <span className="font-bold tabular-nums text-slate-700">
                                {formatCurrency(r.counted_cash)}
                              </span>
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <Hash className="h-3 w-3 text-indigo-500" />
                              Variance
                              <span
                                className={`font-bold tabular-nums ${
                                  repVarianceState === "short"
                                    ? "text-rose-600"
                                    : repVarianceState === "over"
                                      ? "text-blue-600"
                                      : repVarianceState === "balanced"
                                        ? "text-emerald-600"
                                        : "text-slate-500"
                                }`}
                              >
                                {formatCurrency(r.variance ?? 0)}
                              </span>
                            </span>
                          </div>
                        )}
                        {r.note && (
                          <div className="mt-1.5 flex items-start gap-1.5 text-xs italic text-slate-500">
                            <Info className="mt-0.5 h-3 w-3 shrink-0 text-indigo-400" />
                            {r.note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
