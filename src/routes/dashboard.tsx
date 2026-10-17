import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getCurrentUserFn, signOutFn } from "@/server/auth.functions";
import { getMyRolesFn } from "@/server/admin.functions";
import { getMyBookingsFn } from "@/server/booking.functions";
import {
  getBuyerProposalInboxFn,
  getDashboardSummaryFn,
} from "@/server/marketplace.functions";
import { acceptProposalFn } from "@/server/interaction.functions";

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const [user, summary, proposals, roles, bookings] = await Promise.all([
      getCurrentUserFn(),
      getDashboardSummaryFn(),
      getBuyerProposalInboxFn(),
      getMyRolesFn(),
      getMyBookingsFn(),
    ]);
    return { user, summary, proposals, roles, bookings };
  },
  component: Dashboard,
});

function Metric({ label, value }: { label: string; value: number | null }) {
  return <div><span>{label}</span><strong>{value ?? "—"}</strong></div>;
}

function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

function Dashboard() {
  const { user, summary, proposals, roles, bookings } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const staff = roles.includes("admin") || roles.includes("moderator");

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

  async function acceptProposal(proposalId: string) {
    setAccepting(proposalId);
    setActionMessage("");
    try {
      const result = await acceptProposalFn({ data: { proposalId } });
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      setActionMessage(`Booking created securely: ${result.bookingId}`);
      await router.invalidate();
    } catch {
      setActionMessage("The proposal could not be accepted. Please try again.");
    } finally {
      setAccepting(null);
    }
  }

  return (
    <main className="page-space">
      <div className="shell">
        <div className="dashboard-head">
          <div><span className="eyebrow">Private workspace</span><h1>Dashboard</h1><p className="muted">Signed in as {user.email ?? "verified user"}</p></div>
          <div className="dashboard-actions">
            <Link to="/request" className="button button-dark">Post a job</Link>
            <Link to="/professionals" className="button">Professional workspace</Link>
            {staff && <Link to="/admin" className="button">Trust operations</Link>}
            <button className="button" disabled={busy} onClick={async () => { setBusy(true); await signOutFn(); await navigate({ to: "/login" }); }} type="button">Sign out</button>
          </div>
        </div>
        <div className="stats-grid"><Metric label="Open requests" value={summary?.openRequests ?? null} /><Metric label="Active bookings" value={summary?.activeBookings ?? null} /><Metric label="Completed bookings" value={summary?.completedBookings ?? null} /><Metric label="Offers received" value={proposals.length} /></div>

        <section className="content-card">
          <div className="section-head"><div><span className="eyebrow">Transactions</span><h2>Your bookings</h2></div><p className="section-lede">Open the participant workspace for booking status, chat, completion confirmation and dispute controls.</p></div>
          {bookings.length === 0 ? <p className="muted">No bookings yet.</p> : (
            <div className="provider-grid">
              {bookings.map((booking) => (
                <article className="provider-card" key={booking.id}>
                  <div className="provider-body">
                    <span className="eyebrow">{booking.status.replaceAll("_", " ")}</span>
                    <h3>{formatMoney(booking.subtotal_minor, booking.currency)}</h3>
                    <p className="muted">Booking {booking.id}</p>
                    <div className="provider-footer"><div><small>Success fee</small><strong>{formatMoney(booking.marketplace_fee_minor, booking.currency)}</strong></div><Link to="/bookings/$id" params={{ id: booking.id }} className="arrow-link">Open workspace →</Link></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="content-card">
          <div className="section-head">
            <div><span className="eyebrow">Your offers</span><h2>Proposal inbox</h2></div>
            <p className="section-lede">Accepting an offer creates the booking server-side. TrustBooker calculates the success fee in the database; the browser cannot override the financial record.</p>
          </div>
          {actionMessage && <div className="notice" role="status">{actionMessage}</div>}
          {proposals.length === 0 ? (
            <p className="muted">No proposals have arrived for your requests yet.</p>
          ) : (
            <div className="provider-grid">
              {proposals.map((proposal) => (
                <article className="provider-card" key={proposal.id}>
                  <div className="provider-card-top">
                    <div>
                      <span className="eyebrow">{proposal.requestTitle}</span>
                      <h3>{proposal.provider?.display_name ?? "Professional"}</h3>
                    </div>
                    {proposal.provider && <strong>Trust {proposal.provider.trust_score}</strong>}
                  </div>
                  <p>{proposal.message || "No additional message."}</p>
                  <div className="rating-line">
                    <strong>{formatMoney(proposal.amountMinor, proposal.currency)}</strong>
                    <span>{proposal.status}</span>
                  </div>
                  {proposal.status === "sent" && ["open", "matched"].includes(proposal.requestStatus) ? (
                    <button
                      className="button button-brand"
                      disabled={accepting === proposal.id}
                      onClick={() => void acceptProposal(proposal.id)}
                      type="button"
                    >
                      {accepting === proposal.id ? "Securing booking…" : "Accept offer"}
                    </button>
                  ) : (
                    <span className="muted">This offer is no longer actionable.</span>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="content-card"><h2>Your marketplace activity</h2><p className="muted">Metrics are fetched through the signed-in user session and RLS. A dash means this environment has no linked marketplace database yet; TrustBooker does not fabricate activity.</p></div>
      </div>
    </main>
  );
}
