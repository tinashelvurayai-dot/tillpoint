import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import { cashierSignIn } from "@/lib/cashier-auth.functions";
import oilColors from "@/assets/oil-colors.jpg.asset.json";
import creamColors from "@/assets/cream-colors.jpg.asset.json";
import rosehip from "@/assets/Rosehip-125ml-Box-Mock-up.png.asset.json";
import q10 from "@/assets/q10-125ml-Box-Mock-up.png.asset.json";
import tissueOil from "@/assets/Tissue-Oil-125ml-Box-Mock-up.png.asset.json";
import camphor from "@/assets/exo-camphor.png.asset.json";
import creamMen from "@/assets/exo-cream-men.png.asset.json";
import glycerine from "@/assets/exo-glycerine.png.asset.json";
import tissueCream from "@/assets/exo-tissue-cream.png.asset.json";

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
        content: "Sign in to the EXO till to sell creams and oils and follow daily takings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const creamHeroImage = "/packs.png";
const productImages = {
  scar: rosehip.url,
  firming: q10.url,
  tissue: tissueOil.url,
};

const products = [
  {
    img: tissueCream.url,
    name: "Tissue Oil Cream",
    body: "Triple glycerine with tissue oil and essential oils. Dermatologist tested for 72 hour moisturisation.",
  },
  {
    img: glycerine.url,
    name: "Triple Glycerine Cream",
    body: "Three times the glycerine, non-greasy, dermatologically tested for 48 hour moisturisation.",
  },
  {
    img: camphor.url,
    name: "Triple Intensive Camphor",
    body: "Camphor cream with triple glycerine and essential oils to restore, rejuvenate and repair.",
  },
  {
    img: creamMen.url,
    name: "Tissue Oil Cream 450ml - Men",
    body: "A richer tin for men. Tissue oil and essential oils with 72 hour moisturisation.",
  },
  {
    img: productImages.tissue,
    name: "Tissue Oil 125ml",
    body: "A high potency, non-greasy oil concentrate for scars, stretch marks, dehydrated and ageing skin.",
  },
  {
    img: productImages.scar,
    name: "Scar & Stretch Mark Oil",
    body: "Rosehip and jojoba tissue oil that softens the look of scars, stretch marks and dry skin.",
  },
  {
    img: productImages.firming,
    name: "Skin Firming & Toning Oil",
    body: "Q10 tissue oil for fine lines, uneven tone, elasticity and everyday vitality.",
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
  const signInWithCodes = useServerFn(cashierSignIn);

  async function handleCashier(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await signInWithCodes({ data: { code1: c1, code2: c2 } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        token_hash: res.tokenHash,
        type: "email",
      });
      if (error) {
        toast.error("Could not open the till. Please try again.");
        return;
      }
      setMode("cashier");
      toast.success(`Welcome, ${res.name}`);
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
  if (session && role === "manager") return <Navigate to="/manager" />;
  if (session && role === "cashier") return <Navigate to="/cashier" />;

  const trustItems: Array<{ icon: typeof ShieldCheck; title: string; body: string }> = [
    { icon: ShieldCheck, title: "DERMATOLOGIST TESTED", body: "Gentle & safe for everyday use" },
    { icon: Leaf, title: "QUALITY INGREDIENTS", body: "Rosehip, jojoba & Q10 oils" },
    { icon: ArrowRight, title: "HONEST PRICING", body: "Premium care that’s affordable" },
    { icon: Droplets, title: "FOR THE WHOLE FAMILY", body: "Care for every skin type" },
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
        <section className="grid items-center gap-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-white via-blue-50/80 to-blue-100/70 px-6 py-10 shadow-[var(--shadow-elev-2)] sm:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-14">
          <div className="motion-safe:animate-in motion-safe:slide-in-from-left-4 duration-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Ignited BrandZ
            </span>
            <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.05em] text-slate-950 md:text-7xl">
              Healthy skin,
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                honestly priced.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Affordable creams and tissue oils made for real, everyday skin. Triple glycerine
              moisture, rosehip & Q10 oilsas well as a till that keeps every jar and bottle counted.
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
                { icon: Droplets, t: "72h moisture", b: "Dermatologist tested creams" },
                { icon: Leaf, t: "Rosehip & jojoba", b: "High potency tissue oils" },
                { icon: Sun, t: "Everyday care", b: "For the whole family" },
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

          <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 motion-safe:animate-in motion-safe:slide-in-from-right-4 duration-700">
            <div className="relative w-full overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary via-blue-700 to-slate-950 p-3 shadow-[var(--shadow-elev-2)]">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_42%)]"
                aria-hidden="true"
              />
              <img
                src="/exo-logo.png"
                alt="EXO logo"
                className="relative mx-auto w-full max-w-[34rem] object-contain drop-shadow-2xl"
              />
              <img
                src={creamHeroImage}
                alt="Ignited BrandZ cream collection"
                className="relative mt-2 w-full object-contain"
              />
            </div>
            {!signInOpen ? (
              <Button size="lg" className="group px-8" onClick={() => setSignInOpen(true)}>
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
                    <Button type="submit" className="w-full" disabled={busy}>
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
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                )}

                <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Every sale is recorded against
                  the person signed in.
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
                className={`flex items-center gap-3 px-4 py-2 ${index > 0 ? "lg:border-l lg:border-primary/15" : ""}`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 text-primary">
                  <TrustIcon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-xs font-bold tracking-wide text-primary">{title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{body}</div>
                </div>
              </div>
            );
          })}
        </section>

        <section id="range" className="mt-24">
          <h2 className="text-3xl font-bold tracking-tight">The Ignited BrandZ range</h2>
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
                    className="h-full w-full object-contain transition group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-5">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    EXO skincare
                  </div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="shades" className="mt-24">
          <h2 className="text-3xl font-bold tracking-tight">Shades & variants</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The colour of each cap and lid tells you which oil or cream is in the bottle.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <figure className="overflow-hidden rounded-2xl border border-border bg-card p-4">
              <img
                src={oilColors.url}
                alt="Ignited BrandZ oil colour chart showing each oil variant"
                loading="lazy"
                className="w-full rounded-lg object-contain"
              />
              <figcaption className="mt-3 text-sm font-medium">Oil colours</figcaption>
            </figure>
            <figure className="overflow-hidden rounded-2xl border border-border bg-card p-4">
              <img
                src={creamColors.url}
                alt="Ignited BrandZ cream colour chart showing each cream variant"
                loading="lazy"
                className="w-full rounded-lg object-contain"
              />
              <figcaption className="mt-3 text-sm font-medium">Cream colours</figcaption>
            </figure>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        {new Date().getFullYear()} Ignited BrandZ. Affordable skincare for healthy skin.
      </footer>
    </div>
  );
}
