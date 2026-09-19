import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Truck,
  Plus,
  Trash2,
  PackageCheck,
  Pencil,
  Sparkles,
  Users,
  Mail,
  Phone,
  MapPin,
  Building2,
  ShoppingBag,
  Calendar,
  Zap,
  ArrowRight,
  ClipboardList,
  Info,
  Boxes,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/manager/suppliers")({
  component: SuppliersPage,
});

type POItem = { name: string; quantity: number; unit_cost: number };

function SuppliersPage() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [supForm, setSupForm] = useState({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    products_offered: "",
  });
  const [poOpen, setPoOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<any | null>(null);
  const [poForm, setPoForm] = useState<{
    supplier_id: string;
    notes: string;
    auto_reorder: boolean;
    items: POItem[];
  }>({
    supplier_id: "",
    notes: "",
    auto_reorder: false,
    items: [{ name: "", quantity: 1, unit_cost: 0 }],
  });

  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lowStock = useQuery({
    queryKey: ["supplier-low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock")
        .select(
          "quantity, low_stock_alert_level, variant:product_variants(variant_name, product:products(name))",
        )
        .order("quantity");
      if (error) throw error;
      return (data ?? []).filter(
        (row: any) => Number(row.quantity) <= Number(row.low_stock_alert_level),
      );
    },
  });

  const pos = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, supplier:suppliers(name)")
        .order("order_date", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!suppliers.data?.length || !lowStock.data || !pos.data) return;
    const flagged = lowStock.data as any[];
    const existingNames = new Set(
      (pos.data as any[]).flatMap((order) =>
        (Array.isArray(order.items) ? order.items : []).map((item: POItem) => item.name),
      ),
    );
    const supplierList = suppliers.data as any[];
    const createOrders = flagged
      .map((row) => {
        const name = `${row.variant?.product?.name ?? "Product"} · ${row.variant?.variant_name ?? "Variant"}`;
        if (existingNames.has(name)) return null;
        const supplier =
          supplierList.find((candidate) =>
            `${candidate.name} ${candidate.notes ?? ""}`
              .toLowerCase()
              .includes((row.variant?.product?.name ?? "").toLowerCase()),
          ) ?? supplierList[0];
        return {
          supplier_id: supplier.id,
          items: [{ name, quantity: 40, unit_cost: 0 }],
          total: 0,
          auto_reorder: true,
          notes: "Automatically generated from a low-stock alert.",
        };
      })
      .filter(Boolean);
    if (!createOrders.length) return;
    void supabase
      .from("purchase_orders")
      .insert(createOrders)
      .then(({ error }) => {
        if (!error) {
          toast.success(
            `${createOrders.length} automatic purchase order${createOrders.length === 1 ? "" : "s"} created`,
          );
          void qc.invalidateQueries({ queryKey: ["purchase-orders"] });
        }
      });
  }, [lowStock.data, pos.data, qc, suppliers.data]);

  const addSupplier = useMutation({
    mutationFn: async () => {
      if (!supForm.name.trim()) throw new Error("Supplier name required");
      const { products_offered, ...supplier } = supForm;
      const notes = [
        supplier.notes,
        products_offered ? `Products and prices offered:\n${products_offered}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const { error } = await supabase.from("suppliers").insert({ ...supplier, notes });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier added");
      setSupplierOpen(false);
      setSupForm({
        name: "",
        contact_name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
        products_offered: "",
      });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSupplier = useMutation({
    mutationFn: async () => {
      const { products_offered, ...supplier } = supForm;
      const notes = [
        supplier.notes,
        products_offered ? `Products and prices offered:\n${products_offered}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const { error } = await supabase
        .from("suppliers")
        .update({ ...supplier, notes })
        .eq("id", editingSupplier.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier updated");
      setEditingSupplier(null);
      setSupplierOpen(false);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSupplier = useMutation({
    mutationFn: async (s: any) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier deleted");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (e: Error) =>
      toast.error(
        /foreign key|violates/i.test(e.message)
          ? "This supplier is linked to purchase orders or stock-in records, so it cannot be deleted."
          : e.message,
      ),
  });

  const orderTotal = (order: any) => {
    const items: POItem[] = Array.isArray(order?.items) ? order.items : [];
    const computed = items.reduce(
      (sum, item) => sum + Number(item?.quantity || 0) * Number(item?.unit_cost || 0),
      0,
    );
    return computed || Number(order?.total || 0);
  };

  const poTotal = useMemo(
    () => poForm.items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_cost || 0), 0),
    [poForm.items],
  );

  const addPO = useMutation({
    mutationFn: async () => {
      if (!poForm.supplier_id) throw new Error("Choose a supplier");
      const validItems = poForm.items.filter((i) => i.name.trim() && Number(i.quantity) > 0);
      if (validItems.length === 0) throw new Error("Add at least one item");
      const { error } = await supabase.from("purchase_orders").insert({
        supplier_id: poForm.supplier_id,
        items: validItems,
        total: validItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0),
        auto_reorder: poForm.auto_reorder,
        notes: poForm.notes || null,
        created_by: session?.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Purchase order created");
      setPoOpen(false);
      setPoForm({
        supplier_id: "",
        notes: "",
        auto_reorder: false,
        items: [{ name: "", quantity: 1, unit_cost: 0 }],
      });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePO = useMutation({
    mutationFn: async () => {
      if (!editingPO) return;
      const validItems = poForm.items.filter((i) => i.name.trim() && Number(i.quantity) > 0);
      if (validItems.length === 0) throw new Error("Add at least one item");
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          supplier_id: poForm.supplier_id || null,
          items: validItems,
          total: validItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0),
          auto_reorder: poForm.auto_reorder,
          notes: poForm.notes || null,
        })
        .eq("id", editingPO.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Purchase order updated");
      setPoOpen(false);
      setEditingPO(null);
      setPoForm({
        supplier_id: "",
        notes: "",
        auto_reorder: false,
        items: [{ name: "", quantity: 1, unit_cost: 0 }],
      });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openPOEditor(order: any) {
    setEditingPO(order);
    setPoForm({
      supplier_id: order.supplier_id ?? "",
      notes: order.notes ?? "",
      auto_reorder: Boolean(order.auto_reorder),
      items: (Array.isArray(order.items) ? order.items : []).map((i: POItem) => ({
        name: String(i?.name ?? ""),
        quantity: Number(i?.quantity ?? 0),
        unit_cost: Number(i?.unit_cost ?? 0),
      })),
    });
    setPoOpen(true);
  }

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("purchase_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });

  const statusStyles: Record<string, { bg: string; label: string; dot: string }> = {
    pending: {
      bg: "from-amber-500 to-orange-500",
      label: "Pending",
      dot: "from-amber-400 to-orange-400",
    },
    ordered: {
      bg: "from-blue-500 to-indigo-500",
      label: "Ordered",
      dot: "from-blue-400 to-indigo-400",
    },
    received: {
      bg: "from-emerald-500 to-teal-500",
      label: "Received",
      dot: "from-emerald-400 to-teal-400",
    },
    cancelled: {
      bg: "from-slate-400 to-slate-500",
      label: "Cancelled",
      dot: "from-slate-300 to-slate-400",
    },
  };

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
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
                <Truck className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Suppliers & Purchase Orders
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage suppliers, issue POs, and auto-reorder items running low.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingSupplier(null);
                setSupForm({
                  name: "",
                  contact_name: "",
                  phone: "",
                  email: "",
                  address: "",
                  notes: "",
                  products_offered: "",
                });
                setSupplierOpen(true);
              }}
              className="border-blue-200 hover:border-blue-300 hover:bg-blue-50"
            >
              <Plus className="mr-2 h-4 w-4" /> Add supplier
            </Button>
            <Button
              onClick={() => setPoOpen(true)}
              disabled={!suppliers.data?.length}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-purple-500/40"
            >
              <Plus className="mr-2 h-4 w-4" /> New PO
            </Button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Suppliers panel */}
          <Card className="relative overflow-hidden border-blue-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md shadow-blue-500/25">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Suppliers</h2>
                    <p className="text-[11px] text-slate-500">Vendor directory</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/60 px-2.5 py-1">
                  <Users className="h-3 w-3 text-blue-600" />
                  <span className="text-[11px] font-bold text-blue-700">
                    {suppliers.data?.length ?? 0}
                  </span>
                </div>
              </div>

              <ul className="divide-y divide-slate-100">
                {(suppliers.data ?? []).map((s) => (
                  <li key={s.id} className="group py-3.5 transition-colors hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-indigo-50/20">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 opacity-30 blur-sm" />
                        <div className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-md shadow-blue-500/30">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-bold text-slate-900">{s.name}</div>
                            {s.contact_name && (
                              <div className="truncate text-xs text-slate-500">
                                {s.contact_name}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 hover:bg-indigo-50 hover:text-indigo-600"
                              onClick={() => {
                                setEditingSupplier(s);
                                setSupForm({
                                  name: s.name ?? "",
                                  contact_name: s.contact_name ?? "",
                                  phone: s.phone ?? "",
                                  email: s.email ?? "",
                                  address: s.address ?? "",
                                  notes: s.notes ?? "",
                                  products_offered: "",
                                });
                                setSupplierOpen(true);
                              }}
                              aria-label={`Edit ${s.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              disabled={deleteSupplier.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete supplier "${s.name}"? This cannot be undone. Past stock-in records stay in place.`,
                                  )
                                )
                                  deleteSupplier.mutate(s);
                              }}
                              aria-label={`Delete ${s.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {(s.phone || s.email) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {s.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3 text-blue-500" />
                                {s.phone}
                              </span>
                            )}
                            {s.email && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3 text-indigo-500" />
                                {s.email}
                              </span>
                            )}
                          </div>
                        )}
                        {s.address && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{s.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
                {suppliers.data?.length === 0 && (
                  <li className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100">
                        <Truck className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No suppliers yet</p>
                      <p className="text-xs text-slate-500">Add your first vendor to get started.</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </Card>

          {/* Purchase orders panel */}
          <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                    <ClipboardList className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Purchase orders</h2>
                    <p className="text-[11px] text-slate-500">Track order fulfillment</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/60 px-2.5 py-1">
                  <PackageCheck className="h-3 w-3 text-indigo-600" />
                  <span className="text-[11px] font-bold text-indigo-700">
                    {pos.data?.length ?? 0}
                  </span>
                </div>
              </div>

              <ul className="divide-y divide-slate-100">
                {(pos.data ?? []).map((p: any) => {
                  const statusInfo = statusStyles[p.status] ?? statusStyles.pending;
                  const items: POItem[] = Array.isArray(p.items) ? p.items : [];
                  return (
                    <li
                      key={p.id}
                      className="group py-4 transition-colors hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/20"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="relative shrink-0">
                            <div
                              className={`absolute inset-0 rounded-lg bg-gradient-to-br ${statusInfo.bg} opacity-30 blur-sm`}
                            />
                            <div
                              className={`relative grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${statusInfo.bg} shadow-md`}
                            >
                              <ShoppingBag className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-bold text-slate-900">
                                {p.supplier?.name ?? "Supplier"}
                              </div>
                              {p.auto_reorder && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-orange-500/30">
                                  <Zap className="h-2.5 w-2.5" />
                                  Auto
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-indigo-500" />
                                {formatDate(p.order_date)}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span className="inline-flex items-center gap-1">
                                <Boxes className="h-3 w-3 text-purple-500" />
                                {items.length} item{items.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                              Total
                            </div>
                            <div className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-sm font-extrabold tabular-nums text-transparent">
                              {formatCurrency(orderTotal(p))}
                            </div>
                          </div>

                          <Select
                            value={p.status}
                            onValueChange={(v) => updateStatus.mutate({ id: p.id, status: v })}
                          >
                            <SelectTrigger className="h-9 w-[130px] border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full bg-gradient-to-br ${statusInfo.dot}`}
                                />
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-400" />
                                  Pending
                                </span>
                              </SelectItem>
                              <SelectItem value="ordered">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400" />
                                  Ordered
                                </span>
                              </SelectItem>
                              <SelectItem value="received">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400" />
                                  Received
                                </span>
                              </SelectItem>
                              <SelectItem value="cancelled">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-slate-300 to-slate-400" />
                                  Cancelled
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPOEditor(p)}
                            className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Edit costs
                          </Button>
                        </div>
                      </div>

                      {/* Items preview */}
                      {items.length > 0 && (
                        <div className="mt-3 ml-13 rounded-lg border border-slate-100 bg-gradient-to-r from-slate-50/80 to-indigo-50/40 p-2.5">
                          <ul className="space-y-1">
                            {items.slice(0, 4).map((it, i) => (
                              <li
                                key={i}
                                className="flex items-center justify-between gap-2 text-[11px]"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-gradient-to-br from-indigo-500 to-purple-500 text-[10px] font-bold text-white">
                                    {it.quantity}
                                  </span>
                                  <span className="truncate font-medium text-slate-700">
                                    {it.name}
                                  </span>
                                </div>
                                <span className="shrink-0 font-semibold tabular-nums text-indigo-700">
                                  {formatCurrency(it.unit_cost)}
                                </span>
                              </li>
                            ))}
                            {items.length > 4 && (
                              <li className="pt-0.5 text-[10px] font-medium text-indigo-500">
                                + {items.length - 4} more item
                                {items.length - 4 === 1 ? "" : "s"}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
                {pos.data?.length === 0 && (
                  <li className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                        <PackageCheck className="h-6 w-6 text-indigo-500" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        No purchase orders yet
                      </p>
                      <p className="text-xs text-slate-500">
                        Create one to start tracking fulfillment.
                      </p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </Card>
        </section>
      </div>

      {/* Add/Edit supplier dialog */}
      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-blue-100 bg-gradient-to-b from-white to-blue-50/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/30">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                {editingSupplier ? "Edit supplier" : "Add supplier"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={supForm.name}
                onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                placeholder="e.g. Delta Beverages"
                className="border-slate-200 bg-white shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Contact person</Label>
              <Input
                value={supForm.contact_name}
                onChange={(e) => setSupForm({ ...supForm, contact_name: e.target.value })}
                placeholder="e.g. John Moyo"
                className="border-slate-200 bg-white shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Phone</Label>
                <Input
                  value={supForm.phone}
                  onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                  className="border-slate-200 bg-white shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Email</Label>
                <Input
                  value={supForm.email}
                  onChange={(e) => setSupForm({ ...supForm, email: e.target.value })}
                  className="border-slate-200 bg-white shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Address</Label>
              <Input
                value={supForm.address}
                onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                className="border-slate-200 bg-white shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Products and prices offered
              </Label>
              <Textarea
                placeholder={"e.g. Sugar - $2.70/kg\nRice - $5/5kg"}
                value={supForm.products_offered}
                onChange={(e) => setSupForm({ ...supForm, products_offered: e.target.value })}
                className="border-slate-200 bg-white shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Notes</Label>
              <Textarea
                value={supForm.notes}
                onChange={(e) => setSupForm({ ...supForm, notes: e.target.value })}
                className="border-slate-200 bg-white shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSupplierOpen(false)}
              className="border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => (editingSupplier ? updateSupplier.mutate() : addSupplier.mutate())}
              disabled={addSupplier.isPending || updateSupplier.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-indigo-500/40"
            >
              {addSupplier.isPending || updateSupplier.isPending
                ? "Saving..."
                : editingSupplier
                  ? "Save changes"
                  : "Add supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO dialog */}
      <Dialog open={poOpen} onOpenChange={setPoOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30">
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                {editingPO ? "Edit purchase order" : "New purchase order"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Supplier</Label>
              <Select
                value={poForm.supplier_id}
                onValueChange={(v) => setPoForm({ ...poForm, supplier_id: v })}
              >
                <SelectTrigger className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
                  <SelectValue placeholder="Choose supplier" />
                </SelectTrigger>
                <SelectContent>
                  {(suppliers.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Items</Label>
              <div className="space-y-2">
                {poForm.items.map((it, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_80px_100px_36px] items-center gap-2 rounded-lg border border-slate-100 bg-white/60 p-2"
                  >
                    <Input
                      placeholder="Item name"
                      value={it.name}
                      onChange={(e) => {
                        const items = [...poForm.items];
                        items[i] = { ...it, name: e.target.value };
                        setPoForm({ ...poForm, items });
                      }}
                      className="border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <Input
                      type="number"
                      placeholder="# Units"
                      value={it.quantity === 0 ? "" : it.quantity}
                      onChange={(e) => {
                        const items = [...poForm.items];
                        items[i] = { ...it, quantity: Number(e.target.value) };
                        setPoForm({ ...poForm, items });
                      }}
                      className="border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={it.unit_cost === 0 ? "" : it.unit_cost}
                      onChange={(e) => {
                        const items = [...poForm.items];
                        items[i] = { ...it, unit_cost: Number(e.target.value) };
                        setPoForm({ ...poForm, items });
                      }}
                      className="border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() =>
                        setPoForm({ ...poForm, items: poForm.items.filter((_, x) => x !== i) })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPoForm({
                      ...poForm,
                      items: [...poForm.items, { name: "", quantity: 1, unit_cost: 0 }],
                    })
                  }
                  className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <Plus className="mr-1 h-3 w-3" /> Add row
                </Button>
              </div>
            </div>

            <label
              htmlFor="auto"
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-orange-200/60 bg-gradient-to-r from-orange-50 to-amber-50 p-3 transition-colors hover:border-orange-300"
            >
              <input
                id="auto"
                type="checkbox"
                checked={poForm.auto_reorder}
                onChange={(e) => setPoForm({ ...poForm, auto_reorder: e.target.checked })}
                className="h-4 w-4 accent-orange-500"
              />
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-slate-700">
                Mark as auto-reorder (recurring)
              </span>
            </label>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Notes</Label>
              <Textarea
                value={poForm.notes}
                onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="relative overflow-hidden rounded-lg border border-indigo-200/60 bg-gradient-to-r from-indigo-50 via-purple-50 to-orange-50 p-4">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Order total</span>
                </div>
                <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-2xl font-extrabold tabular-nums text-transparent">
                  {formatCurrency(poTotal)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPoOpen(false);
                setEditingPO(null);
              }}
              className="border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => (editingPO ? savePO.mutate() : addPO.mutate())}
              disabled={addPO.isPending || savePO.isPending}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-purple-500/40"
            >
              {addPO.isPending || savePO.isPending
                ? "Saving..."
                : editingPO
                  ? "Save changes"
                  : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
