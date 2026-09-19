import { createFileRoute, Link } from "@tanstack/react-router";
import { isManagerMode } from "@/lib/session-mode";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { getQueue, retrySale, subscribeQueue, type QueuedSale } from "@/lib/offline-queue";
import { readLog, subscribeLog, type TxLogEntry } from "@/lib/transaction-log";
import { runSync } from "@/lib/sync-manager";
import { useOnline } from "@/hooks/use-online";
import { SyncIndicator } from "@/components/sync-indicator";
import {
  ArrowLeft,
  RefreshCw,
  CloudUpload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Sparkles,
  Zap,
  Wifi,
  WifiOff,
  Wallet,
  Receipt,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/sync")({
  component: SyncQueuePage,
  head: () => ({
    meta: [
      { title: "Sync Queue - TillPoint POS" },
      {
        name: "description",
        content: "Track pending, uploading, synced and failed sales and retry uploads manually.",
      },
      { property: "og:title", content: "Sync Queue - TillPoint POS" },
      {
        property: "og:description",
        content: "Track pending, uploading, synced and failed sales and retry uploads manually.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const statusConfig: Record<
  NonNullable<QueuedSale["status"]>,
  { gradient: string; shadow: string; label: string; dot: string }
> = {
  uploading: {
    gradient: "from-blue-500 to-indigo-500",
    shadow: "shadow-blue-500/30",
    label: "Uploading",
    dot: "from-blue-400 to-indigo-400",
  },
  failed: {
    gradient: "from-rose-500 to-red-500",
    shadow: "shadow-rose-500/30",
    label: "Failed",
    dot: "from-rose-400 to-red-400",
  },
  pending: {
    gradient: "from-amber-500 to-orange-500",
    shadow: "shadow-amber-500/30",
    label: "Pending",
    dot: "from-amber-400 to-orange-400",
  },
};

function statusBadge(s: QueuedSale["status"]) {
  const cfg = statusConfig[s ?? "pending"] ?? statusConfig.pending;
  return (
    <Badge className={`border-0 bg-gradient-to-r ${cfg.gradient} text-white shadow-sm ${cfg.shadow}`}>
      <span className={`mr-1 h-1.5 w-1.5 rounded-full bg-white/90`} />
      {cfg.label}
    </Badge>
  );
}

const paymentGradients: Record<string, string> = {
  cash: "from-emerald-500 to-teal-500",
  mobile: "from-blue-500 to-indigo-500",
  ecocash: "from-blue-500 to-indigo-500",
  card: "from-violet-500 to-purple-500",
  other: "from-orange-500 to-amber-500",
};
const getPaymentGradient = (p: string) =>
  paymentGradients[p.toLowerCase()] ?? "from-slate-500 to-slate-600";

function SyncQueuePage() {
  const [manager, setManager] = useState(false);
  useEffect(() => {
    setManager(isManagerMode());
  }, []);
  const online = useOnline();
  const [queue, setQueue] = useState<QueuedSale[]>([]);
  const [log, setLog] = useState<TxLogEntry[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQueue(getQueue());
    setLog(readLog());
    const offQueue = subscribeQueue(() => setQueue(getQueue()));
    const offLog = subscribeLog(setLog);
    return () => {
      offQueue();
      offLog();
    };
  }, []);

  const pending = queue.filter((q) => q.status !== "failed").length;
  const uploading = queue.filter((q) => q.status === "uploading").length;
  const failed = queue.filter((q) => q.status === "failed").length;
  const synced = log.filter((e) => e.status === "synced").length;

  async function retryAll() {
    if (!online)
      return toast.error(
        "Still offline - retry will run automatically when the connection returns.",
      );
    setBusy(true);
    const res = await runSync();
    setBusy(false);
    setQueue(getQueue());
    if (res.failed > 0)
      toast.error(`${res.failed} sale${res.failed === 1 ? "" : "s"} still pending.`);
    else toast.success("All sales uploaded.");
  }

  async function retryOne(id: string) {
    if (!online) return toast.error("Still offline.");
    setBusy(true);
    const ok = await retrySale(id);
    setBusy(false);
    setQueue(getQueue());
    if (ok) toast.success("Sale uploaded.");
    else toast.error("Upload failed - it stays safe on this device.");
  }

  const cards = [
    {
      label: "Pending",
      value: pending,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/30",
      textGradient: "from-amber-600 to-orange-600",
      caption: "Waiting in the queue",
    },
    {
      label: "Uploading",
      value: uploading,
      icon: CloudUpload,
      gradient: "from-blue-500 to-indigo-500",
      shadow: "shadow-blue-500/30",
      textGradient: "from-blue-700 to-indigo-700",
      caption: "In-flight transfers",
    },
    {
      label: "Synced",
      value: synced,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/30",
      textGradient: "from-emerald-700 to-teal-700",
      caption: "Uploaded to cloud",
    },
    {
      label: "Failed",
      value: failed,
      icon: AlertTriangle,
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/30",
      textGradient: "from-rose-700 to-red-700",
      caption: "Needs manual retry",
    },
  ];

  const allClear = queue.length === 0 && failed === 0;

  return (
    <div className="relative min-h-screen p-4 sm:p-8">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-blue-400/10 to-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                <CloudUpload className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Link to={manager ? "/manager" : "/cashier"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                </Link>
                <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                  Sync queue
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {online ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                    Connected — all data synchronized automatically.
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <WifiOff className="h-3.5 w-3.5 text-amber-500" />
                    Offline mode — sales are being stored safely on this device.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SyncIndicator />
            <Button
              onClick={retryAll}
              disabled={busy || !online || queue.length === 0}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-purple-500/40"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Retry all
            </Button>
          </div>
        </header>

        {/* Status banner */}
        <Card
          className={`relative mb-6 overflow-hidden border p-4 shadow-sm ${
            online
              ? "border-emerald-100/60 bg-gradient-to-r from-white via-emerald-50/50 to-teal-50/40"
              : "border-amber-100/60 bg-gradient-to-r from-white via-amber-50/50 to-orange-50/40"
          }`}
        >
          <div
            className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl ${
              online
                ? "bg-gradient-to-br from-emerald-400/20 to-teal-400/20"
                : "bg-gradient-to-br from-amber-400/20 to-orange-400/20"
            }`}
          />
          <div className="relative flex items-start gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-md ${
                online
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
              }`}
            >
              {online ? (
                <Server className="h-5 w-5 text-white" />
              ) : (
                <WifiOff className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="text-sm">
              <div
                className={`font-bold ${
                  online ? "text-emerald-900" : "text-amber-900"
                }`}
              >
                {online ? "Connection healthy" : "Working offline"}
              </div>
              <p
                className={`mt-0.5 text-[12px] ${
                  online ? "text-emerald-700/80" : "text-amber-700/80"
                }`}
              >
                {online
                  ? "Sales upload in the background. You can also retry failed items below."
                  : "Sales are saved locally and will upload automatically when the connection returns. Do not close this device."}
              </p>
            </div>
          </div>
        </Card>

        {/* Stat cards */}
        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card
                key={c.label}
                className="group relative overflow-hidden border-slate-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`}
                />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {c.label}
                    </span>
                    <div
                      className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${c.gradient} shadow-md ${c.shadow}`}
                    >
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span
                      className={`bg-gradient-to-r ${c.textGradient} bg-clip-text text-3xl font-extrabold tabular-nums text-transparent`}
                    >
                      {c.value}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <Sparkles className="h-3 w-3" />
                    {c.caption}
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        {/* Queue list */}
        <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

          <div className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Queue</h2>
                  <p className="text-[11px] text-slate-500">
                    {queue.length === 0
                      ? "Everything is uploaded"
                      : `${queue.length} sale${queue.length === 1 ? "" : "s"} waiting on this device`}
                  </p>
                </div>
              </div>
              {!allClear && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    failed > 0
                      ? "border-rose-100 bg-rose-50/60 text-rose-700"
                      : "border-amber-100 bg-amber-50/60 text-amber-700"
                  }`}
                >
                  {failed > 0 ? (
                    <>
                      <AlertTriangle className="h-3 w-3" />
                      {failed} failed
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" />
                      {pending} pending
                    </>
                  )}
                </span>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="py-14 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-2xl" />
                    <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">All clear</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Nothing waiting — every sale is uploaded.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {queue.map((q) => {
                  const cfg = statusConfig[q.status] ?? statusConfig.pending;
                  const paymentGradient = getPaymentGradient(q.payment_type);
                  const isFailed = q.status === "failed";
                  return (
                    <li
                      key={q.id}
                      className={`group relative overflow-hidden rounded-xl border bg-white p-3.5 shadow-sm transition-all hover:shadow-md ${
                        isFailed
                          ? "border-rose-100/60 hover:border-rose-200"
                          : "border-slate-100 hover:border-indigo-200"
                      }`}
                    >
                      {isFailed && (
                        <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-rose-400/20 to-red-400/20 blur-xl" />
                      )}

                      <div className="relative flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="relative shrink-0">
                            <div
                              className={`absolute inset-0 rounded-lg bg-gradient-to-br ${cfg.gradient} opacity-30 blur-sm`}
                            />
                            <div
                              className={`relative grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${cfg.gradient} shadow-md ${cfg.shadow}`}
                            >
                              <Wallet className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-base font-extrabold tabular-nums text-transparent">
                                {formatCurrency(q.total_amount)}
                              </span>
                              {statusBadge(q.status)}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(q.queued_at).toLocaleString()}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span className="inline-flex items-center gap-1">
                                <Receipt className="h-3 w-3" />
                                {q.items.length} line{q.items.length === 1 ? "" : "s"}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span
                                className={`inline-flex items-center gap-1 rounded-md bg-gradient-to-r ${paymentGradient} bg-clip-text font-bold capitalize text-transparent`}
                              >
                                {q.payment_type}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span className="inline-flex items-center gap-1">
                                <Zap className="h-3 w-3 text-indigo-500" />
                                {q.cashier_name ?? "Cashier"}
                              </span>
                            </div>

                            {q.last_error && (
                              <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-100/60 bg-gradient-to-r from-rose-50/60 to-red-50/40 p-2">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                                <div className="text-[11px] text-rose-800">
                                  <span className="font-bold">
                                    Attempt {q.attempts ?? 1}:
                                  </span>{" "}
                                  {q.last_error}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || !online}
                          onClick={() => retryOne(q.id)}
                          className={`shrink-0 ${
                            isFailed
                              ? "border-rose-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                              : "border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                          }`}
                        >
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                          Retry
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Info footer */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-white/60 p-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="text-[11px] text-slate-600">
            Every sale is stored on this device first. If an upload fails, the record stays safe
            locally and retries automatically the next time the connection returns. Nothing is
            ever lost.
          </p>
        </div>
      </div>
    </div>
  );
}
