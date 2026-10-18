import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  getMyRolesFn,
  getPendingReviewsFn,
  getProviderReviewQueueFn,
  moderateProviderFn,
  moderateReviewFn,
} from "@/server/admin.functions";
import { getOpenDisputesFn, resolveDisputeFn } from "@/server/dispute-admin.functions";
import { getAdminOperationsOverviewFn } from "@/server/owner.functions";
import { isMoneyEnabled, isPublicMarket } from "@/lib/admin-overview";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const [roles, queue, reviews, disputes, snapshot] = await Promise.all([
      getMyRolesFn(),
      getProviderReviewQueueFn(),
      getPendingReviewsFn(),
      getOpenDisputesFn(),
      getAdminOperationsOverviewFn(),
    ]);
    return { roles, queue, reviews, disputes, snapshot };
  },
  component: AdminPage,
});

function money(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

function AdminPage() {
  const { roles, queue, reviews, disputes, snapshot } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const staff = roles.includes("admin") || roles.includes("moderator");
  const admin = roles.includes("admin");
  const overview = snapshot.status === "ready" ? snapshot.overview : null;
  const allPaymentsClosed = overview ? overview.countries.every((country) => !isMoneyEnabled(country)) : false;
  const allMarketsClosed = overview ? overview.countries.every((country) => !isPublicMarket(country)) : false;
  const formatDate = (value: string) => new Date(value).toLocaleDateString("en-GB", {
    year: "numeric", month: "short", day: "numeric",
  });


  async function moderateProvider(providerId: string, decision: "approve" | "reject" | "suspend") {
    if (decision === "approve" && !window.confirm(
      "Have you personally verified authentic identity AND business evidence? Approving will mark both as verified. Continue only if the checks are complete."
    )) return;
    if (decision === "suspend" && !window.confirm(
      "Suspend this professional and unpublish their services? Continue?"
    )) return;
    setBusy(`${providerId}:${decision}`);
    setMessage("");
    try {
      const result = await moderateProviderFn({ data: { providerId, decision } });
      setMessage(result.ok ? `Provider decision applied: ${decision}.` : result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The provider moderation action could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  async function moderateReview(reviewId: string, decision: "publish" | "hide" | "remove") {
    setBusy(`${reviewId}:${decision}`);
    setMessage("");
    try {
      const result = await moderateReviewFn({ data: { reviewId, decision } });
      setMessage(result.ok ? `Review decision applied: ${decision}.` : result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The review moderation action could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  async function resolveDispute(event: FormEvent<HTMLFormElement>, disputeId: string) {
    event.preventDefault();
    setBusy(`dispute:${disputeId}`);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const selectedOutcome = String(form.get("outcome") ?? "");
    const outcome = selectedOutcome === "cancel" ? "cancel" : "complete";
    try {
      const result = await resolveDisputeFn({ data: {
        disputeId,
        outcome,
        resolutionNote: String(form.get("resolutionNote") ?? ""),
      } });
      setMessage(result.ok ? `Dispute resolved; booking is now ${result.status}.` : result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The dispute resolution could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  if (!staff || !queue.authorized || !reviews.authorized || !disputes.authorized) {
    return (
      <main className="page-space">
        <div className="shell narrow empty-state">
          <span className="eyebrow">Restricted</span>
          <h1>Staff access required.</h1>
          <p>Provider, review and dispute moderation are protected by database roles, not just hidden UI.</p>
          <Link to="/dashboard" className="button">Back to dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-space tb-ops-page">
      <div className="shell">
        <div className="tb-ops-hero">
          <div>
            <span className="tb-section-kicker">ADMINISTRATION / OPERATIONS</span>
            <h1>Every detail.<br/><em>Under control.</em></h1>
            <p>Review professionals, protect reputation and resolve disputes. Decisions are authorized in the database and written to an audit trail.</p>
            <div className="tb-ops-hero-links"><Link to="/dashboard" className="button button-brand">Open my dashboard ↗</Link><Link to="/account" className="button tb-outline-light">Account security</Link></div>
          </div>
          <aside className="tb-ops-access">
            <span className="tb-ops-access-icon">✳</span>
            <span className="tb-ops-access-label">ACCESS LEVEL</span>
            <strong>Administration</strong>
            <p>Only authorized staff can view these moderation tools.</p>
            <div className="tb-ops-access-bottom"><span className="tb-live-dot"></span> Protected workspace</div>
          </aside>
        </div>

        <div className="tb-admin-layout">
          <aside className="tb-admin-navigation" aria-label="Administration sections">
            <span className="tb-admin-nav-label">OPERATIONS</span>
            <a href="#admin-overview"><span>◫</span> Overview</a>
            <a href="#admin-markets"><span>◎</span> Markets & rollout</a>
            <a href="#admin-providers"><span>♧</span> Professionals</a>
            <a href="#admin-services"><span>▤</span> Services</a><Link to="/admin/opportunities"><span>↗</span> Jobs & events review</Link>
            <a href="#admin-verification"><span>✓</span> Verification queue</a>
            <a href="#admin-reviews"><span>★</span> Reviews</a>
            <a href="#admin-disputes"><span>⚑</span> Disputes</a>
            <a href="#admin-activity"><span>↗</span> Audit activity</a>
            <div className="tb-admin-nav-divider" />
            <Link to="/dashboard">← My dashboard</Link>
            <div className="tb-admin-nav-foot">Live database information. Private admin access.</div>
          </aside>
          <div className="tb-admin-content">
            <section id="admin-overview" className="tb-admin-block">
              <div className="tb-ops-section-title"><div><span className="tb-section-kicker">OPERATIONS / OVERVIEW</span><h2>Your control centre.</h2></div><p>Real marketplace information. No demo numbers or invented activity.</p></div>
              {admin && snapshot.status === "unavailable" && <div className="notice" role="alert">The live operations snapshot is unavailable. Totals are hidden until we can verify the data connection.</div>}
              {!admin && <div className="notice" role="status">Full platform statistics are restricted to administrators.</div>}
              {overview && (
                <>
                  <div className="tb-admin-stats-grid">
                    {([
                      ["Registered accounts", overview.totals.users],
                      ["Professional profiles", overview.totals.providers],
                      ["Services in catalogue", overview.totals.services],
                      ["Customer requests", overview.totals.requests],
                      ["Bookings created", overview.totals.bookings],
                      ["Completed bookings", overview.totals.completed_bookings],
                    ] as const).map(([label, value]) => <div className="tb-admin-stat" key={label}><span>{label}</span><strong>{value.toLocaleString("en-GB")}</strong><small>Verified database count</small></div>)}
                  </div>
                  <div className="tb-admin-system-strip">
                    <span className="tb-admin-system-indicator" aria-hidden="true">●</span>
                    <strong>Marketplace controls</strong>
                    <span>{allMarketsClosed ? "Public markets closed" : "Some markets open"}</span>
                    <span>{allPaymentsClosed ? "Payments & payouts disabled in every listed market" : "Review market financial settings"}</span>
                    <small>Snapshot {new Date(overview.captured_at).toLocaleString("en-GB")}</small>
                  </div>
                </>
              )}
            </section>

            <section id="admin-markets" className="tb-admin-block">
              <div className="tb-admin-section-head"><div><span className="tb-section-kicker">GLOBAL ROLLOUT</span><h2>Markets & availability</h2><p>Country flags from Supabase. Read-only here to prevent accidental launches.</p></div><span className="tb-admin-mini-count">{overview ? overview.countries.length : "—"} configured</span></div>
              {overview && (overview.countries.length === 0 ? <div className="tb-admin-empty">No countries configured for launch.</div> :
                <div className="tb-admin-table-scroller"><table className="tb-admin-table"><thead><tr><th>Market</th><th>Discovery</th><th>Requests</th><th>Bookings</th><th>Payments</th><th>Payouts</th></tr></thead><tbody>{overview.countries.map((country) =>
                  <tr key={country.code}><td><strong>{country.code}</strong></td>
                    {([country.discovery,country.requests,country.bookings,country.payments,country.payouts]).map((flag,index) => <td key={index}><span className={"tb-gate "+(flag ? "enabled" : "disabled")}>{flag ? "Enabled" : "Off"}</span></td>)}
                  </tr>)}</tbody></table></div>)}
            </section>

            <div className="tb-admin-dual-grid">
              <section id="admin-providers" className="tb-admin-block">
                <div className="tb-admin-section-head"><div><span className="tb-section-kicker">PEOPLE & PARTNERS</span><h2>Recent professionals</h2><p>Latest profiles, including draft and inactive accounts.</p></div><span className="tb-admin-mini-count">Latest 8</span></div>
                {overview && (overview.recent_providers.length ? <div className="tb-admin-rows">{overview.recent_providers.map((p) => <div className="tb-admin-person-row" key={p.id}><span className="tb-admin-row-avatar">{p.name.slice(0,1).toUpperCase()}</span><div><strong>{p.name}</strong><small>{p.locality} · {p.country} · {p.services} services</small></div><span className={"tb-gate "+(p.status==="active" ? "enabled" : "disabled")}>{p.status}</span></div>)}</div> :
                  <p className="tb-admin-empty">No professional accounts registered yet.</p>)}
              </section>
              <section id="admin-services" className="tb-admin-block">
                <div className="tb-admin-section-head"><div><span className="tb-section-kicker">SERVICE CATALOGUE</span><h2>Recent services</h2><p>Published and private listings at a glance.</p></div><span className="tb-admin-mini-count">Latest 8</span></div>
                {overview && (overview.recent_services.length ? <div className="tb-admin-rows">{overview.recent_services.map((s) => <div className="tb-admin-person-row" key={s.id}><span className="tb-admin-row-avatar">▤</span><div><strong>{s.title}</strong><small>{s.provider} · {s.category}</small></div><span className={"tb-gate "+(s.is_active ? "enabled" : "disabled")}>{s.is_active ? "Active" : "Private"}</span></div>)}</div> :
                  <p className="tb-admin-empty">No services have been created yet.</p>)}
              </section>
            </div>
            <div className="tb-ops-section-title tb-ops-queue-title"><div><span className="tb-section-kicker">MODERATION & SAFETY</span><h2>Review queues.</h2></div><p>Every verification or booking decision must be supported by actual evidence.</p></div>
            <div className="tb-ops-metrics">
              <div><span>01 / VERIFICATION</span><strong>{queue.providers.length}</strong><small>Professionals waiting</small></div>
              <div><span>02 / REPUTATION</span><strong>{reviews.reviews.length}</strong><small>Pending reviews</small></div>
              <div><span>03 / DISPUTES</span><strong>{disputes.disputes.length}</strong><small>Open disputes</small></div>
              <div><span>04 / REPORTS</span><strong>{overview ? overview.totals.open_reports : "—"}</strong><small>Reports requiring attention</small></div>
            </div>
            {message && <div className="notice" role="status">{message}</div>}

        <section id="admin-verification" className="content-card tb-ops-section">
          <div className="section-head"><div><span className="eyebrow">Providers</span><h2>Verification queue</h2></div><p className="section-lede">Approval grants verified status. Approve only after checking real identity and business evidence.</p></div>
          {queue.providers.length === 0 ? (
            <p className="muted">No professionals awaiting verification.</p>
          ) : (
            <div className="provider-grid">
              {queue.providers.map((provider) => (
                <article className="provider-card" key={provider.id}>
                  <div className="provider-body">
                    <span className="eyebrow">{provider.locality} · {provider.country_code}</span>
                    <h3>{provider.display_name}</h3>
                    <p><strong>{provider.headline}</strong></p>
                    <p>{provider.description || "No description supplied."}</p>
                    <div className="provider-meta">
                      <span>Identity: {provider.identity_status}</span>
                      <span>Business: {provider.business_status}</span>
                      <span>{provider.service_count} services</span>
                    </div>
                    <div className="dashboard-actions">
                      <button className="button button-brand" disabled={busy !== null} onClick={() => void moderateProvider(provider.id, "approve")} type="button">{busy === `${provider.id}:approve` ? "Approving…" : "Approve verified"}</button>
                      <button className="button" disabled={busy !== null} onClick={() => void moderateProvider(provider.id, "reject")} type="button">{busy === `${provider.id}:reject` ? "Rejecting…" : "Reject"}</button>
                      <button className="button" disabled={busy !== null} onClick={() => void moderateProvider(provider.id, "suspend")} type="button">{busy === `${provider.id}:suspend` ? "Suspending…" : "Suspend"}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="admin-reviews" className="content-card tb-ops-section">
          <div className="section-head"><div><span className="eyebrow">Reputation</span><h2>Pending reviews</h2></div><p className="section-lede">Only booking-backed reviews are eligible. Check the evidence before publishing.</p></div>
          {reviews.reviews.length === 0 ? (
            <p className="muted">No reviews awaiting moderation.</p>
          ) : (
            <div className="provider-grid">
              {reviews.reviews.map((review) => (
                <article className="provider-card" key={review.id}>
                  <div className="provider-body">
                    <span className="eyebrow">{review.provider_name}</span>
                    <h3>{review.rating.toFixed(1)} ★</h3>
                    <p>“{review.body}”</p>
                    <div className="provider-meta"><span>Booking {review.booking_id}</span><span>{new Date(review.created_at).toLocaleDateString("en-GB")}</span></div>
                    <div className="dashboard-actions">
                      <button className="button button-brand" disabled={busy !== null} onClick={() => void moderateReview(review.id, "publish")} type="button">{busy === `${review.id}:publish` ? "Publishing…" : "Publish verified"}</button>
                      <button className="button" disabled={busy !== null} onClick={() => void moderateReview(review.id, "hide")} type="button">Hide</button>
                      <button className="button" disabled={busy !== null} onClick={() => void moderateReview(review.id, "remove")} type="button">Remove</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="admin-disputes" className="content-card tb-ops-section">
          <div className="section-head"><div><span className="eyebrow">Safety</span><h2>Open disputes</h2></div><p className="section-lede">This queue resolves marketplace state only. Refunds or payouts must be handled by the payment ledger once payments are enabled.</p></div>
          {disputes.disputes.length === 0 ? (
            <p className="muted">No disputes currently open.</p>
          ) : (
            <div className="provider-grid">
              {disputes.disputes.map((dispute) => (
                <article className="provider-card" key={dispute.id}>
                  <div className="provider-body">
                    <span className="eyebrow">{dispute.provider_name} · {dispute.booking_status}</span>
                    <h3>{money(dispute.subtotal_minor, dispute.currency)}</h3>
                    <p>{dispute.reason}</p>
                    <div className="provider-meta"><span>Booking {dispute.booking_id}</span><span>Opened {new Date(dispute.created_at).toLocaleDateString("en-GB")}</span></div>
                    <form className="form-card" onSubmit={(event) => void resolveDispute(event, dispute.id)}>
                      <label>Outcome<select name="outcome" defaultValue="complete"><option value="complete">Resolve as completed</option><option value="cancel">Resolve as cancelled</option></select></label>
                      <label>Resolution note<textarea name="resolutionNote" required minLength={10} maxLength={5000} rows={4} placeholder="Explain the evidence reviewed and the marketplace decision." /></label>
                      <button className="button button-brand" disabled={busy !== null} type="submit">{busy === `dispute:${dispute.id}` ? "Resolving…" : "Resolve dispute"}</button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
            <section id="admin-activity" className="tb-admin-block tb-admin-activity">
              <div className="tb-admin-section-head"><div><span className="tb-section-kicker">ACCOUNTABILITY</span><h2>Recent audit activity</h2><p>Actions and timestamps only. Private audit details stay protected.</p></div><span className="tb-admin-mini-count">Latest 12</span></div>
              {overview && (overview.activity.length ? <div className="tb-admin-rows">{overview.activity.map((item) => <div className="tb-admin-person-row" key={item.id}><span className="tb-admin-row-avatar">↗</span><div><strong>{item.action.replaceAll("_"," ").replaceAll("."," · ")}</strong><small>{item.entity_type}</small></div><small>{formatDate(item.created_at)}</small></div>)}</div> : <p className="tb-admin-empty">No recorded administrative activity.</p>)}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
