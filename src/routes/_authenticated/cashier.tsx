import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOnline } from "@/hooks/use-online";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SignOutButton } from "@/components/sign-out-button";
import { ManagerGateLogo } from "@/components/manager-gate-logo";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import {
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  Minus,
  Package as PackageIcon,
  BookOpen,
  ClipboardList,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock as LockIcon,
  Undo2,
  Menu,
  TrendingUp,
  Wallet,
  Receipt,
} from "lucide-react";
import { enqueueSale, flushQueue, getQueue } from "@/lib/offline-queue";
import {
  appendLog,
  hydrateLogFromIdb,
  subscribeLog,
  type TxLogEntry,
} from "@/lib/transaction-log";
import { computeSalesToday, subscribeSalesTodayMarker } from "@/lib/sales-today";
import { SyncAlertBanner } from "@/components/sync-alert-banner";
import { printReceipt, downloadReceipt, receiptText, receiptNumber } from "@/lib/receipt";
import { runSync } from "@/lib/sync-manager";
import { recordSaleDelta, hydrateStockDeltas } from "@/lib/local-stock";
import { CASHIER_NAME, setMode, isManagerMode } from "@/lib/session-mode";

import { IDB_KEYS, idbGet, idbSet } from "@/lib/offline-db";
import { SyncIndicator } from "@/components/sync-indicator";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { useHideImages } from "@/hooks/use-hide-images";

export const Route = createFileRoute("/_authenticated/cashier")({
  component: CashierScreen,
});

type Variant = {
  id: string;
  variant_name: string;
  size: string | null;
  flavour: string | null;
  price: number;
  image_url: string | null;
  active: boolean;
  product: { id: string; name: string; category: string | null; image_url: string | null } | null;
  stock: { quantity: number; available?: boolean } | null;
};

type CartLine = { variant: Variant; qty: number };
type SyncStatus = "idle" | "syncing" | "synced" | "failed";

const OFFLINE_CACHE_KEY = "tillpoint.cashier.catalog.v1";
const LOGO_URL = "https://i.postimg.cc/Hkq55G3M/Whats-App-Image-2026-09-07-at-9-29-12-AM.jpg";
const INTRO_DURATION_MS = 7000;

function LegendaryLoader({ label = "Till Loading" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Animated grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(129,140,248,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "gridDrift 8s linear infinite",
        }}
      />

      {/* Sweeping light beams */}
      <div
        className="absolute -inset-x-1/2 top-0 h-full w-[200%] opacity-40"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, transparent 0deg, rgba(99,102,241,0.25) 45deg, transparent 90deg, rgba(249,89,34,0.2) 180deg, transparent 270deg)",
          animation: "beamRotate 7s linear infinite",
        }}
      />

      {/* Rotating orbit rings */}
      <div className="absolute h-[520px] w-[520px]" style={{ animation: "spin 7s linear infinite" }}>
        <div className="absolute inset-0 rounded-full border border-indigo-500/20" />
        <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 shadow-[0_0_24px_6px_rgba(129,140,248,0.7)]" />
      </div>
      <div
        className="absolute h-[400px] w-[400px]"
        style={{ animation: "spin 4.5s linear infinite reverse" }}
      >
        <div className="absolute inset-0 rounded-full border border-orange-500/20" />
        <div className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 shadow-[0_0_24px_6px_rgba(249,89,34,0.7)]" />
      </div>
      <div className="absolute h-[300px] w-[300px]" style={{ animation: "spin 3s linear infinite" }}>
        <div className="absolute inset-0 rounded-full border border-purple-500/20" />
        <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-400 to-fuchsia-400 shadow-[0_0_20px_5px_rgba(168,85,247,0.7)]" />
      </div>

      {/* Pulsing halo behind logo */}
      <div
        className="absolute h-[360px] w-[360px] rounded-full bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-orange-500/20 blur-3xl"
        style={{ animation: "haloPulse 2.4s ease-in-out infinite" }}
      />

      {/* Corner brackets */}
      <div className="pointer-events-none absolute inset-8 sm:inset-16">
        {[
          "top-0 left-0 border-t-2 border-l-2",
          "top-0 right-0 border-t-2 border-r-2",
          "bottom-0 left-0 border-b-2 border-l-2",
          "bottom-0 right-0 border-b-2 border-r-2",
        ].map((pos, i) => (
          <div
            key={i}
            className={`absolute h-10 w-10 sm:h-14 sm:w-14 ${pos} rounded-sm border-indigo-400/50`}
            style={{ animation: `cornerPulse 3s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>

      {/* Center: logo + text */}
      <div className="relative flex flex-col items-center gap-8">
        <div
          className="relative"
          style={{ animation: "logoReveal 7s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
        >
          {/* Glow ring behind logo */}
          <div
            className="absolute -inset-6 rounded-full bg-gradient-to-br from-indigo-500/40 via-purple-500/30 to-orange-500/40 blur-2xl"
            style={{ animation: "haloPulse 2.4s ease-in-out infinite" }}
          />

          {/* Logo with gradient border frame */}
          <div className="relative">
            <div
              className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-orange-500 opacity-90 blur-[2px]"
              style={{ animation: "borderSpin 7s linear infinite" }}
            />
            <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-1">
              <img
                src={LOGO_URL}
                alt="Logo"
                className="h-40 w-40 rounded-2xl object-contain sm:h-52 sm:w-52"
                style={{
                  animation: "logoFloat 3.5s ease-in-out infinite",
                  filter: "drop-shadow(0 8px 24px rgba(99,102,241,0.5))",
                }}
              />
              {/* Shimmer sweep across logo */}
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
                  backgroundSize: "250% 100%",
                  animation: "shimmer 2.4s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </div>

        {/* Brand text */}
        <div
          className="flex flex-col items-center gap-2"
          style={{ animation: "fadeUp 7s ease-out 0.9s both" }}
        >
          <div className="bg-gradient-to-r from-indigo-300 via-purple-300 to-orange-300 bg-clip-text text-2xl font-black uppercase tracking-[0.3em] text-transparent sm:text-3xl">
            Cashier
          </div>
          <div className="bg-gradient-to-r from-indigo-400/70 via-purple-400/70 to-orange-400/70 bg-clip-text text-[10px] font-bold uppercase tracking-[0.5em] text-transparent">
            {label}
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-1 w-64 overflow-hidden rounded-full bg-white/10 sm:w-80">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500"
            style={{ animation: "progressFill 7s cubic-bezier(0.65, 0, 0.35, 1) forwards" }}
          />
          <div
            className="absolute inset-y-0 left-0 w-24 rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
            style={{ animation: "progressShine 1.6s ease-in-out infinite" }}
          />
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"
              style={{ animation: `dotBounce 1.4s ease-in-out ${i * 0.18}s infinite` }}
            />
          ))}
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes logoReveal {
          0% { opacity: 0; transform: scale(0.4) rotate(-12deg); filter: blur(20px); }
          15% { opacity: 1; transform: scale(1.12) rotate(3deg); filter: blur(0); }
          30% { transform: scale(0.96) rotate(-1deg); }
          45% { transform: scale(1.03) rotate(0.5deg); }
          60% { transform: scale(1) rotate(0deg); }
          80% { transform: scale(1.01) rotate(0deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes haloPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes borderSpin {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: 250% 0; }
          100% { background-position: -150% 0; }
        }
        @keyframes beamRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gridDrift {
          0% { background-position: 0 0; }
          100% { background-position: 48px 48px; }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(16px); }
          30% { opacity: 1; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes progressShine {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(360px); }
        }
        @keyframes dotBounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function CashierScreen() {
  const { profile, session, loading } = useAuth();
  const offlineCashierId = "offline-cashier";
  const qc = useQueryClient();
  const online = useOnline();
  const [hideImages] = useHideImages();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<"cash" | "mobile" | "other">("cash");
  const [checkingOut, setCheckingOut] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [queuedCount, setQueuedCount] = useState<number>(() => getQueue().length);
  const [today, setToday] = useState({ total: 0, count: 0 });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [showIntro, setShowIntro] = useState(true);
  const [receipt, setReceipt] = useState<{
    entry: TxLogEntry;
    amountPaid: number;
    change: number;
  } | null>(null);
  const [roleIdentity, setRoleIdentity] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tillpoint.manager.settings.v1") ?? "{}");
    } catch {
      return {};
    }
  });

  const [cashierPhoto, setCashierPhoto] = useState<string | null>(() => {
    try {
      return localStorage.getItem("tillpoint.cashier.photo.v1");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let cancelled = false;
    void supabase
      .rpc("my_cashier_profile")
      .then(({ data }) => {
        if (cancelled) return;
        const photo = (data as { photo_url?: string | null } | null)?.photo_url ?? null;
        setCashierPhoto(photo);
        try {
          if (photo) localStorage.setItem("tillpoint.cashier.photo.v1", photo);
          else localStorage.removeItem("tillpoint.cashier.photo.v1");
        } catch {
          /* best effort */
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onSettings = (event: StorageEvent) => {
      if (event.key !== "tillpoint.manager.settings.v1") return;
      try {
        setRoleIdentity(JSON.parse(event.newValue ?? "{}"));
      } catch {
        /* noop */
      }
    };
    window.addEventListener("storage", onSettings);
    return () => window.removeEventListener("storage", onSettings);
  }, []);

  useEffect(() => {
    void hydrateLogFromIdb();
    let latest: TxLogEntry[] = [];
    const recompute = () => setToday(computeSalesToday(latest));
    const offLog = subscribeLog((list) => {
      latest = list;
      recompute();
    });
    const offMarker = subscribeSalesTodayMarker(recompute);
    return () => {
      offLog();
      offMarker();
    };
  }, []);

  const variants = useQuery({
    queryKey: ["cashier", "variants"],
    placeholderData: () => {
      try {
        const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
        return raw ? (JSON.parse(raw) as Variant[]) : undefined;
      } catch {
        return undefined;
      }
    },
    queryFn: async () => {
      if (!online) throw new Error("Offline");
      const { data, error } = await supabase
        .from("product_variants")
        .select(
          "id, variant_name, size, flavour, price, image_url, active, product:products(id, name, category, image_url), stock(quantity, available)",
        )
        .eq("active", true)
        .order("variant_name");
      if (error) throw error;
      const list = (data as unknown as Variant[]).filter((v) => v.product);
      try {
        localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(list));
      } catch {
        /* noop */
      }
      void idbSet(IDB_KEYS.catalog, list);
      return list;
    },
  });

  const [idbCatalog, setIdbCatalog] = useState<Variant[]>([]);
  useEffect(() => {
    void idbGet<Variant[]>(IDB_KEYS.catalog).then((c) => {
      if (c?.length) setIdbCatalog(c);
    });
    if (!isManagerMode()) setMode("cashier");
    void hydrateStockDeltas();
  }, []);

  const offlineList = useMemo<Variant[]>(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Variant[]) : [];
      return parsed.length ? parsed : idbCatalog;
    } catch {
      return idbCatalog;
    }
  }, [variants.data, idbCatalog]);

  const list: Variant[] = variants.data ?? offlineList;

  const settings = useQuery({
    queryKey: ["cashier", "settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("show_cashier_manual")
        .eq("id", true)
        .maybeSingle();
      return data ?? { show_cashier_manual: true };
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (v) =>
        v.variant_name.toLowerCase().includes(q) ||
        v.product?.name.toLowerCase().includes(q) ||
        v.product?.category?.toLowerCase().includes(q),
    );
  }, [search, list]);

  const subtotal = cart.reduce((s, l) => s + Number(l.variant.price) * l.qty, 0);
  const totalItems = cart.reduce((s, l) => s + l.qty, 0);

  const syncOfflineQueue = useCallback(
    async (showEmptyToast = false) => {
      if (!online) {
        toast.error("You are offline. Sync will start when the connection returns.");
        return;
      }
      const q = getQueue();
      setQueuedCount(q.length);
      if (q.length === 0) {
        setSyncStatus("synced");
        setLastSync(new Date().toISOString());
        if (showEmptyToast) toast.success("Everything is synced");
        return;
      }
      setSyncStatus("syncing");
      toast.info(`Syncing ${q.length} offline sale${q.length === 1 ? "" : "s"}...`);
      const res = await flushQueue();
      const remaining = getQueue().length;
      setQueuedCount(remaining);
      setLastSync(new Date().toISOString());
      if (res.failed > 0) {
        setSyncStatus("failed");
        toast.error(`${res.failed} sale${res.failed === 1 ? "" : "s"} could not sync - will retry`);
      } else {
        setSyncStatus("synced");
        if (res.ok > 0) toast.success(`${res.ok} offline sale${res.ok === 1 ? "" : "s"} synced`);
      }
      qc.invalidateQueries({ queryKey: ["cashier"] });
    },
    [online, qc],
  );

  useEffect(() => {
    if (!online) {
      setSyncStatus(getQueue().length > 0 ? "idle" : "synced");
      return;
    }
    qc.invalidateQueries({ queryKey: ["cashier"] });
    void syncOfflineQueue(false);
  }, [online, qc, syncOfflineQueue]);

  function addToCart(v: Variant) {
    setCart((prev) => {
      const existing = prev.find((l) => l.variant.id === v.id);
      if (existing) return prev.map((l) => (l.variant.id === v.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { variant: v, qty: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.variant.id !== id) return [l];
        const next = l.qty + delta;
        if (next <= 0) return [];
        return [{ ...l, qty: next }];
      }),
    );
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.variant.id !== id));
  }

  function cancelSale() {
    if (cart.length === 0) return;
    if (!confirm("Cancel this sale and clear the receipt?")) return;
    setCart([]);
    toast.info("Sale cancelled");
  }

  function findVariantByPhrase(phrase: string): Variant | null {
    const q = phrase.toLowerCase().trim();
    if (!q) return null;
    const scored = list
      .map((v) => {
        const hay =
          `${v.product?.name ?? ""} ${v.variant_name} ${v.size ?? ""} ${v.flavour ?? ""}`.toLowerCase();
        let score = 0;
        for (const w of q.split(/\s+/).filter(Boolean)) if (hay.includes(w)) score++;
        return { v, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.v ?? null;
  }

  function handleVoice(raw: string) {
    const text = raw
      .toLowerCase()
      .trim()
      .replace(/[.,!?]/g, "");
    if (!text) return;

    if (/^(new( sale)?|clear|reset)$/.test(text)) {
      setCart([]);
      toast.info("Cart cleared");
      return;
    }
    if (/^(checkout|complete( sale)?|pay|finish)$/.test(text)) {
      if (cart.length === 0) return toast.error("Cart is empty");
      checkout.mutate();
      return;
    }
    if (/^cash$/.test(text)) {
      setPayment("cash");
      toast.info("Payment: Cash");
      return;
    }
    if (/^(mobile|ecocash|eco cash)$/.test(text)) {
      setPayment("mobile");
      toast.info("Payment: EcoCash / Mobile");
      return;
    }

    const rm = text.match(/^remove\s+(.+)$/);
    if (rm) {
      const line = cart.find((l) =>
        `${l.variant.product?.name} ${l.variant.variant_name}`.toLowerCase().includes(rm[1]),
      );
      if (line) {
        removeLine(line.variant.id);
        toast.success(`Removed ${line.variant.product?.name}`);
      } else toast.error(`Not in cart: ${rm[1]}`);
      return;
    }
    const sr = text.match(/^(search|find)\s+(.+)$/);
    if (sr) {
      setSearch(sr[2]);
      return;
    }

    const addN = text.match(/^(?:add\s+)?(\d+)\s+(.+)$/);
    const addPhrase = text.match(/^add\s+(.+)$/);
    let qty = 1;
    let phrase = text;
    if (addN) {
      qty = Math.max(1, parseInt(addN[1], 10));
      phrase = addN[2];
    } else if (addPhrase) {
      phrase = addPhrase[1];
    }

    const v = findVariantByPhrase(phrase);
    if (!v) {
      setSearch(phrase);
      toast.info(`Searching "${phrase}"`);
      return;
    }
    for (let i = 0; i < qty; i++) addToCart(v);
    toast.success(`Added ${qty} × ${v.product?.name}`);
  }

  const checkout = useMutation<{ entry: TxLogEntry }, Error, void>({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Cart is empty");

      const items = cart.map((l) => ({
        variant_id: l.variant.id,
        quantity: l.qty,
        unit_price: Number(l.variant.price),
        subtotal: Number(l.variant.price) * l.qty,
      }));
      const logItems = cart.map((l) => ({
        name: l.variant.product?.name ?? l.variant.variant_name,
        variant: l.variant.variant_name,
        quantity: l.qty,
        unit_price: Number(l.variant.price),
        subtotal: Number(l.variant.price) * l.qty,
      }));
      const cashierName = profile?.full_name ?? CASHIER_NAME;
      const saleId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

      const entry = enqueueSale({
        id: saleId,
        cashier_id: session?.user.id ?? offlineCashierId,
        cashier_name: cashierName,
        total_amount: subtotal,
        payment_type: payment,
        items,
      });
      const logEntry = appendLog({
        id: entry.id,
        created_at: entry.queued_at,
        total: subtotal,
        payment_type: payment,
        cashier_name: cashierName,
        items: logItems,
        status: "queued",
      });
      recordSaleDelta(entry.id, items);
      setQueuedCount(getQueue().length);

      return Promise.resolve({ entry: logEntry });
    },
    onMutate: () => setCheckingOut(true),
    onSettled: () => setCheckingOut(false),
    onSuccess: (res) => {
      const paid = Number(amountPaid);
      setReceipt({
        entry: res.entry,
        amountPaid: Number.isFinite(paid) && paid > 0 ? paid : subtotal,
        change: Number.isFinite(paid) && paid > subtotal ? paid - subtotal : 0,
      });
      toast.success(
        online
          ? `Sale completed - ${formatCurrency(res.entry.total)}`
          : `Sale saved on this device - ${formatCurrency(res.entry.total)}`,
      );
      setCart([]);
      setAmountPaid("");
      if (typeof navigator === "undefined" || navigator.onLine) {
        void runSync().then(() => {
          setQueuedCount(getQueue().length);
          setLastSync(new Date().toISOString());
          qc.invalidateQueries({ queryKey: ["cashier"] });
        });
      }
    },

    onError: (e: Error) => toast.error(e.message),
  });

  // Legendary 7-second intro on mount
  if (showIntro) return <LegendaryLoader label="Till Loading" />;

  if (loading) return <LegendaryLoader label="Connecting" />;

  const showManual = settings.data?.show_cashier_manual !== false;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-orange-50/30">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/15 to-indigo-400/15 blur-3xl" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1fr_420px]">
        {/* Main product area */}
        <div className="flex flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-white/20 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 opacity-30 blur-md" />
                  <div className="relative"><ManagerGateLogo /></div>
                </div>
                {cashierPhoto && (
                  <img
                    src={cashierPhoto}
                    alt="Cashier"
                    className="h-10 w-10 rounded-xl border border-white/70 object-cover shadow-md"
                  />
                )}
                <div className="hidden border-l border-slate-200 pl-3 sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    <div className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-[10px] font-bold uppercase tracking-wider text-transparent">
                      Green Shop · Cashier
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {roleIdentity.cashierName ?? profile?.full_name ?? "Cashier"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {roleIdentity.cashierTitle ?? "Cashier"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Sales today card */}
                <div className="relative overflow-hidden rounded-xl border border-orange-200/60 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 px-3 py-1.5 shadow-sm">
                  <div className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-400/20" />
                  <div className="relative text-right">
                    <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                      <TrendingUp className="h-3 w-3" />
                      Sales today
                    </div>
                    <div className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-base font-extrabold tabular-nums text-transparent">
                      {formatCurrency(today.total)}
                    </div>
                    <div className="text-[10px] font-medium text-orange-700/70">
                      {today.count} sale{today.count === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block"><SyncIndicator /></div>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Open cashier actions"
                      className="border-indigo-200 bg-white/80 backdrop-blur-sm hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      <Menu data-icon="inline-start" /> Actions
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="border-l border-indigo-100 bg-gradient-to-b from-white to-indigo-50/50">
                    <SheetHeader>
                      <SheetTitle className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                        Cashier actions
                      </SheetTitle>
                      <SheetDescription>Operational tools and account controls.</SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-col gap-3 p-4">
                      <Button
                        variant="outline"
                        onClick={() => syncOfflineQueue(true)}
                        disabled={!online || syncStatus === "syncing"}
                        className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
                      >
                        <RefreshCw data-icon="inline-start" /> Sync
                      </Button>
                      <PWAInstallButton variant="outline" size="sm" label="Install" />
                      <Link to="/transactions">
                        <Button variant="outline" className="w-full border-indigo-200 hover:bg-indigo-50">
                          <ClipboardList data-icon="inline-start" /> Transaction log
                        </Button>
                      </Link>
                      <Link to="/sync">
                        <Button variant="outline" className="w-full border-indigo-200 hover:bg-indigo-50">
                          Sync queue
                        </Button>
                      </Link>
                      <Link to="/shift">
                        <Button variant="outline" className="w-full border-indigo-200 hover:bg-indigo-50">
                          <LockIcon data-icon="inline-start" /> Shift close
                        </Button>
                      </Link>
                      <Link to="/refunds">
                        <Button variant="outline" className="w-full border-indigo-200 hover:bg-indigo-50">
                          <Undo2 data-icon="inline-start" /> Refunds
                        </Button>
                      </Link>
                      {showManual && (
                        <Button
                          variant="outline"
                          onClick={() => setManualOpen(true)}
                          className="border-indigo-200 hover:bg-indigo-50"
                        >
                          <BookOpen data-icon="inline-start" /> Manual
                        </Button>
                      )}
                      <SignOutButton variant="outline" />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </header>

          <SyncAlertBanner />

          {/* Status bar */}
          <div
            className={`border-b px-4 py-3 text-xs sm:px-6 ${
              online
                ? "border-indigo-100/60 bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-purple-50/80"
                : "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {syncStatus === "syncing" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                ) : online ? (
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                ) : (
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500">
                    <AlertTriangle className="h-3 w-3 text-white" />
                  </div>
                )}
                <span className={`font-semibold ${online ? "text-indigo-900" : "text-amber-950"}`}>
                  {!online
                    ? "Offline mode active — sales are saved on this device."
                    : syncStatus === "syncing"
                      ? "Syncing offline sales now..."
                      : queuedCount > 0
                        ? `${queuedCount} offline sale${queuedCount === 1 ? "" : "s"} waiting to sync.`
                        : "Online and synced."}
                </span>
              </div>
              <span className="text-slate-500">
                {lastSync
                  ? `Last sync: ${new Date(lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Catalog is available after it loads once."}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-slate-200/60 bg-white/60 px-4 py-3 backdrop-blur-sm sm:px-6">
            <div className="relative max-w-md">
              <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 transition-opacity peer-focus-within:opacity-100" />
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
              <Input
                id="cashier-search"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-slate-200 bg-white/90 pl-9 pr-10 shadow-sm transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
              {search.length > 0 && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    document.getElementById("cashier-search")?.focus();
                  }}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100">
                  <PackageIcon className="h-10 w-10 text-indigo-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-500">No products found.</p>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {filtered.map((v, index) => {
                  const image = v.image_url || v.product?.image_url;
                  const gradients = [
                    "from-indigo-500 to-blue-500",
                    "from-purple-500 to-indigo-500",
                    "from-orange-500 to-amber-500",
                    "from-blue-500 to-cyan-500",
                    "from-violet-500 to-purple-500",
                    "from-rose-500 to-orange-500",
                  ];
                  const gradient = gradients[index % gradients.length];
                  return (
                    <div key={v.id} className="group relative">
                      <button
                        onClick={() => addToCart(v)}
                        className="w-full overflow-hidden rounded-2xl border border-white/60 bg-white/80 text-left shadow-[0_2px_8px_-2px_rgba(79,70,229,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_12px_32px_-8px_rgba(79,70,229,0.25)]"
                      >
                        {/* Gradient accent bar */}
                        <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

                        {!hideImages && (
                          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-50 to-indigo-50/50">
                            {image ? (
                              <img
                                src={image}
                                alt={v.product?.name}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center">
                                <PackageIcon className="h-10 w-10 text-indigo-300" />
                              </div>
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/0 via-indigo-900/0 to-indigo-900/0 transition-all duration-300 group-hover:from-indigo-900/20" />
                            {/* Price badge */}
                            <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-indigo-700 shadow-sm backdrop-blur-sm">
                              {formatCurrency(v.price)}
                            </div>
                          </div>
                        )}

                        <div className="p-3">
                          <div className="truncate text-sm font-bold text-slate-800 group-hover:text-indigo-700">
                            {v.product?.name}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            {v.variant_name}
                            {v.size ? ` · ${v.size}` : ""}
                          </div>
                          <div className="mt-2.5 flex items-center justify-between">
                            <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-base font-extrabold text-transparent`}>
                              {formatCurrency(v.price)}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              In stock
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart sidebar */}
        <aside className="relative flex flex-col border-t border-slate-200/60 bg-white/70 backdrop-blur-xl lg:border-l lg:border-t-0">
          {/* Sidebar gradient accent */}
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-indigo-500/40 via-purple-500/40 to-orange-500/40" />

          <div className="border-b border-slate-200/60 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Current sale</h2>
                <p className="text-xs text-slate-500">
                  {cart.length} line{cart.length === 1 ? "" : "s"} · {totalItems} item
                  {totalItems === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-4 py-3">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-2xl" />
                  <div className="relative grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                    <ShoppingCart className="h-10 w-10 text-indigo-500" />
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-500">Tap a product to start.</p>
                <p className="mt-1 text-xs text-slate-400">Items will appear here</p>
              </div>
            ) : (
              <div className="relative rounded-xl border border-dashed border-indigo-200 bg-gradient-to-b from-white to-indigo-50/30 p-4 font-mono text-[13px] shadow-sm">
                {/* Receipt zigzag top */}
                <div className="absolute -top-px left-0 right-0 h-2 bg-[linear-gradient(45deg,transparent_33.333%,#fff_33.333%,#fff_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#fff_33.333%,#fff_66.667%,transparent_66.667%)] bg-[length:8px_8px] bg-repeat-x" />

                <button
                  type="button"
                  aria-label="Cancel sale"
                  title="Cancel this sale"
                  onClick={cancelSale}
                  className="absolute right-2 top-3 grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-indigo-500" />
                    <div className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-sm font-bold uppercase tracking-[0.18em] text-transparent">
                      Receipt
                    </div>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {new Date().toLocaleString()}
                  </div>
                </div>

                <div className="my-3 border-t border-dashed border-indigo-200" />

                <ul className="space-y-3">
                  {cart.map((l) => (
                    <li key={l.variant.id} className="group">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate font-bold text-slate-800">
                          {l.variant.product?.name}
                        </span>
                        <span className="tabular-nums font-bold text-indigo-700">
                          {formatCurrency(Number(l.variant.price) * l.qty)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="min-w-0 truncate">
                          {l.variant.variant_name}
                          {l.variant.size ? ` · ${l.variant.size}` : ""} · {l.qty} ×{" "}
                          {formatCurrency(l.variant.price)}
                        </span>
                        <span className="flex items-center gap-1">
                          <button
                            aria-label="Decrease"
                            onClick={() => changeQty(l.variant.id, -1)}
                            className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            aria-label="Increase"
                            onClick={() => changeQty(l.variant.id, 1)}
                            className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            aria-label="Remove"
                            onClick={() => removeLine(l.variant.id)}
                            className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="my-3 border-t border-dashed border-indigo-200" />
                <div className="flex items-baseline justify-between text-sm font-bold">
                  <span className="text-slate-700">TOTAL</span>
                  <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-lg font-extrabold tabular-nums text-transparent">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {/* Receipt zigzag bottom */}
                <div className="absolute -bottom-px left-0 right-0 h-2 rotate-180 bg-[linear-gradient(45deg,transparent_33.333%,#fff_33.333%,#fff_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#fff_33.333%,#fff_66.667%,transparent_66.667%)] bg-[length:8px_8px] bg-repeat-x" />
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-200/60 bg-gradient-to-b from-white to-indigo-50/30 p-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Wallet className="h-3.5 w-3.5 text-indigo-500" />
                Payment method
              </label>
              <Select value={payment} onValueChange={(v) => setPayment(v as typeof payment)}>
                <SelectTrigger className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="mobile">📱 EcoCash / Mobile</SelectItem>
                  <SelectItem value="other">🔄 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">
                Amount paid (optional)
              </label>
              <Input
                inputMode="decimal"
                placeholder={formatCurrency(subtotal)}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
              {Number(amountPaid) > subtotal && (
                <p className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Change: {formatCurrency(Number(amountPaid) - subtotal)}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2.5">
              <span className="text-sm font-bold text-slate-700">Total</span>
              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-xl font-extrabold text-transparent">
                {formatCurrency(subtotal)}
              </span>
            </div>

            <Button
              className="group relative w-full overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40"
              size="lg"
              disabled={cart.length === 0 || checkingOut}
              onClick={() => checkout.mutate()}
            >
              <span className="relative flex items-center justify-center gap-2 font-bold">
                {checkingOut ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Saving on device...
                  </>
                ) : online ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Complete sale
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5" />
                    Save sale offline
                  </>
                )}
              </span>
            </Button>

            <p className="text-center text-[11px] text-slate-400">
              Sales are saved on this device first, then uploaded automatically.
            </p>
          </div>
        </aside>
      </div>

      {/* Manual dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-auto border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Cashier User Manual
              </span>
            </DialogTitle>
          </DialogHeader>
          <CashierManualContent />
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog
        open={receipt !== null}
        onOpenChange={(o) => {
          if (!o) setReceipt(null);
        }}
      >
        <DialogContent className="max-w-md border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <span className="bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
                Sale completed
              </span>
            </DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed border-indigo-200 bg-gradient-to-b from-white to-indigo-50/50 p-3 text-xs">
                <pre className="whitespace-pre-wrap font-mono leading-relaxed text-slate-700">
                  {receiptText(receipt.entry, {
                    amountPaid: receipt.amountPaid,
                    change: receipt.change,
                  })}
                </pre>
              </div>
              <p className="text-xs text-slate-500">
                Receipt {receiptNumber(receipt.entry)} is stored on this device. Reprint it any time
                from the transaction log.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-purple-500/40"
                  onClick={() =>
                    printReceipt(receipt.entry, {
                      amountPaid: receipt.amountPaid,
                      change: receipt.change,
                    })
                  }
                >
                  Print receipt
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-indigo-200 hover:bg-indigo-50"
                  onClick={() =>
                    downloadReceipt(receipt.entry, {
                      amountPaid: receipt.amountPaid,
                      change: receipt.change,
                    })
                  }
                >
                  Download
                </Button>
                <Button variant="ghost" onClick={() => setReceipt(null)} className="hover:bg-indigo-50">
                  Next sale
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function VoiceCommandHelp() {
  const commands = [
    ["add Coke", "Adds the best matching product to the cart."],
    ["add 3 Coke", "Adds a quantity in one command."],
    ["remove Coke", "Removes a matching item from the cart."],
    ["search sugar", "Filters the product grid."],
    ["new", "Clears the current cart for a new sale."],
    ["cash", "Sets payment to Cash."],
    ["ecocash", "Sets payment to EcoCash / Mobile."],
    ["checkout", "Completes or queues the sale, depending on connection."],
  ];
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        Tap Voice, speak one command clearly, then wait for the action to complete.
      </p>
      <div className="grid gap-2">
        {commands.map(([command, description]) => (
          <div
            key={command}
            className="grid gap-2 rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 p-3 sm:grid-cols-[140px_1fr]"
          >
            <code className="font-semibold text-indigo-700">{command}</code>
            <span className="text-muted-foreground">{description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashierManualContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <section>
        <h3 className="font-semibold text-base">1. Opening cashier mode</h3>
        <p className="text-muted-foreground">
          From the welcome or auth page, tap Enter Cashier Mode. The till opens without a password
          for fast counter access. Named cashier accounts can still sign in when the manager wants
          staff-specific tracking.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-base">2. Finding a product</h3>
        <p className="text-muted-foreground">
          Use the search bar at the top of the product grid. You can search by product name,
          variant, or category.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-base">3. Adding items to the cart</h3>
        <p className="text-muted-foreground">
          Tap any product card. It appears in the current sale panel. Use plus and minus to change
          quantity. Tap the trash icon to remove a line.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-base">4. Taking payment</h3>
        <p className="text-muted-foreground">
          Choose the payment method, confirm the total with the customer, and tap Complete sale.
          Stock updates automatically.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-base">5. Voice commands</h3>
        <p className="text-muted-foreground">
          Tap Voice and say commands such as add Coke, add 3 Coke, remove Coke, search sugar, new,
          cash, ecocash, or checkout. Use Voice help in the cashier top bar for the full list.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-base">6. Working offline and syncing</h3>
        <p className="text-muted-foreground">
          If the connection drops, keep serving customers. Sales are stored securely on this device,
          a pending badge shows what is waiting, and sync runs automatically when the device comes
          back online. You can also press Sync while online.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-base">6b. Refunds and voids</h3>
        <p className="text-muted-foreground">
          Tap Refunds in the top bar to open your refunds page. A refund gives money back to a
          customer; a void cancels a sale entered by mistake. Both can return the items to stock and
          both remove the sale from the day&apos;s takings, so sales and refunds always balance. You
          can only complete one yourself when the manager has switched on{" "}
          <span className="font-medium">auto-approve refunds</span> - otherwise the page tells you
          to ask the manager. Refunds need a connection; if you are offline, wait until the device
          is back online.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-base">7. Stock warnings</h3>
        <p className="text-muted-foreground">
          Out means the item cannot be sold. Low means only a few units remain - let the manager
          know.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-base">8. Installing on a device</h3>
        <p className="text-muted-foreground">
          Tap Install in Chrome or Edge on the published site. The app appears with the other apps
          on the device and keeps the cashier dashboard available after it has loaded once.
        </p>
      </section>
      <section>
        <h3 className="font-semibold text-base">9. Signing out</h3>
        <p className="text-muted-foreground">
          Tap Sign out at the end of your shift when using a named account. Shared cashier mode can
          be opened again from the auth page.
        </p>
      </section>
    </div>
  );
}
