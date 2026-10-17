import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <div className="brand footer-brand"><span className="brand-mark">T</span><span>TrustBooker</span></div>
          <p className="muted footer-copy">A global services marketplace designed around verified reputation, transparent economics and accountable bookings.</p>
        </div>
        <div><strong>Marketplace</strong><Link to="/marketplace">Explore services</Link><Link to="/request">Post a job</Link><Link to="/pricing">Pricing</Link></div>
        <div><strong>Trust</strong><Link to="/trust-safety">Trust & safety</Link><a href="mailto:support@trustbooker.com">Support</a><a href="/robots.txt">Robots</a></div>
        <div><strong>Company</strong><span>London · Amsterdam</span><span>© {new Date().getFullYear()} TrustBooker</span></div>
      </div>
    </footer>
  );
}
