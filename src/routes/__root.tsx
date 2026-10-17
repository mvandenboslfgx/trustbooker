import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "TrustBooker — Good work begins with real trust" },
      { name: "description", content: "A more considered service marketplace. Find professionals, compare real trust signals and prepare your next project with clarity. Opening market by market." },
      { name: "theme-color", content: "#162b24" },
    ],
    links: [{ rel: "stylesheet", href: appCss }, { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  }),
  component: RootComponent,
  notFoundComponent: () => <main className="shell page-space"><div className="empty-state"><span className="eyebrow">404</span><h1>That page isn’t here.</h1><p>Try the marketplace or return to the homepage.</p></div></main>,
});

function RootComponent() {
  return <Document><Header /><Outlet /><Footer /></Document>;
}

function Document({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}
