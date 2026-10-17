import { Link } from "@tanstack/react-router";

export function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link to="/" className="brand" aria-label="TrustBooker home">
          <span className="brand-mark" aria-hidden="true">T</span>
          <span>TrustBooker</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link to="/marketplace">Find services</Link>
          <Link to="/trust-safety">Trust & safety</Link>
          <Link to="/pricing">Pricing</Link>
        </nav>
        <div className="header-actions">
          <Link to="/login" className="text-link">Log in</Link>
          <Link to="/request" className="button button-dark button-compact">Post a job</Link>
        </div>
      </div>
    </header>
  );
}
