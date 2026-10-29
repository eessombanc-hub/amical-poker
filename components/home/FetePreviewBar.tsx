"use client";

import { useState } from "react";

/**
 * Mode de prévisualisation de l'ambiance de l'accueil — permet de choisir
 * une date fictive (ex. pour vérifier le rendu de Noël en plein été) sans
 * toucher à l'horloge du système (voir cahier des charges, section 9).
 *
 * Réservé au bureau/responsables/admin (voir app/page.tsx, canPreviewFetes) :
 * un visiteur ordinaire ne voit jamais ce contrôle, et le paramètre d'URL
 * ?previewDate=... qu'il produit est de toute façon ignoré côté serveur pour
 * qui n'a pas ce rôle (même vérification, voir app/page.tsx).
 *
 * Simple formulaire GET vers "/" : fonctionne même sans JavaScript, comme le
 * reste des formulaires essentiels du site.
 */
export default function FetePreviewBar({ initialDate }: { initialDate: string | null }) {
  const [value, setValue] = useState(initialDate ?? "");

  return (
    <form
      action="/"
      method="get"
      className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-black/50 backdrop-blur border border-white/15 rounded-full pl-3 pr-1.5 py-1.5 text-xs text-white/80"
    >
      <span className="hidden sm:inline whitespace-nowrap">Prévisualiser une date</span>
      <input
        type="date"
        name="previewDate"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
      />
      <button type="submit" className="bg-brass text-ink rounded-full px-3 py-1 font-medium whitespace-nowrap">
        Voir
      </button>
      {initialDate && (
        <a href="/" className="text-white/60 underline underline-offset-2 px-1 whitespace-nowrap">
          Aujourd&apos;hui
        </a>
      )}
    </form>
  );
}
