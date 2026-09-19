import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  Users,
  Receipt,
  Wallet,
  RefreshCw,
  CheckCircle2,
  Clock,
  CloudUpload,
  Server,
  ArrowRight,
  ArrowUpRight,
  Zap,
  PackageX,
  ChevronRight,
} from "lucide-react";
import { SyncIndicator, useSyncState } from "@/components/sync-indicator";
import { readLog, subscribeLog, type TxLogEntry } from "@/lib/transaction-log";
import { getQueue, subscribeQueue, type QueuedSale } from "@/lib/offline-queue";

function PendingSyncNotice() {
  const { pending, lastSync } = useSyncState();
  const isHealthy = pending === 0;

  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-2xl border px-5 py-4 shadow-sm transition-all duration-300 ${
        isHealthy
          ? "border-emerald-100/60 bg-gradient-to-r from-white via-emerald-50/40 to-teal-50/40"
          : "border-amber-100/60 bg-gradient-to-r from-white via-amber-50/50 to-orange-50/50"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl ${
          isHealthy
            ? "bg-gradient-to-br from-emerald-400/20 to-teal-400/20"
            : "bg-gradient-to-br from-amber-400/20 to-orange-400/20"
        }`}
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-10 w-10 place-items-center rounded-xl shadow-md ${
              isHealthy
                ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
            }`}
          >
            {isHealthy ? (
              <CloudUpload className="h-5 w-5 text-white" />
            ) : (
              <RefreshCw className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <div
              className={`text-xs font-bold uppercase tracking-wider ${
                isHealthy ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              Sync status
            </div>
            <div
              className={`text-sm font-semibold ${
                isHealthy ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              {pending > 0
                ? `${pending} offline sale${pending === 1 ? "" : "s"} still waiting to upload.`
                : lastSync
                  ? `All sales uploaded · last sync ${new Date(lastSync).toLocaleTimeString()}`
                  : "All sales uploaded."}
            </div>
          </div>
        </div>
        <SyncIndicator />
      </div>
    </div>
  );
}

function SyncOverview() {
  const [log, setLog] = useState<TxLogEntry[]>([]);
  const [queue, setQueue] = useState<QueuedSale[]>([]);
  useEffect(() => {
    setQueue(getQueue());
    const offLog = subscribeLog(setLog);
    const offQueue = subscribeQueue(() => setQueue(getQueue()));
    return () => {
      offLog();
      offQueue();
    };
  }, []);

  const synced = log.filter((e) => e.status === "synced");
  const offline = log.filter((e) => e.status !== "synced");
  const failed = queue.filter((q) => q.status === "failed").length;
  const pending = queue.length - failed;

  const tiles = [
    {
      label: "Synced sales",
      value: synced.length,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/30",
      caption: "Uploaded to cloud",
    },
    {
      label: "Offline sales on device",
      value: offline.length,
      icon: Server,
      gradient: "from-indigo-500 to-purple-500",
      shadow: "shadow-indigo-500/30",
      caption: "Stored locally",
    },
    {
      label: "Pending upload",
      value: pending,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/30",
      caption: "Awaiting sync",
    },
    {
      label: "Failed upload",
      value: failed,
      icon: AlertTriangle,
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/30",
      caption: "Needs attention",
    },
  ];

  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl border border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
              <RefreshCw className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Synchronization</h2>
              <p className="text-[11px] text-slate-500">Local vs. cloud transaction state</p>
            </div>
          </div>
          <Link to="/sync">
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
            >
              Open sync queue
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className="group relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/60 p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md"
              >
                <div
                  className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${t.gradient} opacity-10 blur-xl transition-opacity group-hover:opacity-20`}
                />
                <div className="relative flex items-start justify-between">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${t.gradient} shadow-sm ${t.shadow}`}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="relative mt-2.5">
                  <div className={`bg-gradient-to-br ${t.gradient} bg-clip-text text-2xl font-extrabold tabular-nums text-transparent`}>
                    {t.value}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-700">{t.label}</div>
                  <div className="text-[10px] text-slate-400">{t.caption}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/_authenticated/manager/")({
  component: ManagerDashboard,
});

function ManagerDashboard() {
  const [shopName, setShopName] = useState("Green Shop");
  useEffect(() => {
    const read = () => {
      try {
        setShopName(
          (JSON.parse(localStorage.getItem("tillpoint.manager.settings.v1") ?? "{}")
            .shopName as string) || "Green Shop",
        );
      } catch {
        /* noop */
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  const stats = useQuery({
    queryKey: ["manager", "dashboard"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [salesToday, allSales, products, lowStock, recentSales] = await Promise.all([
        supabase
          .from("sales")
          .select("total_amount, cashier_name")
          .not("status", "in", "(refunded,voided)")
          .gte("created_at", today.toISOString()),
        supabase.from("sales").select("total_amount").not("status", "in", "(refunded,voided)"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase
          .from("stock")
          .select(
            "quantity, low_stock_alert_level, variant:product_variants(id, variant_name, product:products(name))",
          )
          .order("quantity"),
        supabase
          .from("sales")
          .select("id, total_amount, payment_type, created_at, cashier_name")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      const todayTotal = (salesToday.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
      const total = (allSales.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
      const low = (lowStock.data ?? []).filter((s) => s.quantity <= s.low_stock_alert_level);
      const byCashierMap = new Map<string, { name: string; total: number; count: number }>();
      for (const r of salesToday.data ?? []) {
        const name = (r as { cashier_name: string | null }).cashier_name ?? "Unknown";
        const cur = byCashierMap.get(name) ?? { name, total: 0, count: 0 };
        cur.total += Number(r.total_amount);
        cur.count += 1;
        byCashierMap.set(name, cur);
      }
      const byCashier = [...byCashierMap.values()].sort((a, b) => b.total - a.total);
      return {
        todayTotal,
        byCashier,
        todayCount: salesToday.data?.length ?? 0,
        total,
        productsCount: products.count ?? 0,
        lowStock: low,
        recent: recentSales.data ?? [],
      };
    },
  });

  const lowStockCount = stats.data?.lowStock.length ?? 0;

  const cards = [
    {
      label: "Today's revenue",
      value: formatCurrency(stats.data?.todayTotal ?? 0),
      icon: DollarSign,
      gradient: "from-indigo-500 to-purple-500",
      shadow: "shadow-indigo-500/30",
      textGradient: "from-indigo-700 to-purple-700",
      caption: "Total sales income today",
    },
    {
      label: "Today's sales",
      value: String(stats.data?.todayCount ?? 0),
      icon: ShoppingBag,
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/30",
      textGradient: "from-blue-700 to-cyan-700",
      caption: "Completed transactions",
    },
    {
      label: "Products",
      value: String(stats.data?.productsCount ?? 0),
      icon: Package,
      gradient: "from-violet-500 to-purple-500",
      shadow: "shadow-violet-500/30",
      textGradient: "from-violet-700 to-purple-700",
      caption: "In active catalog",
    },
    {
      label: "Low stock alerts",
      value: String(lowStockCount),
      icon: lowStockCount > 0 ? AlertTriangle : PackageX,
      gradient:
        lowStockCount > 0 ? "from-orange-500 to-amber-500" : "from-emerald-500 to-teal-500",
      shadow: lowStockCount > 0 ? "shadow-orange-500/30" : "shadow-emerald-500/30",
      textGradient:
        lowStockCount > 0 ? "from-orange-600 to-amber-600" : "from-emerald-700 to-teal-700",
      caption: lowStockCount > 0 ? "Needs restocking" : "All stock healthy",
    },
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
        <header className="mb-8">
          <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            {shopName} Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">Live snapshot of your shop.</p>
        </header>

        <PendingSyncNotice />

        <SyncOverview />

        {/* KPI cards */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card
                key={c.label}
                className="group relative overflow-hidden border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`}
                />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {c.label}
                    </span>
                    <div
                      className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${c.gradient} shadow-md ${c.shadow}`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div
                      className={`bg-gradient-to-br ${c.textGradient} bg-clip-text text-3xl font-extrabold tabular-nums text-transparent`}
                    >
                      {c.value}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <ArrowUpRight className="h-3 w-3" />
                    {c.caption}
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        {/* Today by cashier */}
        <Card className="relative mt-8 overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Today by cashier</h2>
                  <p className="text-[11px] text-slate-500">Revenue contribution per staff</p>
                </div>
              </div>
              {stats.data?.byCashier.length ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/60 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                  <Users className="h-3 w-3" />
                  {stats.data.byCashier.length} active
                </span>
              ) : null}
            </div>

            <ul className="divide-y divide-slate-100">
              {stats.data?.byCashier.length ? (
                stats.data.byCashier.map((c, index) => {
                  const gradients = [
                    "from-indigo-600 to-purple-600",
                    "from-blue-600 to-cyan-600",
                    "from-violet-600 to-purple-600",
                    "from-orange-500 to-amber-500",
                    "from-rose-500 to-orange-500",
                    "from-emerald-500 to-teal-500",
                  ];
                  const gradient = gradients[index % gradients.length];
                  const maxTotal = stats.data?.byCashier[0]?.total || 1;
                  const percentage = (c.total / maxTotal) * 100;
                  return (
                    <li
                      key={c.name}
                      className="group py-3.5 transition-colors hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div
                            className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} opacity-30 blur-sm`}
                          />
                          <div
                            className={`relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-md`}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900">
                                {c.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {c.count} sale{c.count === 1 ? "" : "s"} today
                              </div>
                            </div>
                            <div
                              className={`shrink-0 bg-gradient-to-r ${gradient} bg-clip-text text-base font-extrabold tabular-nums text-transparent`}
                            >
                              {formatCurrency(c.total)}
                            </div>
                          </div>
                          {/* Contribution bar */}
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
                              style={{ width: `${Math.max(6, percentage)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                      <Users className="h-6 w-6 text-indigo-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No sales today yet</p>
                    <p className="text-xs text-slate-500">
                      Cashier activity will appear here once the first sale completes.
                    </p>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </Card>

        {/* Recent sales + Low stock */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Recent sales */}
          <Card className="relative overflow-hidden border-blue-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md shadow-blue-500/25">
                    <Receipt className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Recent sales</h2>
                    <p className="text-[11px] text-slate-500">Latest transactions</p>
                  </div>
                </div>
                <Link
                  to="/manager/sales"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 transition-colors hover:text-indigo-800"
                >
                  View all
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <ul className="divide-y divide-slate-100">
                {stats.data?.recent.length ? (
                  stats.data.recent.map((s) => (
                    <li
                      key={s.id}
                      className="group flex items-center justify-between gap-3 py-3 transition-colors hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm shadow-blue-500/20">
                          <Wallet className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {(s as any).cashier_name ?? "Cashier"}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1 capitalize">
                              <Zap className="h-2.5 w-2.5 text-indigo-500" />
                              {s.payment_type}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>{formatDate(s.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-sm font-extrabold tabular-nums text-transparent">
                        {formatCurrency(s.total_amount)}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100">
                        <Receipt className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No sales yet</p>
                      <p className="text-xs text-slate-500">
                        Recent transactions will show up here.
                      </p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </Card>

          {/* Low stock */}
          <Card className="relative overflow-hidden border-orange-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/25">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Low stock</h2>
                    <p className="text-[11px] text-slate-500">Items below threshold</p>
                  </div>
                </div>
                <Link
                  to="/manager/alerts"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 transition-colors hover:text-orange-800"
                >
                  Manage
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <ul className="divide-y divide-slate-100">
                {stats.data?.lowStock.length ? (
                  stats.data.lowStock.slice(0, 8).map((s: any) => {
                    const isFinished = s.quantity === 0;
                    const percentage =
                      s.low_stock_alert_level > 0
                        ? Math.min(100, (s.quantity / s.low_stock_alert_level) * 100)
                        : 0;
                    return (
                      <li
                        key={s.variant?.id}
                        className={`group py-3 transition-colors ${
                          isFinished
                            ? "hover:bg-gradient-to-r hover:from-rose-50/40 hover:to-transparent"
                            : "hover:bg-gradient-to-r hover:from-orange-50/40 hover:to-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg shadow-sm ${
                                isFinished
                                  ? "bg-gradient-to-br from-rose-500 to-red-500 shadow-rose-500/20"
                                  : "bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/20"
                              }`}
                            >
                              {isFinished ? (
                                <PackageX className="h-4 w-4 text-white" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {s.variant?.product?.name}
                              </div>
                              <div className="truncate text-[11px] text-slate-500">
                                {s.variant?.variant_name}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                                isFinished
                                  ? "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700"
                                  : "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700"
                              }`}
                            >
                              {s.quantity} left
                            </span>
                            <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  isFinished
                                    ? "bg-gradient-to-r from-rose-500 to-red-500"
                                    : "bg-gradient-to-r from-orange-500 to-amber-500"
                                }`}
                                style={{ width: `${Math.max(6, percentage)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        All stock levels healthy
                      </p>
                      <p className="text-xs text-slate-500">
                        Nothing has reached the minimum threshold.
                      </p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
