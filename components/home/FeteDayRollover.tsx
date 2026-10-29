"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { msUntilNextParisMidnight } from "@/lib/fetes/calendar";

/**
 * Actualisation automatique de l'ambiance du jour à minuit (heure de Paris),
 * sans que le visiteur ait à recharger la page — y compris si son
 * navigateur reste ouvert plusieurs jours (voir cahier des charges, section
 * 6). N'affiche rien : programme un seul `router.refresh()` (re-rendu des
 * composants serveur, PAS un rechargement complet de la page) au passage de
 * minuit, puis se reprogramme pour le lendemain.
 */
export default function FeteDayRollover() {
  const router = useRouter();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    function schedule() {
      // +5s de marge de sécurité pour être certain d'être bien après minuit
      // au moment du refresh (imprécision volontaire et sans conséquence de
      // msUntilNextParisMidnight, voir lib/fetes/calendar.ts).
      const delay = msUntilNextParisMidnight() + 5000;
      timeoutId = setTimeout(() => {
        router.refresh();
        schedule();
      }, delay);
    }
    schedule();
    return () => clearTimeout(timeoutId);
  }, [router]);

  return null;
}
