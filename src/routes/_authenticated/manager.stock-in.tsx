import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Check,
  ChevronsUpDown,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Truck,
  Package,
  Coins,
  CalendarDays,
  FileText,
  ArrowDownToLine,
  TrendingUp,
  X,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/manager/stock-in")({
  component: StockInRecordsPage,
});

type Variant = {
  id: string;
  variant_name: string;
  product: { name: string; category: string | null } | null;
  stock: { id: string; quantity: number }[] | null;
};
type RecordRow = {
  id: string;
  variant_id: string;
  stock_id: string;
  supplier_id: string | null;
  quantity: number;
  unit_buying_price: number;
  total_cost: number;
  received_at: string;
  notes: string | null;
  variant: Variant | null;
  supplier: { name: string } | null;
};
const blank = {
  variantId: "",
  supplierId: "none",
  quantity: "",
  price: "",
  receivedAt: new Date().toISOString().slice(0, 16),
  notes: "",
};

function StockInRecordsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [search, setSearch] = useState("");
  const [variantOpen, setVariantOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    setShowForm(new URLSearchParams(window.location.search).get("record") === "1");
    const channel = supabase
      .channel("stock-in-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_in_records" }, () => {
        void qc.invalidateQueries({ queryKey: ["stock-in-records"] });
        void qc.invalidateQueries({ queryKey: ["stock"] });
        void qc.invalidateQueries({ queryKey: ["products"] });
        void qc.invalidateQueries({ queryKey: ["cashier"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const variants = useQuery({
    queryKey: ["stock-in-variants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, variant_name, product:products(name, category), stock(id, quantity)")
        .eq("active", true)
        .order("variant_name");
      if (error) throw error;
      return data as unknown as Variant[];
    },
  });
  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const records = useQuery({
    queryKey: ["stock-in-records"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stock_in_records")
        .select(
          "id, variant_id, stock_id, supplier_id, quantity, unit_buying_price, total_cost, received_at, notes, variant:product_variants(variant_name, product:products(name, category)), supplier:suppliers(name)",
        )
        .order("received_at", { ascending: false });
      if (error) throw error;
      return data as unknown as RecordRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.variantId && !editing) throw new Error("Choose a product variant");
      const variantId = editing?.variant_id ?? form.variantId;
      const variant = variants.data?.find((v) => v.id === variantId);
      let stockId = editing?.stock_id ?? variant?.stock?.[0]?.id;
      if (!stockId) {
        const { data: existing } = await supabase
          .from("stock")
          .select("id")
          .eq("variant_id", variantId)
          .maybeSingle();
        if (existing?.id) {
          stockId = existing.id;
        } else {
          const { data: created, error: createError } = await supabase
            .from("stock")
            .insert({ variant_id: variantId, quantity: 0 })
            .select("id")
            .single();
          if (createError) throw createError;
          stockId = created.id;
        }
      }
      const quantity = Number(form.quantity);
      const price = Number(form.price);
      if (!Number.isInteger(quantity) || quantity <= 0 || price < 0)
        throw new Error("Enter a valid quantity and buying price");
      if (editing) {
        const { error } = await (supabase as any).rpc("update_stock_in_record", {
          p_id: editing.id,
          p_quantity: quantity,
          p_unit_buying_price: price,
          p_supplier_id: form.supplierId === "none" ? null : form.supplierId,
          p_received_at: new Date(form.receivedAt).toISOString(),
          p_notes: form.notes || null,
        });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).rpc("record_stock_in", {
          p_stock_id: stockId,
          p_variant_id: form.variantId,
          p_quantity: quantity,
          p_unit_buying_price: price,
          p_supplier_id: form.supplierId === "none" ? null : form.supplierId,
          p_received_at: new Date(form.receivedAt).toISOString(),
          p_notes: form.notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Stock-in record updated" : "Stock-in recorded");
      setForm(blank);
      setEditing(null);
      ["stock-in-records", "stock", "products", "cashier", "restock-orders"].forEach((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedVariant = (variants.data ?? []).find((v) => v.id === form.variantId);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (records.data ?? []).filter((r) => {
      const text =
        `${r.variant?.product?.name ?? ""} ${r.variant?.variant_name ?? ""} ${r.variant?.product?.category ?? ""} ${r.supplier?.name ?? ""}`.toLowerCase();
      const date = r.received_at.slice(0, 10);
      return (
        (!q || text.includes(q)) &&
        (supplierFilter === "all" || r.supplier_id === supplierFilter) &&
        (!from || date >= from) &&
        (!to || date <= to)
      );
    });
  }, [records.data, search, supplierFilter, from, to]);
  const total = filtered.reduce((sum, r) => sum + Number(r.total_cost), 0);
  const totalUnits = filtered.reduce((sum, r) => sum + Number(r.quantity), 0);

  function editRecord(record: RecordRow) {
    setEditing(record);
    setForm({
      variantId: record.variant_id,
      supplierId: record.supplier_id ?? "none",
      quantity: String(record.quantity),
      price: String(record.unit_buying_price),
      receivedAt: record.received_at.slice(0, 16),
      notes: record.notes ?? "",
    });
    setShowForm(true);
  }
  function resetForm() {
    setEditing(null);
    setForm(blank);
  }

  return (
    <div className="relative min-h-screen p-4 sm:p-6 md:p-10">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-blue-400/10 to-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
                <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <ClipboardList className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                  Stock-In Records
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  A complete, searchable register of deliveries, buying costs, suppliers, and
                  inventory movement.
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                if (showForm && !editing) {
                  setShowForm(false);
                } else {
                  resetForm();
                  setShowForm(true);
                }
              }}
              className={
                showForm && !editing
                  ? "border-indigo-200 bg-white text-indigo-700 shadow-sm hover:bg-indigo-50"
                  : "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40"
              }
              variant={showForm && !editing ? "outline" : "default"}
            >
              {showForm && !editing ? (
                <>
                  <X data-icon="inline-start" /> Close form
                </>
              ) : (
                <>
                  <Plus data-icon="inline-start" /> Record stock-in
                </>
              )}
            </Button>
          </div>

          {/* Summary stat strip */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="relative overflow-hidden rounded-xl border border-indigo-100/60 bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 p-3 shadow-sm">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-xl" />
              <div className="relative flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                  <ClipboardCheck className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    Records shown
                  </div>
                  <div className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-lg font-extrabold tabular-nums text-transparent">
                    {filtered.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-blue-100/60 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50/40 p-3 shadow-sm">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 blur-xl" />
              <div className="relative flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md shadow-blue-500/25">
                  <Package className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    Units received
                  </div>
                  <div className="bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-lg font-extrabold tabular-nums text-transparent">
                    {totalUnits}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-orange-100/60 bg-gradient-to-br from-white via-orange-50/50 to-amber-50/50 p-3 shadow-sm">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-400/20 blur-xl" />
              <div className="relative flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/25">
                  <Coins className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                    Total buying cost
                  </div>
                  <div className="bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-lg font-extrabold tabular-nums text-transparent">
                    {formatCurrency(total)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className={cn("grid gap-6", showForm ? "lg:grid-cols-[400px_1fr]" : "grid-cols-1")}>
          {showForm && (
            <Card className="relative h-fit overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
              {/* Tri-color top accent */}
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

              <div className="p-5">
                <div className="mb-5 flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                    {editing ? (
                      <Pencil className="h-4 w-4 text-white" />
                    ) : (
                      <Plus className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {editing ? "Edit stock-in record" : "Record delivery"}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {editing
                        ? "Adjust quantities, cost or notes"
                        : "Log a new delivery into inventory"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Product variant picker */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Package className="h-3.5 w-3.5 text-indigo-500" />
                      Product / variant
                    </Label>
                    <Popover open={variantOpen} onOpenChange={setVariantOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={variantOpen}
                          disabled={!!editing}
                          className="w-full justify-between border-indigo-100 bg-white font-normal shadow-sm hover:border-indigo-300 hover:bg-indigo-50/50"
                        >
                          <span className="truncate">
                            {selectedVariant
                              ? `${selectedVariant.product?.name} \u00b7 ${selectedVariant.variant_name}`
                              : "Search product or variant"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command
                          filter={(value, search) =>
                            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                          }
                        >
                          <CommandInput placeholder="Type a product, variant or category..." />
                          <CommandList className="max-h-72 overflow-y-auto overscroll-contain">
                            <CommandEmpty>No matching product.</CommandEmpty>
                            <CommandGroup>
                              {(variants.data ?? []).map((v) => (
                                <CommandItem
                                  key={v.id}
                                  value={`${v.product?.name ?? ""} ${v.variant_name} ${v.product?.category ?? ""}`}
                                  onSelect={() => {
                                    setForm({ ...form, variantId: v.id });
                                    setVariantOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 text-indigo-600",
                                      form.variantId === v.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <span className="truncate">
                                    {v.product?.name} &middot; {v.variant_name}
                                  </span>
                                  <span className="ml-auto pl-2 text-xs text-muted-foreground">
                                    {v.stock?.[0]?.quantity ?? 0} in stock
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Supplier */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Truck className="h-3.5 w-3.5 text-indigo-500" />
                      Supplier
                    </Label>
                    <Select
                      value={form.supplierId}
                      onValueChange={(value) => setForm({ ...form, supplierId: value })}
                    >
                      <SelectTrigger className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No supplier</SelectItem>
                        {(suppliers.data ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity + Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <ArrowDownToLine className="h-3.5 w-3.5 text-indigo-500" />
                        Quantity
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Coins className="h-3.5 w-3.5 text-indigo-500" />
                        Unit price
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Received at */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                      Date and time received
                    </Label>
                    <Input
                      type="datetime-local"
                      value={form.receivedAt}
                      onChange={(e) => setForm({ ...form, receivedAt: e.target.value })}
                      className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      Notes
                    </Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Invoice, batch, delivery notes..."
                      className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => save.mutate()}
                      disabled={save.isPending}
                      className="flex-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40"
                    >
                      {save.isPending
                        ? "Saving..."
                        : editing
                          ? "Save changes"
                          : "Record stock-in"}
                    </Button>
                    {(editing || showForm) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetForm();
                          setShowForm(false);
                        }}
                        className="border-indigo-200 bg-white hover:bg-indigo-50"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
            {/* Tri-color top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

            <div className="p-5">
              {/* Register header */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Delivery register</h2>
                    <p className="text-[11px] text-slate-500">
                      {filtered.length} record{filtered.length === 1 ? "" : "s"} ·{" "}
                      {formatCurrency(total)} total buying cost
                    </p>
                  </div>
                </div>
                <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/25">
                  <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  Live
                </Badge>
              </div>

              {/* Filters */}
              <div className="mb-5 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
                  <Input
                    className="border-indigo-100 bg-white pl-9 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Search products, categories, suppliers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 md:w-44">
                    <SelectValue placeholder="Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All suppliers</SelectItem>
                    {(suppliers.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label="From date"
                  className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label="To date"
                  className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Records list */}
              <div className="max-h-[560px] space-y-2 overflow-y-auto overscroll-contain pr-1">
                {filtered.map((r) => (
                  <div
                    key={r.id}
                    className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-4 transition-all duration-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5"
                  >
                    {/* Left gradient accent */}
                    <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-orange-500 opacity-60 transition-opacity group-hover:opacity-100" />

                    <div className="flex flex-wrap items-center justify-between gap-3 pl-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/20">
                            <Package className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-900">
                              {r.variant?.product?.name ?? "Product"}
                              <span className="text-slate-400"> · </span>
                              <span className="font-medium text-slate-600">
                                {r.variant?.variant_name}
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700">
                                <CalendarDays className="h-2.5 w-2.5" />
                                {formatDate(r.received_at)}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 font-medium text-orange-700">
                                <Truck className="h-2.5 w-2.5" />
                                {r.supplier?.name ?? "No supplier"}
                              </span>
                              {r.notes && (
                                <span className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-full bg-slate-50 px-1.5 py-0.5 text-slate-600">
                                  <FileText className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{r.notes}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm shadow-emerald-500/25">
                            <ArrowDownToLine className="h-3 w-3" />+{r.quantity} units
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {formatCurrency(r.unit_buying_price)} each ·{" "}
                            <span className="font-semibold text-orange-700">
                              {formatCurrency(r.total_cost)}
                            </span>{" "}
                            total
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => editRecord(r)}
                          aria-label="Edit stock-in record"
                          className="text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {!filtered.length && (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                      <ClipboardList className="h-7 w-7 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">No records found</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Adjust your filters or record a new delivery.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
