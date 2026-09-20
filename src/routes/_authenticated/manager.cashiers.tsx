import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Pencil,
  KeyRound,
  Users,
  Sparkles,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  ShieldX,
  UserPlus,
  UserCog,
  Hash,
  ImagePlus,
} from "lucide-react";
import {
  listCashiers,
  createCashier,
  updateCashier,
  deleteCashier,
} from "@/lib/cashier-auth.functions";
import { fileToCompressedDataUrl } from "@/lib/image-utils";

export const Route = createFileRoute("/_authenticated/manager/cashiers")({
  component: CashiersPage,
});

type Row = {
  id: string;
  name: string;
  code1: string;
  code2: string;
  active: boolean;
  sale_permission: boolean;
  photo_url: string | null;
  created_at: string;
};

type Draft = {
  id: string | null;
  name: string;
  code1: string;
  code2: string;
  active: boolean;
  sale_permission: boolean;
  photo_url: string | null;
};

const emptyDraft: Draft = {
  id: null,
  name: "",
  code1: "",
  code2: "",
  active: true,
  sale_permission: false,
  photo_url: null,
};

// Rotating gradient palette for avatar tiles
const AVATAR_GRADIENTS = [
  "from-indigo-500 to-purple-500",
  "from-orange-500 to-amber-500",
  "from-blue-500 to-cyan-500",
  "from-violet-500 to-fuchsia-500",
  "from-rose-500 to-orange-500",
  "from-teal-500 to-emerald-500",
];

function CashiersPage() {
  const qc = useQueryClient();
  const load = useServerFn(listCashiers);
  const add = useServerFn(createCashier);
  const edit = useServerFn(updateCashier);
  const remove = useServerFn(deleteCashier);

  const [draft, setDraft] = useState<Draft | null>(null);

  const cashiers = useQuery({
    queryKey: ["cashier-accounts"],
    queryFn: async () => (await load({ data: undefined as never })) as unknown as Row[],
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (d.id) {
        await edit({
          data: {
            id: d.id,
            name: d.name,
            code1: d.code1,
            code2: d.code2,
            active: d.active,
            sale_permission: d.sale_permission,
            photo_url: d.photo_url,
          },
        });
      } else {
        await add({ data: { name: d.name, code1: d.code1, code2: d.code2, photo_url: d.photo_url } });
      }
    },
    onSuccess: () => {
      toast.success("Cashier saved");
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["cashier-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await remove({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Cashier removed");
      void qc.invalidateQueries({ queryKey: ["cashier-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = cashiers.data ?? [];
  const activeCount = list.filter((c) => c.active).length;
  const sellerCount = list.filter((c) => c.sale_permission).length;

  return (
    <div className="relative p-6 md:p-10">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Cashiers
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Add each cashier and give them their own pair of access codes. They sign in on the home
                page with those two codes only.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setDraft({ ...emptyDraft })}
            className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40"
          >
            <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            Add cashier
          </Button>
        </header>

        {/* Stat strip */}
        {list.length > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {/* Total */}
            <Card className="group relative overflow-hidden border-indigo-100/60 bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10">
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    Total cashiers
                  </span>
                  <div className="mt-1 bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-2xl font-extrabold tabular-nums text-transparent">
                    {list.length}
                  </div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                  <Users className="h-4 w-4 text-white" />
                </div>
              </div>
            </Card>

            {/* Active */}
            <Card className="group relative overflow-hidden border-emerald-100/60 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-400/15 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Active accounts
                  </span>
                  <div className="mt-1 bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-2xl font-extrabold tabular-nums text-transparent">
                    {activeCount}
                  </div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
              </div>
            </Card>

            {/* Sellers */}
            <Card className="group relative overflow-hidden border-orange-100/60 bg-gradient-to-br from-white via-orange-50/50 to-amber-50/50 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/10">
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                    Selling enabled
                  </span>
                  <div className="mt-1 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-2xl font-extrabold tabular-nums text-transparent">
                    {sellerCount}
                  </div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/30">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Loading / Error / Grid */}
        {cashiers.isLoading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20" />
              <div className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
                <Sparkles className="h-5 w-5 animate-pulse text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Loading cashiers...</p>
          </div>
        ) : cashiers.error ? (
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-red-500">
                <ShieldX className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-900">Failed to load cashiers</p>
                <p className="mt-0.5 text-xs text-rose-700">{(cashiers.error as Error).message}</p>
              </div>
            </div>
          </Card>
        ) : list.length === 0 ? (
          <Card className="relative overflow-hidden border-dashed border-indigo-200 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 p-12 text-center">
            <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-3xl" />
            <div className="relative flex flex-col items-center gap-4">
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100 shadow-sm">
                <UserPlus className="h-9 w-9 text-indigo-500" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">No cashiers yet</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Add your first cashier to generate their pair of access codes.
                </p>
              </div>
              <Button
                onClick={() => setDraft({ ...emptyDraft })}
                className="mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-purple-500/40"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add first cashier
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((c, index) => {
              const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
              return (
                <Card
                  key={c.id}
                  className="group relative overflow-hidden border-white/60 bg-white/80 shadow-[0_2px_8px_-2px_rgba(79,70,229,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_12px_32px_-8px_rgba(79,70,229,0.25)]"
                >
                  {/* Top gradient accent */}
                  <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} opacity-40 blur-sm`}
                          />
                          {c.photo_url ? (
                            <img
                              src={c.photo_url}
                              alt={c.name}
                              className="relative h-11 w-11 rounded-xl object-cover shadow-md"
                            />
                          ) : (
                            <div
                              className={`relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${gradient} text-base font-bold text-white shadow-md`}
                            >
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-base font-bold text-slate-900">
                            {c.name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {c.active ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <ShieldOff className="h-2.5 w-2.5" />
                                Off
                              </span>
                            )}
                            {c.sale_permission ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                                <ShoppingBag className="h-2.5 w-2.5" />
                                Can sell
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <ShieldX className="h-2.5 w-2.5" />
                                No sell
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                          onClick={() =>
                            setDraft({
                              id: c.id,
                              name: c.name,
                              code1: c.code1,
                              code2: c.code2,
                              active: c.active,
                              sale_permission: c.sale_permission,
                              photo_url: c.photo_url ?? null,
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => {
                            if (confirm(`Remove ${c.name}?`)) del.mutate(c.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Access codes panel */}
                    <div className="relative mt-4 overflow-hidden rounded-xl border border-indigo-100/60 bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-white p-3">
                      <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-xl" />
                      <div className="relative">
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          <KeyRound className="h-3 w-3" />
                          Access codes
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border border-indigo-200/60 bg-white/80 px-2.5 py-1.5">
                            <div className="text-[9px] font-semibold uppercase tracking-wider text-indigo-500">
                              Code 1
                            </div>
                            <div className="mt-0.5 font-mono text-sm font-bold tracking-wider text-indigo-900">
                              {c.code1}
                            </div>
                          </div>
                          <div className="rounded-lg border border-purple-200/60 bg-white/80 px-2.5 py-1.5">
                            <div className="text-[9px] font-semibold uppercase tracking-wider text-purple-500">
                              Code 2
                            </div>
                            <div className="mt-0.5 font-mono text-sm font-bold tracking-wider text-purple-900">
                              {c.code2}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="overflow-hidden border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30 sm:max-w-md">
          {/* Top gradient bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30">
                {draft?.id ? (
                  <UserCog className="h-4 w-4 text-white" />
                ) : (
                  <UserPlus className="h-4 w-4 text-white" />
                )}
              </div>
              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                {draft?.id ? "Edit cashier" : "Add cashier"}
              </span>
            </DialogTitle>
            <DialogDescription>
              The two codes are what the cashier types on the sign-in screen.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(draft);
              }}
            >
              <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-white/70 p-3">
                {draft.photo_url ? (
                  <img
                    src={draft.photo_url}
                    alt="Cashier photo"
                    className="h-16 w-16 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-500">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="cphoto" className="text-xs font-semibold text-slate-700">
                    Cashier photo
                  </Label>
                  <Input
                    id="cphoto"
                    type="file"
                    accept="image/*"
                    className="text-xs"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await fileToCompressedDataUrl(file, 320, 0.8);
                        setDraft((d) => (d ? { ...d, photo_url: url } : d));
                      } catch {
                        toast.error("Could not read that picture. Try a JPG or PNG.");
                      }
                    }}
                  />
                  {draft.photo_url && (
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                      onClick={() => setDraft((d) => (d ? { ...d, photo_url: null } : d))}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cname" className="text-xs font-semibold text-slate-700">
                  Cashier name
                </Label>
                <Input
                  id="cname"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="border-slate-200 bg-white shadow-sm transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ccode1" className="flex items-center gap-1 text-xs font-semibold text-indigo-700">
                    <Hash className="h-3 w-3" />
                    Code 1
                  </Label>
                  <Input
                    id="ccode1"
                    value={draft.code1}
                    onChange={(e) => setDraft({ ...draft, code1: e.target.value.toUpperCase() })}
                    className="border-indigo-200 bg-white font-mono font-bold uppercase tracking-wider text-indigo-900 shadow-sm transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ccode2" className="flex items-center gap-1 text-xs font-semibold text-purple-700">
                    <Hash className="h-3 w-3" />
                    Code 2
                  </Label>
                  <Input
                    id="ccode2"
                    value={draft.code2}
                    onChange={(e) => setDraft({ ...draft, code2: e.target.value.toUpperCase() })}
                    className="border-purple-200 bg-white font-mono font-bold uppercase tracking-wider text-purple-900 shadow-sm transition-all focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              {draft.id && (
                <div className="space-y-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/30">
                        <ShieldCheck className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Account active</div>
                        <div className="text-xs text-slate-500">Controls access to the account.</div>
                      </div>
                    </div>
                    <Switch
                      checked={draft.active}
                      onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                    />
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent" />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm shadow-orange-500/30">
                        <ShoppingBag className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Sale permission</div>
                        <div className="text-xs text-slate-500">Enable selling for this cashier.</div>
                      </div>
                    </div>
                    <Switch
                      checked={draft.sale_permission}
                      onCheckedChange={(v) => setDraft({ ...draft, sale_permission: v })}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40"
                disabled={save.isPending}
              >
                {save.isPending ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                    Saving...
                  </>
                ) : draft.id ? (
                  <>
                    <UserCog className="mr-2 h-4 w-4" />
                    Save changes
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Save cashier
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
