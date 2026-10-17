import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  getMyRolesFn,
  getProviderReviewQueueFn,
  moderateProviderFn,
} from "@/server/admin.functions";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const [roles, queue] = await Promise.all([getMyRolesFn(), getProviderReviewQueueFn()]);
    return { roles, queue };
  },
  component: AdminPage,
});

function AdminPage() {
  const { roles, queue } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const staff = roles.includes("admin") || roles.includes("moderator");

  async function moderate(providerId: string, decision: "approve" | "reject" | "suspend") {
    setBusy(`${providerId}:${decision}`);
    setMessage("");
    try {
      const result = await moderateProviderFn({ data: { providerId, decision } });
      setMessage(result.ok ? `Decision applied: ${decision}.` : result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The moderation action could not be completed.");
    } finally {
      setBusy(null);
    }
  }

  if (!staff || !queue.authorized) {
    return (
      <main className="page-space">
        <div className="shell narrow empty-state">
          <span className="eyebrow">Restricted</span>
          <h1>Staff access required.</h1>
          <p>Provider verification and moderation are protected by database roles, not just hidden UI.</p>
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
            <h1>Provider review queue</h1>
            <p className="muted">Approve only after the identity/business evidence has actually been checked. Every decision is audited.</p>
          </div>
          <Link to="/dashboard" className="button">Dashboard</Link>
        </div>

        {message && <div className="notice" role="status">{message}</div>}

        {queue.providers.length === 0 ? (
          <div className="content-card"><h2>Queue clear</h2><p className="muted">There are no provider profiles waiting for verification.</p></div>
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
                    <button className="button button-brand" disabled={busy !== null} onClick={() => void moderate(provider.id, "approve")} type="button">{busy === `${provider.id}:approve` ? "Approving…" : "Approve verified"}</button>
                    <button className="button" disabled={busy !== null} onClick={() => void moderate(provider.id, "reject")} type="button">{busy === `${provider.id}:reject` ? "Rejecting…" : "Reject"}</button>
                    <button className="button" disabled={busy !== null} onClick={() => void moderate(provider.id, "suspend")} type="button">{busy === `${provider.id}:suspend` ? "Suspending…" : "Suspend"}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
