import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Package as PackageIcon,
  Camera,
  Upload,
  Pencil,
  ImageOff,
  ImageIcon,
  Search,
  X,
  Sparkles,
  Layers,
  Tag,
  DollarSign,
  Boxes,
  Hash,
  Palette,
  Ruler,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { fileToCompressedDataUrl } from "@/lib/image-utils";
import { Switch } from "@/components/ui/switch";
import { useHideImages } from "@/hooks/use-hide-images";

export const Route = createFileRoute("/_authenticated/manager/products")({
  component: ProductsPage,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  base_price: number | null;
  active: boolean;
  variants: Array<{
    id: string;
    variant_name: string;
    size: string | null;
    flavour: string | null;
    price: number;
    sku: string | null;
    stock: { quantity: number } | null;
  }>;
};

const SIZES = ["Small", "Medium", "Large", "XL", "One Size"] as const;
const CATEGORIES = ["Personal Care"] as const;

const homepageProductCatalog = [
  ["EXO Moisture Intensive Tissue Oil Cream", "https://i.postimg.cc/HkQNSkRh/e.png"],
  ["EXO Moisture Intensive Triple Glycerine Cream", "https://i.postimg.cc/vZbRwnWf/a.png"],
  ["EXO Triple Intensive Camphor Cream", "https://i.postimg.cc/rwrTqTbx/f.png"],
  ["EXO Q10 Firming Triple Glycerine Cream", "https://i.postimg.cc/YCGrjYvT/d.png"],
  ["EXO Max Moisture Triple Glycerine Cream", "https://i.postimg.cc/FzpRgvvM/c.png"],
  ["Tissue Oil Cream 450ml (Men)", "https://i.postimg.cc/Kv5LJXQY/50ml-Exo-Tissue-oil-Men-768x802.png"],
  ["EXO Tissue Oil (125ml)", "https://i.postimg.cc/yNGfkTBH/Whats-App-Image-2026-09-07-at-9-24-42-AM.jpg"],
  ["Skin Firming & Toning Oil (125ml)", "https://i.postimg.cc/mgRKsV2b/Whats-App-Image-2026-09-07-at-9-24-43-AM.jpg"],
  ["Scar & Stretch Mark Oil (125ml)", "https://i.postimg.cc/BvpY4G7J/Whats-App-Image-2026-09-07-at-9-24-43-AM-(1).jpg"],
] as const;

// Rotating gradient palette for product cards
const PRODUCT_GRADIENTS = [
  "from-indigo-500 to-purple-500",
  "from-orange-500 to-amber-500",
  "from-blue-500 to-cyan-500",
  "from-violet-500 to-fuchsia-500",
  "from-rose-500 to-orange-500",
  "from-teal-500 to-emerald-500",
];

function ProductImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    if (!files || !files[0]) return;
    try {
      const url = await fileToCompressedDataUrl(files[0]);
      onChange(url);
    } catch {
      toast.error("Could not read image");
    }
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
        Product photo
      </Label>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-20 blur-md" />
          <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
            {value ? (
              <img src={value} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <PackageIcon className="h-7 w-7 text-indigo-300" />
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => camRef.current?.click()}
            className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
          >
            <Camera className="mr-2 h-4 w-4" /> Take photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
          >
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              className="hover:bg-rose-50 hover:text-rose-600"
            >
              Remove
            </Button>
          )}
        </div>
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
      </div>
    </div>
  );
}

function ProductsPage() {
  const qc = useQueryClient();
  const [openNewProduct, setOpenNewProduct] = useState(false);
  const [variantFor, setVariantFor] = useState<Product | null>(null);
  const [image, setImage] = useState("");
  const [editingVariant, setEditingVariant] = useState<{ id: string; price: number } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editImage, setEditImage] = useState("");
  const [hideImages, setHideImages] = useHideImages();
  const [search, setSearch] = useState("");

  const products = useQuery({
    queryKey: ["products", "with-variants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, description, category, image_url, base_price, active, variants:product_variants(id, variant_name, size, flavour, price, sku, stock(quantity))",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const createProduct = useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      category: string;
      base_price: number;
      image_url: string;
    }) => {
      const { data: existing, error: lookupError } = await supabase
        .from("products")
        .select("id")
        .ilike("name", input.name.trim())
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing)
        throw new Error(
          "A product with this name already exists. Add a variant to the existing product instead.",
        );
      const { data: user } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from("products")
        .insert({
          name: input.name,
          description: input.description || null,
          category: input.category || null,
          base_price: input.base_price || null,
          image_url: input.image_url || null,
          created_by: user.user?.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: variantError } = await supabase.from("product_variants").insert({
        product_id: created.id,
        variant_name: "Standard",
        price: input.base_price || 0,
        image_url: input.image_url || null,
      });
      if (variantError) throw variantError;
    },
    onSuccess: () => {
      toast.success("Product created - a Standard variant was added so it appears in Stock");
      ["products", "stock", "stock-in-variants", "cashier", "alerts"].forEach((key) =>
        qc.invalidateQueries({ queryKey: [key], refetchType: "all" }),
      );
      setOpenNewProduct(false);
      setImage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateProduct = useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      description: string;
      category: string;
      base_price: number;
      image_url: string;
    }) => {
      const { error } = await supabase
        .from("products")
        .update({
          name: input.name,
          description: input.description || null,
          category: input.category || null,
          base_price: input.base_price || null,
          image_url: input.image_url || null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product updated");
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditingProduct(null);
      setEditImage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visibleProducts = products.data?.length
    ? products.data
    : homepageProductCatalog.map(([name, image_url], index) => ({
        id: `homepage-${index}`,
        name,
        description: "Featured EXO skincare product from the home page catalog.",
        category: "Personal Care",
        image_url,
        base_price: null,
        active: true,
        variants: [],
      }));

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return visibleProducts;
    return visibleProducts.filter((p) =>
      [
        p.name,
        p.category ?? "",
        p.description ?? "",
        ...p.variants.flatMap((v) => [v.variant_name, v.sku ?? ""]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [visibleProducts, search]);

  function openEdit(p: Product) {
    setEditingProduct(p);
    setEditImage(p.image_url ?? "");
  }

  const createVariant = useMutation({
    mutationFn: async (input: {
      product_id: string;
      variant_name: string;
      size: string;
      flavour: string;
      price: number;
      sku: string;
      initial_qty: number;
    }) => {
      const { data, error } = await supabase
        .from("product_variants")
        .insert({
          product_id: input.product_id,
          variant_name: input.variant_name,
          size: (input.size || null) as "Small" | "Medium" | "Large" | "XL" | "One Size" | null,
          flavour: input.flavour || null,
          price: input.price,
          sku: input.sku || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (input.initial_qty > 0) {
        await supabase
          .from("stock")
          .update({ quantity: input.initial_qty })
          .eq("variant_id", data.id);
      }
    },
    onSuccess: () => {
      toast.success("Variant added");
      ["products", "stock", "stock-in-variants", "cashier", "alerts"].forEach((key) =>
        qc.invalidateQueries({ queryKey: [key], refetchType: "all" }),
      );
      setVariantFor(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase.from("product_variants").update({ price }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Price updated");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      setEditingVariant(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Variant removed");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product removed");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="relative p-4 sm:p-6 md:p-10">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-400/10 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-orange-400/10 to-amber-400/10 blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 opacity-30 blur-md" />
              <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30">
                <PackageIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                Products
              </h1>
              <p className="mt-1 text-sm text-slate-500">Manage your catalog and variants.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Hide images toggle */}
            <label className="group flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/40 px-3 py-2 text-sm shadow-sm transition-all hover:border-indigo-200 hover:shadow-md">
              {hideImages ? (
                <EyeOff className="h-4 w-4 text-indigo-500" />
              ) : (
                <Eye className="h-4 w-4 text-indigo-500" />
              )}
              <span className="text-xs font-semibold text-slate-600">Hide images</span>
              <Switch checked={hideImages} onCheckedChange={setHideImages} />
            </label>

            {/* New product dialog */}
            <Dialog
              open={openNewProduct}
              onOpenChange={(o) => {
                setOpenNewProduct(o);
                if (!o) setImage("");
              }}
            >
              <DialogTrigger asChild>
                <Button className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40">
                  <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  New product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-auto border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30">
                      <Plus className="h-4 w-4 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                      New product
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    createProduct.mutate({
                      name: String(fd.get("name") ?? "").trim(),
                      description: String(fd.get("description") ?? ""),
                      category: String(fd.get("category") ?? ""),
                      base_price: parseFloat(String(fd.get("base_price") ?? "0")) || 0,
                      image_url: image,
                    });
                  }}
                  className="space-y-4"
                >
                  <ProductImagePicker value={image} onChange={setImage} />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Tag className="h-3.5 w-3.5 text-indigo-500" />
                      Name
                    </Label>
                    <Input
                      name="name"
                      required
                      maxLength={100}
                      className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Layers className="h-3.5 w-3.5 text-indigo-500" />
                      Category
                    </Label>
                    <Select name="category" defaultValue="Personal Care">
                      <SelectTrigger className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <DollarSign className="h-3.5 w-3.5 text-indigo-500" />
                      Base price (optional)
                    </Label>
                    <Input
                      name="base_price"
                      type="number"
                      step="0.01"
                      min="0"
                      className="border-slate-200 bg-white font-semibold shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Description</Label>
                    <Textarea
                      name="description"
                      rows={3}
                      maxLength={500}
                      className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createProduct.isPending}
                      className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40"
                    >
                      {createProduct.isPending ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create product
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Search */}
        <div className="mb-6 max-w-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, variants, categories, or SKUs"
              aria-label="Search products"
              className="border-slate-200 bg-white/90 pl-9 pr-10 shadow-sm backdrop-blur-sm transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
            {search.length > 0 && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {products.isLoading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 animate-ping rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20" />
              <div className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
                <Sparkles className="h-5 w-5 animate-pulse text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Loading products...</p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <Card className="relative overflow-hidden border-dashed border-indigo-200 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 p-12 text-center">
            <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-3xl" />
            <div className="relative flex flex-col items-center gap-4">
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-100 to-orange-100">
                <PackageIcon className="h-9 w-9 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">No products yet</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create your first product to get started.
                </p>
              </div>
            </div>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card className="relative overflow-hidden border-dashed border-indigo-200 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 p-12 text-center">
            <div className="relative flex flex-col items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100">
                <Search className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">No matches found</p>
                <p className="mt-0.5 text-xs text-slate-500">Try a different search term.</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((p, index) => {
              const gradient = PRODUCT_GRADIENTS[index % PRODUCT_GRADIENTS.length];
              return (
                <Card
                  key={p.id}
                  className="group relative flex flex-col overflow-hidden border-white/60 bg-white/80 shadow-[0_2px_8px_-2px_rgba(79,70,229,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_12px_32px_-8px_rgba(79,70,229,0.25)]"
                >
                  {/* Top gradient accent */}
                  <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

                  {!hideImages && (
                    <div className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden bg-gradient-to-br from-slate-50 to-indigo-50/50">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <PackageIcon className="h-10 w-10 text-indigo-300" />
                      )}
                      {/* Category pill floating on image */}
                      {p.category && (
                        <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 shadow-sm backdrop-blur-sm">
                          {p.category}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-bold leading-tight text-slate-900 transition-colors group-hover:text-indigo-700">
                      {p.name}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {hideImages && p.category && (
                        <Badge className="border-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm shadow-indigo-500/20">
                          {p.category}
                        </Badge>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        <Layers className="h-2.5 w-2.5" />
                        {p.variants.length} variant{p.variants.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {p.description && (
                      <p className="mt-3 line-clamp-2 text-xs text-slate-500">{p.description}</p>
                    )}

                    {p.variants.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {p.variants.map((v) => (
                          <div
                            key={v.id}
                            className="group/variant flex items-center justify-between rounded-xl border border-indigo-100/60 bg-gradient-to-r from-white to-indigo-50/30 px-3 py-2.5 text-sm transition-all hover:border-indigo-200 hover:shadow-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-slate-800">
                                {v.variant_name}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 truncate text-[10px] text-slate-500">
                                {(v.size || v.flavour) && (
                                  <span className="truncate">
                                    {[v.size, v.flavour].filter(Boolean).join(" · ")}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-600">
                                  <Boxes className="h-2.5 w-2.5" />
                                  {v.stock?.quantity ?? 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5 pl-2">
                              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-sm font-bold tabular-nums text-transparent">
                                {formatCurrency(v.price)}
                              </span>
                              <button
                                title="Edit price"
                                onClick={() =>
                                  setEditingVariant({ id: v.id, price: Number(v.price) })
                                }
                                className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() =>
                                  confirm("Remove variant?") && deleteVariant.mutate(v.id)
                                }
                                className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(p)}
                        className="flex-1 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVariantFor(p)}
                        className="flex-1 border-purple-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Variant
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          confirm(`Delete ${p.name}?`) && deleteProduct.mutate(p.id)
                        }
                        className="text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add variant dialog */}
      <Dialog open={!!variantFor} onOpenChange={(o) => !o && setVariantFor(null)}>
        <DialogContent className="max-h-[90vh] overflow-auto border-purple-100 bg-gradient-to-b from-white to-purple-50/30">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-md shadow-purple-500/30">
                <Layers className="h-4 w-4 text-white" />
              </div>
              <span className="bg-gradient-to-r from-purple-700 to-fuchsia-700 bg-clip-text text-transparent">
                Add variant to {variantFor?.name}
              </span>
            </DialogTitle>
          </DialogHeader>
          {variantFor && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createVariant.mutate({
                  product_id: variantFor.id,
                  variant_name: String(fd.get("variant_name") ?? "").trim(),
                  size: String(fd.get("size") ?? ""),
                  flavour: String(fd.get("flavour") ?? ""),
                  price: parseFloat(String(fd.get("price") ?? "0")),
                  sku: String(fd.get("sku") ?? ""),
                  initial_qty: parseInt(String(fd.get("initial_qty") ?? "0"), 10) || 0,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Tag className="h-3.5 w-3.5 text-purple-500" />
                  Variant name
                </Label>
                <Input
                  name="variant_name"
                  required
                  placeholder="e.g. Wild Rose, Blue Ocean"
                  className="border-slate-200 bg-white shadow-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Ruler className="h-3.5 w-3.5 text-purple-500" />
                    Size
                  </Label>
                  <Select name="size">
                    <SelectTrigger className="border-slate-200 bg-white shadow-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Palette className="h-3.5 w-3.5 text-purple-500" />
                    Flavour / color
                  </Label>
                  <Input
                    name="flavour"
                    className="border-slate-200 bg-white shadow-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <DollarSign className="h-3.5 w-3.5 text-purple-500" />
                    Price
                  </Label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="border-slate-200 bg-white font-semibold shadow-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Hash className="h-3.5 w-3.5 text-purple-500" />
                    SKU (optional)
                  </Label>
                  <Input
                    name="sku"
                    className="border-slate-200 bg-white font-mono shadow-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Boxes className="h-3.5 w-3.5 text-purple-500" />
                  Initial stock
                </Label>
                <Input
                  name="initial_qty"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="border-slate-200 bg-white shadow-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createVariant.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 bg-[length:200%_100%] shadow-lg shadow-purple-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-fuchsia-500/40"
                >
                  {createVariant.isPending ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add variant
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit price dialog */}
      <Dialog open={!!editingVariant} onOpenChange={(o) => !o && setEditingVariant(null)}>
        <DialogContent className="border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Edit price
              </span>
            </DialogTitle>
          </DialogHeader>
          {editingVariant && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const price = parseFloat(String(fd.get("price") ?? "0"));
                if (price >= 0) updatePrice.mutate({ id: editingVariant.id, price });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">New price</Label>
                <Input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingVariant.price}
                  required
                  autoFocus
                  className="border-slate-200 bg-white font-bold shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updatePrice.isPending}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-purple-500/40"
                >
                  Save price
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit product dialog */}
      <Dialog
        open={!!editingProduct}
        onOpenChange={(o) => {
          if (!o) {
            setEditingProduct(null);
            setEditImage("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-auto border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/30">
                <Pencil className="h-4 w-4 text-white" />
              </div>
              <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Edit product
              </span>
            </DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                updateProduct.mutate({
                  id: editingProduct.id,
                  name: String(fd.get("name") ?? "").trim(),
                  description: String(fd.get("description") ?? ""),
                  category: String(fd.get("category") ?? ""),
                  base_price: parseFloat(String(fd.get("base_price") ?? "0")) || 0,
                  image_url: editImage,
                });
              }}
              className="space-y-4"
            >
              <ProductImagePicker value={editImage} onChange={setEditImage} />

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Tag className="h-3.5 w-3.5 text-indigo-500" />
                  Name
                </Label>
                <Input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={editingProduct.name}
                  className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  Category
                </Label>
                <Input
                  name="category"
                  readOnly
                  value="Personal Care"
                  className="border-slate-200 bg-slate-50 text-slate-500 shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <DollarSign className="h-3.5 w-3.5 text-indigo-500" />
                  Base price (optional)
                </Label>
                <Input
                  name="base_price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingProduct.base_price ?? ""}
                  className="border-slate-200 bg-white font-semibold shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Description</Label>
                <Textarea
                  name="description"
                  rows={3}
                  maxLength={500}
                  defaultValue={editingProduct.description ?? ""}
                  className="border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateProduct.isPending}
                  className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-purple-500/40"
                >
                  {updateProduct.isPending ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Pencil className="mr-2 h-4 w-4" />
                      Save changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
