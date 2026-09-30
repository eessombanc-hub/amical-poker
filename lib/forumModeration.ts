// Suspension ("mise en sourdine") du forum ouvert à tous — voir
// /api/forum/mute/[userId]. Un compte suspendu ne peut plus créer de sujet
// ni répondre sur le forum commun (le forum du bureau n'est jamais concerné).

export type MuteState = {
  forumMutedUntil: Date | null;
  forumMutedPermanent: boolean;
};

/** Vrai si ce compte est actuellement suspendu du forum commun. */
export function isForumMuted(user: MuteState): boolean {
  if (user.forumMutedPermanent) return true;
  if (user.forumMutedUntil && user.forumMutedUntil.getTime() > Date.now()) return true;
  return false;
}

/** Message à afficher à un membre suspendu qui tente de publier. */
export function muteMessage(user: MuteState): string {
  if (user.forumMutedPermanent) {
    return "Vous êtes suspendu définitivement du forum commun par le bureau.";
  }
  if (user.forumMutedUntil) {
    const date = user.forumMutedUntil.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Vous êtes suspendu du forum commun jusqu'au ${date}.`;
  }
  return "Vous êtes suspendu du forum commun.";
}

// Durées proposées pour une suspension temporaire, en jours.
export const MUTE_DURATIONS = [
  { label: "24 heures", days: 1 },
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
] as const;
