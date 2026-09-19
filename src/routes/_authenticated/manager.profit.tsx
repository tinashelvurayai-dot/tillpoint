import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { cachedQuery } from "@/lib/cached-query";
import {
  TrendingUp,
  Coins,
  Receipt,
  PiggyBank,
  Sparkles,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Wallet,
  Percent,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/manager/profit")({
  component: ProfitPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

type Line = {
  quantity: number;
  unit_price: number;
  subtotal: number;
  variant_id: string;
  sale: { created_at: string; status: string } | null;
  variant: { variant_name: string; product: { name: string } | null } | null;
};

function ProfitPage() {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());

  const lines = useQuery({
    queryKey: ["profit-lines", from, to],
    ...cachedQuery<Line[]>(`profit-lines-${from}-${to}`, async () => {
      const { data, error } = await supabase
        .from("sale_items")
        .select(
          "quantity, unit_price, subtotal, variant_id, sale:sales(created_at, status), variant:product_variants(variant_name, product:products(name))",
        )
        .gte("created_at", `${from}T00:00:00Z`)
        .lte("created_at", `${to}T23:59:59Z`)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as unknown as Line[];
    }),
  });

  const costs = useQuery({
    queryKey: ["variant-costs"],
    ...cachedQuery<Record<string, number>>("variant-costs", async () => {
      const { data, error } = await (supabase as any)
        .from("stock_in_records")
        .select("variant_id, quantity, unit_buying_price")
        .limit(5000);
      if (error) throw error;
      const agg: Record<string, { qty: number; cost: number }> = {};
      for (const r of (data ?? []) as any[]) {
        const a = (agg[r.variant_id] ??= { qty: 0, cost: 0 });
        a.qty += Number(r.quantity);
        a.cost += Number(r.quantity) * Number(r.unit_buying_price);
      }
      const map: Record<string, number> = {};
      for (const [id, a] of Object.entries(agg)) map[id] = a.qty > 0 ? a.cost / a.qty : 0;
      return map;
    }),
  });

  const expenses = useQuery({
    queryKey: ["profit-expenses", from, to],
    ...cachedQuery<{ amount: number }[]>(`profit-expenses-${from}-${to}`, async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", from)
        .lte("expense_date", to);
      if (error) throw error;
      return data ?? [];
    }),
  });

  const view = useMemo(() => {
    const costMap = costs.data ?? {};
    const rows: Record<string, { name: string; qty: number; revenue: number; cogs: number }> = {};
    let revenue = 0;
    let cogs = 0;
    for (const l of lines.data ?? []) {
      if (l.sale && (l.sale.status === "refunded" || l.sale.status === "voided")) continue;
      const unitCost = costMap[l.variant_id] ?? 0;
      const lineCost = unitCost * l.quantity;
      revenue += Number(l.subtotal);
      cogs += lineCost;
      const key = l.variant_id;
      const name = `${l.variant?.product?.name ?? "Product"} - ${l.variant?.variant_name ?? ""}`;
      const r = (rows[key] ??= { name, qty: 0, revenue: 0, cogs: 0 });
      r.qty += l.quantity;
      r.revenue += Number(l.subtotal);
      r.cogs += lineCost;
    }
    const expenseTotal = (expenses.data ?? []).reduce((t, e) => t + Number(e.amount), 0);
    const list = Object.values(rows).sort((a, b) => b.revenue - a.revenue - (a.cogs - b.cogs));
    return {
      revenue,
      cogs,
      expenseTotal,
      gross: revenue - cogs,
      net: revenue - cogs - expenseTotal,
      list,
    };
  }, [lines.data, costs.data, expenses.data]);

  const margin = view.revenue > 0 ? (view.gross / view.revenue) * 100 : 0;
  const netMargin = view.revenue > 0 ? (view.net / view.revenue) * 100 : 0;

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
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Profit View
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Revenue from sales, cost of goods from the buying prices captured on Stock-In, minus
                the expenses recorded for the same period. Tax rate is 0%.
              </p>
            </div>
          </div>
        </header>

        {/* Date range filter */}
        <Card className="relative mb-6 flex flex-wrap items-end gap-4 overflow-hidden border-indigo-100/60 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 p-5 shadow-sm">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-2xl" />

          <div className="relative flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Report period
              </div>
              <div className="text-xs text-slate-500">Filter transactions by date</div>
            </div>
          </div>

          <div className="relative ml-auto flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from" className="text-xs font-semibold text-slate-600">
                From
              </Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to" className="text-xs font-semibold text-slate-600">
                To
              </Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </Card>

        {/* Stat cards — 4 columns */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Revenue */}
          <Card className="group relative overflow-hidden border-indigo-100/60 bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Revenue
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                  <Coins className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <div className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-2xl font-extrabold tabular-nums text-transparent">
                  {formatCurrency(view.revenue)}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600/70">
                <ArrowUpRight className="h-3 w-3" />
                Total sales income
              </div>
            </div>
          </Card>

          {/* Cost of goods */}
          <Card className="group relative overflow-hidden border-blue-100/60 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Cost of goods
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md shadow-blue-500/30">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <div className="bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-2xl font-extrabold tabular-nums text-transparent">
                  {formatCurrency(view.cogs)}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-blue-700/70">
                <ArrowDownRight className="h-3 w-3" />
                From Stock-In buying prices
              </div>
            </div>
          </Card>

          {/* Gross profit */}
          <Card className="group relative overflow-hidden border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Gross profit
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <div className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-2xl font-extrabold tabular-nums text-transparent">
                  {formatCurrency(view.gross)}
                </div>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-emerald-500/30">
                <Percent className="h-2.5 w-2.5" />
                {margin.toFixed(1)}% margin
              </div>
            </div>
          </Card>

          {/* Net after expenses */}
          <Card className="group relative overflow-hidden border-orange-100/60 bg-gradient-to-br from-white via-orange-50/50 to-amber-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-400/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
                  Net after expenses
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/30">
                  <PiggyBank className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <div className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-2xl font-extrabold tabular-nums text-transparent">
                  {formatCurrency(view.net)}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-orange-500/30">
                  <Percent className="h-2.5 w-2.5" />
                  {netMargin.toFixed(1)}%
                </span>
                <span className="text-[10px] font-medium text-orange-700/70">
                  Expenses {formatCurrency(view.expenseTotal)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Profit by product table */}
        <Card className="relative mt-6 overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          {/* Tri-color top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Profit by product</h2>
                  <p className="text-[11px] text-slate-500">
                    Ranked by revenue contribution
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/60 px-2.5 py-1 sm:inline-flex">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                <span className="text-[11px] font-semibold text-indigo-700">
                  {view.list.length} product{view.list.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-indigo-50/95 via-purple-50/90 to-orange-50/90 text-left text-xs uppercase backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-3 font-bold text-indigo-700">Product</th>
                    <th className="px-3 py-3 text-right font-bold text-indigo-700">Sold</th>
                    <th className="px-3 py-3 text-right font-bold text-indigo-700">Revenue</th>
                    <th className="px-3 py-3 text-right font-bold text-indigo-700">Cost</th>
                    <th className="px-3 py-3 text-right font-bold text-indigo-700">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {view.list.map((r) => {
                    const profit = r.revenue - r.cogs;
                    const isPositive = profit >= 0;
                    const rowMargin = r.revenue > 0 ? (profit / r.revenue) * 100 : 0;
                    return (
                      <tr
                        key={r.name}
                        className="group transition-colors hover:bg-gradient-to-r hover:from-indigo-50/50 hover:via-purple-50/30 hover:to-transparent"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg shadow-sm ${
                                isPositive
                                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/20"
                                  : "bg-gradient-to-br from-rose-500 to-red-500 shadow-rose-500/20"
                              }`}
                            >
                              {isPositive ? (
                                <ArrowUpRight className="h-3.5 w-3.5 text-white" />
                              ) : (
                                <ArrowDownRight className="h-3.5 w-3.5 text-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-900">
                                {r.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {rowMargin.toFixed(1)}% margin
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50/60 px-2 py-0.5 text-xs font-bold tabular-nums text-indigo-700">
                            {r.qty}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-700">
                          {formatCurrency(r.revenue)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-500">
                          {formatCurrency(r.cogs)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                              isPositive
                                ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700"
                                : "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700"
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {formatCurrency(profit)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {view.list.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                            <Wallet className="h-7 w-7 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              No sales in this period
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Try adjusting the date range above.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Info footnote */}
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-indigo-100/60 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-orange-50/40 p-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <p className="text-xs text-slate-600">
                Products with no Stock-In buying price recorded are counted at zero cost, so record
                buying prices on the{" "}
                <span className="font-semibold text-indigo-700">Stock-In Records</span> page to keep
                this accurate.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
