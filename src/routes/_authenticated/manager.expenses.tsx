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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Trash2,
  Wallet,
  PieChart,
  Sparkles,
  CalendarDays,
  Tag,
  FileText,
  Plus,
  BarChart3,
  Clock,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/manager/expenses")({
  component: ExpensesPage,
});

const CATEGORIES = ["Rent", "Utilities", "Wages", "Restock", "Transport", "Repairs", "Marketing", "Other"];

// Rotating gradient palette for category bars
const CATEGORY_GRADIENTS = [
  "from-indigo-500 to-purple-500",
  "from-orange-500 to-amber-500",
  "from-blue-500 to-cyan-500",
  "from-violet-500 to-fuchsia-500",
  "from-rose-500 to-orange-500",
  "from-teal-500 to-emerald-500",
  "from-fuchsia-500 to-pink-500",
  "from-amber-500 to-yellow-500",
];

function ExpensesPage() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Other",
    description: "",
    amount: "",
  });

  const expenses = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, expense_date, category, description, amount, created_at")
        .order("expense_date", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data ?? [];
    },
  });

  const sales = useQuery({
    queryKey: ["sales-30d"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("sales")
        .select("total_amount, created_at")
        .gte("created_at", since.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const cutoff30 = Date.now() - 30 * 24 * 3600 * 1000;
    const cutoff7 = Date.now() - 7 * 24 * 3600 * 1000;

    const exp30 = (expenses.data ?? []).filter((e) => new Date(e.expense_date).getTime() >= cutoff30);
    const exp7 = (expenses.data ?? []).filter((e) => new Date(e.expense_date).getTime() >= cutoff7);
    const totalExp30 = exp30.reduce((s, e) => s + Number(e.amount), 0);
    const totalExp7 = exp7.reduce((s, e) => s + Number(e.amount), 0);

    const rev30 = (sales.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
    const rev7 = (sales.data ?? []).filter((r) => new Date(r.created_at).getTime() >= cutoff7).reduce((s, r) => s + Number(r.total_amount), 0);

    const profit30 = rev30 - totalExp30;
    const profit7 = rev7 - totalExp7;

    const byCategory = new Map<string, number>();
    exp30.forEach((e) => byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount)));
    const categories = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
    const maxCat = categories[0]?.[1] ?? 1;

    return { rev30, rev7, totalExp30, totalExp7, profit30, profit7, categories, maxCat };
  }, [expenses.data, sales.data]);

  const add = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(form.amount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("expenses").insert({
        expense_date: form.expense_date,
        category: form.category,
        description: form.description || null,
        amount: amt,
        recorded_by: session?.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense recorded");
      setForm({ ...form, description: "", amount: "" });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const cards = [
    {
      label: "Revenue (30d)",
      value: formatCurrency(stats.rev30),
      icon: DollarSign,
      gradient: "from-blue-500 to-cyan-500",
      bg: "from-white via-blue-50/40 to-cyan-50/40",
      border: "border-blue-100/60",
      text: "from-blue-700 to-cyan-700",
      caption: "Total sales intake",
    },
    {
      label: "Expenses (30d)",
      value: formatCurrency(stats.totalExp30),
      icon: Receipt,
      gradient: "from-violet-500 to-purple-500",
      bg: "from-white via-violet-50/40 to-purple-50/40",
      border: "border-violet-100/60",
      text: "from-violet-700 to-purple-700",
      caption: "Total outgoing spend",
    },
    {
      label: "Profit (30d)",
      value: formatCurrency(stats.profit30),
      icon: stats.profit30 >= 0 ? TrendingUp : TrendingDown,
      gradient: stats.profit30 >= 0 ? "from-emerald-500 to-teal-500" : "from-rose-500 to-red-500",
      bg: stats.profit30 >= 0 ? "from-white via-emerald-50/40 to-teal-50/40" : "from-white via-rose-50/40 to-red-50/40",
      border: stats.profit30 >= 0 ? "border-emerald-100/60" : "border-rose-100/60",
      text: stats.profit30 >= 0 ? "from-emerald-700 to-teal-700" : "from-rose-700 to-red-700",
      caption: "Revenue − Expenses",
    },
    {
      label: "Profit (7d)",
      value: formatCurrency(stats.profit7),
      icon: stats.profit7 >= 0 ? TrendingUp : TrendingDown,
      gradient: stats.profit7 >= 0 ? "from-orange-500 to-amber-500" : "from-rose-500 to-red-500",
      bg: stats.profit7 >= 0 ? "from-white via-orange-50/50 to-amber-50/50" : "from-white via-rose-50/40 to-red-50/40",
      border: stats.profit7 >= 0 ? "border-orange-100/60" : "border-rose-100/60",
      text: stats.profit7 >= 0 ? "from-orange-600 to-amber-600" : "from-rose-700 to-red-700",
      caption: "Weekly performance",
    },
  ];

  return (
    <div className="relative p-6 md:p-10">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/30">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-violet-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Expenses & Profit
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track every dollar leaving the shop and see live profit against sales.
              </p>
            </div>
          </div>
        </header>

        {/* Stat cards */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card
              key={c.label}
              className={`group relative overflow-hidden bg-gradient-to-br ${c.bg} ${c.border} p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {c.label}
                  </span>
                  <div className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${c.gradient} shadow-md`}>
                    <c.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className={`mt-3 bg-gradient-to-r ${c.text} bg-clip-text text-2xl font-extrabold tabular-nums text-transparent`}>
                  {c.value}
                </div>
                <div className="mt-1.5 text-[11px] font-medium text-slate-500">{c.caption}</div>
              </div>
            </Card>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Log expense form */}
          <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />

            <div className="relative">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <h2 className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-base font-bold text-transparent">
                  Log expense
                </h2>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                    Date
                  </Label>
                  <Input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    className="border-slate-200 bg-white shadow-sm transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Tag className="h-3.5 w-3.5 text-indigo-500" />
                    Category
                  </Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <DollarSign className="h-3.5 w-3.5 text-indigo-500" />
                    Amount (USD)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="border-slate-200 bg-white font-semibold shadow-sm transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <FileText className="h-3.5 w-3.5 text-indigo-500" />
                    Description
                  </Label>
                  <Textarea
                    placeholder="e.g. Diesel for generator"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="min-h-[72px] border-slate-200 bg-white shadow-sm transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <Button
                  className="group relative w-full overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40"
                  onClick={() => add.mutate()}
                  disabled={add.isPending}
                >
                  {add.isPending ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Receipt className="mr-2 h-4 w-4" />
                      Record expense
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            {/* Spend by category */}
            <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />

              <div className="relative">
                <div className="mb-4 flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/30">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-base font-bold text-transparent">
                      Spend by category
                    </h2>
                    <p className="text-[11px] text-slate-500">Last 30 days breakdown</p>
                  </div>
                </div>

                {stats.categories.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100">
                      <PieChart className="h-6 w-6 text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No expenses logged yet.</p>
                  </div>
                ) : (
                  <ul className="space-y-3.5">
                    {stats.categories.map(([cat, amt], index) => {
                      const gradient = CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];
                      const pct = (amt / stats.maxCat) * 100;
                      return (
                        <li key={cat} className="group">
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${gradient} shadow-sm`} />
                              <span className="font-semibold text-slate-700">{cat}</span>
                            </div>
                            <span className="font-bold tabular-nums text-slate-900">
                              {formatCurrency(amt)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>

            {/* Recent expenses */}
            <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

              <div className="relative p-5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 shadow-md shadow-violet-500/30">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-base font-bold text-transparent">
                      Recent expenses
                    </h2>
                    <p className="text-[11px] text-slate-500">Latest entries across all categories</p>
                  </div>
                </div>
              </div>

              <ul className="divide-y divide-slate-100">
                {(expenses.data ?? []).slice(0, 12).map((e) => (
                  <li
                    key={e.id}
                    className="group flex items-start justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-gradient-to-r hover:from-indigo-50/40 hover:via-purple-50/20 hover:to-transparent"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-indigo-500/20">
                          {e.category}
                        </Badge>
                        <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-sm font-bold tabular-nums text-transparent">
                          {formatCurrency(e.amount)}
                        </span>
                      </div>
                      {e.description && (
                        <div className="mt-1 truncate text-xs text-slate-500">{e.description}</div>
                      )}
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(e.expense_date)}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-slate-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                      onClick={() => del.mutate(e.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
                {expenses.data?.length === 0 && (
                  <li className="flex flex-col items-center gap-2 py-10">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                      <Receipt className="h-6 w-6 text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No expenses yet.</p>
                    <p className="text-xs text-slate-400">Log your first expense above.</p>
                  </li>
                )}
              </ul>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
