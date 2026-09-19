import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Settings,
  Save,
  RotateCcw,
  Download,
  Eye,
  EyeOff,
  Timer,
  Sparkles,
  HardDrive,
  ShieldAlert,
  ShoppingBag,
  Coins,
  Percent,
  PackageCheck,
  UserCog,
  Store,
  BadgeCheck,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useShowInstallButton } from "@/hooks/use-app-prefs";
import { runTransactionReset } from "@/lib/transaction-reset";
import { computeSalesToday, setSalesTodayMarker } from "@/lib/sales-today";
import { readLog } from "@/lib/transaction-log";
import { recordResetLog } from "@/lib/reset-logs";

export const Route = createFileRoute("/_authenticated/manager/settings")({
  component: ManagerSettingsPage,
});

const SETTINGS_KEY = "tillpoint.manager.settings.v1";

type SettingsForm = {
  shopName: string;
  currency: string;
  taxRate: string;
  lowStockDefault: string;
  managerName: string;
  managerTitle: string;
  cashierName: string;
  cashierTitle: string;
};

const defaults: SettingsForm = {
  shopName: "Green Shop",
  currency: "USD",
  taxRate: "0",
  lowStockDefault: "10",
  managerName: "Mr Pride Tatire",
  managerTitle: "Manager",
  cashierName: "Cashier",
  cashierTitle: "Cashier",
};

function readSettings(): SettingsForm {
  try {
    return {
      ...defaults,
      ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<SettingsForm>),
    };
  } catch {
    return defaults;
  }
}

function ManagerSettingsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<SettingsForm>(defaults);
  const [saving, setSaving] = useState(false);
  const [showInstall, setShowInstall] = useShowInstallButton();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSalesReset, setConfirmSalesReset] = useState(false);
  const [salesToday, setSalesToday] = useState({ total: 0, count: 0 });
  const [resetting, setResetting] = useState(false);
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });

  useEffect(() => {
    setSalesToday(computeSalesToday(readLog()));
  }, [confirmSalesReset]);

  async function resetSalesToday() {
    const snapshot = computeSalesToday(readLog());
    setSalesTodayMarker();
    await recordResetLog({
      kind: "sales_today_reset",
      label: "Sales today reset",
      details: `Cleared the till "Sales today" counter (${snapshot.count} sale${snapshot.count === 1 ? "" : "s"}). Sales history was kept.`,
      amount: snapshot.total,
      count: snapshot.count,
      actor: profile?.full_name ?? "Manager",
    });
    setSalesToday({ total: 0, count: 0 });
    setConfirmSalesReset(false);
    toast.success("Sales today counter reset to zero.");
  }

  async function resetTransactions() {
    setResetting(true);
    const snapshot = computeSalesToday(readLog());
    const cleared = readLog();
    try {
      await runTransactionReset(null);
      setSalesTodayMarker();
      await recordResetLog({
        kind: "transaction_reset",
        label: "Transaction reset",
        details:
          "Cleared all sales, sale items and the transaction log; every variant returned to its registered peak quantity.",
        amount: cleared.reduce((sum, e) => sum + Number(e.total), 0) || snapshot.total,
        count: cleared.length,
        actor: profile?.full_name ?? "Manager",
      });
      ["sales", "sales-by-day", "stock", "products", "cashier", "manager", "daily-cash"].forEach(
        (key) => qc.invalidateQueries({ queryKey: [key] }),
      );
      toast.success("Transactions cleared and every product returned to its registered peak quantity.");
      setConfirmReset(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transaction reset failed.");
    } finally {
      setResetting(false);
    }
  }
  useEffect(() => {
    void navigator.storage
      ?.estimate()
      .then(({ usage = 0, quota = 0 }) => setStorage({ usage, quota }));
  }, []);

  useEffect(() => setForm(readSettings()), []);

  useEffect(() => {
    if (!profile?.full_name) return;
    setForm((current) =>
      current.managerName === profile.full_name
        ? current
        : { ...current, managerName: profile.full_name },
    );
  }, [profile?.full_name]);

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const taxRate = Number(form.taxRate);
    const lowStockDefault = Number(form.lowStockDefault);
    if (!form.shopName.trim() || !form.currency.trim() || taxRate < 0 || lowStockDefault < 0) {
      toast.error("Check the settings values and try again.");
      return;
    }
    setSaving(true);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(form));
      window.dispatchEvent(
        new StorageEvent("storage", { key: SETTINGS_KEY, newValue: JSON.stringify(form) }),
      );
      if (profile?.id && form.managerName.trim()) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: form.managerName.trim() })
          .eq("id", profile.id);
        if (error) throw error;
        qc.invalidateQueries();
      }
      toast.success("Settings saved.");
    } catch {
      toast.error("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  const storagePct = storage.quota
    ? Math.min(100, (storage.usage / storage.quota) * 100)
    : 0;

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
        <header className="mb-8 flex items-start gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
            <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
              <Settings className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Manager settings
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Configure the local checkout defaults for this shop.
            </p>
          </div>
        </header>

        {/* ================= DANGER ZONE ================= */}
        <div className="mb-6 max-w-2xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-rose-300/60 to-transparent" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/60 bg-gradient-to-r from-rose-50 to-orange-50 px-2.5 py-1">
              <ShieldAlert className="h-3 w-3 text-rose-600" />
              <span className="bg-gradient-to-r from-rose-700 to-orange-700 bg-clip-text text-[10px] font-bold uppercase tracking-wider text-transparent">
                Danger zone
              </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-rose-300/60 to-transparent" />
          </div>

          {/* Transaction Reset */}
          <Card className="relative mb-4 overflow-hidden border-rose-200/60 bg-gradient-to-br from-white via-rose-50/40 to-red-50/40 p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-rose-400/15 to-red-400/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-red-500 shadow-md shadow-rose-500/30">
                  <Trash2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-rose-700">Transaction Reset</div>
                  <div className="text-[11px] text-rose-700/70">Permanent — cannot be undone</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Clears the Sales and Transaction Log pages back to zero and returns every product
                variant to its own highest registered peak quantity. Products, suppliers, expenses
                and cash records are never deleted. Export your sales first if you need a copy.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  asChild
                  className="border-rose-200 bg-white hover:border-rose-300 hover:bg-rose-50"
                >
                  <a href="/manager/sales">
                    <Download className="mr-2 h-4 w-4" /> Export sales first
                  </a>
                </Button>
                <Button
                  onClick={() => setConfirmReset(true)}
                  disabled={resetting}
                  className="bg-gradient-to-r from-rose-600 to-red-600 shadow-md shadow-rose-500/30 hover:shadow-lg hover:shadow-rose-500/40"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {resetting ? "Resetting..." : "Transaction Reset"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Sales today Reset */}
          <Card className="relative overflow-hidden border-orange-200/60 bg-gradient-to-br from-white via-orange-50/50 to-amber-50/50 p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/30">
                  <Timer className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-orange-700">Sales today reset</div>
                  <div className="text-[11px] text-orange-700/70">Non-destructive counter restart</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Sets the cashier&apos;s &quot;Sales today&quot; total back to zero for a fresh shift.
                Sales records, stock and reports are untouched — only the till counter restarts.
              </p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-orange-200/60 bg-white/70 px-3 py-2">
                <Coins className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-[11px] font-semibold text-orange-700">
                  Current counter:
                </span>
                <span className="bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-sm font-extrabold tabular-nums text-transparent">
                  {salesToday.total.toFixed(2)}
                </span>
                <span className="text-[11px] text-orange-700/70">
                  ({salesToday.count} sale{salesToday.count === 1 ? "" : "s"})
                </span>
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setConfirmSalesReset(true)}
                  className="border-orange-200 bg-white hover:border-orange-300 hover:bg-orange-50"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Sales today Reset
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* ================= CONFIRMATION DIALOGS ================= */}
        <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
          <AlertDialogContent className="border-rose-100 bg-gradient-to-b from-white to-rose-50/40">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-red-500 shadow-md shadow-rose-500/30">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <AlertDialogTitle className="bg-gradient-to-r from-rose-700 to-red-700 bg-clip-text text-transparent">
                  Are you absolutely sure?
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-2">
                This permanently deletes every recorded transaction and resets all product
                quantities to their registered peak. Products are kept. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={resetting}
                onClick={(e) => {
                  e.preventDefault();
                  void resetTransactions();
                }}
                className="bg-gradient-to-r from-rose-600 to-red-600 shadow-md shadow-rose-500/30 hover:shadow-lg hover:shadow-rose-500/40"
              >
                {resetting ? "Resetting..." : "Yes, reset transactions"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmSalesReset} onOpenChange={setConfirmSalesReset}>
          <AlertDialogContent className="border-orange-100 bg-gradient-to-b from-white to-orange-50/40">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/30">
                  <Timer className="h-5 w-5 text-white" />
                </div>
                <AlertDialogTitle className="bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-transparent">
                  Reset the till counter?
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-2">
                This resets the &quot;Sales today&quot; amount shown on the cashier dashboard back
                to zero. Sales history is kept and the reset is recorded on the Reset Logs page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void resetSalesToday();
                }}
                className="bg-gradient-to-r from-orange-600 to-amber-600 shadow-md shadow-orange-500/30 hover:shadow-lg hover:shadow-orange-500/40"
              >
                Yes, reset Sales today
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ================= PREFERENCES ================= */}
        <div className="mb-6 max-w-2xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-300/60 to-transparent" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-purple-50 px-2.5 py-1">
              <Sparkles className="h-3 w-3 text-indigo-600" />
              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-[10px] font-bold uppercase tracking-wider text-transparent">
                Preferences
              </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-indigo-300/60 to-transparent" />
          </div>

          {/* Install button toggle */}
          <Card className="relative mb-4 overflow-hidden border-indigo-100/60 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-2xl" />
            <div className="relative flex items-start justify-between gap-6">
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg shadow-md transition-all ${
                    showInstall
                      ? "bg-gradient-to-br from-indigo-500 to-purple-500 shadow-indigo-500/30"
                      : "bg-slate-200 shadow-slate-300/20"
                  }`}
                >
                  {showInstall ? (
                    <Eye className="h-4 w-4 text-white" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    Show the &quot;Install app&quot; button on the home page
                  </div>
                  <p className="mt-1 max-w-xl text-xs text-slate-500">
                    Turn off once every device has installed TillPoint to keep the welcome page
                    clean.
                  </p>
                </div>
              </div>
              <Switch
                checked={showInstall}
                onCheckedChange={(v) => {
                  setShowInstall(v);
                  toast.success(v ? "Install button is visible" : "Install button is hidden");
                }}
              />
            </div>
          </Card>

          {/* Storage monitor */}
          <Card className="relative overflow-hidden border-blue-100/60 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50/40 p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400/15 to-cyan-400/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md shadow-blue-500/30">
                  <HardDrive className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-blue-800">
                    Offline database storage monitor
                  </div>
                  <div className="text-[11px] text-blue-700/70">
                    Cached app storage used for offline checkout
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Storage used
                  </span>
                  <span className="bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-sm font-extrabold tabular-nums text-transparent">
                    {storagePct.toFixed(1)}%
                  </span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-blue-100/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 bg-[length:200%_100%] transition-all duration-500"
                    style={{ width: `${Math.max(2, storagePct)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {storage.quota
                    ? `${(storage.usage / 1048576).toFixed(1)} MB used of ${(storage.quota / 1048576).toFixed(1)} MB available`
                    : "Storage estimate unavailable"}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ================= SHOP CONFIGURATION ================= */}
        <div className="mb-6 max-w-2xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-300/60 to-transparent" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-purple-50 px-2.5 py-1">
              <Store className="h-3 w-3 text-indigo-600" />
              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-[10px] font-bold uppercase tracking-wider text-transparent">
                Shop configuration
              </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-indigo-300/60 to-transparent" />
          </div>

          <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
            {/* Tri-color top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

            <div className="p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Shop name */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="shopName" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <ShoppingBag className="h-3.5 w-3.5 text-indigo-500" />
                    Shop name
                  </Label>
                  <Input
                    id="shopName"
                    value={form.shopName}
                    onChange={(e) => update("shopName", e.target.value)}
                    className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <Label htmlFor="currency" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Coins className="h-3.5 w-3.5 text-indigo-500" />
                    Currency
                  </Label>
                  <Input
                    id="currency"
                    value={form.currency}
                    onChange={(e) => update("currency", e.target.value.toUpperCase())}
                    maxLength={3}
                    className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Tax rate */}
                <div className="space-y-2">
                  <Label htmlFor="taxRate" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Percent className="h-3.5 w-3.5 text-indigo-500" />
                    Tax rate (%)
                  </Label>
                  <div className="relative">
                    <Input
                      id="taxRate"
                      value="0"
                      readOnly
                      disabled
                      className="border-slate-200 bg-slate-50 pr-16 text-slate-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">
                      Tax free
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    This shop operates tax free — prices and receipts are the final amount.
                  </p>
                </div>

                {/* Low stock threshold */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="lowStockDefault" className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <PackageCheck className="h-3.5 w-3.5 text-indigo-500" />
                    Default low-stock threshold
                  </Label>
                  <Input
                    id="lowStockDefault"
                    type="number"
                    min="0"
                    value={form.lowStockDefault}
                    onChange={(e) => update("lowStockDefault", e.target.value)}
                    className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[11px] text-slate-500">
                    Products at or below this quantity trigger a low-stock alert.
                  </p>
                </div>
              </div>

              {/* Role identities */}
              <div className="mt-6 border-t border-indigo-100/60 pt-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/25">
                    <UserCog className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Role identities</h2>
                    <p className="text-[11px] text-slate-500">
                      These names and titles appear across the manager and cashier workspaces.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="managerName"
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                    >
                      <BadgeCheck className="h-3.5 w-3.5 text-indigo-500" />
                      Manager name
                    </Label>
                    <Input
                      id="managerName"
                      value={form.managerName}
                      onChange={(e) => update("managerName", e.target.value)}
                      className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="managerTitle"
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                    >
                      <BadgeCheck className="h-3.5 w-3.5 text-indigo-500" />
                      Manager title
                    </Label>
                    <Input
                      id="managerTitle"
                      value={form.managerTitle}
                      onChange={(e) => update("managerTitle", e.target.value)}
                      className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="cashierName"
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                    >
                      <BadgeCheck className="h-3.5 w-3.5 text-orange-500" />
                      Cashier name
                    </Label>
                    <Input
                      id="cashierName"
                      value={form.cashierName}
                      onChange={(e) => update("cashierName", e.target.value)}
                      className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="cashierTitle"
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                    >
                      <BadgeCheck className="h-3.5 w-3.5 text-orange-500" />
                      Cashier title
                    </Label>
                    <Input
                      id="cashierTitle"
                      value={form.cashierTitle}
                      onChange={(e) => update("cashierTitle", e.target.value)}
                      className="border-indigo-100 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="mt-6 flex justify-end border-t border-indigo-100/60 pt-5">
                <Button
                  onClick={() => void save()}
                  disabled={saving}
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] px-6 shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save settings"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
