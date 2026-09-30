"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type TickerItem = {
  id: string;
  title: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  imageUrl: string | null;
};

/**
 * Bannière d'actualité animée façon "site sportif" : une ligne "En direct" qui
 * défile automatiquement d'un titre à l'autre, et qui se déroule (popup
 * déroulant animé) au clic pour afficher le résumé complet + le lien vers
 * l'article. L'animation d'ouverture utilise la technique grid-template-rows
 * 0fr → 1fr pour un déroulé fluide, sans hauteur fixe à calculer.
 */
export default function NewsTicker({ items }: { items: TickerItem[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (items.length <= 1 || open) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5500);
    return () => clearInterval(t);
  }, [items.length, open]);

  if (items.length === 0) return null;
  const current = items[index];

  function go(delta: number, e: React.MouseEvent) {
    e.stopPropagation();
    setIndex((i) => (i + delta + items.length) % items.length);
  }

  return (
    <div className="bg-noir text-white relative z-10">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="w-full flex items-center gap-3 px-5 sm:px-7 py-2.5 text-left"
        >
          <span className="flex items-center gap-1.5 text-[0.62rem] tracking-widest uppercase font-bold text-crimson flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-crimson animate-badge-pulse" />
            En direct
          </span>
          <span key={current.id} className="flex-1 min-w-0 text-sm truncate animate-fade-in-up">
            <span className="text-brass font-semibold mr-2">{current.category}</span>
            <span className="text-white/90">{current.title}</span>
          </span>
          <span className="hidden sm:flex items-center gap-1 flex-shrink-0">
            <span
              role="button"
              aria-label="Actu précédente"
              onClick={(e) => go(-1, e)}
              className="text-white/50 hover:text-white px-1.5 py-0.5"
            >
              ‹
            </span>
            <span
              role="button"
              aria-label="Actu suivante"
              onClick={(e) => go(1, e)}
              className="text-white/50 hover:text-white px-1.5 py-0.5"
            >
              ›
            </span>
          </span>
          <span
            className={`flex-shrink-0 text-white/60 text-xs transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </button>

        <div
          className="grid transition-[grid-template-rows] duration-[350ms] ease-out"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="px-5 sm:px-7 pb-5 pt-1 flex flex-col sm:flex-row gap-4 border-t border-white/10">
              {current.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.imageUrl}
                  alt=""
                  className="w-full sm:w-40 h-24 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="text-[0.62rem] tracking-widest uppercase text-sage/80 font-semibold mb-1.5">
                  {current.category} · {current.sourceName}
                </div>
                <p className="text-white/80 text-sm leading-relaxed line-clamp-3">
                  {current.summary}
                </p>
                <Link
                  href={`/poker-news/${current.id}`}
                  className="inline-block mt-2 text-forest-glow text-xs font-medium underline underline-offset-4"
                >
                  Lire l&apos;article →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {items.length > 1 && (
          <div className="flex gap-1 px-5 sm:px-7 pb-2">
            {items.map((it, i) => (
              <button
                key={it.id}
                aria-label={`Actu ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-[3px] flex-1 rounded-full transition-colors ${
                  i === index ? "bg-brass" : "bg-white/15"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
