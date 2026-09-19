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
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Trash2,
  Undo2,
  Sparkles,
  Banknote,
  Receipt,
  PiggyBank,
  Scale,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/manager/cash")({
  component: DailyCashPage,
});

function DailyCashPage() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const entries = useQuery({
    queryKey: ["daily-cash"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_cash")
        .select("id, collection_date, amount, notes, created_at, recorded_by")
        .order("collection_date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });

  const salesToday = useQuery({
    queryKey: ["sales-by-day"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("sales")
        .select("total_amount, created_at, payment_type")
        .not("status", "eq", "voided")
        .gte("created_at", since.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const refundsToday = useQuery({
    queryKey: ["cash-refunds"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("refunds")
        .select("amount, kind, created_at, sale:sales(payment_type)")
        .gte("created_at", since.toISOString());
      if (error) throw error;
      return (data ?? []) as Array<{
        amount: number;
        kind: string;
        created_at: string;
        sale: { payment_type: string } | null;
      }>;
    },
  });

  const expenses = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, expense_date")
        .gte("expense_date", since.toISOString().slice(0, 10));
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const list = entries.data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const todayEntry = list.find((e) => e.collection_date === today);
    const total7 = list
      .filter((e) => new Date(e.collection_date) >= new Date(Date.now() - 7 * 24 * 3600 * 1000))
      .reduce((s, e) => s + Number(e.amount), 0);
    const total30 = list.reduce((s, e) => s + Number(e.amount), 0);

    const grossCashSalesToday = (salesToday.data ?? [])
      .filter((s) => s.payment_type === "cash" && s.created_at.slice(0, 10) === today)
      .reduce((s, r) => s + Number(r.total_amount), 0);
    const refundsTodayTotal = (refundsToday.data ?? [])
      .filter(
        (r) => String(r.created_at).slice(0, 10) === today && r.sale?.payment_type === "cash",
      )
      .reduce((s, r) => s + Number(r.amount), 0);
    const cashSalesToday = grossCashSalesToday - refundsTodayTotal;
    const expensesToday = (expenses.data ?? [])
      .filter((e) => String(e.expense_date).slice(0, 10) === today)
      .reduce((s, e) => s + Number(e.amount), 0);
    const expectedToday = cashSalesToday - expensesToday;
    const variance = Number(todayEntry?.amount ?? 0) - expectedToday;

    return {
      todayTotal: Number(todayEntry?.amount ?? 0),
      total7,
      total30,
      grossCashSalesToday,
      refundsTodayTotal,
      cashSalesToday,
      expensesToday,
      expectedToday,
      variance,
    };
  }, [entries.data, salesToday.data, refundsToday.data, expenses.data]);

  const add = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("daily_cash").insert({
        collection_date: date,
        amount: amt,
        notes: notes || null,
        recorded_by: session?.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cash entry recorded");
      setAmount("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["daily-cash"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_cash").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry removed");
      qc.invalidateQueries({ queryKey: ["daily-cash"] });
    },
  });

  const cards = [
    {
      label: "Today's collection",
      value: formatCurrency(stats.todayTotal),
      icon: Wallet,
      gradient: "from-indigo-500 to-purple-500",
      shadow: "shadow-indigo-500/30",
      bg: "from-indigo-50/60 via-purple-50/40 to-indigo-50/40",
      border: "border-indigo-100/60",
      text: "from-indigo-700 to-purple-700",
      hint: "Recorded in the drawer",
    },
    {
      label: "Cash sales today",
      value: formatCurrency(stats.cashSalesToday),
      icon: Banknote,
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/30",
      bg: "from-blue-50/60 via-cyan-50/40 to-blue-50/40",
      border: "border-blue-100/60",
      text: "from-blue-700 to-cyan-700",
      hint: "After refunds & voids",
    },
    {
      label: "Refunds & voids today",
      value: formatCurrency(stats.refundsTodayTotal),
      icon: Undo2,
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/30",
      bg: "from-rose-50/60 via-red-50/40 to-rose-50/40",
      border: "border-rose-100/60",
      text: "from-rose-700 to-red-700",
      hint: "Money returned",
    },
    {
      label: "Expenses today",
      value: formatCurrency(stats.expensesToday),
      icon: TrendingDown,
      gradient: "from-orange-500 to-amber-500",
      shadow: "shadow-orange-500/30",
      bg: "from-orange-50/60 via-amber-50/40 to-orange-50/40",
      border: "border-orange-100/60",
      text: "from-orange-700 to-amber-700",
      hint: "Cash paid out",
    },
    {
      label: "Expected in drawer",
      value: formatCurrency(stats.expectedToday),
      icon: Scale,
      gradient: "from-violet-500 to-purple-500",
      shadow: "shadow-violet-500/30",
      bg: "from-violet-50/60 via-purple-50/40 to-violet-50/40",
      border: "border-violet-100/60",
      text: "from-violet-700 to-purple-700",
      hint: "Sales − refunds − expenses",
    },
    {
      label: "Variance today",
      value: formatCurrency(stats.variance),
      icon: stats.variance >= 0 ? TrendingUp : TrendingDown,
      gradient: stats.variance >= 0 ? "from-emerald-500 to-teal-500" : "from-rose-500 to-red-500",
      shadow: stats.variance >= 0 ? "shadow-emerald-500/30" : "shadow-rose-500/30",
      bg:
        stats.variance >= 0
          ? "from-emerald-50/60 via-teal-50/40 to-emerald-50/40"
          : "from-rose-50/60 via-red-50/40 to-rose-50/40",
      border: stats.variance >= 0 ? "border-emerald-100/60" : "border-rose-100/60",
      text: stats.variance >= 0 ? "from-emerald-700 to-teal-700" : "from-rose-700 to-red-700",
      hint: stats.variance >= 0 ? "Balanced / overage" : "Shortfall",
    },
    {
      label: "Last 7 days",
      value: formatCurrency(stats.total7),
      icon: TrendingUp,
      gradient: "from-indigo-500 to-blue-500",
      shadow: "shadow-indigo-500/30",
      bg: "from-indigo-50/60 via-blue-50/40 to-indigo-50/40",
      border: "border-indigo-100/60",
      text: "from-indigo-700 to-blue-700",
      hint: "Rolling weekly total",
    },
  ];

  return (
    <div className="relative p-6 md:p-10">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-gradient-to-br from-blue-400/10 to-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Daily Cash Collection
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track cash collected from shop sales and compare against recorded cash transactions.
              </p>
            </div>
          </div>
        </header>

        {/* Stat cards */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((c) => (
            <Card
              key={c.label}
              className={`group relative overflow-hidden border ${c.border} bg-gradient-to-br ${c.bg} p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-white/40 to-white/0 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    {c.label}
                  </span>
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${c.gradient} shadow-md ${c.shadow}`}
                  >
                    <c.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div
                  className={`mt-3 bg-gradient-to-r ${c.text} bg-clip-text text-2xl font-extrabold tabular-nums text-transparent`}
                >
                  {c.value}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  {c.hint}
                </div>
              </div>
            </Card>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[440px_1fr]">
          {/* Record collection form */}
          <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
            {/* Top gradient bar */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

            <div className="relative p-6">
              {/* Ambient orb inside card */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-2xl" />

              <div className="relative">
                <div className="mb-5 flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                    <PiggyBank className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-base font-bold text-transparent">
                      Record cash collection
                    </h2>
                    <p className="text-[11px] text-slate-500">Log the day&apos;s takings</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Banknote className="h-3.5 w-3.5 text-indigo-500" />
                      Amount (USD)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Receipt className="h-3.5 w-3.5 text-indigo-500" />
                      Notes (optional)
                    </Label>
                    <Textarea
                      placeholder="e.g. Banked at CBZ, envelope A"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <Button
                    className="group relative w-full overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] font-bold shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40"
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
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Record collection
                      </>
                    )}
                  </Button>

                  {/* Balance check */}
                  <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-blue-50/40 to-purple-50/60 p-3.5">
                    <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-xl" />
                    <div className="relative">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                        <Scale className="h-3 w-3" />
                        Balance check for today
                      </div>
                      <p className="text-xs leading-relaxed text-slate-700">
                        Cash sales{" "}
                        <span className="font-semibold text-blue-700">
                          {formatCurrency(stats.grossCashSalesToday)}
                        </span>{" "}
                        − refunds{" "}
                        <span className="font-semibold text-rose-700">
                          {formatCurrency(stats.refundsTodayTotal)}
                        </span>{" "}
                        − expenses{" "}
                        <span className="font-semibold text-orange-700">
                          {formatCurrency(stats.expensesToday)}
                        </span>{" "}
                        ={" "}
                        <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text font-bold text-transparent">
                          {formatCurrency(stats.expectedToday)}
                        </span>{" "}
                        expected against{" "}
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(stats.todayTotal)}
                        </span>{" "}
                        collected.
                      </p>
                    </div>
                  </div>

                  {stats.variance !== 0 &&
                    (stats.cashSalesToday > 0 || stats.expensesToday > 0) && (
                      <div
                        className={`relative overflow-hidden rounded-xl border p-3.5 ${
                          stats.variance < 0
                            ? "border-rose-200 bg-gradient-to-br from-rose-50 via-red-50 to-rose-50"
                            : "border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                              stats.variance < 0
                                ? "bg-gradient-to-br from-rose-500 to-red-500 shadow-md shadow-rose-500/30"
                                : "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30"
                            }`}
                          >
                            {stats.variance < 0 ? (
                              <AlertCircle className="h-3.5 w-3.5 text-white" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            )}
                          </div>
                          <div className="text-xs">
                            <div
                              className={`font-bold ${
                                stats.variance < 0 ? "text-rose-700" : "text-emerald-700"
                              }`}
                            >
                              {stats.variance < 0 ? "Shortfall detected" : "Overage recorded"}
                            </div>
                            <div
                              className={`mt-0.5 ${
                                stats.variance < 0 ? "text-rose-700/80" : "text-emerald-700/80"
                              }`}
                            >
                              {stats.variance < 0
                                ? `${formatCurrency(Math.abs(stats.variance))} below expected cash sales less expenses today.`
                                : `${formatCurrency(stats.variance)} above expected cash sales less expenses today.`}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </Card>

          {/* Recent collections */}
          <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />

            <div className="relative p-6">
              <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-2xl" />

              <div className="relative">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/30">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-base font-bold text-transparent">
                        Recent collections
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        {(entries.data ?? []).length} entr
                        {(entries.data ?? []).length === 1 ? "y" : "ies"} logged
                      </p>
                    </div>
                  </div>
                  <Badge className="border-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20">
                    Last 60
                  </Badge>
                </div>

                <ul className="space-y-2.5">
                  {(entries.data ?? []).map((e) => (
                    <li
                      key={e.id}
                      className="group relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-r from-white to-indigo-50/30 p-3.5 transition-all duration-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="border-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm shadow-indigo-500/20">
                              <Calendar className="mr-1 h-3 w-3" />
                              {e.collection_date}
                            </Badge>
                            <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-base font-extrabold tabular-nums text-transparent">
                              {formatCurrency(e.amount)}
                            </span>
                          </div>
                          {e.notes && (
                            <div className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                              {e.notes}
                            </div>
                          )}
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            Recorded {formatDate(e.created_at)}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => del.mutate(e.id)}
                          className="shrink-0 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                  {entries.data?.length === 0 && (
                    <li className="py-12">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100">
                          <Wallet className="h-7 w-7 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            No entries yet
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Record your first collection to see it here.
                          </p>
                        </div>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
