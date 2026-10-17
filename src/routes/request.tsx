import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { serviceCategories } from "@/config/marketplace";
import { createServiceRequestFn } from "@/server/marketplace.functions";

export const Route = createFileRoute("/request")({ component: RequestPage });

function toMinor(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

function RequestPage() {
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);

    try {
      const result = await createServiceRequestFn({
        data: {
          category: String(form.get("category") ?? ""),
          title: String(form.get("title") ?? ""),
          description: String(form.get("description") ?? ""),
          countryCode: String(form.get("countryCode") ?? ""),
          locality: String(form.get("locality") ?? ""),
          budgetMinMinor: toMinor(String(form.get("budgetMin") ?? "")),
          budgetMaxMinor: toMinor(String(form.get("budgetMax") ?? "")),
        },
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setSubmittedId(result.requestId);
    } catch {
      setMessage("We could not submit that request. Check the form and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-space">
      <div className="shell narrow">
        {!submittedId ? (
          <>
            <span className="eyebrow">Post a job</span>
            <h1 className="page-title">Tell us what needs doing.</h1>
            <p className="page-intro">Create a structured request. TrustBooker checks your session and the country launch gate before anything is written.</p>
            <form className="form-card" onSubmit={submit}>
              <label>Service category<select name="category" required defaultValue=""><option value="" disabled>Select a category</option>{serviceCategories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
              <label>Job title<input name="title" required minLength={5} maxLength={180} placeholder="e.g. Fix a leaking kitchen tap" /></label>
              <label>Describe the job<textarea name="description" required minLength={20} maxLength={10000} rows={6} placeholder="What needs to be done, what matters most, and when do you need it?" /></label>
              <div className="two-col"><label>Country code<input name="countryCode" required minLength={2} maxLength={2} defaultValue="GB" placeholder="GB" /></label><label>City or postcode<input name="locality" required placeholder="Location" /></label></div>
              <div className="two-col"><label>Budget from<input name="budgetMin" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Optional" /></label><label>Budget to<input name="budgetMax" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Optional" /></label></div>
              {message && <div className="notice" role="status">{message}</div>}
              <button className="button button-brand" disabled={busy} type="submit">{busy ? "Checking & posting…" : "Post request securely"}</button>
            </form>
          </>
        ) : (
          <div className="empty-state"><span className="eyebrow">Request posted</span><h1>Your job is in the marketplace.</h1><p>Request reference: <strong>{submittedId}</strong></p><Link to="/dashboard" className="button button-brand">Open dashboard</Link></div>
        )}
      </div>
    </main>
  );
}
