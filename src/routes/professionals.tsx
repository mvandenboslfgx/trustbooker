import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { bootstrapProviderProfileFn, getMyProviderProfileFn } from "@/server/provider.functions";

export const Route = createFileRoute("/professionals")({
  loader: () => getMyProviderProfileFn(),
  component: Professionals,
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function Professionals() {
  const existing = Route.useLoaderData();
  const [created, setCreated] = useState<string | null>(existing?.id ?? null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "");

    try {
      const result = await bootstrapProviderProfileFn({ data: {
        slug: String(form.get("slug") ?? "") || slugify(displayName),
        displayName,
        headline: String(form.get("headline") ?? ""),
        description: String(form.get("description") ?? ""),
        countryCode: String(form.get("countryCode") ?? ""),
        locality: String(form.get("locality") ?? ""),
      } });
      if (!result.ok) { setMessage(result.message); return; }
      setCreated(result.providerId);
    } catch {
      setMessage("We could not complete professional onboarding. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (existing || created) {
    return <main className="page-space"><div className="shell narrow empty-state"><span className="eyebrow">Professional workspace</span><h1>Your provider profile exists.</h1><p>{existing ? `${existing.display_name} · ${existing.locality} · ${existing.status}` : "Profile created in draft status."}</p><Link to="/dashboard" className="button button-brand">Open workspace</Link></div></main>;
  }

  return <main className="page-space"><div className="shell narrow"><span className="eyebrow">For professionals</span><h1 className="page-title">Build trust. Win the right work.</h1><p className="page-intro">Core participation has no subscription, no lead fee and no paid ranking. Your public visibility is designed to be earned through relevance, verified signals and reputation.</p><form className="form-card" onSubmit={submit}><label>Business or display name<input name="displayName" required minLength={2} maxLength={120} placeholder="Your professional name" /></label><label>Profile URL slug<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="your-business-name" /></label><label>Headline<input name="headline" required minLength={5} maxLength={180} placeholder="What are you excellent at?" /></label><label>About your work<textarea name="description" rows={6} maxLength={10000} placeholder="Experience, approach, specialties and what clients can expect." /></label><div className="two-col"><label>Country code<input name="countryCode" defaultValue="GB" required minLength={2} maxLength={2} /></label><label>City / service base<input name="locality" required minLength={2} maxLength={160} /></label></div>{message && <div className="notice" role="status">{message}</div>}<button className="button button-brand" disabled={busy} type="submit">{busy ? "Creating securely…" : "Create professional profile"}</button></form></div></main>;
}
