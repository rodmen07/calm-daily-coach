import type { Metadata } from "next";
import { Sora, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
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
      className={`${sora.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="site-nav-shell">
          <div className="site-nav-inner">
            <p className="site-nav-title">Calm Daily Coach</p>
            <nav className="site-nav-links" aria-label="Primary">
              <Link href="/">Dashboard</Link>
              <Link href="/focus">Focus</Link>
              <Link href="/execute">Execute</Link>
              <Link href="/review">Review</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
