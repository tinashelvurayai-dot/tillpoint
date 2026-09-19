import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Download,
  Search,
  RefreshCw,
  Receipt,
  TrendingUp,
  Undo2,
  Wallet,
  Sparkles,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  CreditCard,
  Smartphone,
  Banknote,
  Filter,
  BarChart3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/manager/sales")({
  component: SalesPage,
});

function toCsv(rows: any[]): string {
  const header = ["When", "Cashier", "Items", "Payment", "Status", "Total"];
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((s) =>
    [
      new Date(s.created_at).toISOString(),
      s.cashier_name ?? "Cashier",
      s.items?.reduce((a: number, x: any) => a + x.quantity, 0) ?? 0,
      s.payment_type,
      s.status ?? "completed",
      Number(s.total_amount).toFixed(2),
    ]
      .map(esc)
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}

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

function SalesPage() {
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("all");
  const [range, setRange] = useState<"all" | "today" | "week">("all");
  const sales = useQuery({
    queryKey: ["sales", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(
          "id, total_amount, payment_type, status, created_at, cashier_name, items:sale_items(quantity)",
        )
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredSales = useMemo(() => {
    const now = Date.now();
    const start =
      range === "today"
        ? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
        : range === "week"
          ? now - 7 * 86400000
          : 0;
    const q = search.toLowerCase().trim();
    return (sales.data ?? []).filter((s: any) => {
      const cashier = s.cashier_name ?? "";
      return (
        new Date(s.created_at).getTime() >= start &&
        (payment === "all" || s.payment_type === payment) &&
        (!q || `${s.id} ${cashier} ${s.payment_type}`.toLowerCase().includes(q))
      );
    });
  }, [sales.data, search, payment, range]);

  const isReversed = (s: any) => s.status === "refunded" || s.status === "voided";
  const countedSales = filteredSales.filter((s: any) => !isReversed(s));
  const gross = filteredSales.reduce((s, r) => s + Number(r.total_amount), 0);
  const reversed = filteredSales
    .filter(isReversed)
    .reduce((s, r) => s + Number(r.total_amount), 0);
  const total = gross - reversed;
  const avgTicket = countedSales.length ? total / countedSales.length : 0;

  function exportCsv() {
    const rows = filteredSales;
    if (rows.length === 0) {
      toast.error("No sales to export");
      return;
    }
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} sales`);
  }

  const stats = [
    {
      label: "Transactions counted",
      value: String(countedSales.length),
      icon: Receipt,
      gradient: "from-indigo-500 to-purple-500",
      shadow: "shadow-indigo-500/30",
      textGradient: "from-indigo-700 to-purple-700",
      caption: "Net of reversals",
    },
    {
      label: "Gross revenue",
      value: formatCurrency(gross),
      icon: TrendingUp,
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/30",
      textGradient: "from-blue-700 to-cyan-700",
      caption: "Before reversals",
    },
    {
      label: "Refunded / voided",
      value: `−${formatCurrency(reversed)}`,
      icon: Undo2,
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/30",
      textGradient: "from-rose-700 to-red-700",
      caption: "Excluded from net",
    },
    {
      label: "Net revenue",
      value: formatCurrency(total),
      icon: Coins,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/30",
      textGradient: "from-emerald-700 to-teal-700",
      caption: `Avg ticket ${formatCurrency(avgTicket)}`,
    },
  ];

  const rangeOptions: { key: typeof range; label: string }[] = [
    { key: "all", label: "All time" },
    { key: "today", label: "Today" },
    { key: "week", label: "Last 7 days" },
  ];

  return (
    <div className="relative p-6 md:p-10">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-blue-400/10 to-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Receipt className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Sales
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Recent transactions across your shop.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void sales.refetch()}
              variant="outline"
              disabled={sales.isFetching}
              className="border-indigo-200 bg-white hover:border-indigo-300 hover:bg-indigo-50"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${sales.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={exportCsv}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-purple-500/40"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </header>

        {/* Filters */}
        <Card className="relative mb-6 overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="relative flex flex-wrap items-center gap-3 p-4">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cashier, payment, sale ID..."
                className="border-indigo-100 bg-white pl-9 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Payment select */}
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md shadow-blue-500/25">
                <Wallet className="h-3.5 w-3.5 text-white" />
              </div>
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="h-10 rounded-md border border-indigo-100 bg-white px-3 text-sm shadow-sm transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All payments</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>

            {/* Range toggle */}
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-white p-1 shadow-sm">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm">
                <Clock className="h-3.5 w-3.5 text-white" />
              </div>
              {rangeOptions.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    range === r.key
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25"
                      : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Stat cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Table */}
        <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Transaction ledger</h2>
                  <p className="text-[11px] text-slate-500">
                    {filteredSales.length} sale{filteredSales.length === 1 ? "" : "s"} matched
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/60 px-2.5 py-1">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span className="text-[11px] font-semibold text-indigo-700">
                  {countedSales.length} counted
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader className="bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-orange-50/60">
                  <TableRow className="border-b border-indigo-100/60 hover:bg-transparent">
                    <TableHead className="font-bold text-indigo-700">When</TableHead>
                    <TableHead className="font-bold text-indigo-700">Cashier</TableHead>
                    <TableHead className="font-bold text-indigo-700">Items</TableHead>
                    <TableHead className="font-bold text-indigo-700">Payment</TableHead>
                    <TableHead className="text-right font-bold text-indigo-700">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative h-12 w-12">
                            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20" />
                            <div className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
                              <Sparkles className="h-5 w-5 animate-pulse text-white" />
                            </div>
                          </div>
                          <p className="text-sm font-medium text-slate-500">Loading sales...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                            <Receipt className="h-7 w-7 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">No sales found</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Try adjusting your search or filters.
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((s: any) => {
                      const reversed = isReversed(s);
                      const itemCount =
                        s.items?.reduce((a: number, x: any) => a + x.quantity, 0) ?? 0;
                      const PayIcon = paymentIcon(s.payment_type);
                      return (
                        <TableRow
                          key={s.id}
                          className={`group transition-colors ${
                            reversed
                              ? "bg-gradient-to-r from-rose-50/40 via-rose-50/20 to-transparent hover:from-rose-100/50"
                              : "hover:bg-gradient-to-r hover:from-indigo-50/40 hover:via-purple-50/20 hover:to-transparent"
                          }`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 text-slate-500">
                                <Clock className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-medium text-slate-700">
                                {formatDate(s.created_at)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="relative shrink-0">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-sm" />
                                <div className="relative grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-[11px] font-bold text-white shadow-sm">
                                  {(s.cashier_name ?? "C").charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-slate-800">
                                {s.cashier_name ?? "Cashier"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-100 bg-indigo-50/60 px-2 py-0.5 text-xs font-bold text-indigo-700">
                              <Package className="h-3 w-3" />
                              {itemCount}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
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
                                <Badge className="border-0 bg-gradient-to-r from-rose-500 to-red-500 text-white capitalize shadow-sm shadow-rose-500/20">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  {s.status}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                                reversed
                                  ? "text-slate-400 line-through"
                                  : "bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
                              }`}
                            >
                              {!reversed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                              {formatCurrency(s.total_amount)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
