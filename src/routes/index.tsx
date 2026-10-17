import { createFileRoute, Link } from "@tanstack/react-router";
import { SearchBar } from "@/components/SearchBar";
import { serviceCategories } from "@/config/marketplace";

export const Route = createFileRoute("/")({ component: Home });

const steps = [
  { number: "01", title: "Tell us what you need", body: "Search a service or describe the job. Your request stays yours, from scope to location." },
  { number: "02", title: "Choose with clarity", body: "Compare real profiles and trust signals. No paid placement disguised as quality." },
  { number: "03", title: "Keep everything together", body: "Use one workspace for agreed work, updates and a record you can return to." },
];

function Home() {
  return (
    <main className="tb-home">
      <section className="tb-hero">
        <div className="shell tb-hero-grid">
          <div className="tb-hero-copy">
            <span className="tb-overline"><span className="tb-overline-dot" /> THE MORE CONFIDENT WAY TO BOOK</span>
            <h1>Good work begins with <em>real trust.</em></h1>
            <p className="tb-lead">Whatever needs doing, find the right professional without the guesswork. A better way to discover, compare and arrange services.</p>
            <SearchBar dark />
            <div className="tb-hero-notes">
              <span><span aria-hidden="true">✓</span> No fees to browse</span>
              <span><span aria-hidden="true">✓</span> No pay-to-win rankings</span>
              <span><span aria-hidden="true">✓</span> Clear booking records</span>
            </div>
          </div>
          <div className="tb-hero-visual" aria-label="TrustBooker booking workflow illustration">
            <div className="tb-orbit orbit-a"/><div className="tb-orbit orbit-b"/>
            <div className="tb-preview-window">
              <div className="tb-preview-head">
                <span className="tb-preview-symbol">T<span>.</span></span>
                <span className="tb-preview-title">A better way to book</span>
                <span className="tb-preview-ellipsis" aria-hidden="true">•••</span>
              </div>
              <div className="tb-preview-label">YOUR JOURNEY</div>
              <h2>Everything in one place.</h2>
              <div className="tb-preview-progress" aria-label="Three steps: discover, decide, book">
                <div className="done"><span>01</span><strong>Discover</strong><small>Find a service</small></div>
                <div><span>02</span><strong>Compare</strong><small>Review signals</small></div>
                <div><span>03</span><strong>Arrange</strong><small>Keep a record</small></div>
              </div>
              <div className="tb-preview-bottom">
                <span className="tb-preview-tick" aria-hidden="true">✓</span>
                <div><strong>Built on transparency</strong><small>Relevance first. Evidence over claims.</small></div>
                <span aria-hidden="true">↗</span>
              </div>
            </div>
            <div className="tb-sticker tb-sticker-top"><span className="tb-sticker-icon">✳</span><span><strong>Trust over noise</strong><small>A fairer way to compare</small></span></div>
            <div className="tb-sticker tb-sticker-bottom"><span className="tb-sticker-monogram">10%</span><span><strong>Success-based model</strong><small>No subscriptions or lead fees</small></span></div>
          </div>
        </div>
        <div className="shell tb-hero-bottom"><span>TRUSTBOOKER / THE SERVICE MARKETPLACE</span><span>DISCOVER <span aria-hidden="true">↘</span> CONNECT <span aria-hidden="true">↘</span> GET IT DONE</span></div>
      </section>

      <section className="tb-benefit-strip">
        <div className="shell tb-benefits">
          <div><span className="tb-benefit-mark">01</span><strong>Search with purpose.</strong><small>Explore useful services, not sponsored rankings.</small></div>
          <div><span className="tb-benefit-mark">02</span><strong>Know what matters.</strong><small>Check verification and booking-backed feedback.</small></div>
          <div><span className="tb-benefit-mark">03</span><strong>Make informed choices.</strong><small>Keep the important details in one place.</small></div>
        </div>
      </section>

      <section className="section shell tb-categories-section">
        <div className="tb-section-top"><span className="tb-section-kicker">01 / DISCOVER</span><Link to="/marketplace" className="tb-text-arrow">Explore the marketplace <span aria-hidden="true">↗</span></Link></div>
        <div className="section-head tb-editorial-head"><div><h2>Every kind of help.<br/><em>One place to find it.</em></h2></div><p className="section-lede">From the little jobs to the big projects. Explore the services that move life and work forward.</p></div>
        <div className="category-grid tb-category-grid">
          {serviceCategories.map((category, index) => (
            <Link key={category.slug} to="/marketplace" search={{ q: category.name }} className="category-card tb-category-card">
              <span className="tb-category-index">{String(index + 1).padStart(2, "0")} / SERVICE</span>
              <span className="category-icon" aria-hidden="true">{category.icon}</span>
              <h3>{category.name}</h3><p>{category.description}</p><span className="mini-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="tb-process-section">
        <div className="shell">
          <div className="tb-section-top"><span className="tb-section-kicker">02 / THE EXPERIENCE</span><span className="tb-caption">LESS GUESSWORK. MORE CONFIDENCE.</span></div>
          <div className="section-head tb-editorial-head">
            <div><h2>Simple from the search<br/><em>to the last detail.</em></h2></div>
            <p className="section-lede">A more considered way to find someone, agree on the work and keep track of what matters.</p>
          </div>
          <div className="tb-steps-grid">{steps.map((step) => <article className="tb-step" key={step.number}><span className="tb-step-number">{step.number}</span><div className="tb-step-line"/><h3>{step.title}</h3><p>{step.body}</p></article>)}</div>
        </div>
      </section>

      <section className="section shell tb-trust-feature">
        <div className="tb-feature-art"><div className="tb-feature-art-inner"><span className="tb-feature-sigil">T<span>.</span></span><p>Trust is built<br/>in the details.</p><div className="tb-feature-art-bottom"><span>CLARITY / ACCOUNTABILITY / FAIRNESS</span><span>↗</span></div></div></div>
        <div className="tb-feature-copy"><span className="tb-section-kicker">03 / OUR STANDARD</span><h2>Trust isn't a badge.<br/><em>It's how we work.</em></h2><p>A good marketplace should make genuine signals understandable, keep transaction records traceable and never sell credibility to the highest bidder.</p><div className="tb-feature-points"><div><strong>Evidence, not assumptions</strong><span>Clear distinctions between checked and unchecked information.</span></div><div><strong>Fair visibility</strong><span>Relevance and quality before advertising spend.</span></div><div><strong>Accountable by design</strong><span>Records for the work and conversations that matter.</span></div></div><Link to="/trust-safety" className="button button-dark">Explore our trust standard <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section className="tb-closing-section"><div className="shell tb-closing-inner"><div><span className="tb-section-kicker">MADE FOR PROFESSIONALS</span><h2>Your next opportunity<br/><em>starts here.</em></h2><p>Create your profile and prepare your services for launch. Free to join, with no fee just to receive a lead.</p></div><div className="tb-closing-actions"><Link to="/professionals" className="button button-brand">Join as a professional <span aria-hidden="true">↗</span></Link><small>Availability opens by country. Payments are not live yet.</small></div></div></section>
    </main>
  );
}
