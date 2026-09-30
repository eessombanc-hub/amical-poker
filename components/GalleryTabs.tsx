"use client";

import { useState } from "react";

/**
 * Bascule Galerie photos / Galerie vidéos (voir app/galerie/page.tsx) — reçoit
 * les deux sections déjà rendues côté serveur (albums + MediaLightbox) et
 * n'affiche que celle sélectionnée. Même code couleur "pill" que les
 * onglets de navigation de /classement.
 */
export default function GalleryTabs({
  photos,
  videos,
}: {
  photos: React.ReactNode;
  videos: React.ReactNode;
}) {
  const [tab, setTab] = useState<"photos" | "videos">("photos");

  return (
    <div>
      <div className="flex gap-2.5 mb-8">
        <button
          type="button"
          onClick={() => setTab("photos")}
          className={`text-[0.72rem] tracking-wide uppercase font-semibold px-4 py-2 rounded-full border transition-colors ${
            tab === "photos"
              ? "bg-brass border-brass text-ink"
              : "border-brass/50 text-brass hover:bg-brass hover:text-ink"
          }`}
        >
          📷 Galerie photos
        </button>
        <button
          type="button"
          onClick={() => setTab("videos")}
          className={`text-[0.72rem] tracking-wide uppercase font-semibold px-4 py-2 rounded-full border transition-colors ${
            tab === "videos"
              ? "bg-forest border-forest text-white"
              : "border-forest text-forest-glow hover:bg-forest hover:text-white"
          }`}
        >
          🎬 Galerie vidéos
        </button>
      </div>

      <div className={tab === "photos" ? "" : "hidden"}>{photos}</div>
      <div className={tab === "videos" ? "" : "hidden"}>{videos}</div>
    </div>
  );
}
