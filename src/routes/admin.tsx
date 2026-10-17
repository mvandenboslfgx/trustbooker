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

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const [roles, queue, reviews, disputes] = await Promise.all([
      getMyRolesFn(),
      getProviderReviewQueueFn(),
      getPendingReviewsFn(),
      getOpenDisputesFn(),
    ]);
    return { roles, queue, reviews, disputes };
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
  const { roles, queue, reviews, disputes } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const staff = roles.includes("admin") || roles.includes("moderator");

  async function moderateProvider(providerId: string, decision: "approve" | "reject" | "suspend") {
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

        <div className="tb-ops-metrics">
          <div><span>01 / PROVIDERS</span><strong>{queue.providers.length}</strong><small>Waiting for verification</small></div>
          <div><span>02 / REPUTATION</span><strong>{reviews.reviews.length}</strong><small>Reviews awaiting decisions</small></div>
          <div><span>03 / SAFETY</span><strong>{disputes.disputes.length}</strong><small>Unresolved disputes</small></div>
          <div><span>04 / FINANCIAL</span><strong className="tb-ops-off">OFF</strong><small>Payments and payouts disabled</small></div>
        </div>
        <div className="tb-ops-section-title"><div><span className="tb-section-kicker">YOUR REVIEW QUEUES</span><h2>Trust operations.</h2></div><p>Nothing should be marked verified without genuine supporting evidence.</p></div>
        {message && <div className="notice" role="status">{message}</div>}

        <section className="content-card tb-ops-section">
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

        <section className="content-card tb-ops-section">
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

        <section className="content-card tb-ops-section">
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
      </div>
    </main>
  );
}
