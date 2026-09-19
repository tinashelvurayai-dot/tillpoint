import { createFileRoute, Link, Outlet, Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { SignOutButton } from "@/components/sign-out-button";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  Receipt,
  BookOpen,
  Menu,
  X,
  Wallet,
  TrendingUp,
  Truck,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  Lock as LockIcon,
  HardDrive,
  Settings,
  Undo2,
  ScrollText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { SyncAlertBanner } from "@/components/sync-alert-banner";

export const Route = createFileRoute("/_authenticated/manager")({
  component: ManagerLayout,
});

const navItems: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  { to: "/manager", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/manager/products", label: "Products", icon: Package },
  { to: "/manager/stock", label: "Stock", icon: Boxes },
  { to: "/manager/stock-in", label: "Stock-In Records", icon: ClipboardList },
  { to: "/manager/alerts", label: "Low Stock Alerts", icon: AlertTriangle },
  { to: "/manager/sales", label: "Sales", icon: Receipt },
  { to: "/manager/refunds", label: "Refunds & Voids", icon: Undo2 },
  { to: "/manager/profit", label: "Profit View", icon: TrendingUp },
  { to: "/manager/cash", label: "Daily Cash", icon: Wallet },
  { to: "/manager/expenses", label: "Expenses & Profit", icon: TrendingUp },
  { to: "/manager/suppliers", label: "Suppliers & PO", icon: Truck },
  { to: "/transactions", label: "Transaction Log", icon: ClipboardList },
  { to: "/sync", label: "Sync Queue", icon: RefreshCw },
  { to: "/shift", label: "Shift Close (Z)", icon: LockIcon },

  { to: "/manager/cashiers", label: "Cashiers", icon: Users },
  { to: "/manager/storage", label: "Storage & Exports", icon: HardDrive },
  { to: "/manager/settings", label: "Settings", icon: Settings },
  { to: "/manager/logs", label: "Reset Logs", icon: ScrollText },
  { to: "/manager/manuals", label: "Manuals", icon: BookOpen },
];

const LOGO_URL = "https://i.postimg.cc/Hkq55G3M/Whats-App-Image-2026-09-07-at-9-29-12-AM.jpg";
const INTRO_DURATION_MS = 5000;

function LegendaryLoader() {
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
            Manager
          </div>
          <div className="bg-gradient-to-r from-indigo-400/70 via-purple-400/70 to-orange-400/70 bg-clip-text text-[10px] font-bold uppercase tracking-[0.5em] text-transparent">
            Console Loading
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

function ManagerLayout() {
  const { role, profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (showIntro) return <LegendaryLoader />;

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-orange-500 to-amber-400 opacity-20" />
            <div className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/40">
              <img src={LOGO_URL} alt="Loading" className="h-10 w-10 object-contain" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-300">Loading console...</p>
        </div>
      </div>
    );
  if (role !== "manager") return <Navigate to="/cashier" />;

  const SidebarInner = (
    <>
      {/* Brand header */}
      <div className="relative overflow-hidden px-6 py-5">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-2xl" />
        <div className="absolute -left-4 bottom-0 h-16 w-16 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-400/20 blur-2xl" />
        <div className="relative">
          <BrandLogo />
          <div className="mt-1 pl-[46px]">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-purple-50 px-2 py-0.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-[10px] font-bold uppercase tracking-[0.16em] text-transparent">
                Manager console
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Divider with gradient */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to as "/manager"}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700",
              )}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-orange-400 to-amber-500 shadow-sm shadow-orange-500/50" />
              )}

              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all duration-200",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
              </span>

              <span className="flex-1 truncate">{item.label}</span>

              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-all duration-200",
                  active
                    ? "translate-x-0 text-white/80 opacity-100"
                    : "-translate-x-1 text-indigo-400 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="relative overflow-hidden border-t border-slate-200/60 p-4">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 via-transparent to-orange-50/50" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 opacity-40 blur-sm" />
              <div className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-bold text-white shadow-md shadow-indigo-500/30">
                {(profile?.full_name ?? "M").charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-gradient-to-br from-emerald-400 to-teal-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-900">
                {profile?.full_name ?? "Manager"}
              </div>
              <div className="text-xs text-slate-500">Manager</div>
            </div>
          </div>
          <SignOutButton variant="outline" />
        </div>
      </div>
    </>
  );

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-orange-50/20">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
      </div>

      <aside className="sticky top-0 z-20 hidden h-screen w-72 flex-col overflow-hidden border-r border-white/40 bg-white/70 shadow-[4px_0_24px_-8px_rgba(79,70,229,0.08)] backdrop-blur-xl md:flex">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-indigo-500/30 via-purple-500/30 to-orange-500/30" />
        {SidebarInner}
      </aside>

      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-white/40 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <BrandLogo />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="hover:bg-indigo-50 hover:text-indigo-600"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-slate-900/50 to-orange-950/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-hidden bg-white/95 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-indigo-500/40 via-purple-500/40 to-orange-500/40" />
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-3xl" />

            <div className="relative flex justify-end p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                className="hover:bg-indigo-50 hover:text-indigo-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative flex flex-1 flex-col overflow-hidden">{SidebarInner}</div>
          </aside>
        </div>
      )}

      <main className="relative flex-1 overflow-auto pt-14 md:pt-0">
        <SyncAlertBanner />
        <Outlet />
      </main>
    </div>
  );
}
