import { Link } from "@tanstack/react-router";
import type { Provider } from "@/domain/models";

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}

export function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <article className="provider-card">
      <div className="provider-cover"><span className="provider-initials">{provider.displayName.split(" ").slice(0,2).map((x) => x[0]).join("")}</span><span className="trust-pill">Trust {provider.trustScore}</span></div>
      <div className="provider-body">
        <div className="eyebrow">{provider.city} · {provider.countryCode}</div>
        <h3>{provider.displayName}</h3>
        <p>{provider.headline}</p>
        <div className="provider-meta"><span className="stars">★ {provider.rating.toFixed(1)}</span><span>{provider.reviewCount} reviews</span><span>{provider.completedJobs} jobs</span></div>
        <div className="provider-footer"><div><small>From</small><strong>{money(provider.startingPriceMinor, provider.currency)}</strong></div><Link to="/providers/$slug" params={{ slug: provider.slug }} className="arrow-link">View profile →</Link></div>
      </div>
    </article>
  );
}
