import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SearchBar } from "@/components/SearchBar";
import { ProviderCard } from "@/components/ProviderCard";
import { demoProviders } from "@/data/demo";
import { serviceCategories } from "@/config/marketplace";
import { searchMarketplaceFn } from "@/server/marketplace.functions";

const searchSchema = z.object({ q: z.string().optional(), location: z.string().optional() });
export const Route = createFileRoute("/marketplace")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q, location: search.location }),
  loader: ({ deps }) => searchMarketplaceFn({ data: deps }),
  component: Marketplace,
});

function Marketplace() {
  const search = Route.useSearch();
  const result = Route.useLoaderData();
  const term = search.q?.toLowerCase() ?? "";
  const location = search.location?.toLowerCase() ?? "";

  const previewProviders = demoProviders.filter((provider) => {
    const categoryMatch = serviceCategories.some(
      (category) => category.name.toLowerCase() === term && provider.categories.includes(category.slug),
    );
    const termMatch =
      !term ||
      `${provider.displayName} ${provider.headline} ${provider.categories.join(" ")}`
        .toLowerCase()
        .includes(term) ||
      categoryMatch;
    const locationMatch =
      !location ||
      `${provider.city} ${provider.countryCode}`.toLowerCase().includes(location);
    return termMatch && locationMatch;
  });

  const providers = result.configured ? result.providers : previewProviders;

  return (
    <main className="page-space">
      <section className="shell">
        <span className="eyebrow">Marketplace</span>
        <h1 className="page-title">Find work you can trust.</h1>
        <p className="page-intro">
          Search by service and location, compare earned reputation signals and inspect a professional before you book.
        </p>
        <SearchBar />
        {!result.configured && (
          <div className="notice" role="status">
            Preview mode: connect Supabase to replace these example profiles with the live marketplace directory.
          </div>
        )}
        <div className="market-toolbar">
          <span>{providers.length} {result.configured ? "live" : "preview"} matches</span>
          <div className="chips">
            <span className="chip active">Earned ranking</span>
            <span className="chip">Trust weighted</span>
            <span className="chip">No paid boost</span>
          </div>
        </div>
        <div className="provider-grid">
          {providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
        </div>
        {providers.length === 0 && (
          <div className="empty-state">
            <h2>No matching professionals yet.</h2>
            <p>Try a broader service or location. TrustBooker never invents live marketplace results.</p>
          </div>
        )}
      </section>
    </main>
  );
}
