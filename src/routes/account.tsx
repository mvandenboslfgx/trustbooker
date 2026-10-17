import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  cancelAccountDeletionFn,
  getAccountDeletionRequestFn,
  requestAccountDeletionFn,
} from "@/server/account.functions";
import { getCurrentUserFn, signOutAllSessionsFn } from "@/server/auth.functions";

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
  const navigate = useNavigate();
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

  async function revokeAllSessions() {
    if (!window.confirm("Sign out every TrustBooker session on all devices?")) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await signOutAllSessionsFn();
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      await navigate({ to: "/login" });
    } catch {
      setMessage("All sessions could not be revoked. Please try again.");
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
          <span className="eyebrow">Session security</span>
          <h2>Revoke every active session</h2>
          <p className="muted">Use this after a lost device or suspicious login. It revokes refresh tokens across your TrustBooker sessions and signs this session out too.</p>
          <button className="button" disabled={busy} onClick={() => void revokeAllSessions()} type="button">
            {busy ? "Working…" : "Sign out all devices"}
          </button>
        </section>

        <section className="content-card">
          <span className="eyebrow">Data portability</span>
          <h2>Download your TrustBooker data</h2>
          <p className="muted">Export the account, profile and marketplace records available to your signed-in account as a machine-readable JSON file. Authentication tokens, internal platform secrets and unrelated users' private records are never included.</p>
          <a className="button" href="/account/export" download>Download my data</a>
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
