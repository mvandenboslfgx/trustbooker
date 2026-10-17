import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export function SearchBar({ dark = false }: { dark?: boolean }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  return (
    <form
      className={`search-bar ${dark ? "search-bar-dark" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        void navigate({ to: "/marketplace", search: { q: query || undefined, location: location || undefined } });
      }}
    >
      <label><span>What do you need?</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. electrician, cleaner, web designer" /></label>
      <label><span>Where?</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or postcode" /></label>
      <button className="button button-brand" type="submit">Search professionals</button>
    </form>
  );
}
