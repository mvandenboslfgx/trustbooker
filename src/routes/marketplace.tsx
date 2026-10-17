import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SearchBar } from "@/components/SearchBar";
import { ProviderCard } from "@/components/ProviderCard";
import { demoProviders } from "@/data/demo";
import { serviceCategories } from "@/config/marketplace";

const searchSchema = z.object({ q: z.string().optional(), location: z.string().optional() });
export const Route = createFileRoute("/marketplace")({ validateSearch: searchSchema, component: Marketplace });

function Marketplace() {
  const search = Route.useSearch();
  const term = search.q?.toLowerCase() ?? "";
  const providers = demoProviders.filter((p) => !term || `${p.displayName} ${p.headline} ${p.categories.join(" ")}`.toLowerCase().includes(term) || serviceCategories.some((c) => c.name.toLowerCase() === term && p.categories.includes(c.slug)));
  return <main className="page-space"><section className="shell"><span className="eyebrow">Marketplace</span><h1 className="page-title">Find work you can trust.</h1><p className="page-intro">Search by service, compare transparent reputation signals and inspect a professional before you book.</p><SearchBar /><div className="market-toolbar"><span>{providers.length} strong matches</span><div className="chips"><button className="chip active">Recommended</button><button className="chip">Top rated</button><button className="chip">Fast response</button></div></div><div className="provider-grid">{providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div>{providers.length === 0 && <div className="empty-state"><h2>No exact demo matches yet.</h2><p>The production search layer will query providers, services, location availability and ranking signals.</p></div>}</section></main>;
}
