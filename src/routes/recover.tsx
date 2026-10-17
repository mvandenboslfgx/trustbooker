import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/recover")({ component: RecoverAccount });

function hasRecoveryHint() {
  if (typeof window === "undefined") return false;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return search.has("code") || search.get("type") === "recovery" || hash.get("type") === "recovery";
}

function RecoverAccount() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Account recovery is not configured for this environment yet.");
      setChecking(false);
      return;
    }

    let active = true;
    const recoveryHint = hasRecoveryHint();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setChecking(false);
        setMessage("");
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setMessage("This recovery link could not be verified. Request a new one from the sign-in page.");
        setChecking(false);
        return;
      }
      if (data.session && recoveryHint) {
        setReady(true);
        setMessage("");
      }
      setChecking(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!ready) {
      setMessage("This recovery session is not valid. Request a new recovery link.");
      return;
    }
    if (password.length < 10 || password.length > 128) {
      setMessage("Use a password between 10 and 128 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Account recovery is not configured for this environment yet.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage("The password could not be updated. Request a new recovery link and try again.");
        return;
      }

      await supabase.auth.signOut();
      setPassword("");
      setConfirmPassword("");
      setComplete(true);
      setReady(false);
    } catch {
      setMessage("The password could not be updated. Request a new recovery link and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand auth-brand"><span className="brand-mark">T</span><span>TrustBooker</span></div>
        <span className="eyebrow">Account recovery</span>
        <h1>{complete ? "Password updated." : "Choose a new password."}</h1>

        {complete ? (
          <>
            <p>Your recovery session has been signed out. Sign in again with your new password.</p>
            <Link className="button button-brand full" to="/login">Return to sign in</Link>
          </>
        ) : checking ? (
          <p>Verifying your recovery link…</p>
        ) : ready ? (
          <form onSubmit={submit}>
            <label>New password<input required minLength={10} maxLength={128} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <label>Confirm new password<input required minLength={10} maxLength={128} autoComplete="new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
            <button className="button button-brand full" disabled={busy} type="submit">{busy ? "Updating…" : "Update password"}</button>
          </form>
        ) : (
          <>
            <p>This recovery link is missing, expired or invalid.</p>
            <Link className="button full" to="/login">Request a new recovery link</Link>
          </>
        )}

        {message && <div className="notice" role="status">{message}</div>}
      </div>
    </main>
  );
}
