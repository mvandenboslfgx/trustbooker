import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SearchBar } from "@/components/SearchBar";
import { ProviderCard } from "@/components/ProviderCard";
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
  const providers = result.configured ? result.providers : [];

  return (
    <main className="page-space tb-market-page">
      <section className="shell">
        <div className="tb-market-intro">
          <span className="tb-section-kicker">THE MARKETPLACE / DISCOVER</span>
          <div className="tb-market-heading"><h1 className="page-title">Find your next<br/><em>great professional.</em></h1><p className="page-intro">Search by service and location. Compare real profiles and make your next decision with more confidence.</p></div>
          <SearchBar scope="services" />
        </div>
        {!result.configured && <div className="notice" role="status">The marketplace directory is temporarily unavailable. No example listings are shown as real businesses.</div>}
        <div className="tb-filter-section">
          <div className="tb-market-toolbar"><strong>{providers.length} {providers.length === 1 ? "professional" : "professionals"} found</strong><span>Ranked by relevance, never paid placement</span></div>
          <div className="tb-category-pills" aria-label="Browse by service">
            <Link to="/marketplace" search={{}} className={!search.q ? "tb-pill active" : "tb-pill"}>All services</Link>
            {serviceCategories.map((category) => <Link key={category.slug} to="/marketplace" search={{ q: category.name, location: search.location }} className={"tb-pill" + (search.q === category.name ? " active" : "")}>{category.name}</Link>)}
          </div>
        </div>
        {providers.length > 0 ? <div className="provider-grid tb-market-results">{providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div> :
          <div className="tb-market-empty"><div className="tb-empty-symbol">↗</div><div><span className="tb-section-kicker">MARKET-BY-MARKET ROLLOUT</span><h2>{search.q || search.location ? "No matches just yet." : "Something good is taking shape."}</h2><p>We only show real professionals in markets open for discovery. Try another search, or join early as a professional while new areas prepare to launch.</p><div className="tb-inline-actions"><Link to="/marketplace" search={{}} className="button button-dark">Explore all categories</Link><Link to="/professionals" className="button">Join as a professional ↗</Link></div></div></div>}
      </section>
    </main>
  );
}
