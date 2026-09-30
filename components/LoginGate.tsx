import Link from "next/link";

/**
 * Écran affiché À LA PLACE du contenu (pas de redirection) pour les
 * rubriques désormais réservées aux connectés (membres ou invités) :
 * Gazette Poker, Stratégie (niveaux Intermédiaire/Avancé), Vie du club,
 * Classement, Résultats, Forum, Galerie. Les Actualités, le Calendrier et
 * la Stratégie niveau Débutant restent, eux, accessibles sans connexion.
 * Toujours proposer de rejoindre le club ou de demander un accès invité,
 * plutôt qu'un simple renvoi vers /connexion.
 */
export default function LoginGate({
  title = "Contenu réservé aux connectés",
  description = "Cette rubrique est réservée aux membres et aux invités connectés de l'Amical Poker Club.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="px-7 py-20">
      <div className="max-w-md mx-auto panel text-center">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Accès réservé
        </div>
        <h1 className="text-2xl mb-3">{title}</h1>
        <p className="text-sage text-sm mb-9">{description}</p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link
            href="/connexion"
            className="btn-glow bg-forest text-white px-6 py-3 rounded text-sm font-medium"
          >
            Se connecter
          </Link>
          <Link
            href="/demande-adhesion"
            className="btn-glow bg-gradient-to-r from-brass to-brass-light text-ink font-semibold px-6 py-3 rounded text-sm"
          >
            Rejoindre le club →
          </Link>
          <Link
            href="/demande-invite"
            className="border border-ink/15 text-ink px-6 py-3 rounded text-sm font-medium hover:bg-paper-dim transition-colors"
          >
            Demander un accès invité →
          </Link>
        </div>
      </div>
    </div>
  );
}
