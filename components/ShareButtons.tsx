"use client";

import { useState } from "react";
import { absoluteUrl } from "@/lib/seo";

/**
 * Boutons de partage (WhatsApp, Facebook, X, copier le lien) pour les
 * pages qui ont une URL et un contenu propres à partager (poker-news,
 * stratégie) — chaque partage par un membre est un relais gratuit vers de
 * nouveaux visiteurs, sans dépendre uniquement des comptes du club.
 */
export default function ShareButtons({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = absoluteUrl(path);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie indisponible (permissions navigateur) : les liens de partage restent utilisables.
    }
  }

  const iconClass =
    "w-8 h-8 flex items-center justify-center rounded-full border border-ink/15 text-sage hover:text-forest hover:border-forest/40 transition-colors flex-shrink-0";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[0.65rem] uppercase tracking-widest text-sage font-semibold mr-1">
        Partager
      </span>
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Partager sur WhatsApp"
        className={iconClass}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.74.46 3.44 1.32 4.94L2 22l5.28-1.38a9.9 9.9 0 0 0 4.76 1.21h.01c5.46 0 9.9-4.45 9.9-9.92 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.16 0 4.19.84 5.71 2.37a8.06 8.06 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.09 8.09a8.1 8.1 0 0 1-4.12-1.13l-.29-.17-3.13.82.84-3.04-.19-.31a8.06 8.06 0 0 1-1.24-4.31c0-4.46 3.63-8.04 8.14-8.04Zm-4.5 4.13c-.15 0-.4.06-.61.29-.21.24-.8.78-.8 1.9s.82 2.2.93 2.35c.11.16 1.6 2.55 3.98 3.48 1.97.77 2.37.62 2.79.58.43-.04 1.38-.56 1.58-1.11.19-.54.19-1.01.13-1.11-.06-.1-.21-.16-.43-.27-.22-.11-1.38-.68-1.6-.76-.21-.08-.37-.11-.53.11-.15.22-.6.76-.74.92-.14.16-.27.18-.5.06-.22-.11-.95-.35-1.81-1.12-.67-.59-1.12-1.33-1.25-1.55-.13-.22-.01-.34.1-.45.1-.1.22-.27.34-.4.11-.14.15-.24.22-.4.07-.16.04-.3-.02-.41-.06-.11-.53-1.31-.74-1.79-.19-.46-.39-.4-.53-.41-.14-.01-.29-.01-.44-.01Z" />
        </svg>
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Partager sur Facebook"
        className={iconClass}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
        </svg>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Partager sur X"
        className={iconClass}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.9 2H22l-7.5 8.57L23.3 22h-6.86l-5.37-6.62L4.9 22H1.8l8.02-9.17L1 2h7.03l4.86 6.05L18.9 2Zm-1.2 18h1.7L7.4 4h-1.8l11.9 16Z" />
        </svg>
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="text-xs text-sage hover:text-forest underline underline-offset-4"
      >
        {copied ? "Lien copié ✓" : "Copier le lien"}
      </button>
    </div>
  );
}
