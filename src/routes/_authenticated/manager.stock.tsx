import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import {
  AlertTriangle,
  TrendingDown,
  Boxes,
  DollarSign,
  Plus,
  History,
  Package,
  PackageX,
  PackageCheck,
  Search,
  Pencil,
  ArrowDownToLine,
  ShieldAlert,
  Activity,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/manager/stock")({
  component: StockPage,
});

type StockRow = {
  id: string;
  quantity: number;
  low_stock_alert_level: number;
  available?: boolean;
  variant: {
    id: string;
    variant_name: string;
    size: string | null;
    price: number;
    image_url?: string | null;
    product: { name: string; category: string | null; image_url?: string | null } | null;
  } | null;
};

function StockPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "low" | "out" | "ok">("all");
  const [editPriceFor, setEditPriceFor] = useState<StockRow | null>(null);

  const stockInHistory = useQuery({
    queryKey: ["stock-in-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, action, details, created_at")
        .ilike("action", "%stock%in%")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const stock = useQuery({
    queryKey: ["stock", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock")
        .select(
          "id, quantity, low_stock_alert_level, available, variant:product_variants(id, variant_name, size, price, product:products(name, category))",
        )
        .order("quantity");
      if (error) throw error;
      return data as unknown as StockRow[];
    },
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, low }: { id: string; low: number }) => {
      const { error } = await supabase
        .from("stock")
        .update({ low_stock_alert_level: low })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock updated");
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePrice = useMutation({
    mutationFn: async ({ variant_id, price }: { variant_id: string; price: number }) => {
      const { error } = await supabase
        .from("product_variants")
        .update({ price })
        .eq("id", variant_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Price updated");
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditPriceFor(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = stock.data ?? [];

  const stats = useMemo(() => {
    const totalUnits = rows.reduce((s, r) => s + r.quantity, 0);
    const inventoryValue = rows.reduce((s, r) => s + r.quantity * Number(r.variant?.price ?? 0), 0);
    const out = rows.filter((r) => r.quantity === 0).length;
    const low = rows.filter((r) => r.quantity > 0 && r.quantity <= r.low_stock_alert_level).length;
    return { totalUnits, inventoryValue, out, low, skus: rows.length };
  }, [rows]);

  const filtered = rows.filter((r) => {
    const q = filter.toLowerCase();
    const matchQ =
      !q ||
      r.variant?.variant_name.toLowerCase().includes(q) ||
      r.variant?.product?.name.toLowerCase().includes(q);
    const status = r.quantity === 0 ? "out" : r.quantity <= r.low_stock_alert_level ? "low" : "ok";
    const matchS = statusFilter === "all" || status === statusFilter;
    return matchQ && matchS;
  });

  const flaggedOutCount = rows.filter((r) => r.available === false).length;
  const hasAlerts = stats.low > 0 || stats.out > 0;

  return (
    <div className="relative p-4 sm:p-6 md:p-10">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-blue-400/10 to-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Boxes className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                Stock control
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Smart inventory monitoring, restock, and price adjustments.
                {flaggedOutCount > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-100 to-red-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                      <ShieldAlert className="h-3 w-3" />
                      {flaggedOutCount} flagged out by cashiers
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </header>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={<Boxes className="h-4 w-4 text-white" />}
            label="SKUs tracked"
            value={stats.skus.toString()}
            gradient="from-indigo-500 to-purple-500"
            shadow="shadow-indigo-500/25"
            accent="text-indigo-700"
            bg="from-white via-indigo-50/40 to-purple-50/40"
            border="border-indigo-100/60"
          />
          <StatCard
            icon={<Package className="h-4 w-4 text-white" />}
            label="Units on hand"
            value={stats.totalUnits.toLocaleString()}
            gradient="from-blue-500 to-cyan-500"
            shadow="shadow-blue-500/25"
            accent="text-blue-700"
            bg="from-white via-blue-50/40 to-cyan-50/40"
            border="border-blue-100/60"
          />
          <StatCard
            icon={<DollarSign className="h-4 w-4 text-white" />}
            label="Inventory value"
            value={formatCurrency(stats.inventoryValue)}
            gradient="from-emerald-500 to-teal-500"
            shadow="shadow-emerald-500/25"
            accent="text-emerald-700"
            bg="from-white via-emerald-50/40 to-teal-50/40"
            border="border-emerald-100/60"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4 text-white" />}
            label="Low / Out"
            value={`${stats.low} / ${stats.out}`}
            gradient="from-orange-500 to-amber-500"
            shadow="shadow-orange-500/25"
            accent="text-orange-700"
            bg="from-white via-orange-50/50 to-amber-50/50"
            border="border-orange-100/60"
          />
        </div>

        {/* Smart alert */}
        {hasAlerts && (
          <Card className="relative mb-6 overflow-hidden border-orange-200/60 bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-orange-50/80 p-4 shadow-sm">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-400/20 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/30">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <div className="text-sm text-orange-950">
                <div className="font-bold">Smart alert</div>
                <div className="mt-0.5">
                  {stats.out > 0 && (
                    <>
                      <span className="font-semibold">{stats.out}</span> item
                      {stats.out === 1 ? "" : "s"} out of stock.{" "}
                    </>
                  )}
                  {stats.low > 0 && (
                    <>
                      <span className="font-semibold">{stats.low}</span> running low.{" "}
                    </>
                  )}
                  Consider restocking before your next busy day.
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Recent stock-in records */}
        <Card className="relative mb-6 overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                <History className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent stock-in records</h2>
                <p className="text-[11px] text-slate-500">
                  Latest deliveries logged into inventory
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {(stockInHistory.data ?? []).slice(0, 8).map((movement: any) => (
                <div
                  key={movement.id}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-sm transition-all hover:border-indigo-200 hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/20">
                      <ArrowDownToLine className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800">Stock-in</span>
                      <span className="truncate text-slate-500">
                        {" "}
                        · {String((movement.details as any)?.reason ?? "Manual stock-in")}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm shadow-emerald-500/25">
                      +{String((movement.details as any)?.quantity ?? 0)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDate(movement.created_at)}
                    </span>
                  </div>
                </div>
              ))}
              {!stockInHistory.data?.length && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                    <Activity className="h-5 w-5 text-indigo-500" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Stock-in history will appear here after the next receipt.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Stock table */}
        <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
          <div className="p-4 sm:p-5">
            {/* Filters */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
                <Input
                  placeholder="Search product or variant..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border-indigo-100 bg-white pl-9 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "ok", "low", "out"] as const).map((s) => {
                  const active = statusFilter === s;
                  const gradients: Record<typeof s, string> = {
                    all: "from-indigo-600 to-purple-600",
                    ok: "from-emerald-500 to-teal-500",
                    low: "from-orange-500 to-amber-500",
                    out: "from-rose-500 to-red-500",
                  };
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? `bg-gradient-to-r ${gradients[s]} text-white shadow-md`
                          : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      {s === "all" ? "All" : s === "ok" ? "In stock" : s === "low" ? "Low" : "Out"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader className="bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-orange-50/60">
                  <TableRow className="border-b border-indigo-100/60 hover:bg-transparent">
                    <TableHead className="font-bold text-indigo-700">Product</TableHead>
                    <TableHead className="font-bold text-indigo-700">Variant</TableHead>
                    <TableHead className="font-bold text-indigo-700">Price</TableHead>
                    <TableHead className="font-bold text-indigo-700">Qty</TableHead>
                    <TableHead className="font-bold text-indigo-700">Low alert</TableHead>
                    <TableHead className="font-bold text-indigo-700">Value</TableHead>
                    <TableHead className="font-bold text-indigo-700">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                            <PackageX className="h-7 w-7 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">No stock matches</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Try a different search or filter.
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <StockEditor
                        key={r.id}
                        row={r}
                        onSave={(l) => updateStock.mutate({ id: r.id, low: l })}
                        onAdd={() => {
                          window.location.href = "/manager/stock-in?record=1";
                        }}
                        onEditPrice={() => setEditPriceFor(r)}
                        pending={updateStock.isPending}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit price dialog */}
      <Dialog open={!!editPriceFor} onOpenChange={(o) => !o && setEditPriceFor(null)}>
        <DialogContent className="border-indigo-100 bg-gradient-to-b from-white to-indigo-50/40">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                <Pencil className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Edit price — {editPriceFor?.variant?.variant_name}
              </DialogTitle>
            </div>
          </DialogHeader>
          {editPriceFor?.variant && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const price = parseFloat(String(fd.get("price") ?? "0"));
                if (price >= 0) updatePrice.mutate({ variant_id: editPriceFor.variant!.id, price });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="edit-price"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                >
                  <DollarSign className="h-3.5 w-3.5 text-indigo-500" />
                  New price
                </Label>
                <Input
                  id="edit-price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={Number(editPriceFor.variant.price)}
                  required
                  autoFocus
                  className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditPriceFor(null)}
                  className="border-indigo-200 bg-white hover:bg-indigo-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePrice.isPending}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-purple-500/40"
                >
                  {updatePrice.isPending ? "Saving..." : "Save price"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  gradient,
  shadow,
  accent,
  bg,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
  shadow: string;
  accent: string;
  bg: string;
  border: string;
}) {
  return (
    <Card
      className={`group relative overflow-hidden border ${border} bg-gradient-to-br ${bg} p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-15 blur-2xl`}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${accent}`}>{label}</span>
          <div
            className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${gradient} shadow-md ${shadow}`}
          >
            {icon}
          </div>
        </div>
        <div
          className={`mt-2 bg-gradient-to-r ${gradient} bg-clip-text text-xl font-extrabold tabular-nums text-transparent sm:text-2xl`}
        >
          {value}
        </div>
      </div>
    </Card>
  );
}

function StockEditor({
  row,
  onSave,
  onAdd,
  onEditPrice,
  pending,
}: {
  row: StockRow;
  onSave: (l: number) => void;
  onAdd: () => void;
  onEditPrice: () => void;
  pending: boolean;
}) {
  const [l, setL] = useState(row.low_stock_alert_level);
  const dirty = l !== row.low_stock_alert_level;
  const flaggedOut = row.available === false;
  const status = flaggedOut
    ? "flagged"
    : row.quantity === 0
      ? "out"
      : row.quantity <= l
        ? "low"
        : "ok";
  const value = row.quantity * Number(row.variant?.price ?? 0);

  const statusConfig = {
    flagged: {
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/25",
      icon: <ShieldAlert className="mr-1 h-3 w-3" />,
      label: "Flagged out",
    },
    out: {
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/25",
      icon: <PackageX className="mr-1 h-3 w-3" />,
      label: "Out",
    },
    low: {
      gradient: "from-orange-500 to-amber-500",
      shadow: "shadow-orange-500/25",
      icon: <AlertTriangle className="mr-1 h-3 w-3" />,
      label: "Low",
    },
    ok: {
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
      icon: <PackageCheck className="mr-1 h-3 w-3" />,
      label: "OK",
    },
  }[status];

  return (
    <TableRow
      className={`group transition-colors ${
        flaggedOut
          ? "bg-gradient-to-r from-rose-50/60 via-rose-50/30 to-transparent hover:from-rose-100/60"
          : "hover:bg-gradient-to-r hover:from-indigo-50/50 hover:via-purple-50/30 hover:to-transparent"
      }`}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg shadow-sm bg-gradient-to-br ${statusConfig.gradient} ${statusConfig.shadow}`}
          >
            <Package className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900">
              {row.variant?.product?.name}
            </div>
            {row.variant?.product?.category && (
              <div className="truncate text-[11px] text-slate-500">
                {row.variant.product.category}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex w-fit items-center rounded-md border border-indigo-100 bg-indigo-50/60 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {row.variant?.variant_name}
          </span>
          {row.variant?.size && (
            <span className="text-[11px] text-slate-500">{row.variant.size}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <button
          onClick={onEditPrice}
          className="group/price inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-semibold tabular-nums text-slate-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          {formatCurrency(row.variant?.price ?? 0)}
          <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover/price:opacity-100" />
        </button>
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex min-w-16 items-center justify-center rounded-lg bg-gradient-to-br ${statusConfig.gradient} px-2.5 py-1 text-sm font-bold tabular-nums text-white shadow-sm ${statusConfig.shadow}`}
        >
          {row.quantity}
        </span>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          value={l}
          onChange={(e) => setL(Number(e.target.value) || 0)}
          className="w-20 border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
        />
      </TableCell>
      <TableCell>
        <span className="text-sm font-semibold tabular-nums text-slate-600">
          {formatCurrency(value)}
        </span>
      </TableCell>
      <TableCell>
        <Badge
          className={`border-0 bg-gradient-to-r ${statusConfig.gradient} text-white shadow-sm ${statusConfig.shadow}`}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={onAdd}
            className="border-indigo-200 bg-white text-xs hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Plus className="mr-1 h-3 w-3" />
            Stock-In
          </Button>
          <Button
            size="sm"
            disabled={!dirty || pending}
            onClick={() => onSave(l)}
            className={`text-xs ${
              dirty
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-purple-500/40"
                : ""
            }`}
          >
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
