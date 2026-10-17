import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  getMyRolesFn,
  getPendingReviewsFn,
  getProviderReviewQueueFn,
  moderateProviderFn,
  moderateReviewFn,
} from "@/server/admin.functions";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const [roles, queue, reviews] = await Promise.all([
      getMyRolesFn(),
      getProviderReviewQueueFn(),
      getPendingReviewsFn(),
    ]);
    return { roles, queue, reviews };
  },
  component: AdminPage,
});

function AdminPage() {
  const { roles, queue, reviews } = Route.useLoaderData();
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

  if (!staff || !queue.authorized || !reviews.authorized) {
    return (
      <main className="page-space">
        <div className="shell narrow empty-state">
          <span className="eyebrow">Restricted</span>
          <h1>Staff access required.</h1>
          <p>Provider and review moderation are protected by database roles, not just hidden UI.</p>
          <Link to="/dashboard" className="button">Back to dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-space">
      <div className="shell">
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">Trust operations</span>
            <h1>Verification & moderation</h1>
            <p className="muted">Only approve evidence you have actually checked. Provider and review decisions are written to the audit trail.</p>
          </div>
          <Link to="/dashboard" className="button">Dashboard</Link>
        </div>

        {message && <div className="notice" role="status">{message}</div>}

        <section className="content-card">
          <div className="section-head"><div><span className="eyebrow">Providers</span><h2>Verification queue</h2></div><p className="section-lede">Approval marks identity and business verification as verified and activates the provider.</p></div>
          {queue.providers.length === 0 ? (
            <p className="muted">There are no provider profiles waiting for verification.</p>
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

        <section className="content-card">
          <div className="section-head"><div><span className="eyebrow">Reputation</span><h2>Pending reviews</h2></div><p className="section-lede">Publishing re-checks the completed booking link, marks the review verified and recalculates rating and Trust Score server-side.</p></div>
          {reviews.reviews.length === 0 ? (
            <p className="muted">There are no reviews waiting for moderation.</p>
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
      </div>
    </main>
  );
}
