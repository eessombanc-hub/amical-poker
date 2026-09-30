"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SiteSearchResult } from "@/app/api/site-search/route";
import MascotArt from "./MascotArt";

/**
 * Mascotte animée de l'accueil : le personnage dédié à l'aide à la
 * recherche (voir components/MascotArt.tsx), posé en bas à droite de la
 * page, avec quelques étincelles scintillantes en plus. Le logo du site
 * (components/Logo.tsx) reste la pièce tournante historique — les deux
 * dessins sont volontairement distincts. Au clic, la mascotte ouvre un
 * panneau de recherche qui interroge /api/site-search pour aider à
 * retrouver une page, une actu, une fiche stratégie... N'utilise aucun
 * stockage navigateur : tout l'état vit en mémoire (React state), reset à
 * chaque navigation.
 */

const KIND_LABEL: Record<SiteSearchResult["kind"], string> = {
  page: "Page du site",
  actu: "Gazette Poker",
  strategie: "Stratégie",
  "vie-du-club": "Actualité du club",
};

const KIND_ICON: Record<SiteSearchResult["kind"], string> = {
  page: "🧭",
  actu: "📰",
  strategie: "♠️",
  "vie-du-club": "🏆",
};

export default function HelperMascot() {
  const [open, setOpen] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SiteSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Petite bulle "Besoin d'aide ?" qui apparaît après quelques secondes pour
  // signaler la mascotte sans être intrusive dès le chargement de la page.
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 2600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/site-search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function toggle() {
    setOpen((o) => !o);
    setBubbleDismissed(true);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {/* ── PANNEAU DE RECHERCHE ─────────────────────────────── */}
      {open && (
        <div className="w-[calc(100vw-2.5rem)] max-w-sm bg-white border border-ink/10 rounded-xl shadow-[0_20px_45px_-15px_rgba(0,0,0,0.35)] overflow-hidden animate-fade-in-up">
          <div className="bg-gradient-to-r from-ink to-noir px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <span className="text-base" aria-hidden>
                ♠️
              </span>
              <span className="text-sm font-semibold">Un coup de main ?</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer la recherche"
              className="text-white/60 hover:text-white text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
          <div className="p-3">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher : classement, adhésion, stratégie…"
              className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brass/50"
            />
            <div className="mt-2 max-h-72 overflow-y-auto">
              {loading && (
                <p className="text-sage text-xs px-1 py-3">Recherche en cours…</p>
              )}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-sage text-xs px-1 py-3">
                  Aucun résultat pour « {query.trim()} ». Essayez « calendrier », «
                  classement », « adhésion »…
                </p>
              )}
              {!loading &&
                results.map((r) => (
                  <Link
                    key={`${r.kind}-${r.url}`}
                    href={r.url}
                    onClick={() => setOpen(false)}
                    className="block px-2 py-2 rounded-lg hover:bg-paper-dim transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span aria-hidden>{KIND_ICON[r.kind]}</span>
                      <span className="text-sm font-medium text-ink truncate">{r.title}</span>
                    </div>
                    <div className="text-[0.65rem] text-sage pl-6 truncate">
                      {KIND_LABEL[r.kind]} · {r.description}
                    </div>
                  </Link>
                ))}
              {query.trim().length < 2 && (
                <p className="text-sage text-xs px-1 py-3">
                  Tapez au moins deux lettres pour lancer la recherche sur tout le
                  site.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BULLE DE RELANCE ─────────────────────────────────── */}
      {showBubble && !bubbleDismissed && !open && (
        <div className="animate-fade-in-up bg-white border border-ink/10 rounded-xl rounded-br-sm shadow-lg px-3.5 py-2 text-xs text-ink relative">
          Besoin d&apos;aide pour trouver quelque chose ?
          <button
            onClick={() => setBubbleDismissed(true)}
            aria-label="Masquer le message"
            className="ml-2 text-sage/70 hover:text-sage"
          >
            ×
          </button>
        </div>
      )}

      {/* ── MASCOTTE ─────────────────────────────────────────── */}
      <button
        onClick={toggle}
        aria-label={open ? "Fermer l'aide à la recherche" : "Ouvrir l'aide à la recherche"}
        aria-expanded={open}
        className="relative group"
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full blur-xl opacity-70 animate-coin-halo"
          style={{
            background:
              "radial-gradient(circle, rgba(240,180,41,0.65) 0%, rgba(255,143,163,0.25) 45%, transparent 72%)",
          }}
        />

        {/* petites étincelles scintillantes autour de la mascotte, pour un
           effet plus charmeur/séduisant — décalées pour ne pas clignoter
           ensemble (voir tailwind.config.ts, animate-mascot-sparkle). */}
        {[
          { x: 6, y: 10, s: 5, delay: "0s" },
          { x: 60, y: 16, s: 4, delay: "0.9s" },
          { x: 58, y: 54, s: 3.4, delay: "1.7s" },
        ].map((sp, i) => (
          <svg
            key={i}
            aria-hidden
            width={sp.s * 2}
            height={sp.s * 2}
            viewBox="0 0 10 10"
            className="absolute animate-mascot-sparkle pointer-events-none"
            style={{ left: sp.x, top: sp.y, animationDelay: sp.delay }}
          >
            <path d="M5 0c0 2.4 0.4 4.6 5 5-4.6 0.4-5 2.6-5 5 0-2.4-0.4-4.6-5-5 4.6-0.4 5-2.6 5-5z" fill="#ffe9a8" />
          </svg>
        ))}

        <div className="relative drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105">
          <MascotArt size={68} />
        </div>
      </button>
    </div>
  );
}
