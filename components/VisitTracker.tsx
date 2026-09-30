"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Compteur de trafic maison, sans cookie ni service externe — voir
// prisma/schema.prisma, PageView. Enregistre une visite à chaque
// changement de page (navigation initiale ou interne). N'affiche jamais
// rien : purement un effet de bord côté client, tolérant à l'échec.
// Volontairement sans useSearchParams (juste le chemin) pour ne pas
// contraindre tout le layout dans une limite <Suspense>.
export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const path = pathname || "/";
    try {
      const body = JSON.stringify({ path });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track-visit", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/track-visit", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(
          () => {}
        );
      }
    } catch {
      // Silencieux : le comptage de trafic ne doit jamais gêner la navigation.
    }
  }, [pathname]);

  return null;
}
