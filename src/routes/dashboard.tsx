import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getCurrentUserFn, signOutFn } from "@/server/auth.functions";
import { getDashboardSummaryFn } from "@/server/marketplace.functions";

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const [user, summary] = await Promise.all([getCurrentUserFn(), getDashboardSummaryFn()]);
    return { user, summary };
  },
  component: Dashboard,
});

function Metric({ label, value }: { label: string; value: number | null }) {
  return <div><span>{label}</span><strong>{value ?? "—"}</strong></div>;
}

function Dashboard() {
  const { user, summary } = Route.useLoaderData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <main className="page-space">
        <div className="shell narrow empty-state">
          <span className="eyebrow">Protected workspace</span>
          <h1>Sign in to open your dashboard.</h1>
          <p>No private marketplace data is rendered without a verified server session.</p>
          <Link to="/login" className="button button-brand">Sign in securely</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-space">
      <div className="shell">
        <div className="dashboard-head">
          <div><span className="eyebrow">Private workspace</span><h1>Dashboard</h1><p className="muted">Signed in as {user.email ?? "verified user"}</p></div>
          <div className="dashboard-actions"><Link to="/request" className="button button-dark">Post a job</Link><button className="button" disabled={busy} onClick={async () => { setBusy(true); await signOutFn(); await navigate({ to: "/login" }); }} type="button">Sign out</button></div>
        </div>
        <div className="stats-grid"><Metric label="Open requests" value={summary?.openRequests ?? null} /><Metric label="Active bookings" value={summary?.activeBookings ?? null} /><Metric label="Completed bookings" value={summary?.completedBookings ?? null} /><Metric label="Trust actions" value={null} /></div>
        <div className="content-card"><h2>Your marketplace activity</h2><p className="muted">Metrics are fetched through the signed-in user session and RLS. A dash means this environment has no linked marketplace database yet; TrustBooker does not fabricate activity.</p></div>
      </div>
    </main>
  );
}
