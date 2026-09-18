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
import { Droplets, Leaf, ShieldCheck, Sun, ArrowRight } from "lucide-react";
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
      { property: "og:title", content: "Ignited BrandZ - Till & Stock" },
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
      // Access codes are verified in the database, so no server key is needed.
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
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
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
    <div className="min-h-screen bg-background motion-safe:animate-in motion-safe:fade-in duration-700">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-brand)" }}
        />

        <div
          className="absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full opacity-10 blur-3xl"
          style={{ background: "var(--gradient-brand)" }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-primary/10 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <BrandLogo />

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <a href="#range">Our range</a>
            </Button>

            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <a href="#shades">Shades</a>
            </Button>

            {showInstall && (
              <PWAInstallButton
                variant="outline"
                size="sm"
                className="hidden rounded-full border-primary/15 bg-white px-5 shadow-sm sm:inline-flex"
              />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 md:pt-12">
        <section className="relative grid items-center gap-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-white via-blue-50/80 to-blue-100/70 px-6 py-10 shadow-[var(--shadow-elev-2)] sm:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-14">
          <img
            src={glassFrameBackdropImage}
            alt=""
            aria-hidden
            loading="eager"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="relative motion-safe:animate-in motion-safe:slide-in-from-left-4 duration-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Ignited BrandZ
            </span>

            <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.05em] text-slate-950 md:text-7xl">
              Affordable Skincare Products
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                Healthy Skin.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Affordable creams and tissue oils made for real, everyday skin.
              Triple glycerine moisture, rosehip & Q10 oilsas well as a till
              that keeps every jar and bottle counted.
            </p>

            <Button
              size="lg"
              className="group mt-8 rounded-full px-8 shadow-lg shadow-primary/20"
              onClick={() => setSignInOpen(true)}
            >
              Sign in{" "}
              <ArrowRight
                className="transition-transform group-hover:translate-x-1"
                data-icon="inline-end"
              />
            </Button>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Droplets,
                  t: "72h moisture",
                  b: "Dermatologist tested creams",
                },
                {
                  icon: Leaf,
                  t: "Rosehip & jojoba",
                  b: "High potency tissue oils",
                },
                {
                  icon: Sun,
                  t: "Everyday care",
                  b: "For the whole family",
                },
              ].map((f) => (
                <div
                  key={f.t}
                  className="group rounded-2xl border border-primary/10 bg-white/85 p-5 shadow-[var(--shadow-elev-1)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elev-2)]"
                >
                  <f.icon className="h-5 w-5 text-primary" />
                  <div className="mt-3 text-sm font-semibold">{f.t}</div>
                  <div className="text-xs text-muted-foreground">{f.b}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex min-h-[420px] flex-col items-center justify-center gap-6 motion-safe:animate-in motion-safe:slide-in-from-right-4 duration-700">
            <div className="relative w-full overflow-hidden rounded-3xl shadow-[var(--shadow-elev-2)]">
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
            </div>

            {!signInOpen ? (
              <Button
                size="lg"
                className="group px-8"
                onClick={() => setSignInOpen(true)}
              >
                Sign in{" "}
                <ArrowRight
                  className="transition-transform group-hover:translate-x-1"
                  data-icon="inline-end"
                />
              </Button>
            ) : (
              <Card className="w-full p-6 shadow-[var(--shadow-elev-2)] animate-in fade-in zoom-in-95 duration-500">
                <div className="mb-5">
                  <h2 className="text-xl font-bold">Sign in</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Staff access only. Accounts are created by the manager.
                  </p>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                  {(["cashier", "manager"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`rounded-md px-3 py-2 text-sm font-medium capitalize transition ${
                        tab === t ? "bg-card shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {tab === "cashier" ? (
                  <form onSubmit={handleCashier} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code1">Access code 1</Label>
                      <Input
                        id="code1"
                        value={c1}
                        onChange={(e) => setC1(e.target.value)}
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="code2">Access code 2</Label>
                      <Input
                        id="code2"
                        type="password"
                        value={c2}
                        onChange={(e) => setC2(e.target.value)}
                        autoComplete="off"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={busy}
                    >
                      {busy ? "Opening the till..." : "Open the till"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleManager} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={busy}
                    >
                      {busy ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                )}

                <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Every sale is recorded against the person signed in.
                </div>
              </Card>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-4 rounded-3xl border border-white/70 bg-white/75 p-5 shadow-[var(--shadow-elev-1)] backdrop-blur sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {trustItems.map(({ icon: TrustIcon, title, body }, index) => {
            return (
              <div
                key={title}
                className={`flex items-center gap-3 px-4 py-2 ${
                  index > 0 ? "lg:border-l lg:border-primary/15" : ""
                }`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 text-primary">
                  <TrustIcon className="h-5 w-5" />
                </span>

                <div>
                  <div className="text-xs font-bold tracking-wide text-primary">
                    {title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {body}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section id="range" className="relative mt-24 overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <img
            src={sectionBackdropImage}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight">
            The Ignited BrandZ range
          </h2>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            Creams and oils that work together - moisture first, then repair.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <article
                key={p.name}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elev-1)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elev-2)] motion-safe:animate-in motion-safe:fade-in duration-700"
              >
                <div className="grid aspect-square place-items-center bg-gradient-to-br from-blue-50 to-slate-100 p-5">
                  <img
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.src = "/packs.png";
                    }}
                    className="h-full w-full object-contain transition group-hover:scale-[1.03]"
                  />
                </div>

                <div className="p-5">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    EXO skincare
                  </div>

                  <h3 className="font-semibold">{p.name}</h3>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
          </div>
        </section>

        <section id="shades" className="relative mt-24 overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <img
            src={sectionBackdropImage}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight">
            Shades & variants
          </h2>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            The colour of each cap and lid tells you which oil or cream is in
            the bottle.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <figure className="overflow-hidden rounded-2xl border border-border bg-card p-4">
              <img
                src={productImages.oilColors}
                alt="Ignited BrandZ oil colour chart showing each oil variant"
                loading="lazy"
                decoding="async"
                className="w-full rounded-lg object-contain"
                onError={(event) => {
                  event.currentTarget.src = "/packs.png";
                }}
              />

              <figcaption className="mt-3 text-sm font-medium">
                Oil colours
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-2xl border border-border bg-card p-4">
              <img
                src={productImages.creamColors}
                alt="Ignited BrandZ cream colour chart showing each cream variant"
                loading="lazy"
                decoding="async"
                className="w-full rounded-lg object-contain"
                onError={(event) => {
                  event.currentTarget.src = "/packs.png";
                }}
              />

              <figcaption className="mt-3 text-sm font-medium">
                Cream colours
              </figcaption>
            </figure>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        {new Date().getFullYear()} Ignited BrandZ. Affordable skincare for
        healthy skin.
      </footer>
    </div>
  );
}
