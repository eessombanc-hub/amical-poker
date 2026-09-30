"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Bouton "j'aime" générique, réutilisé pour les actus (app/actualites) et
 * les articles de stratégie (app/strategie/[slug]) — bascule via un POST
 * sur `endpoint`, qui doit renvoyer { liked, count }. Mise à jour optimiste
 * du compteur. Les visiteurs non connectés voient le nombre de "j'aime"
 * mais un clic les renvoie vers la connexion plutôt que d'appeler l'API.
 */
export default function LikeButton({
  endpoint,
  initialCount,
  initialLiked,
  isLoggedIn,
}: {
  endpoint: string;
  initialCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link
        href="/connexion"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-sage hover:text-forest transition-colors"
        title="Connectez-vous pour aimer"
      >
        <span aria-hidden>🤍</span>
        {count > 0 ? count : "J'aime"}
      </Link>
    );
  }

  async function toggle() {
    if (pending) return;
    setPending(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      setLiked(!nextLiked);
      setCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
        liked ? "text-crimson" : "text-sage hover:text-forest"
      }`}
    >
      <span aria-hidden className={liked ? "animate-birthday-emoji-bounce" : ""}>
        {liked ? "❤️" : "🤍"}
      </span>
      {count > 0 ? count : "J'aime"}
    </button>
  );
}
