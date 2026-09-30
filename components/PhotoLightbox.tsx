"use client";

import { useCallback, useEffect, useState } from "react";

type Photo = { id: string; photoUrl: string; caption: string | null };

/**
 * Grille de photos cliquables pour un album de la Galerie : un clic ouvre la
 * photo en plein écran (lightbox), avec navigation précédent/suivant au sein
 * du même album (flèches, clavier) et fermeture par clic hors-image, bouton
 * ✕ ou touche Échap — voir app/galerie/page.tsx, un PhotoLightbox par album.
 */
export default function PhotoLightbox({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;
  const current = isOpen ? photos[openIndex] : null;

  const close = useCallback(() => setOpenIndex(null), []);
  const showPrev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length)),
    [photos.length]
  );
  const showNext = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close, showPrev, showNext]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="card-hover aspect-square bg-paper-dim border border-white/10 rounded-lg bg-cover bg-center cursor-zoom-in"
            style={{ backgroundImage: `url(${p.photoUrl})` }}
            title={p.caption ?? undefined}
            aria-label={p.caption ?? "Agrandir la photo"}
          />
        ))}
      </div>

      {isOpen && current && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="absolute top-5 right-5 text-white/80 hover:text-white text-3xl leading-none w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            ×
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrev();
                }}
                aria-label="Photo précédente"
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showNext();
                }}
                aria-label="Photo suivante"
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                ›
              </button>
            </>
          )}

          <div
            className="animate-modal-in max-w-[92vw] max-h-[88vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.photoUrl}
              alt={current.caption ?? "Photo de l'Amical Poker Club"}
              className="max-w-[92vw] max-h-[78vh] object-contain rounded-lg shadow-2xl"
            />
            {current.caption && (
              <p className="text-white/80 text-sm text-center max-w-xl">{current.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
