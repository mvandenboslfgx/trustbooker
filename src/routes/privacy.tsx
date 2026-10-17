import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return <main className="page-space"><article className="shell narrow content-card"><span className="eyebrow">Legal draft</span><h1>Privacy notice</h1><p className="muted">This page is a product placeholder and must be replaced by counsel-reviewed terms before a public launch that processes personal data.</p><h2>Design principles</h2><p>TrustBooker is designed around data minimisation, purpose limitation, access controls, auditable trust signals and clear retention rules. Sensitive credentials remain server-side and identity verification data should be handled by approved processors wherever possible.</p><h2>Your controls</h2><p>The production product must provide appropriate access, correction, export and deletion workflows, subject to legal and transaction-record retention requirements.</p></article></main>;
}
