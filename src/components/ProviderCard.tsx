import { Link } from "@tanstack/react-router";
import type { Provider } from "@/domain/models";

function money(minor: number, currency: string) {
  if (minor <= 0) return "Quote required";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
  } catch {
    return currency + " " + (minor / 100).toFixed(0);
  }
}

export function ProviderCard({ provider }: { provider: Provider }) {
  const initials = provider.displayName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
  return (
    <article className="provider-card tb-provider-card">
      <div className="provider-cover">
        <span className="provider-initials" aria-hidden="true">{initials}</span>
        <span className="tb-provider-area">{provider.city} · {provider.countryCode}</span>
      </div>
      <div className="provider-body">
        <div className="tb-provider-topline"><span className="eyebrow">PROFESSIONAL</span>{provider.verifiedIdentity && <span className="tb-verified">Identity checked</span>}</div>
        <h3>{provider.displayName}</h3><p>{provider.headline}</p>
        <div className="provider-meta">
          {provider.reviewCount > 0 ? <span className="stars">★ {provider.rating.toFixed(1)} <span className="muted">({provider.reviewCount})</span></span> : <span>No booking reviews yet</span>}
          {provider.completedJobs > 0 && <span>{provider.completedJobs} completed jobs</span>}
        </div>
        <div className="provider-footer"><div><small>{provider.startingPriceMinor > 0 ? "Starting from" : "Price"}</small><strong>{money(provider.startingPriceMinor, provider.currency)}</strong></div><Link to="/providers/$slug" params={{ slug: provider.slug }} className="tb-circle-arrow" aria-label={"View " + provider.displayName + " profile"}>↗</Link></div>
      </div>
    </article>
  );
}
