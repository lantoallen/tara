import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { RegisterServiceWorker } from "@/components/offline-tickets";
import { SearchShortcut } from "@/components/search-shortcut";
import { SiteHeader } from "@/components/site-header";
import { CurrentTabs, TabLinks } from "@/components/tab-bar";
import { APP_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${APP_NAME}: things to do around Batangas and online`, template: `%s · ${APP_NAME}` },
  description:
    "Find events, register in a click, and get a QR ticket. Organizers get a waitlist, door check-in, and attendee exports.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#131211" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* The bottom padding keeps the footer clear of the phone tab bar. */}
      <body className="flex min-h-full flex-col overflow-x-clip pb-[calc(3.5rem+env(safe-area-inset-bottom))] font-sans sm:pb-0">
        <a
          href="#content"
          className="sr-only rounded-md bg-ink px-3 py-2 text-sm text-bg focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>
        {/* The header photo is the biggest thing on screen, so fetch it before the CSS asks. React moves this into <head>. */}
        <link rel="preload" href="/taal-lake.avif" as="image" type="image/avif" fetchPriority="high" />
        <SiteHeader />
        <SearchShortcut />
        <RegisterServiceWorker />
        <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-16 sm:px-6">
          {children}
        </main>
        <SiteFooter />
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
        >
          <Suspense fallback={<TabLinks pathname={null} />}>
            <CurrentTabs />
          </Suspense>
        </nav>
      </body>
    </html>
  );
}
