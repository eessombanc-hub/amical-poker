"use client";

import { useState } from "react";

/**
 * Encart de capture d'e-mail — pour un visiteur intéressé mais pas encore
 * prêt à adhérer. Placé dans le pied de page (visible sur tout le site,
 * y compris les articles Stratégie) plutôt que dans une modale intrusive.
 */
export default function NewsletterSignup({
  source = "footer",
  className = "",
}: {
  source?: string;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className={className}>
        <p className="text-sm font-medium">✓ Inscription confirmée, à bientôt dans votre boîte mail !</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-sm font-medium mb-1">Être prévenu de la prochaine manche</p>
      <p className="text-xs opacity-70 mb-3 max-w-xs">
        Un e-mail de temps en temps pour les prochaines manches et les temps forts du club. Désinscription en un clic à tout moment.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@e-mail.fr"
          className="min-w-0 flex-1 bg-white/10 border border-white/25 rounded px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-brass text-ink text-sm font-semibold px-4 py-2 rounded whitespace-nowrap disabled:opacity-60"
        >
          {status === "loading" ? "..." : "S'inscrire"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-xs text-red-300 mt-2">Un souci est survenu, réessayez dans un instant.</p>
      )}
    </div>
  );
}
