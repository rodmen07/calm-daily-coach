import type { Metadata } from "next";
import { Sora, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { SyncStatusBadge } from "@/app/components/sync-status-badge";
import { SubscriptionGuard } from "@/app/components/subscription-guard";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calm Daily Coach",
  description: "Self-improvement with deliberate daily dose limits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${sora.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var savedTheme = localStorage.getItem("calm-daily-coach:theme");
                  var nextTheme = savedTheme === "light" ? "light" : "dark";
                  document.documentElement.dataset.theme = nextTheme;
                } catch (error) {
                  document.documentElement.dataset.theme = "dark";
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="site-nav-shell">
          <div className="site-nav-inner">
            <p className="site-nav-title">Calm Daily Coach</p>
            <div className="site-nav-actions">
              <nav className="site-nav-links" aria-label="Primary">
                <Link href="/">Dashboard</Link>
                <Link href="/ambient">Ambient</Link>
                <Link href="/focus">Focus</Link>
                <Link href="/execute">Execute</Link>
                <Link href="/review">Review</Link>
                <Link href="/pricing">Pricing</Link>
                <Link href="/monetization">Monetization</Link>
              </nav>
              <div className="flex items-center gap-3">
                <SyncStatusBadge />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>
        <SubscriptionGuard>{children}</SubscriptionGuard>
      </body>
    </html>
  );
}
