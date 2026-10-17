import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return <main className="page-space"><article className="shell narrow content-card"><span className="eyebrow">Legal draft</span><h1>Marketplace terms</h1><p className="muted">This page is a product placeholder and is not a substitute for jurisdiction-specific legal review before launch.</p><h2>Marketplace model</h2><p>Core participation is designed to be free. TrustBooker does not charge lead fees or sell organic ranking position. The planned primary marketplace charge is a 10% success commission on eligible successful transactions.</p><h2>Trust and conduct</h2><p>Users must provide accurate information, respect applicable law, avoid manipulation of reviews or verification signals, and use the platform’s transaction and dispute records honestly.</p></article></main>;
}
