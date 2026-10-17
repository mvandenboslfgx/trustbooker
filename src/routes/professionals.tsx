import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { serviceCategories } from "@/config/marketplace";
import {
  bootstrapProviderProfileFn,
  createProviderServiceFn,
  getMyProviderProfileFn,
  getMyProviderServicesFn,
  setProviderServiceActiveFn,
  submitProviderForReviewFn,
  updateMyProviderProfileFn,
} from "@/server/provider.functions";

export const Route = createFileRoute("/professionals")({
  loader: async () => {
    const [profile, services] = await Promise.all([
      getMyProviderProfileFn(),
      getMyProviderServicesFn(),
    ]);
    return { profile, services };
  },
  component: Professionals,
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function toMinor(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

function money(minor: number | null, currency: string) {
  if (minor == null) return "Quote required";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

function Professionals() {
  const { profile, services } = Route.useLoaderData();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function onboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("onboard");
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
      await router.invalidate();
    } catch {
      setMessage("We could not complete professional onboarding. Check your details and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy("profile");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await updateMyProviderProfileFn({ data: {
        providerId: profile.id,
        displayName: String(form.get("displayName") ?? ""),
        headline: String(form.get("headline") ?? ""),
        description: String(form.get("description") ?? ""),
        countryCode: String(form.get("countryCode") ?? ""),
        locality: String(form.get("locality") ?? ""),
      } });
      setMessage(result.ok ? "Profile updated." : result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The profile could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  async function addService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy("service");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await createProviderServiceFn({ data: {
        providerId: profile.id,
        categorySlug: String(form.get("category") ?? ""),
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        startingPriceMinor: toMinor(String(form.get("startingPrice") ?? "")),
        currency: String(form.get("currency") ?? "GBP"),
      } });
      setMessage(result.ok ? "Service created. Publish it after your provider profile is active." : result.message);
      if (result.ok) {
        event.currentTarget.reset();
        await router.invalidate();
      }
    } catch {
      setMessage("The service could not be created.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleService(serviceId: string, active: boolean) {
    setBusy(serviceId);
    setMessage("");
    try {
      const result = await setProviderServiceActiveFn({ data: { serviceId, active } });
      setMessage(result.ok ? (active ? "Service published." : "Service unpublished.") : result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The service status could not be changed.");
    } finally {
      setBusy(null);
    }
  }

  async function submitForReview() {
    if (!profile) return;
    setBusy("review");
    setMessage("");
    try {
      const result = await submitProviderForReviewFn({ data: { providerId: profile.id } });
      setMessage(result.ok ? "Profile submitted for verification review." : result.message);
      if (result.ok) await router.invalidate();
    } catch {
      setMessage("The profile could not be submitted for review.");
    } finally {
      setBusy(null);
    }
  }

  if (!profile) {
    return (
      <main className="page-space">
        <div className="shell narrow">
          <span className="eyebrow">For professionals</span>
          <h1 className="page-title">Build trust. Win the right work.</h1>
          <p className="page-intro">Core participation has no subscription, no lead fee and no paid ranking. Your public visibility is earned through relevance, verification and reputation.</p>
          <form className="form-card" onSubmit={onboard}>
            <label>Business or display name<input name="displayName" required minLength={2} maxLength={120} placeholder="Your professional name" /></label>
            <label>Profile URL slug<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="your-business-name" /></label>
            <label>Headline<input name="headline" required minLength={5} maxLength={180} placeholder="What are you excellent at?" /></label>
            <label>About your work<textarea name="description" rows={6} maxLength={10000} placeholder="Experience, approach, specialties and what clients can expect." /></label>
            <div className="two-col"><label>Country code<input name="countryCode" defaultValue="GB" required minLength={2} maxLength={2} /></label><label>City / service base<input name="locality" required minLength={2} maxLength={160} /></label></div>
            {message && <div className="notice" role="status">{message}</div>}
            <button className="button button-brand" disabled={busy === "onboard"} type="submit">{busy === "onboard" ? "Creating securely…" : "Create professional profile"}</button>
          </form>
        </div>
      </main>
    );
  }

  const reviewPending = profile.identity_status === "pending" || profile.business_status === "pending";
  const verified = profile.identity_status === "verified" && profile.business_status === "verified";

  return (
    <main className="page-space">
      <div className="shell">
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">Professional workspace</span>
            <h1>{profile.display_name}</h1>
            <p className="muted">{profile.locality} · {profile.country_code} · status: {profile.status}</p>
          </div>
          <div className="dashboard-actions">
            {profile.status === "active" && <Link to="/providers/$slug" params={{ slug: profile.slug }} className="button">View public profile</Link>}
            {!verified && !reviewPending && services.length > 0 && <button className="button button-brand" disabled={busy === "review"} onClick={() => void submitForReview()} type="button">{busy === "review" ? "Submitting…" : "Submit for verification"}</button>}
          </div>
        </div>

        {message && <div className="notice" role="status">{message}</div>}
        {reviewPending && <div className="notice">Verification is pending. Only platform staff can activate verified status.</div>}
        {verified && <div className="notice">Verified profile. Material identity/location edits will pause visibility and require reverification.</div>}
        {profile.status === "suspended" && <div className="notice">This provider profile is suspended and cannot publish services.</div>}

        <div className="two-col">
          <section className="content-card">
            <h2>Profile</h2>
            <form className="form-card" onSubmit={updateProfile}>
              <label>Display name<input name="displayName" defaultValue={profile.display_name} required minLength={2} maxLength={120} /></label>
              <label>Headline<input name="headline" defaultValue={profile.headline} required minLength={5} maxLength={180} /></label>
              <label>Description<textarea name="description" defaultValue={profile.description} rows={5} maxLength={10000} /></label>
              <div className="two-col"><label>Country code<input name="countryCode" defaultValue={profile.country_code} required minLength={2} maxLength={2} /></label><label>City / service base<input name="locality" defaultValue={profile.locality} required minLength={2} maxLength={160} /></label></div>
              <button className="button" disabled={busy === "profile" || profile.status === "suspended"} type="submit">{busy === "profile" ? "Saving…" : "Save profile"}</button>
            </form>
          </section>

          <section className="content-card">
            <h2>Add service</h2>
            <form className="form-card" onSubmit={addService}>
              <label>Category<select name="category" required defaultValue=""><option value="" disabled>Select category</option>{serviceCategories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
              <label>Service title<input name="title" required minLength={3} maxLength={160} placeholder="e.g. Emergency plumbing repair" /></label>
              <label>Description<textarea name="description" rows={5} required minLength={10} maxLength={10000} /></label>
              <div className="two-col"><label>Starting price<input name="startingPrice" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Optional" /></label><label>Currency<input name="currency" defaultValue="GBP" required minLength={3} maxLength={3} /></label></div>
              <button className="button button-dark" disabled={busy === "service" || profile.status === "suspended"} type="submit">{busy === "service" ? "Adding…" : "Add service"}</button>
            </form>
          </section>
        </div>

        <section className="content-card">
          <div className="section-head"><div><span className="eyebrow">Catalogue</span><h2>Your services</h2></div><p className="section-lede">Services are created privately. They can only become public while the provider profile is active.</p></div>
          {services.length === 0 ? <p className="muted">Add your first service to become eligible for verification review.</p> : (
            <div className="provider-grid">
              {services.map((service) => (
                <article className="provider-card" key={service.id}>
                  <div className="provider-body">
                    <span className="eyebrow">{service.category_slug}</span>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    <div className="provider-footer"><div><small>{service.is_active ? "Published" : "Private"}</small><strong>{money(service.starting_price_minor, service.currency)}</strong></div><button className="button" disabled={busy === service.id || (profile.status !== "active" && !service.is_active)} onClick={() => void toggleService(service.id, !service.is_active)} type="button">{busy === service.id ? "Updating…" : service.is_active ? "Unpublish" : "Publish"}</button></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
