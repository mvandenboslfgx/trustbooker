import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  cancelAccountDeletionFn,
  getAccountDeletionRequestFn,
  requestAccountDeletionFn,
} from "@/server/account.functions";
import { getCurrentUserFn } from "@/server/auth.functions";

export const Route = createFileRoute("/account")({
  loader: async () => {
    const [user, deletionRequest] = await Promise.all([
      getCurrentUserFn(),
      getAccountDeletionRequestFn(),
    ]);
    return { user, deletionRequest };
  },
  component: AccountControls,
});

function AccountControls() {
  const { user, deletionRequest } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!user) {
    return (
      <main className="page-space">
        <div className="shell narrow empty-state">
          <span className="eyebrow">Private account controls</span>
          <h1>Sign in to manage your account.</h1>
          <Link className="button button-brand" to="/login">Sign in</Link>
        </div>
      </main>
    );
  }

  async function requestDeletion() {
    if (!window.confirm("Request deletion of your TrustBooker account? Active bookings must be resolved first.")) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await requestAccountDeletionFn();
      setMessage(result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The deletion request could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelDeletion() {
    setBusy(true);
    setMessage("");
    try {
      const result = await cancelAccountDeletionFn();
      setMessage(result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The deletion request could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-space">
      <div className="shell narrow">
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">Account & privacy</span>
            <h1>Account controls</h1>
            <p className="muted">Signed in as {user.email ?? "verified user"}</p>
          </div>
          <Link className="button" to="/dashboard">Back to dashboard</Link>
        </div>

        {message && <div className="notice" role="status">{message}</div>}

        <section className="content-card">
          <span className="eyebrow">Password security</span>
          <h2>Lost access to your password?</h2>
          <p className="muted">Use the recovery flow from the sign-in page. Recovery links are handled by Supabase Auth and expire according to the authentication configuration.</p>
          <Link className="button" to="/login">Open sign-in & recovery</Link>
        </section>

        <section className="content-card">
          <span className="eyebrow">Data rights</span>
          <h2>Account deletion</h2>
          <p className="muted">TrustBooker records your deletion request immediately. Active bookings must be resolved first, and Trust Operations must preserve transaction, dispute or financial evidence where deletion cannot be immediate.</p>

          {deletionRequest?.status === "pending" ? (
            <div className="notice">
              <strong>Deletion requested</strong>
              <p>Requested {new Date(deletionRequest.requested_at).toLocaleString("en-GB")}.</p>
              <button className="button" disabled={busy} onClick={() => void cancelDeletion()} type="button">
                {busy ? "Working…" : "Cancel deletion request"}
              </button>
            </div>
          ) : (
            <button className="button" disabled={busy} onClick={() => void requestDeletion()} type="button">
              {busy ? "Working…" : "Request account deletion"}
            </button>
          )}

          {deletionRequest?.status === "cancelled" && (
            <p className="muted">Your previous deletion request was cancelled.</p>
          )}
          {deletionRequest?.status === "completed" && (
            <p className="muted">The recorded deletion request has been completed.</p>
          )}
        </section>
      </div>
    </main>
  );
}
