import { createFileRoute } from "@tanstack/react-router";
import oilColors from "@/assets/oil-colors.jpg.asset.json";
import creamColors from "@/assets/cream-colors.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/manager/colours")({
  component: ColoursPage,
});

function ColoursPage() {
  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Colour charts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reference for oil and cream variants when adding products or serving a customer.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <figure className="rounded-2xl border border-border bg-card p-4">
          <img src={oilColors.url} alt="EXO oil colours" className="w-full rounded-lg object-contain" />
          <figcaption className="mt-3 font-medium">Oil colours</figcaption>
        </figure>
        <figure className="rounded-2xl border border-border bg-card p-4">
          <img src={creamColors.url} alt="EXO cream colours" className="w-full rounded-lg object-contain" />
          <figcaption className="mt-3 font-medium">Cream colours</figcaption>
        </figure>
      </div>
    </div>
  );
}
