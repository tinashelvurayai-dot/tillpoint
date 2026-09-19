import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ScrollText,
  Download,
  Sparkles,
  History,
  Clock,
  User,
  Database,
  RotateCcw,
  Calendar,
  Info,
  FileDown,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { readResetLogs, subscribeResetLogs, type ResetLogEntry } from "@/lib/reset-logs";

export const Route = createFileRoute("/_authenticated/manager/logs")({
  component: LogsPage,
  head: () => ({
    meta: [
      { title: "Reset Logs · TillPoint Manager" },
      {
        name: "description",
        content:
          "Audit trail of every transaction and sales-today reset performed on this till, with date, time, amount and item counts.",
      },
      { property: "og:title", content: "Reset Logs · TillPoint Manager" },
      {
        property: "og:description",
        content: "Every reset performed on this till with date, time and amounts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LogsPage() {
  const [logs, setLogs] = useState<ResetLogEntry[]>([]);
  useEffect(() => {
    const read = () => setLogs(readResetLogs());
    read();
    return subscribeResetLogs(read);
  }, []);

  function exportCsv() {
    const rows = [
      ["When", "Action", "Details", "Amount cleared", "Records cleared", "By"],
      ...logs.map((l) => [
        formatDate(l.created_at),
        l.label,
        l.details,
        l.amount === null ? "" : String(l.amount),
        l.count === null ? "" : String(l.count),
        l.actor,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `reset-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalAmountCleared = logs.reduce((sum, l) => sum + (l.amount ?? 0), 0);
  const totalRecordsCleared = logs.reduce((sum, l) => sum + (l.count ?? 0), 0);

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
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                <ScrollText className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Reset logs
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Every Transaction Reset and Sales-today Reset performed from Settings, with the date,
                time, what was cleared and the amount involved.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={logs.length === 0}
            className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </header>

        {/* Summary stats */}
        {logs.length > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="group relative overflow-hidden border-indigo-100/60 bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10">
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Total resets
                  </span>
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                    <RotateCcw className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                    {logs.length}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    event{logs.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600/70">
                  <History className="h-3 w-3" />
                  Full audit trail on this device
                </div>
              </div>
            </Card>

            <Card className="group relative overflow-hidden border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-400/15 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Amount cleared
                  </span>
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30">
                    <Database className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                    {formatCurrency(totalAmountCleared)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700/70">
                  <Sparkles className="h-3 w-3" />
                  Sum across all resets
                </div>
              </div>
            </Card>

            <Card className="group relative overflow-hidden border-orange-100/60 bg-gradient-to-br from-white via-orange-50/50 to-amber-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/10">
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
                    Records cleared
                  </span>
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/30">
                    <ScrollText className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent">
                    {totalRecordsCleared}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    record{totalRecordsCleared === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-orange-700/70">
                  <Database className="h-3 w-3" />
                  Transactions removed
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Logs table */}
        <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          {/* Tri-color top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

          <div className="p-4 sm:p-5">
            {/* Panel header */}
            <div className="mb-4 flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                <History className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Audit trail</h2>
                <p className="text-[11px] text-slate-500">
                  Chronological log of all resets performed
                </p>
              </div>
            </div>

            <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-indigo-50/95 via-purple-50/90 to-orange-50/90 text-left text-xs uppercase tracking-wider backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3.5 font-bold text-indigo-700">When</th>
                    <th className="px-4 py-3.5 font-bold text-indigo-700">Action</th>
                    <th className="px-4 py-3.5 font-bold text-indigo-700">Details</th>
                    <th className="px-4 py-3.5 text-right font-bold text-indigo-700">
                      Amount cleared
                    </th>
                    <th className="px-4 py-3.5 text-right font-bold text-indigo-700">Records</th>
                    <th className="px-4 py-3.5 font-bold text-indigo-700">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length ? (
                    logs.map((l) => (
                      <tr
                        key={l.id}
                        className="group transition-colors hover:bg-gradient-to-r hover:from-indigo-50/50 hover:via-purple-50/30 hover:to-transparent"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm shadow-indigo-500/20">
                              <Calendar className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-700">
                                {formatDate(l.created_at)}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(l.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-md border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-2 py-0.5 text-xs font-bold text-orange-700">
                            <RotateCcw className="mr-1 h-3 w-3" />
                            {l.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">{l.details}</td>
                        <td className="px-4 py-3.5 text-right">
                          {l.amount === null ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <span className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-sm font-bold tabular-nums text-transparent">
                              {formatCurrency(l.amount)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {l.count === null ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50/60 px-2 py-0.5 text-xs font-bold tabular-nums text-indigo-700">
                              {l.count}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-[10px] font-bold text-white shadow-sm shadow-violet-500/20">
                              {l.actor.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-slate-600">{l.actor}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                            <ScrollText className="h-7 w-7 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              No resets performed yet
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Reset events will appear here once triggered from Settings.
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
            {logs.length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-indigo-100/60 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-orange-50/40 p-3">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <p className="text-xs text-slate-600">
                  This log is stored locally on this device and provides a full audit trail of every
                  reset. Export to CSV to archive records off-device for compliance.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
