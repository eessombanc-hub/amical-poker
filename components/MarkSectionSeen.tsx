"use client";

import { useEffect } from "react";

type Section = "forum" | "poker-news" | "forum-bureau" | "galerie" | "strategie";

// Marque une rubrique comme consultée par le membre connecté, pour le point
// de nouveauté affiché dans l'espace membre (voir app/espace-membre/page.tsx,
// app/api/member/mark-seen/route.ts). N'affiche jamais rien : purement un
// effet de bord côté client, tolérant à l'échec, même pattern que
// components/VisitTracker.tsx. Sans session, l'appel ne fait rien côté
// serveur — inutile de vérifier la session ici.
export default function MarkSectionSeen({ section }: { section: Section }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({ section });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/member/mark-seen", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/member/mark-seen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Silencieux : ne doit jamais gêner la navigation.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  return null;
}
