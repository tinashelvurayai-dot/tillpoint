import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BookOpen,
  Eye,
  EyeOff,
  Sparkles,
  Users,
  ShoppingCart,
  GraduationCap,
  Info,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { CashierManualContent } from "./cashier";

export const Route = createFileRoute("/_authenticated/manager/manuals")({
  component: ManualsPage,
});

function Section({
  title,
  children,
  index,
}: {
  title: string;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <section className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white/60 p-4 transition-all hover:border-indigo-200 hover:shadow-sm">
      <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400/5 to-purple-400/5 blur-xl transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2.5">
          {index !== undefined && (
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-[11px] font-bold text-white shadow-sm shadow-indigo-500/25">
              {index}
            </div>
          )}
          <h3 className="bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-sm font-bold text-transparent">
            {title}
          </h3>
        </div>
        <div className="space-y-2 pl-0 text-[13px] leading-relaxed text-slate-600 sm:pl-9">
          {children}
        </div>
      </div>
    </section>
  );
}

function ManagerManualContent() {
  let counter = 0;
  const next = () => ++counter;

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <Section title="How the system fits together" index={next()}>
        <p>
          TillPoint has one catalogue and one sales ledger shared by every screen. Products create
          variants, variants create stock rows, cashier sales consume stock and write transactions,
          and every report page (Dashboard, Sales, Daily Cash, Expenses &amp; Profit, Forecast,
          Alerts) simply reads that same data from a different angle. Change something in Products
          or Stock and every other page updates immediately.
        </p>
        <p className="rounded-lg border border-indigo-100/60 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-orange-50/40 p-2.5 text-[12px] font-medium text-slate-700">
          Flow: <span className="font-bold text-indigo-700">Suppliers</span> →{" "}
          <span className="font-bold text-indigo-700">Stock-In Records</span> →{" "}
          <span className="font-bold text-indigo-700">Stock</span> →{" "}
          <span className="font-bold text-purple-700">Cashier till</span> →{" "}
          <span className="font-bold text-purple-700">Sales</span> →{" "}
          <span className="font-bold text-orange-700">Daily Cash + Expenses</span> →{" "}
          <span className="font-bold text-orange-700">Profit &amp; Forecast</span>, with Orders and
          Low Stock Alerts feeding back into Stock-In.
        </p>
      </Section>

      <Section title="Dashboard (/manager)" index={next()}>
        <p>
          Today&apos;s revenue, transaction count, active products and low-stock alerts, plus a live
          feed of recent sales with the cashier name. Revenue comes from the Sales ledger, the alert
          count comes from Stock (any variant at or below its alert level, now set to 10).
        </p>
      </Section>

      <Section title="Products" index={next()}>
        <p>
          Create a product with name, category and photo (camera or upload), then add its variants -
          size, flavour or colour - each with its own selling price, SKU and opening stock. Deleting
          or deactivating a variant removes it from the cashier grid but keeps historical sales
          intact. Prices set here are the prices the till charges.
        </p>
      </Section>

      <Section title="Stock" index={next()}>
        <p>
          Every variant is in stock by default and cashiers can sell without a quantity check. When
          a shelf runs out the cashier presses <span className="font-semibold text-indigo-700">Out of Stock</span> on
          the tile; it is flagged instantly and blocked from sale. Managers clear a single flag with{" "}
          <span className="font-semibold text-indigo-700">Stock Available</span>, or clear everything with{" "}
          <span className="font-semibold text-indigo-700">Stock Available (All)</span> after a restock. Use the{" "}
          <span className="font-semibold text-indigo-700">+</span> button to add the units that were brought in - you
          never recount the whole shop. The low-stock alert level is 10 units for every variant.
        </p>
      </Section>

      <Section title="Stock-In Records" index={next()}>
        <p>
          The delivery register. Pick the product/variant using the smart search bar (type any part
          of a product name, variant or category), choose the supplier, enter units received, the
          unit buying price and the date. Saving adds the units to Stock automatically and stores
          the buying cost, which is what makes profit reporting accurate. Records can be edited and
          the stock level corrects itself. Filter by supplier, text or date range and export.
        </p>
      </Section>

      <Section title="Suppliers &amp; Purchase Orders" index={next()}>
        <p>
          Supplier contacts and purchase records. Suppliers chosen here appear in the Stock-In
          Records supplier list and in supplier cost totals. Use the pencil icon to edit a supplier
          and the red <span className="font-semibold text-rose-600">bin icon</span> to delete one you no longer use;
          you are asked to confirm first. A supplier that is still attached to a purchase order or a
          stock-in record cannot be deleted - cancel or reassign those first, so your buying history
          is never lost.
        </p>
      </Section>

      <Section title="Low Stock Alerts" index={next()}>
        <p>
          Every variant at or below 10 units, ranked by urgency. This page is the shortlist for your
          next purchase order.
        </p>
      </Section>

      <Section title="Sales" index={next()}>
        <p>
          The full transaction ledger: date, cashier name, payment method, item count, status and
          total. Search, filter by date and use <span className="font-semibold text-indigo-700">Export CSV</span> for
          accounting or backup. The cards at the top show{" "}
          <span className="font-semibold text-indigo-700">gross revenue</span>, the value{" "}
          <span className="font-semibold text-rose-600">refunded or voided</span>, and{" "}
          <span className="font-semibold text-emerald-700">net revenue</span> (gross minus reversals).
          Reversed sales stay visible with a struck-through total but are excluded from every money
          figure, so the ledger, the Dashboard, Daily Cash and Profit all agree.
        </p>
      </Section>

      <Section title="Refunds &amp; Voids" index={next()}>
        <p>
          Reverse a mistaken sale here. A <span className="font-semibold text-indigo-700">refund</span> returns money
          to the customer; a <span className="font-semibold text-rose-600">void</span> cancels a sale entered by
          mistake. Leave <span className="font-semibold text-emerald-700">Return items to stock</span> on and the sold
          quantities go straight back into Stock. Every reversal is written to the reversal history
          with reason, amount and date, the sale is marked refunded or voided and it drops out of
          Today&apos;s sales, Sales net revenue, cash expected in the drawer and Profit - so refunds
          and sales always balance.
        </p>
        <p className="rounded-lg border border-emerald-100/60 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 p-2.5 text-[12px]">
          <span className="font-semibold text-emerald-800">Auto-approve refunds</span>: switch this on when you are in
          a meeting or away from the shop. Cashiers then use their own Refunds page on the till and
          the reversal goes through immediately under their name. Switch it off and the till buttons
          are disabled - only you can reverse a sale. The rule is enforced in the database, not just
          on screen, so it cannot be bypassed.
        </p>
      </Section>

      <Section title="Daily Cash Collection" index={next()}>
        <p>
          Record the cash physically collected each day. The page balances it for you:{" "}
          <span className="font-semibold text-indigo-700">
            cash sales for the day minus expenses paid out that day = the amount expected in the
            drawer
          </span>
          . The variance card shows any shortfall or overage, so a day where money was spent on
          expenses still balances correctly.
        </p>
      </Section>

      <Section title="Expenses &amp; Profit" index={next()}>
        <p>
          Log every business expense with a category and date. Expenses are subtracted from sales
          revenue for the profit view and from the day&apos;s expected cash on the Daily Cash page,
          so both screens always agree.
        </p>
      </Section>

      <Section title="Forecast" index={next()}>
        <p>
          Projects demand from recent sales history so you can order ahead. Accuracy depends on
          having real sales recorded - a fresh Transaction Reset restarts the history.
        </p>
      </Section>

      <Section title="Staff / Cashiers" index={next()}>
        <p>
          Everyone with access, with editable names, IDs and active status. Cashier mode opens
          without a password from the welcome page for shared counter devices; manager access is
          behind the hidden logo taps and two access codes.
        </p>
      </Section>

      <Section title="Transaction Log, Sync Queue and Shift Report" index={next()}>
        <p>
          The Transaction Log is the device&apos;s own copy of every sale, including offline ones,
          with receipt reprint and CSV export. The Sync Queue shows offline sales still waiting to
          upload and lets you retry. The Shift Report totals a cashier&apos;s shift for handover.
          Leaving these pages keeps you signed in as manager.
        </p>
      </Section>

      <Section title="Settings" index={next()}>
        <p>
          Shop name, currency, tax rate, default low-stock threshold and role identities, plus the
          storage monitor for this device.
        </p>
        <p className="rounded-lg border border-orange-100/60 bg-gradient-to-r from-orange-50/60 to-amber-50/40 p-2.5 text-[12px]">
          <span className="font-semibold text-orange-800">Transaction Reset</span> clears the Sales and Transaction
          Log pages back to zero and returns every product quantity to its highest registered peak
          of 40 units. Products, suppliers, expenses and cash records are kept. It asks &quot;Are
          you sure?&quot; before anything is deleted - export your sales first.
        </p>
        <p>
          <span className="font-semibold text-indigo-700">Install app button</span> - a switch that shows or hides
          the &quot;Install app&quot; button on the home page once all devices are set up.
        </p>
      </Section>

      <Section title="Manuals" index={next()}>
        <p>
          This page. The switch above shows or hides the Manual button inside the cashier dashboard.
        </p>
      </Section>

      <Section title="Offline behaviour and installation" index={next()}>
        <p>
          Install from Chrome so the app sits alongside other device apps. Once the cashier
          dashboard has loaded online at least once, cashiers can sell fully offline - sales queue
          on the device and sync automatically when the connection returns, then appear in Sales and
          on the Dashboard.
        </p>
      </Section>

      <Section title="Handover agreement" index={next()}>
        <p>
          The Agreement page holds the signed POS Software Development, Handover &amp; Acceptance
          Agreement and can be downloaded as a document at any time.
        </p>
      </Section>
    </div>
  );
}

function ManualsPage() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["manager", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("show_cashier_manual")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data ?? { show_cashier_manual: true };
    },
  });

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("id", true)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase
          .from("app_settings")
          .insert({ id: true, show_cashier_manual: next });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .update({ show_cashier_manual: next, updated_at: new Date().toISOString() })
          .eq("id", true);
        if (error) throw error;
      }
    },
    onSuccess: (_d, next) => {
      toast.success(next ? "Cashier manual is now visible" : "Cashier manual is now hidden");
      qc.invalidateQueries({ queryKey: ["manager", "settings"] });
      qc.invalidateQueries({ queryKey: ["cashier", "settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enabled = settings.data?.show_cashier_manual !== false;

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
                <BookOpen className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                User manuals
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Reference guides for every role, and controls for what your cashiers see.
              </p>
            </div>
          </div>
        </header>

        {/* Visibility toggle card */}
        <Card
          className={`relative mb-8 overflow-hidden border p-5 shadow-sm transition-all duration-300 ${
            enabled
              ? "border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40"
              : "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/40"
          }`}
        >
          <div
            className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl ${
              enabled
                ? "bg-gradient-to-br from-emerald-400/20 to-teal-400/20"
                : "bg-gradient-to-br from-slate-300/20 to-slate-400/20"
            }`}
          />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-md ${
                  enabled
                    ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                    : "bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-500/20"
                }`}
              >
                {enabled ? (
                  <Eye className="h-5 w-5 text-white" />
                ) : (
                  <EyeOff className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <div
                  className={`flex items-center gap-2 text-sm font-bold ${
                    enabled ? "text-emerald-900" : "text-slate-700"
                  }`}
                >
                  {enabled ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Cashier manual is visible
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 text-slate-500" />
                      Cashier manual is hidden
                    </>
                  )}
                </div>
                <p
                  className={`mt-1 max-w-xl text-[12px] ${
                    enabled ? "text-emerald-700/80" : "text-slate-500"
                  }`}
                >
                  When on, cashiers see a{" "}
                  <span className="font-semibold">Manual button</span> in the top bar of their
                  dashboard that opens a step-by-step guide. Turn off to keep the cashier screen
                  focused on selling only.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  enabled ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                {enabled ? "On" : "Off"}
              </span>
              <Switch
                checked={enabled}
                disabled={toggle.isPending || settings.isLoading}
                onCheckedChange={(v) => toggle.mutate(v)}
              />
            </div>
          </div>
        </Card>

        {/* Manuals reader */}
        <Card className="relative overflow-hidden border-indigo-100/60 bg-white/80 shadow-sm backdrop-blur-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
          <div className="p-5">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/25">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Read the manuals</h2>
                <p className="text-[11px] text-slate-500">
                  Step-by-step references for each role
                </p>
              </div>
            </div>

            <Tabs defaultValue="manager">
              <TabsList className="grid w-full max-w-md grid-cols-2 border border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/40 p-1">
                <TabsTrigger
                  value="manager"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30"
                >
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Manager manual
                </TabsTrigger>
                <TabsTrigger
                  value="cashier"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/30"
                >
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                  Cashier manual
                </TabsTrigger>
              </TabsList>
              <TabsContent value="manager" className="mt-6">
                <ManagerManualContent />
              </TabsContent>
              <TabsContent value="cashier" className="mt-6">
                <CashierManualContent />
              </TabsContent>
            </Tabs>
          </div>
        </Card>

        {/* Info footer */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-white/60 p-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="text-[11px] text-slate-600">
            The manual visibility setting is stored in the cloud and applies to every device. The
            cashier manual opens as a dialog from the till, and the manager manual lives on this
            page.
          </p>
        </div>
      </div>
    </div>
  );
}
