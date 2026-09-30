"use client";

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 heures
const STORAGE_KEY = "apcv-last-activity";
const CHECK_INTERVAL_MS = 60_000; // vérifie chaque minute, largement suffisant sur 8h
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

// Déconnecte automatiquement un membre connecté après 8h sans la moindre
// activité (souris, clavier, clic, défilement, tactile) — y compris si
// l'onglet reste ouvert sans qu'aucune page ne soit rechargée entretemps
// (dans ce cas, c'est le cookie de session, voir lib/auth.ts, qui prendrait
// de toute façon le relais à la prochaine requête, mais ceci évite d'y
// attendre et déconnecte activement, avec redirection). La dernière
// activité est notée dans localStorage, partagée entre les onglets du même
// navigateur, pour qu'agir dans l'un évite la déconnexion des autres.
export default function IdleLogout() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const lastMarkRef = useRef(0);

  useEffect(() => {
    if (!isLoggedIn) return;

    function readLastActivity(): number {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? parseInt(raw, 10) : NaN;
        return Number.isFinite(parsed) ? parsed : Date.now();
      } catch {
        return Date.now();
      }
    }

    function markActivity() {
      const now = Date.now();
      // Petite marge pour ne pas ré-écrire le stockage à chaque pixel de
      // mousemove.
      if (now - lastMarkRef.current < 5_000) return;
      lastMarkRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // Stockage indisponible (navigation privée…) : la déconnexion se
        // basera uniquement sur l'activité de cet onglet.
      }
    }

    function checkIdle() {
      if (Date.now() - readLastActivity() >= IDLE_LIMIT_MS) {
        signOut({ callbackUrl: "/connexion" });
      }
    }

    markActivity();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActivity, { passive: true }));
    const interval = setInterval(checkIdle, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActivity));
      clearInterval(interval);
    };
  }, [isLoggedIn]);

  return null;
}
