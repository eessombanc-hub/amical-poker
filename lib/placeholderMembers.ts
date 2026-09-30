/**
 * "Fiche placeholder historique" : un Member créé automatiquement (pas par
 * la personne elle-même) pour représenter un joueur retrouvé dans les
 * résultats d'une ancienne manche synchronisée depuis le site historique,
 * mais qui n'a pas encore créé son propre compte sur le nouveau site — voir
 * prisma/completer-saison-2026-2027.ts. Reconnue par convention (pas de
 * champ dédié en base) : adresse e-mail générée en @apcv-poker.local ET
 * statut encore EN_ATTENTE (dès qu'un admin passe la fiche en ACTIF, ou que
 * la vraie personne la réclame via une demande d'adhésion — voir
 * /api/admin/membership-requests/[id] — elle n'est plus considérée comme
 * placeholder).
 *
 * Sert à ne pas bloquer la vraie personne qui voudrait s'inscrire avec ce
 * même pseudo : voir /api/membership-requests (accepte la demande) et
 * /api/admin/membership-requests/[id] (rattache le compte à cette fiche au
 * lieu d'en créer une nouvelle, pour conserver l'historique de résultats).
 */

const PLACEHOLDER_EMAIL_SUFFIX = "@apcv-poker.local";

export function isPlaceholderMember(member: {
  membershipStatus: string;
  user?: { email: string } | null;
}): boolean {
  return member.membershipStatus === "EN_ATTENTE" && !!member.user?.email.endsWith(PLACEHOLDER_EMAIL_SUFFIX);
}
