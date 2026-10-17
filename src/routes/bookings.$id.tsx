import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  getBookingWorkspaceFn,
  openBookingDisputeFn,
  transitionBookingFn,
} from "@/server/booking.functions";
import { sendMessageFn, submitReviewFn } from "@/server/interaction.functions";

export const Route = createFileRoute("/bookings/$id")({
  loader: ({ params }) => getBookingWorkspaceFn({ data: { bookingId: params.id } }),
  component: BookingWorkspace,
});

function money(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

function BookingWorkspace() {
  const workspace = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  if (!workspace) {
    return (
      <main className="page-space">
        <div className="shell narrow empty-state">
          <span className="eyebrow">Private booking</span>
          <h1>Booking unavailable.</h1>
          <p>Only booking participants can open this workspace.</p>
          <Link to="/dashboard" className="button">Back to dashboard</Link>
        </div>
      </main>
    );
  }

  const activeWorkspace = workspace;
  const title = activeWorkspace.booking.scope_snapshot.request_title ?? "Service booking";

  async function transition(action: "start_work" | "request_completion" | "confirm_completion" | "cancel") {
    setBusy(action);
    setMessage("");
    try {
      const result = await transitionBookingFn({ data: { bookingId: activeWorkspace.booking.id, action } });
      setMessage(result.ok ? `Booking updated to ${result.status}.` : result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The booking could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace.conversation_id) return;
    setBusy("message");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await sendMessageFn({ data: {
        conversationId: activeWorkspace.conversation_id,
        body: String(form.get("body") ?? ""),
      } });
      setMessage(result.ok ? "Message sent." : result.message);
      if (result.ok) {
        event.currentTarget.reset();
        await router.invalidate();
      }
    } catch {
      setMessage("The message could not be sent.");
    } finally {
      setBusy(null);
    }
  }

  async function openDispute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("dispute");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await openBookingDisputeFn({ data: {
        bookingId: activeWorkspace.booking.id,
        reason: String(form.get("reason") ?? ""),
      } });
      setMessage(result.ok ? `Dispute opened: ${result.disputeId}` : result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The dispute could not be opened.");
    } finally {
      setBusy(null);
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("review");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await submitReviewFn({ data: {
        bookingId: activeWorkspace.booking.id,
        providerId: activeWorkspace.provider.id,
        rating: Number(form.get("rating") ?? 0),
        body: String(form.get("body") ?? ""),
      } });
      setMessage(result.ok ? "Review submitted for transaction verification." : result.message);
      if (result.ok) event.currentTarget.reset();
    } catch {
      setMessage("The review could not be submitted.");
    } finally {
      setBusy(null);
    }
  }

  const status = activeWorkspace.booking.status;
  const canCancel = ["accepted", "payment_pending", "booked"].includes(status);
  const canDispute = ["booked", "in_progress", "completion_pending", "completed"].includes(status) && !activeWorkspace.dispute;
  const canReview = activeWorkspace.actor_role === "buyer" && status === "completed";

  return (
    <main className="page-space">
      <div className="shell">
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">{activeWorkspace.actor_role} workspace</span>
            <h1>{title}</h1>
            <p className="muted">Booking {activeWorkspace.booking.id} · {status}</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/providers/$slug" params={{ slug: activeWorkspace.provider.slug }} className="button">View professional</Link>
            <Link to="/dashboard" className="button">Dashboard</Link>
          </div>
        </div>

        {message && <div className="notice" role="status">{message}</div>}

        <div className="stats-grid">
          <div><span>Agreed amount</span><strong>{money(activeWorkspace.booking.subtotal_minor, activeWorkspace.booking.currency)}</strong></div>
          <div><span>Success fee</span><strong>{money(activeWorkspace.booking.marketplace_fee_minor, activeWorkspace.booking.currency)}</strong></div>
          <div><span>Trust score</span><strong>{activeWorkspace.provider.trust_score}</strong></div>
          <div><span>Status</span><strong>{status.replaceAll("_", " ")}</strong></div>
        </div>

        <section className="content-card">
          <div className="section-head">
            <div><span className="eyebrow">Booking control</span><h2>Next action</h2></div>
            <p className="section-lede">Status changes are authorized and audited in the database. Payment-enabled markets cannot start work until payment has moved the booking to booked.</p>
          </div>
          <div className="dashboard-actions">
            {activeWorkspace.actor_role === "provider" && status === "booked" && <button className="button button-brand" disabled={busy !== null} onClick={() => void transition("start_work")} type="button">Start work</button>}
            {activeWorkspace.actor_role === "provider" && status === "in_progress" && <button className="button button-brand" disabled={busy !== null} onClick={() => void transition("request_completion")} type="button">Request completion</button>}
            {activeWorkspace.actor_role === "buyer" && status === "completion_pending" && <button className="button button-brand" disabled={busy !== null} onClick={() => void transition("confirm_completion")} type="button">Confirm completed</button>}
            {canCancel && <button className="button" disabled={busy !== null} onClick={() => void transition("cancel")} type="button">Cancel booking</button>}
          </div>
        </section>

        <div className="two-col">
          <section className="content-card">
            <h2>Booking chat</h2>
            <div>
              {activeWorkspace.messages.length === 0 ? <p className="muted">No messages yet.</p> : activeWorkspace.messages.map((item) => (
                <div className="review-sample" key={item.id}>
                  <div><strong>Participant</strong><span>{new Date(item.created_at).toLocaleString("en-GB")}</span></div>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
            {activeWorkspace.conversation_id && (
              <form className="form-card" onSubmit={sendMessage}>
                <label>Message<textarea name="body" required minLength={1} maxLength={10000} rows={4} placeholder="Keep important booking communication on the transaction record." /></label>
                <button className="button button-dark" disabled={busy !== null} type="submit">{busy === "message" ? "Sending…" : "Send message"}</button>
              </form>
            )}
          </section>

          <section className="content-card">
            <h2>Dispute & safety</h2>
            {activeWorkspace.dispute ? (
              <div className="notice">
                <strong>Dispute {activeWorkspace.dispute.status}</strong>
                <p>{activeWorkspace.dispute.reason}</p>
                {activeWorkspace.dispute.resolution_note && <p>Resolution: {activeWorkspace.dispute.resolution_note}</p>}
              </div>
            ) : canDispute ? (
              <form className="form-card" onSubmit={openDispute}>
                <label>What went wrong?<textarea name="reason" required minLength={10} maxLength={5000} rows={5} /></label>
                <button className="button" disabled={busy !== null} type="submit">{busy === "dispute" ? "Opening…" : "Open dispute"}</button>
                <small>Availability is controlled per country. A disabled dispute market will reject this action server-side.</small>
              </form>
            ) : (
              <p className="muted">A dispute is not available for this booking state.</p>
            )}
          </section>
        </div>

        {canReview && (
          <section className="content-card">
            <div className="section-head"><div><span className="eyebrow">Verified reputation</span><h2>Review completed work</h2></div><p className="section-lede">Your review is linked to this completed booking. It becomes public only after the transaction link is validated by Trust Operations.</p></div>
            <form className="form-card" onSubmit={submitReview}>
              <label>Rating<select name="rating" defaultValue="5" required><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label>
              <label>Your experience<textarea name="body" required minLength={10} maxLength={5000} rows={5} placeholder="Describe what happened, what was agreed and how the work was delivered." /></label>
              <button className="button button-brand" disabled={busy !== null} type="submit">{busy === "review" ? "Submitting…" : "Submit verified-booking review"}</button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
