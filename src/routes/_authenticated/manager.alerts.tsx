import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import {
  AlertTriangle,
  PackageX,
  Sparkles,
  TrendingDown,
  Boxes,
  Clock,
  ShieldAlert,
  ArrowDownRight,
  PackageCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/manager/alerts")({
  component: LowStockAlerts,
});

type Row = {
  quantity: number;
  low_stock_alert_level: number;
  updated_at: string;
  variant: {
    id: string;
    variant_name: string;
    size: string | null;
    product: { name: string; category: string | null } | null;
  } | null;
};

function LowStockAlerts() {
  const q = useQuery({
    queryKey: ["manager", "low-stock-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock")
        .select("quantity, low_stock_alert_level, updated_at, variant:product_variants(id, variant_name, size, product:products(name, category))")
        .order("quantity", { ascending: true });
      if (error) throw error;
      return (data as unknown as Row[]).filter((r) => r.variant && r.quantity <= r.low_stock_alert_level);
    },
  });

  const rows = q.data ?? [];
  const empty = rows.filter((r) => r.quantity <= 0);
  const low = rows.filter((r) => r.quantity > 0);

  return (
    <div className="relative p-6 md:p-10">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Low stock alerts
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Products are logged here automatically once their remaining units reach the minimum threshold.
              </p>
            </div>
          </div>
        </header>

        {/* Stat cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total at/below threshold */}
          <Card className="group relative overflow-hidden border-indigo-100/60 bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  At or below threshold
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                  <Boxes className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                  {rows.length}
                </span>
                <span className="text-xs font-medium text-slate-500">item{rows.length === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600/70">
                <TrendingDown className="h-3 w-3" />
                Needs restocking soon
              </div>
            </div>
          </Card>

          {/* Running low */}
          <Card className="group relative overflow-hidden border-amber-100/60 bg-gradient-to-br from-white via-amber-50/50 to-orange-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/15 to-orange-400/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Running low
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-md shadow-amber-500/30">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                  {low.length}
                </span>
                <span className="text-xs font-medium text-slate-500">item{low.length === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-700/70">
                <ArrowDownRight className="h-3 w-3" />
                Below minimum level
              </div>
            </div>
          </Card>

          {/* Completely finished */}
          <Card className="group relative overflow-hidden border-rose-100/60 bg-gradient-to-br from-white via-rose-50/40 to-red-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-rose-400/15 to-red-400/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                  Completely finished
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-red-500 shadow-md shadow-rose-500/30">
                  <PackageX className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                  {empty.length}
                </span>
                <span className="text-xs font-medium text-slate-500">item{empty.length === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-700/70">
                <ShieldAlert className="h-3 w-3" />
                Out of stock — cannot sell
              </div>
            </div>
          </Card>
        </div>

        {/* Table card */}
        <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          {/* Top gradient accent */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-orange-50/60 text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 font-bold text-indigo-700">Product</th>
                  <th className="px-4 py-3.5 font-bold text-indigo-700">Variant</th>
                  <th className="px-4 py-3.5 font-bold text-indigo-700">Units left</th>
                  <th className="px-4 py-3.5 font-bold text-indigo-700">Threshold</th>
                  <th className="px-4 py-3.5 font-bold text-indigo-700">Status</th>
                  <th className="px-4 py-3.5 font-bold text-indigo-700">Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {q.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative h-12 w-12">
                          <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20" />
                          <div className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
                            <Sparkles className="h-5 w-5 animate-pulse text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Loading alerts...</p>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
                          <PackageCheck className="h-7 w-7 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">All stocked up</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            No products have reached their minimum threshold.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const isFinished = r.quantity <= 0;
                    const percentage =
                      r.low_stock_alert_level > 0
                        ? Math.min(100, (r.quantity / r.low_stock_alert_level) * 100)
                        : 0;
                    return (
                      <tr
                        key={r.variant!.id}
                        className={`group transition-colors ${
                          isFinished
                            ? "bg-gradient-to-r from-rose-50/60 via-rose-50/30 to-transparent hover:from-rose-100/60"
                            : "hover:bg-gradient-to-r hover:from-amber-50/50 hover:via-amber-50/20 hover:to-transparent"
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg shadow-sm ${
                                isFinished
                                  ? "bg-gradient-to-br from-rose-500 to-red-500 shadow-rose-500/20"
                                  : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/20"
                              }`}
                            >
                              {isFinished ? (
                                <PackageX className="h-4 w-4 text-white" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-900">
                                {r.variant?.product?.name}
                              </div>
                              {r.variant?.product?.category && (
                                <div className="truncate text-[11px] text-slate-500">
                                  {r.variant.product.category}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50/60 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            {r.variant?.variant_name}
                            {r.variant?.size ? ` · ${r.variant.size}` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-baseline gap-1">
                              <span
                                className={`text-lg font-bold tabular-nums ${
                                  isFinished
                                    ? "bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent"
                                    : "bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"
                                }`}
                              >
                                {r.quantity}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">units</span>
                            </div>
                            {/* Progress bar */}
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  isFinished
                                    ? "bg-gradient-to-r from-rose-500 to-red-500"
                                    : "bg-gradient-to-r from-amber-500 to-orange-500"
                                }`}
                                style={{ width: `${Math.max(4, percentage)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-medium tabular-nums text-slate-600">
                            {r.low_stock_alert_level}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isFinished ? (
                            <Badge className="border-0 bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-sm shadow-rose-500/20">
                              <PackageX className="mr-1 h-3 w-3" />
                              Finished
                            </Badge>
                          ) : (
                            <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Running low
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {formatDate(r.updated_at)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
