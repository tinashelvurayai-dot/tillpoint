import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { isManagerMode, setMode } from "@/lib/session-mode";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand-logo";
import { SyncIndicator } from "@/components/sync-indicator";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ArrowLeft,
  Copy,
  Download,
  Trash2,
  Search,
  Printer,
  Sparkles,
  Receipt,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
  Filter,
  X,
  Info,
  Save,
  User,
} from "lucide-react";
import { printReceipt, downloadReceipt } from "@/lib/receipt";
import { toast } from "sonner";
import {
  clearLog,
  hydrateLogFromIdb,
  logToCsv,
  subscribeLog,
  type TxLogEntry,
} from "@/lib/transaction-log";
import { runSync } from "@/lib/sync-manager";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Transaction Log - TillPoint" },
      {
        name: "description",
        content:
          "Every sale recorded on this till, including offline queued sales waiting to sync.",
      },
      { property: "og:title", content: "Transaction Log - TillPoint" },
      {
        property: "og:description",
        content:
          "Every sale recorded on this till, including offline queued sales waiting to sync.",
      },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const [entries, setEntries] = useState<TxLogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const manager = isManagerMode();
    setIsManager(manager);
    if (manager) setMode("manager");
    const off = subscribeLog(setEntries);
    void hydrateLogFromIdb();
    return off;
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        (paymentFilter === "all" || e.payment_type === paymentFilter) &&
        (statusFilter === "all" || e.status === statusFilter) &&
        (!dateFrom || e.created_at.slice(0, 10) >= dateFrom) &&
        (!dateTo || e.created_at.slice(0, 10) <= dateTo) &&
        (e.cashier_name.toLowerCase().includes(q) ||
          e.payment_type.toLowerCase().includes(q) ||
          e.status.includes(q) ||
          e.items.some((i) => `${i.name} ${i.variant}`.toLowerCase().includes(q))),
    );
  }, [entries, query, paymentFilter, statusFilter, dateFrom, dateTo]);

  const total = filtered.reduce((s, e) => s + e.total, 0);
  const queued = entries.filter((e) => e.status === "queued").length;
  const synced = entries.filter((e) => e.status === "synced").length;
  const failed = entries.filter((e) => e.status === "failed").length;
  const hasActiveFilters =
    query || paymentFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo;

  async function copyAll() {
    const text = logToCsv(filtered);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Transaction log copied to clipboard");
    } catch {
      toast.error("Clipboard blocked - use Download CSV instead");
    }
  }

  function downloadCsv() {
    const blob = new Blob([logToCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaction-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  function doClear() {
    if (queued > 0 && !confirm(`${queued} sale(s) have not synced yet. Clear anyway?`)) return;
    if (!confirm("Clear the whole transaction log on this device?")) return;
    clearLog();
    toast.success("Transaction log cleared");
  }

  function clearFilters() {
    setQuery("");
    setPaymentFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  const statusConfig: Record<string, { gradient: string; shadow: string; label: string; icon: any }> = {
    synced: {
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
      label: "Synced",
      icon: CheckCircle2,
    },
    queued: {
      gradient: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/25",
      label: "Saved offline",
      icon: Clock,
    },
    failed: {
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/25",
      label: "Failed",
      icon: AlertTriangle,
    },
  };

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
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                <div className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-[10px] font-bold uppercase tracking-wider text-transparent">
                  Transaction log
                </div>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {isManager ? "Manager view" : "Cashier view"}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SyncIndicator />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void runSync();
              }}
              className="border-indigo-200 bg-white/80 backdrop-blur-sm hover:border-indigo-300 hover:bg-indigo-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync now
            </Button>
            <Link to={isManager ? "/manager" : "/cashier"}>
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
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
            <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
              <Receipt className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
              Transactions
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Every sale recorded on this device, including queued offline sales.
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
                  Transactions
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-3xl font-extrabold tabular-nums text-transparent">
                  {filtered.length}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  of {entries.length}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600/70">
                <Sparkles className="h-3 w-3" />
                Filtered view
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-400/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Value
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <div className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-3xl font-extrabold tabular-nums text-transparent">
                  {formatCurrency(total)}
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
              queued > 0
                ? "border-amber-100/60 bg-gradient-to-br from-white via-amber-50/50 to-orange-50/50 hover:shadow-amber-500/10"
                : "border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 hover:shadow-emerald-500/10"
            }`}
          >
            <div
              className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${
                queued > 0
                  ? "bg-gradient-to-br from-amber-400/20 to-orange-400/20"
                  : "bg-gradient-to-br from-emerald-400/20 to-teal-400/20"
              }`}
            />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    queued > 0 ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  Waiting to sync
                </span>
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg shadow-md ${
                    queued > 0
                      ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
                      : "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                  }`}
                >
                  {queued > 0 ? (
                    <Clock className="h-4 w-4 text-white" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className={`bg-clip-text text-3xl font-extrabold tabular-nums text-transparent ${
                    queued > 0
                      ? "bg-gradient-to-r from-amber-600 to-orange-600"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600"
                  }`}
                >
                  {queued}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  sale{queued === 1 ? "" : "s"}
                </span>
              </div>
              <div
                className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${
                  queued > 0 ? "text-amber-700/70" : "text-emerald-700/70"
                }`}
              >
                {queued > 0 ? "Awaiting upload" : "All sales synced"}
              </div>
            </div>
          </Card>

          <Card className="group relative overflow-hidden border-rose-100/60 bg-gradient-to-br from-white via-rose-50/40 to-red-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-rose-400/15 to-red-400/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  Failed
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-red-500 shadow-md shadow-rose-500/30">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-3xl font-extrabold tabular-nums text-transparent">
                  {failed}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  sale{failed === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-700/70">
                <AlertTriangle className="h-3 w-3" />
                Needs attention
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="relative mb-6 overflow-hidden border-indigo-100/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm shadow-indigo-500/25">
              <Filter className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Filters
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50/60 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search item, cashier, payment..."
                className="border-indigo-100 bg-white pl-9 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-10 rounded-md border border-indigo-100 bg-white px-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All payments</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-indigo-100 bg-white px-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All statuses</option>
              <option value="synced">Synced</option>
              <option value="queued">Saved offline</option>
              <option value="failed">Failed</option>
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="From date"
              className="w-auto border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="To date"
              className="w-auto border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {isManager && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-indigo-100/60 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={copyAll}
                className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
              >
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCsv}
                className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
              >
                <Download className="mr-2 h-4 w-4" /> Download CSV
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={doClear}
                className="bg-gradient-to-r from-rose-600 to-red-600 shadow-md shadow-rose-500/30 hover:shadow-lg hover:shadow-rose-500/40"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Clear
              </Button>
            </div>
          )}
        </Card>

        {!isManager && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-indigo-100/60 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-orange-50/40 p-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
            <p className="text-xs text-slate-600">
              Only the manager can copy or clear these records.
            </p>
          </div>
        )}

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 p-12 text-center shadow-sm backdrop-blur-sm">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                <ShoppingBag className="h-7 w-7 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {hasActiveFilters ? "No matches for your filters" : "No transactions yet"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {hasActiveFilters
                    ? "Try clearing the filters to see all records."
                    : "Transactions will appear here after the first sale."}
                </p>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-1 border-indigo-200 hover:bg-indigo-50"
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Clear filters
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => {
              const status = statusConfig[e.status] ?? statusConfig.queued;
              const StatusIcon = status.icon;
              const itemCount = e.items.reduce((s, i) => s + i.quantity, 0);
              return (
                <Card
                  key={e.id}
                  className="group relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {/* Left gradient accent by status */}
                  <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${status.gradient}`} />

                  <div className="p-4 pl-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${status.gradient} shadow-md ${status.shadow}`}
                        >
                          <StatusIcon className="h-4.5 w-4.5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {formatDate(e.created_at)}
                            </span>
                            <Badge
                              className={`border-0 bg-gradient-to-r ${status.gradient} text-white shadow-sm ${status.shadow}`}
                            >
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3 text-indigo-500" />
                              {e.cashier_name}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="inline-flex items-center gap-1 capitalize">
                              <Wallet className="h-3 w-3 text-emerald-500" />
                              {e.payment_type}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="inline-flex items-center gap-1">
                              <Package className="h-3 w-3 text-purple-500" />
                              {itemCount} item{itemCount === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-xl font-extrabold tabular-nums text-transparent">
                          {formatCurrency(e.total)}
                        </div>
                      </div>
                    </div>

                    {/* Items list */}
                    <ul className="mt-3 space-y-1.5 rounded-lg border border-slate-100 bg-gradient-to-r from-slate-50/60 to-indigo-50/30 p-3 text-sm">
                      {e.items.map((i, idx) => (
                        <li key={idx} className="flex items-baseline justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2 truncate">
                            <span className="inline-flex min-w-[28px] shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-purple-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {i.quantity}×
                            </span>
                            <span className="truncate font-medium text-slate-700">{i.name}</span>
                            <span className="truncate text-xs text-slate-500">{i.variant}</span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-indigo-700">
                            {formatCurrency(i.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printReceipt(e)}
                        className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Printer className="mr-2 h-4 w-4" /> Reprint receipt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReceipt(e)}
                        className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Save className="mr-2 h-4 w-4" /> Save receipt
                      </Button>
                    </div>
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
