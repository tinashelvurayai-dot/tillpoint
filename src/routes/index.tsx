import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Droplets,
  Leaf,
  ShieldCheck,
  Sun,
  ArrowRight,
  Sparkles,
  Star,
  CheckCircle2,
} from "lucide-react";
import { setMode } from "@/lib/session-mode";
import { useShowInstallButton } from "@/hooks/use-app-prefs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ignited BrandZ - Till & Stock" },
      {
        name: "description",
        content:
          "Ignited BrandZ skincare point of sale: sign in as manager or cashier to sell creams and oils, track stock and follow daily takings.",
      },
      {
        property: "og:title",
        content: "Ignited BrandZ - Till & Stock",
      },
      {
        property: "og:description",
        content:
          "Sign in to the EXO till to sell creams and oils and follow daily takings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const creamHeroImage =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-09-14%20at%208.41.50%20AM-JsEVEvZANZ37QXaQ1WUzw4ecfeI2hk.jpeg";

const sectionBackdropImage =
  "https://i.postimg.cc/3RCtGGN2/Chat-GPT-Image-Sep-18-2026-07-57-56-PM.png";

const glassFrameBackdropImage =
  "https://i.postimg.cc/QdxWbTM4/Chat-GPT-Image-Sep-18-2026-08-46-17-PM.png";

const productImages = {
  oilColors:
    "https://i.postimg.cc/HLC8SD6Y/Chat-GPT-Image-Sep-14-2026-09-00-32-AM.png",
  creamColors:
    "https://i.postimg.cc/m2fcZGGt/Chat-GPT-Image-Sep-14-2026-08-48-36-AM.png",
  tissueOil:
    "https://i.postimg.cc/yNGfkTBH/Whats-App-Image-2026-09-07-at-9-24-42-AM.jpg",
  firmingOil:
    "https://i.postimg.cc/mgRKsV2b/Whats-App-Image-2026-09-07-at-9-24-43-AM.jpg",
  scarOil:
    "https://i.postimg.cc/BvpY4G7J/Whats-App-Image-2026-09-07-at-9-24-43-AM-(1).jpg",
  tripleGlycerine: "https://i.postimg.cc/vZbRwnWf/a.png",
  tissueOilCream: "https://i.postimg.cc/HkQNSkRh/e.png",
  camphorCream: "https://i.postimg.cc/rwrTqTbx/f.png",
  q10Cream: "https://i.postimg.cc/YCGrjYvT/d.png",
  maxMoisture: "https://i.postimg.cc/FzpRgvvM/c.png",
  menTissueOilCream:
    "https://i.postimg.cc/Kv5LJXQY/50ml-Exo-Tissue-oil-Men-768x802.png",
};

const products = [
  {
    img: productImages.tissueOilCream,
    name: "EXO Moisture Intensive Tissue Oil Cream",
    body:
      "Unveil a radiant you with EXO’s luxurious Tissue Oil Cream. This innovative formula combines the nourishing power of tissue oils with rich, hydrating ingredients to quench your skin’s thirst. Perfect for all skin types, it leaves skin soft, supple and smooth.",
  },
  {
    img: productImages.tripleGlycerine,
    name: "EXO Moisture Intensive Triple Glycerine Cream",
    body:
      "Say goodbye to dryness with a powerful triple dose of glycerin, a natural humectant that attracts and retains moisture. It deeply hydrates rough, flaky skin for a soft, smooth and radiant glow.",
  },
  {
    img: productImages.camphorCream,
    name: "EXO Triple Intensive Camphor Cream",
    body:
      "EXO’s Triple Camphor Formula delivers a powerful 3X cooling sensation to soothe irritation and refresh tired skin. Ideal for aches, muscle tension and post-workout soreness.",
  },
  {
    img: productImages.q10Cream,
    name: "EXO Q10 Firming Triple Glycerine Cream",
    body:
      "Triple hydration and rejuvenation combine with Coenzyme Q10 in this luxurious cream, giving your skin essential care and a refreshed, revitalized feel.",
  },
  {
    img: productImages.maxMoisture,
    name: "EXO Max Moisture Triple Glycerine Cream",
    body:
      "A rich moisturizer designed for men’s skin. It helps combat environmental stressors while delivering essential nutrients and a luxurious triple-glycerine experience.",
  },
  {
    img: productImages.menTissueOilCream,
    name: "Tissue Oil Cream 450ml (Men)",
    body:
      "Blended with tissue oil and essential oils, dermatologist tested for 72-hour moisturization and enriched with triple glycerine and nourishing oils for deeply hydrated, healthy-looking skin.",
  },
  {
    img: productImages.tissueOil,
    name: "EXO Tissue Oil (125ml)",
    body:
      "A high-potency, non-greasy oil concentrate specially blended to reduce the appearance of scars, stretch marks and dehydrated or aging skin. Easily absorbed for deep penetration and visible results.",
  },
  {
    img: productImages.firmingOil,
    name: "Skin Firming & Toning Oil (125ml)",
    body:
      "Infused with Coenzyme Q10 and antioxidant-rich, age-defying properties, this non-greasy formula targets fine lines, stretch marks and uneven tone while supporting skin elasticity and vitality.",
  },
  {
    img: productImages.scarOil,
    name: "Scar & Stretch Mark Oil (125ml)",
    body:
      "Rosehip and jojoba combine in this lightweight, fast-absorbing oil to improve the appearance of scars, stretch marks and dry or aging skin while delivering deep nourishment and antioxidant protection.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const [showInstall] = useShowInstallButton();

  const [tab, setTab] = useState<"cashier" | "manager">("cashier");
  const [signInOpen, setSignInOpen] = useState(false);

  const [c1, setC1] = useState("");
  const [c2, setC2] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCashier(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("cashier_login", {
        p_code1: c1,
        p_code2: c2,
      });

      const res = (data ?? null) as {
        ok?: boolean;
        error?: string;
        email?: string;
        password?: string;
        name?: string;
      } | null;

      if (rpcError || !res) {
        toast.error("You need to be online to sign in.");
        return;
      }

      if (!res.ok || !res.email || !res.password) {
        toast.error(res.error ?? "Those access codes are not recognised.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: res.email,
        password: res.password,
      });

      if (error) {
        toast.error("Could not open the till. Please try again.");
        return;
      }

      setMode("cashier");
      toast.success(`Welcome, ${res.name ?? "cashier"}`);
      navigate({ to: "/cashier" });
    } catch {
      toast.error("You need to be online to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleManager(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error("That email and password do not match.");
        return;
      }

      setMode("manager");
      navigate({ to: "/manager" });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 text-slate-600">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-[#f15922] to-[#0b3b8f] opacity-20" />
            <div className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#f15922] to-[#0b3b8f] shadow-lg shadow-orange-500/40">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (session && role === "manager") {
    return <Navigate to="/manager" />;
  }

  if (session && role === "cashier") {
    return <Navigate to="/cashier" />;
  }

  const trustItems: Array<{
    icon: typeof ShieldCheck;
    title: string;
    body: string;
  }> = [
    {
      icon: ShieldCheck,
      title: "DISCOVER YOUR COMPLETE SKINCARE SOLUTION",
      body: "INTENSIVE HYDRATION & REJUVENATION FOR ALL SKIN TYPES",
    },
    {
      icon: Leaf,
      title: "QUALITY INGREDIENTS",
      body: "Rosehip, jojoba & Q10 oils",
    },
    {
      icon: ArrowRight,
      title: "HONEST PRICING",
      body: "Premium care that’s affordable",
    },
    {
      icon: Droplets,
      title: "FOR THE WHOLE FAMILY",
      body: "Care for every skin type",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden motion-safe:animate-in motion-safe:fade-in duration-700">
      {/* ===== Global orange → blue → white gradient backdrop ===== */}
      <div className="pointer-events-none fixed inset-0 -z-20">
        {/* Base wash: orange top-left, blue bottom-right, white center */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #fff5ee 0%, #ffe8d6 14%, #ffffff 38%, #eaf4ff 62%, #d6e6fa 82%, #b9d2f4 100%)",
          }}
        />
        {/* Soft radial glow top-left (orange) */}
        <div
          className="absolute -left-40 -top-40 h-[640px] w-[640px] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(241,89,34,0.35) 0%, rgba(241,89,34,0.08) 45%, transparent 75%)",
          }}
        />
        {/* Soft radial glow bottom-right (deep blue) */}
        <div
          className="absolute -bottom-48 -right-48 h-[700px] w-[700px] rounded-full opacity-45 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(11,59,143,0.35) 0%, rgba(11,59,143,0.08) 45%, transparent 78%)",
          }}
        />
        {/* Centre white bloom for readability */}
        <div
          className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-55 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 40%, transparent 70%)",
          }}
        />
        {/* Fine diagonal sheen */}
        <div
          className="absolute inset-0 opacity-[0.35] mix-blend-overlay"
          style={{
            background:
              "repeating-linear-gradient(115deg, transparent 0px, transparent 60px, rgba(255,255,255,0.5) 60px, rgba(255,255,255,0.5) 61px)",
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <BrandLogo />

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="hidden font-semibold text-[#0b3b8f] transition-colors hover:bg-white/70 hover:text-[#f15922] sm:inline-flex"
            >
              <a href="#range">Our range</a>
            </Button>

            <Button
              asChild
              variant="ghost"
              className="hidden font-semibold text-[#0b3b8f] transition-colors hover:bg-white/70 hover:text-[#f15922] sm:inline-flex"
            >
              <a href="#shades">Shades</a>
            </Button>

            {showInstall && (
              <PWAInstallButton
                variant="outline"
                size="sm"
                className="hidden rounded-full border-[#0b3b8f]/20 bg-white/80 px-5 font-semibold text-[#0b3b8f] shadow-sm backdrop-blur-sm transition-all hover:border-[#f15922]/40 hover:bg-orange-50 sm:inline-flex"
              />
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 md:pt-12">
        {/* Hero */}
        <section className="relative isolate grid items-center gap-10 overflow-hidden rounded-[2rem] border border-white/70 bg-white/40 px-6 py-10 shadow-[0_20px_60px_rgba(11,59,143,0.16)] backdrop-blur-md sm:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-14">
          <img
            src={glassFrameBackdropImage}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover opacity-40"
          />

          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/60 to-transparent"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-tr from-[#0b3b8f]/10 via-transparent to-[#f15922]/15"
            aria-hidden="true"
          />

          {/* Hero content */}
          <div className="motion-safe:animate-in motion-safe:slide-in-from-left-4 duration-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f15922]/30 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#f15922] shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              Ignited BrandZ
            </span>

            <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.05em] text-[#07152f] md:text-7xl">
              Affordable Skincare Products
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #0b3b8f 0%, #1557b0 42%, #f15922 100%)",
                }}
              >
                Healthy Skin.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Affordable creams and tissue oils made for real, everyday skin.
              Triple glycerine moisture, rosehip & Q10 oils as well as a till
              that keeps every jar and bottle counted.
            </p>

            <Button
              size="lg"
              className="group mt-8 rounded-full bg-gradient-to-r from-[#f15922] via-[#f15922] to-[#0b3b8f] px-8 font-bold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/30"
              onClick={() => setSignInOpen(true)}
            >
              Sign in{" "}
              <ArrowRight
                className="transition-transform group-hover:translate-x-1"
                data-icon="inline-end"
              />
            </Button>

            {/* Feature cards */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Droplets,
                  t: "72h moisture",
                  b: "Dermatologist tested creams",
                  gradient: "from-[#0b3b8f] to-[#1557b0]",
                },
                {
                  icon: Leaf,
                  t: "Rosehip & jojoba",
                  b: "High potency tissue oils",
                  gradient: "from-[#f15922] to-[#ff8a4a]",
                },
                {
                  icon: Sun,
                  t: "Everyday care",
                  b: "For the whole family",
                  gradient: "from-[#f15922] via-[#8b5cf6] to-[#0b3b8f]",
                },
              ].map((f) => (
                <div
                  key={f.t}
                  className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-5 shadow-[0_8px_25px_rgba(11,59,143,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200/60 hover:shadow-[0_15px_35px_rgba(11,59,143,0.14)]"
                >
                  <div
                    className={`pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br ${f.gradient} opacity-10 blur-xl transition-opacity group-hover:opacity-25`}
                  />
                  <div
                    className={`relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${f.gradient} shadow-sm`}
                  >
                    <f.icon className="h-4 w-4 text-white" />
                  </div>

                  <div className="relative mt-3 text-sm font-bold text-[#07152f]">
                    {f.t}
                  </div>

                  <div className="relative text-xs text-slate-500">{f.b}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image and sign in */}
          <div className="relative flex min-h-[420px] flex-col items-center justify-center gap-6 motion-safe:animate-in motion-safe:slide-in-from-right-4 duration-700">
            <div className="relative w-full overflow-hidden rounded-3xl border border-white/80 bg-white/10 shadow-[0_0_0_1px_rgba(241,89,34,0.2),0_18px_38px_rgba(241,89,34,0.24),0_28px_70px_rgba(11,59,143,0.18)] backdrop-blur-[1px]">
              <img
                src={creamHeroImage}
                alt="EXO moisture intensive creams and oils"
                width={1200}
                height={900}
                fetchPriority="high"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.src = "/packs.png";
                }}
                className="block h-full w-full object-cover"
              />

              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-[#0b3b8f]/15"
                aria-hidden="true"
              />

              <div
                className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/60"
                aria-hidden="true"
              />
            </div>

            {!signInOpen ? (
              <Button
                size="lg"
                className="group rounded-full bg-gradient-to-r from-[#0b3b8f] via-[#1557b0] to-[#f15922] px-8 font-bold text-white shadow-lg shadow-blue-900/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/30"
                onClick={() => setSignInOpen(true)}
              >
                Sign in{" "}
                <ArrowRight
                  className="transition-transform group-hover:translate-x-1"
                  data-icon="inline-end"
                />
              </Button>
            ) : (
              <Card className="relative w-full overflow-hidden border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(11,59,143,0.18)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
                {/* Gradient accent bar */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f15922] via-[#8b5cf6] to-[#0b3b8f]" />

                <div className="mb-5">
                  <h2 className="bg-gradient-to-r from-[#0b3b8f] to-[#f15922] bg-clip-text text-xl font-bold text-transparent">
                    Sign in
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Staff access only. Accounts are created by the manager.
                  </p>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-gradient-to-r from-orange-50/80 to-blue-50/80 p-1">
                  {(["cashier", "manager"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`rounded-md px-3 py-2 text-sm font-bold capitalize transition ${
                        tab === t
                          ? "bg-white text-[#0b3b8f] shadow-sm"
                          : "text-slate-500 hover:text-[#f15922]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {tab === "cashier" ? (
                  <form onSubmit={handleCashier} className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="code1"
                        className="font-semibold text-[#0b3b8f]"
                      >
                        Access code 1
                      </Label>

                      <Input
                        id="code1"
                        value={c1}
                        onChange={(e) => setC1(e.target.value)}
                        autoComplete="off"
                        className="border-blue-100 bg-white/90 focus-visible:ring-[#f15922]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="code2"
                        className="font-semibold text-[#0b3b8f]"
                      >
                        Access code 2
                      </Label>

                      <Input
                        id="code2"
                        type="password"
                        value={c2}
                        onChange={(e) => setC2(e.target.value)}
                        autoComplete="off"
                        className="border-blue-100 bg-white/90 focus-visible:ring-[#f15922]"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#f15922] to-[#d94816] font-bold text-white shadow-md shadow-orange-500/30 hover:shadow-lg hover:shadow-orange-500/40"
                      disabled={busy}
                    >
                      {busy ? "Opening the till..." : "Open the till"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleManager} className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="font-semibold text-[#0b3b8f]"
                      >
                        Email
                      </Label>

                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        className="border-blue-100 bg-white/90 focus-visible:ring-[#f15922]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="password"
                        className="font-semibold text-[#0b3b8f]"
                      >
                        Password
                      </Label>

                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="border-blue-100 bg-white/90 focus-visible:ring-[#f15922]"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#0b3b8f] to-[#1557b0] font-bold text-white shadow-md shadow-blue-900/30 hover:shadow-lg hover:shadow-blue-900/40"
                      disabled={busy}
                    >
                      {busy ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                )}

                <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-[#f15922]" />
                  Every sale is recorded against the person signed in.
                </div>
              </Card>
            )}
          </div>
        </section>

        {/* Trust strip */}
        <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_8px_25px_rgba(11,59,143,0.08)] backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f15922] via-[#8b5cf6] to-[#0b3b8f]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {trustItems.map(({ icon: TrustIcon, title, body }, index) => (
              <div
                key={title}
                className={`relative flex items-center gap-3 px-4 py-2 ${
                  index > 0 ? "lg:border-l lg:border-blue-100/60" : ""
                }`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-100 via-white to-blue-100 text-[#0b3b8f] shadow-sm">
                  <TrustIcon className="h-5 w-5" />
                </span>

                <div>
                  <div className="text-xs font-bold tracking-wide text-[#f15922]">
                    {title}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Product range */}
        <section
          id="range"
          className="relative mt-24 overflow-hidden rounded-[2rem] border border-white/70 px-4 py-8 shadow-[0_20px_50px_rgba(11,59,143,0.10)] sm:px-8"
        >
          <img
            src={sectionBackdropImage}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 size-full object-cover opacity-70"
          />

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/85 via-white/55 to-blue-50/60"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#f15922]/10 via-transparent to-[#0b3b8f]/10"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#f15922]">
                EXO skincare
              </span>

              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#07152f]">
                The Ignited BrandZ range
              </h2>

              <p className="mt-2 max-w-2xl text-slate-600">
                Creams and oils that work together - moisture first, then
                repair.
              </p>
            </div>

            <div className="hidden h-1 w-24 rounded-full bg-gradient-to-r from-[#f15922] to-[#0b3b8f] sm:block" />
          </div>

          <div className="relative z-10 mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p, index) => (
              <article
                key={p.name}
                className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-[0_8px_25px_rgba(11,59,143,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200/60 hover:shadow-[0_18px_40px_rgba(11,59,143,0.15)] motion-safe:animate-in motion-safe:fade-in duration-700"
              >
                {/* Top accent bar: alternating orange / blue */}
                <div
                  className={`absolute inset-x-0 top-0 z-10 h-1 ${
                    index % 2 === 0
                      ? "bg-gradient-to-r from-[#0b3b8f] to-[#1557b0]"
                      : "bg-gradient-to-r from-[#f15922] to-[#ff8a4a]"
                  }`}
                />

                <div className="relative grid aspect-square place-items-center overflow-hidden bg-gradient-to-br from-orange-50/70 via-white to-blue-50/70 p-5">
                  <img
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.src = "/packs.png";
                    }}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="p-5">
                  <div className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f15922]">
                    <Star className="h-2.5 w-2.5" />
                    EXO skincare
                  </div>

                  <h3 className="font-bold leading-snug text-[#07152f]">
                    {p.name}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {p.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Shades */}
        <section
          id="shades"
          className="relative mt-24 overflow-hidden rounded-[2rem] border border-white/70 px-4 py-8 shadow-[0_20px_50px_rgba(11,59,143,0.10)] sm:px-8"
        >
          <img
            src={sectionBackdropImage}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 size-full object-cover opacity-70"
          />

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/85 via-white/55 to-orange-50/60"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-[#0b3b8f]/10 via-transparent to-[#f15922]/10"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#f15922]">
              Product identification
            </span>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#07152f]">
              Shades & variants
            </h2>

            <p className="mt-2 max-w-2xl text-slate-600">
              The colour of each cap and lid tells you which oil or cream is in
              the bottle.
            </p>

            <div className="relative z-10 mt-8 grid gap-6 lg:grid-cols-2">
              <figure className="group overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_25px_rgba(11,59,143,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200/60 hover:shadow-[0_15px_35px_rgba(11,59,143,0.13)]">
                <div className="overflow-hidden rounded-xl bg-gradient-to-br from-orange-50/70 via-white to-blue-50/70">
                  <img
                    src={productImages.oilColors}
                    alt="Ignited BrandZ oil colour chart showing each oil variant"
                    loading="lazy"
                    decoding="async"
                    className="w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                    onError={(event) => {
                      event.currentTarget.src = "/packs.png";
                    }}
                  />
                </div>

                <figcaption className="mt-3 flex items-center gap-2 text-sm font-bold text-[#0b3b8f]">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#f15922] to-[#0b3b8f]" />
                  Oil colours
                </figcaption>
              </figure>

              <figure className="group overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_25px_rgba(11,59,143,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200/60 hover:shadow-[0_15px_35px_rgba(11,59,143,0.13)]">
                <div className="overflow-hidden rounded-xl bg-gradient-to-br from-blue-50/70 via-white to-orange-50/70">
                  <img
                    src={productImages.creamColors}
                    alt="Ignited BrandZ cream colour chart showing each cream variant"
                    loading="lazy"
                    decoding="async"
                    className="w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                    onError={(event) => {
                      event.currentTarget.src = "/packs.png";
                    }}
                  />
                </div>

                <figcaption className="mt-3 flex items-center gap-2 text-sm font-bold text-[#0b3b8f]">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#0b3b8f] to-[#f15922]" />
                  Cream colours
                </figcaption>
              </figure>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative mt-8 border-t border-white/60 bg-white/70 py-8 text-center text-sm text-slate-500 backdrop-blur-xl">
        <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-gradient-to-r from-[#f15922] to-[#0b3b8f]" />

        <span className="font-semibold text-[#0b3b8f]">
          {new Date().getFullYear()} Ignited BrandZ
        </span>

        <span className="mx-2 text-slate-300">•</span>

        Affordable skincare for healthy skin.

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <CheckCircle2 className="h-3 w-3 text-[#f15922]" />
          Trusted by everyday skin
        </div>
      </footer>
    </div>
  );
}
