import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  requestPasswordResetFn,
  signInWithPasswordFn,
  signUpWithPasswordFn,
} from "@/server/auth.functions";

export const Route = createFileRoute("/login")({ component: Login });

type Mode = "signin" | "signup" | "recover";

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "recover") {
        const result = await requestPasswordResetFn({ data: { email } });
        setMessage(result.ok ? result.message : result.message);
        return;
      }

      const data = { email, password };
      const result =
        mode === "signin"
          ? await signInWithPasswordFn({ data })
          : await signUpWithPasswordFn({ data });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      if (mode === "signup" && "requiresEmailConfirmation" in result && result.requiresEmailConfirmation) {
        setMessage("Account created. Check your email to confirm your address before signing in.");
        setMode("signin");
        return;
      }

      await navigate({ to: "/dashboard" });
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const eyebrow =
    mode === "signin" ? "Welcome back" : mode === "signup" ? "Join TrustBooker" : "Account recovery";
  const heading =
    mode === "signin"
      ? "Sign in securely."
      : mode === "signup"
        ? "Create your account."
        : "Reset your password.";
  const intro =
    mode === "signin"
      ? "Access your requests, bookings and reputation workspace."
      : mode === "signup"
        ? "Start as a buyer and build a professional profile when you are ready."
        : "Enter your account email. If it exists, we will send a secure recovery link.";

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand auth-brand"><span className="brand-mark">T</span><span>TrustBooker</span></div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{heading}</h1>
        <p>{intro}</p>
        <form onSubmit={submit}>
          <label>Email address<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          {mode !== "recover" && (
            <label>Password<input required minLength={10} maxLength={128} autoComplete={mode === "signin" ? "current-password" : "new-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" /></label>
          )}
          <button className="button button-brand full" disabled={busy} type="submit">
            {busy ? "Working…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send recovery link"}
          </button>
        </form>
        {message && <div className="notice" role="status">{message}</div>}
        {mode === "signin" && (
          <button className="auth-switch" type="button" onClick={() => { setMode("recover"); setMessage(""); }}>
            Forgot your password?
          </button>
        )}
        <button className="auth-switch" type="button" onClick={() => { setMode(mode === "signup" ? "signin" : mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
          {mode === "signup" ? "Already have an account? Sign in" : mode === "signin" ? "New to TrustBooker? Create an account" : "Back to sign in"}
        </button>
        <small>Authentication is server-side. Credentials are never stored in the browser by TrustBooker.</small>
      </div>
    </main>
  );
}
