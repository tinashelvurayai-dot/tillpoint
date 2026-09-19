import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Trash2,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ShieldCheck,
  Database,
  Clock,
  FileDown,
  Info,
} from "lucide-react";
import { clearLog, logToRows, readLog, subscribeLog, type TxLogEntry } from "@/lib/transaction-log";
import { getQueue, subscribeQueue, type QueuedSale } from "@/lib/offline-queue";

export const Route = createFileRoute("/_authenticated/manager/storage")({
  component: ManagerStoragePage,
});

function download(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value))
        .join(","),
    )
    .join("\n");
}

function htmlTable(rows: string[][], title: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font:14px Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:7px;text-align:left}th{background:#eef2ff}</style></head><body><h1>${title}</h1><table>${rows.map((row, index) => `<tr>${row.map((value) => (index === 0 ? `<th>${value}</th>` : `<td>${value}</td>`)).join("")}</tr>`).join("")}</table></body></html>`;
}

function ManagerStoragePage() {
  const [entries, setEntries] = useState<TxLogEntry[]>([]);
  const [queue, setQueue] = useState<QueuedSale[]>([]);
  const [exported, setExported] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const offLog = subscribeLog(setEntries);
    const offQueue = subscribeQueue(() => setQueue(getQueue()));
    setQueue(getQueue());
    return () => {
      offLog();
      offQueue();
    };
  }, []);

  const filteredEntries = entries.filter(
    (entry) =>
      (!dateFrom || entry.created_at.slice(0, 10) >= dateFrom) &&
      (!dateTo || entry.created_at.slice(0, 10) <= dateTo),
  );
  const rows = logToRows(filteredEntries);
  const pending = queue.length;

  function exportFile(format: "csv" | "xlsx" | "docx" | "pdf") {
    if (!entries.length) {
      toast.error("There are no local transactions to export.");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "csv")
      download(`transactions-${stamp}.csv`, csv(rows), "text/csv;charset=utf-8");
    if (format === "xlsx")
      download(
        `transactions-${stamp}.xls`,
        htmlTable(rows, "TillPoint transactions"),
        "application/vnd.ms-excel",
      );
    if (format === "docx")
      download(
        `transactions-${stamp}.doc`,
        htmlTable(rows, "TillPoint transactions"),
        "application/msword",
      );
    if (format === "pdf") {
      const popup = window.open("", "_blank", "noopener,noreferrer");
      if (!popup) {
        toast.error("Allow popups to print a PDF export.");
        return;
      }
      popup.document.write(htmlTable(rows, "TillPoint transactions"));
      popup.document.close();
      popup.focus();
      popup.print();
    }
    if (format !== "pdf" || window.confirm("Did the PDF print dialog complete successfully?")) {
      setExported(true);
      toast.success(`Transactions exported as ${format.toUpperCase()}.`);
    }
  }

  function clearAfterExport() {
    if (!exported) {
      toast.error("Export the transactions first, then clearing will unlock.");
      return;
    }
    if (pending > 0) {
      toast.error(`${pending} sale${pending === 1 ? " is" : "s are"} still waiting to sync.`);
      return;
    }
    if (
      !window.confirm(
        "Clear all local transaction records from this device? This cannot be undone.",
      )
    )
      return;
    clearLog();
    setExported(false);
    toast.success("Local transaction storage cleared.");
  }

  const exportFormats = [
    {
      key: "xlsx" as const,
      label: "Excel",
      ext: "XLSX",
      desc: "Opens in Excel, Numbers, Sheets",
      icon: FileSpreadsheet,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/30",
      tint: "hover:border-emerald-300 hover:bg-emerald-50",
    },
    {
      key: "docx" as const,
      label: "Word",
      ext: "DOCX",
      desc: "Opens in Word, Pages, Docs",
      icon: FileText,
      gradient: "from-blue-500 to-indigo-500",
      shadow: "shadow-blue-500/30",
      tint: "hover:border-blue-300 hover:bg-blue-50",
    },
    {
      key: "pdf" as const,
      label: "PDF",
      ext: "PDF",
      desc: "Via the browser print dialog",
      icon: FileDown,
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/30",
      tint: "hover:border-rose-300 hover:bg-rose-50",
    },
    {
      key: "csv" as const,
      label: "CSV",
      ext: "CSV",
      desc: "Universal plain-text format",
      icon: Download,
      gradient: "from-orange-500 to-amber-500",
      shadow: "shadow-orange-500/30",
      tint: "hover:border-orange-300 hover:bg-orange-50",
    },
  ];

  const canClear = exported && pending === 0;

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
                <HardDrive className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Storage & exports
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Export local sales before clearing this device&apos;s transaction history.
              </p>
            </div>
          </div>
        </header>

        {/* Stat cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {/* Local transactions */}
          <Card className="group relative overflow-hidden border-indigo-100/60 bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Local transactions
                </span>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                  <Database className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                  {entries.length}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  record{entries.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600/70">
                <Sparkles className="h-3 w-3" />
                Stored on this device
              </div>
            </div>
          </Card>

          {/* Export status */}
          <Card
            className={`group relative overflow-hidden p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
              exported
                ? "border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 hover:shadow-emerald-500/10"
                : "border-amber-100/60 bg-gradient-to-br from-white via-amber-50/50 to-orange-50/50 hover:shadow-amber-500/10"
            }`}
          >
            <div
              className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${
                exported
                  ? "bg-gradient-to-br from-emerald-400/20 to-teal-400/20"
                  : "bg-gradient-to-br from-amber-400/20 to-orange-400/20"
              }`}
            />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    exported ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  Export status
                </span>
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg shadow-md ${
                    exported
                      ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                      : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
                  }`}
                >
                  {exported ? (
                    <ShieldCheck className="h-4 w-4 text-white" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
              <div className="mt-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white shadow-sm ${
                    exported
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30"
                  }`}
                >
                  {exported ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ready to clear
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Export required
                    </>
                  )}
                </span>
              </div>
              <div
                className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${
                  exported ? "text-emerald-700/70" : "text-amber-700/70"
                }`}
              >
                {exported ? "Clearing is unlocked" : "Clear local storage is locked"}
              </div>
            </div>
          </Card>

          {/* Waiting to sync */}
          <Card
            className={`group relative overflow-hidden p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
              pending > 0
                ? "border-amber-100/60 bg-gradient-to-br from-white via-amber-50/50 to-orange-50/50 hover:shadow-amber-500/10"
                : "border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 hover:shadow-emerald-500/10"
            }`}
          >
            <div
              className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${
                pending > 0
                  ? "bg-gradient-to-br from-amber-400/20 to-orange-400/20"
                  : "bg-gradient-to-br from-emerald-400/20 to-teal-400/20"
              }`}
            />
            <div className="relative">
              <div className="flex items-start justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    pending > 0 ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  Waiting to sync
                </span>
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg shadow-md ${
                    pending > 0
                      ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30"
                      : "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                  }`}
                >
                  {pending > 0 ? (
                    <Clock className="h-4 w-4 text-white" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className={`bg-clip-text text-4xl font-extrabold tabular-nums text-transparent ${
                    pending > 0
                      ? "bg-gradient-to-r from-amber-600 to-orange-600"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600"
                  }`}
                >
                  {pending}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  sale{pending === 1 ? "" : "s"}
                </span>
              </div>
              <div
                className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${
                  pending > 0 ? "text-amber-700/70" : "text-emerald-700/70"
                }`}
              >
                {pending > 0
                  ? "Sync before clearing storage"
                  : "All sales synced to the cloud"}
              </div>
            </div>
          </Card>
        </div>

        {/* Export panel */}
        <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          {/* Tri-color top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

          <div className="p-6">
            {/* Panel header */}
            <div className="mb-5 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                <Download className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Choose an export format</h2>
                <p className="text-[11px] text-slate-500">
                  Excel and Word open in compatible office applications. PDF uses the browser print
                  dialog.
                </p>
              </div>
            </div>

            {/* Date range filter */}
            <div className="relative mb-5 overflow-hidden rounded-xl border border-indigo-100/60 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-orange-50/40 p-4">
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-2xl" />
              <div className="relative flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                    <Calendar className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      Date range
                    </div>
                    <div className="text-[10px] text-slate-500">Optional filter</div>
                  </div>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setExported(false);
                    }}
                    aria-label="Export from date"
                    className="w-auto border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="text-xs font-semibold text-slate-400">→</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setExported(false);
                    }}
                    aria-label="Export to date"
                    className="w-auto border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {(dateFrom || dateTo) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm">
                      <Sparkles className="h-3 w-3 text-indigo-500" />
                      {filteredEntries.length} of {entries.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Format tiles */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {exportFormats.map((fmt) => {
                const Icon = fmt.icon;
                return (
                  <button
                    key={fmt.key}
                    onClick={() => exportFile(fmt.key)}
                    disabled={!entries.length}
                    className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${fmt.tint}`}
                  >
                    <div
                      className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${fmt.gradient} opacity-10 blur-xl transition-opacity group-hover:opacity-20`}
                    />
                    <div className="relative">
                      <div className="flex items-start justify-between">
                        <div
                          className={`grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${fmt.gradient} shadow-md ${fmt.shadow}`}
                        >
                          <Icon className="h-4.5 w-4.5 text-white" />
                        </div>
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          {fmt.ext}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="text-sm font-bold text-slate-900">{fmt.label}</div>
                        <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
                          {fmt.desc}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-indigo-600">
                        <Download className="h-3 w-3" />
                        Export
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Danger zone */}
            <div
              className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
                canClear
                  ? "border-rose-200/60 bg-gradient-to-r from-rose-50/60 via-red-50/40 to-rose-50/60"
                  : "border-slate-200 bg-gradient-to-r from-slate-50 via-slate-50/50 to-slate-50"
              }`}
            >
              <div
                className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${
                  canClear
                    ? "bg-gradient-to-br from-rose-400/20 to-red-400/20"
                    : "bg-gradient-to-br from-slate-300/20 to-slate-400/20"
                }`}
              />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg shadow-md ${
                      canClear
                        ? "bg-gradient-to-br from-rose-500 to-red-500 shadow-rose-500/30"
                        : "bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20"
                    }`}
                  >
                    {canClear ? (
                      <Trash2 className="h-4 w-4 text-white" />
                    ) : (
                      <Lock className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-bold ${
                          canClear ? "text-rose-900" : "text-slate-700"
                        }`}
                      >
                        Clear local storage
                      </h3>
                      {!canClear && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          <Lock className="h-2.5 w-2.5" />
                          Locked
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1 max-w-md text-[11px] ${
                        canClear ? "text-rose-700/80" : "text-slate-500"
                      }`}
                    >
                      Clearing removes all local transaction records from this device. It is locked
                      until an export completes and every queued sale has synced to the cloud. This
                      action cannot be undone.
                    </p>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  onClick={clearAfterExport}
                  disabled={!canClear}
                  className={
                    canClear
                      ? "bg-gradient-to-r from-rose-600 to-red-600 shadow-md shadow-rose-500/30 hover:shadow-lg hover:shadow-rose-500/40"
                      : ""
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear local storage
                </Button>
              </div>

              {/* Lock reason strip */}
              {!canClear && (
                <div className="relative mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/70 p-2.5">
                  <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="text-[11px] font-medium text-slate-500">
                    Unlock by completing these first:
                  </span>
                  {!exported && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Export required
                    </span>
                  )}
                  {pending > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      <Clock className="h-2.5 w-2.5" />
                      {pending} sale{pending === 1 ? "" : "s"} pending sync
                    </span>
                  )}
                  {exported && pending === 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      All conditions met
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
