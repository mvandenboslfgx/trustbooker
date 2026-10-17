import { createFileRoute, Link } from "@tanstack/react-router";
import { demoProviders } from "@/data/demo";
import { getPublicProviderProfileFn } from "@/server/provider.functions";

export const Route = createFileRoute("/providers/$slug")({
  loader: ({ params }) => getPublicProviderProfileFn({ data: { slug: params.slug } }),
  component: ProviderProfile,
});

function money(minor: number | null, currency: string) {
  if (minor == null) return "Quote required";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(0)}`;
  }
}

function ProviderProfile() {
  const { slug } = Route.useParams();
  const result = Route.useLoaderData();

  if (!result.configured) {
    const provider = demoProviders.find((item) => item.slug === slug);
    if (!provider) {
      return <main className="shell page-space"><div className="empty-state"><h1>Professional not found.</h1><Link to="/marketplace">Back to marketplace</Link></div></main>;
    }

    return (
      <main className="page-space">
        <div className="shell profile-layout">
          <section>
            <div className="notice" role="status">Preview profile — connect Supabase for live services and verified reviews.</div>
            <div className="profile-hero"><div className="avatar-xl">{provider.displayName.split(" ").slice(0, 2).map((x) => x[0]).join("")}</div><div><span className="eyebrow">{provider.city} · {provider.countryCode}</span><h1>{provider.displayName}</h1><p>{provider.headline}</p><div className="provider-meta"><span className="stars">★ {provider.rating.toFixed(1)}</span><span>{provider.reviewCount} reviews</span><span>{provider.completedJobs} completed jobs</span></div></div></div>
            <div className="content-card"><h2>Trust signals</h2><div className="trust-detail-grid"><div><strong>{provider.trustScore}/100</strong><span>Trust score</span></div><div><strong>{provider.responseMinutes} min</strong><span>Typical response</span></div><div><strong>{provider.verifiedIdentity ? "Verified" : "Pending"}</strong><span>Identity</span></div><div><strong>{provider.verifiedBusiness ? "Verified" : "Individual"}</strong><span>Business</span></div></div></div>
          </section>
          <aside className="booking-card"><span className="eyebrow">Preview service</span><h2>{provider.featuredService}</h2><div className="price-row"><span>Starting from</span><strong>{money(provider.startingPriceMinor, provider.currency)}</strong></div><Link to="/request" className="button button-brand full">Request a quote</Link></aside>
        </div>
      </main>
    );
  }

  if (!result.profile) {
    return <main className="shell page-space"><div className="empty-state"><h1>Professional not found.</h1><p>This profile is unavailable, not active, or outside an open discovery market.</p><Link to="/marketplace">Back to marketplace</Link></div></main>;
  }

  const { provider, services, reviews } = result.profile;
  const featured = services[0] ?? null;
  const initials = provider.display_name.split(" ").slice(0, 2).map((part) => part[0]).join("");

  return (
    <main className="page-space">
      <div className="shell profile-layout">
        <section>
          <div className="profile-hero">
            <div className="avatar-xl">{initials}</div>
            <div>
              <span className="eyebrow">{provider.locality} · {provider.country_code}</span>
              <h1>{provider.display_name}</h1>
              <p>{provider.headline}</p>
              <div className="provider-meta">
                <span className="stars">★ {(provider.rating ?? 0).toFixed(1)}</span>
                <span>{provider.review_count} reviews</span>
                <span>{provider.completed_jobs} completed jobs</span>
              </div>
            </div>
          </div>

          {provider.description && <div className="content-card"><h2>About</h2><p>{provider.description}</p></div>}

          <div className="content-card">
            <h2>Trust signals</h2>
            <div className="trust-detail-grid">
              <div><strong>{provider.trust_score}/100</strong><span>Trust score</span></div>
              <div><strong>{provider.response_minutes == null ? "—" : `${provider.response_minutes} min`}</strong><span>Typical response</span></div>
              <div><strong>{provider.identity_status === "verified" ? "Verified" : provider.identity_status}</strong><span>Identity</span></div>
              <div><strong>{provider.business_status === "verified" ? "Verified" : provider.business_status}</strong><span>Business</span></div>
            </div>
          </div>

          <div className="content-card">
            <h2>Services</h2>
            {services.length === 0 ? <p className="muted">No public services are listed yet.</p> : services.map((service) => (
              <div className="review-sample" key={service.id}>
                <div><strong>{service.title}</strong><span>{money(service.starting_price_minor, service.currency)}</span></div>
                <p>{service.description}</p>
              </div>
            ))}
          </div>

          <div className="content-card">
            <h2>Verified reputation</h2>
            {reviews.length === 0 ? <p className="muted">No published transaction reviews yet.</p> : reviews.map((review) => (
              <div className="review-sample" key={review.id}>
                <div><strong>{review.rating.toFixed(1)} ★</strong><span>{review.verified_booking ? "Verified booking" : "Published review"}</span></div>
                <p>“{review.body}”</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="booking-card">
          <span className="eyebrow">{featured ? "Featured service" : "Request work"}</span>
          <h2>{featured?.title ?? provider.headline}</h2>
          <p>Start a scoped request and keep the agreement linked to the booking trail.</p>
          {featured && <div className="price-row"><span>Starting from</span><strong>{money(featured.starting_price_minor, featured.currency)}</strong></div>}
          <Link to="/request" className="button button-brand full">Request a quote</Link>
          <small>No lead fee. The success commission applies only to successful work.</small>
        </aside>
      </div>
    </main>
  );
}
