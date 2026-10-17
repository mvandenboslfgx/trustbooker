import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getCurrentUserFn, signOutFn } from "@/server/auth.functions";

export const Route = createFileRoute("/dashboard")({
  loader: () => getCurrentUserFn(),
  component: Dashboard,
});

function Dashboard() {
  const user = Route.useLoaderData();
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
        <div className="stats-grid"><div><span>Open requests</span><strong>0</strong></div><div><span>Active bookings</span><strong>0</strong></div><div><span>Unread messages</span><strong>0</strong></div><div><span>Trust actions</span><strong>0</strong></div></div>
        <div className="content-card"><h2>Your marketplace activity</h2><p className="muted">Real counts will come from RLS-protected database queries once the TrustBooker Supabase project is linked and the reviewed schema is migrated.</p></div>
      </div>
    </main>
  );
}
