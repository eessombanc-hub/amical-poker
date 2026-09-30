"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type RegistrationStatus = "INSCRIT" | "LISTE_ATTENTE" | null;

export default function RegisterButton({
  roundId,
  isFull,
  // Statut d'inscription déjà connu du membre connecté pour cette manche
  // (voir app/calendrier/page.tsx et app/page.tsx, qui l'interrogent
  // côté serveur) — null si non inscrit, ou si personne n'est connecté.
  // Permet de griser le bouton dès le chargement de la page, pas
  // seulement après un clic dans la même session.
  initialStatus = null,
  variant = "solid",
}: {
  roundId: string;
  isFull: boolean;
  initialStatus?: RegistrationStatus;
  /**
   * "solid" (vert plein, pour fond clair), "onDark" (blanc, pour fond vert),
   * ou "heroPill" (pastille compacte, pour la rangée de boutons du hero
   * d'accueil, à côté de "Rejoindre le club →").
   */
  variant?: "solid" | "onDark" | "heroPill";
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<RegistrationStatus>(initialStatus);

  const registered = status !== null;

  async function handleRegister() {
    if (!session) {
      router.push("/connexion");
      return;
    }
    // Garde-fou : le bouton est normalement déjà désactivé/grisé dans ce cas
    // (voir disabled ci-dessous), ceci n'évite qu'un double envoi accidentel.
    if (registered) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/rounds/${roundId}/register`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Affiche le motif exact renvoyé par l'API (ex. manche CFEPA réservée
        // à l'équipe) plutôt qu'un message générique, plus utile ici qu'un
        // "réessayez" quand ce n'est pas un problème transitoire.
        setMessage(typeof data.error === "string" ? data.error : "Une erreur est survenue, réessayez.");
        return;
      }
      setStatus(data.status === "LISTE_ATTENTE" ? "LISTE_ATTENTE" : "INSCRIT");
      setMessage(
        data.status === "LISTE_ATTENTE"
          ? "Manche complète. Vous êtes en liste d'attente."
          : "Inscription confirmée !"
      );
    } catch {
      setMessage("Une erreur est survenue, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  const label = loading
    ? "…"
    : registered
    ? status === "LISTE_ATTENTE"
      ? "Inscrit (liste d'attente)"
      : "Déjà inscrit ✓"
    : isFull
    ? "Rejoindre la liste d'attente"
    : variant === "heroPill"
    ? "S'inscrire pour la prochaine manche"
    : "S'inscrire à cette manche";

  if (variant === "heroPill") {
    return (
      <div className="inline-flex flex-col items-center">
        <button
          onClick={handleRegister}
          disabled={loading || registered}
          className="btn-glow bg-forest text-white px-7 py-3 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {label}
        </button>
        {message && <p className="text-white/90 text-xs mt-2 text-center max-w-[14rem]">{message}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleRegister}
        disabled={loading || registered}
        className={`btn-glow px-8 py-3.5 rounded text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
          variant === "onDark"
            ? "bg-white text-forest-2"
            : "bg-forest text-white"
        }`}
      >
        {label}
      </button>
      {message && (
        <p className={`text-sm mt-3 ${variant === "onDark" ? "text-white/90" : "text-sage"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
