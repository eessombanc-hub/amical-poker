import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import VisitTracker from "@/components/VisitTracker";
import UrgentMessageGate from "@/components/UrgentMessageGate";
import IdleLogout from "@/components/IdleLogout";
import { SITE_NAME, SITE_URL, jsonLdScriptProps, organizationJsonLd } from "@/lib/seo";

const description =
  "Association de poker loi 1901 à Villecresnes (Val-de-Marne) : calendrier des manches, classement de saison, stratégie et pédagogie poker, actus et espace membre.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}, club de poker à Villecresnes`,
    template: `%s, ${SITE_NAME}`,
  },
  description,
  keywords: [
    "club de poker",
    "Villecresnes",
    "Val-de-Marne",
    "association poker loi 1901",
    "tournoi poker amateur",
    "stratégie poker débutant",
  ],
  authors: [{ name: SITE_NAME }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE_NAME,
    title: `${SITE_NAME}, club de poker à Villecresnes`,
    description,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}, club de poker à Villecresnes`,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        <script {...jsonLdScriptProps(organizationJsonLd())} />
        {/* Mesure d'audience Plausible (sans cookies) — uniquement en production
            pour ne pas polluer les statistiques avec les visites de développement. */}
        {process.env.NODE_ENV === "production" && (
          <>
            <Script strategy="afterInteractive" src="https://plausible.io/js/pa-JKH1VKDDzsC3OZU_wAiD3.js" />
            <Script id="plausible-init" strategy="afterInteractive">
              {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
plausible.init()`}
            </Script>
            {/* Compteur de trafic maison (bloc "Trafic du site" de
                /espace-membre) — voir prisma/schema.prisma, PageView. */}
            <VisitTracker />
          </>
        )}
        <UrgentMessageGate />
        <Providers>
          <IdleLogout />
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
