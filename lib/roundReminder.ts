/**
 * Rappel automatique par e-mail envoyé à tous les membres actifs 2 jours
 * avant une manche — voir app/api/cron/round-reminder/route.ts (déclenché
 * par Vercel Cron, voir vercel.json) et Round.reminderSentAt (évite un
 * double envoi si le cron se déclenche plusieurs fois le même jour).
 *
 * Exclut les manches CFEPA : réservées à l'Équipe CFEPA (voir
 * Member.cfepaTeam, app/api/rounds/[id]/register), un rappel "inscrivez-
 * vous" adressé à tous les membres actifs n'aurait pas de sens pour elles —
 * voir lib/cfepaRoundReminder.ts pour leur rappel dédié, envoyé uniquement
 * aux joueurs inscrits avec la liste des rôles (capitaine, matin,
 * après-midi).
 */
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { SITE_NAME, SITE_URL, FORMAT_LABEL } from "@/lib/seo";

export async function sendRoundReminders(): Promise<{
  roundsProcessed: number;
  remindersSent: number;
  remindersFailed: number;
}> {
  // Round.date est stockée sans heure (minuit UTC, voir lib/seo.ts) : on
  // compare donc à la journée civile "aujourd'hui + 2 jours" dans son
  // ensemble plutôt qu'à un instant précis.
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in2Days = new Date(startOfToday.getTime() + 2 * 24 * 60 * 60 * 1000);
  const in3Days = new Date(startOfToday.getTime() + 3 * 24 * 60 * 60 * 1000);

  const rounds = await prisma.round.findMany({
    where: {
      date: { gte: in2Days, lt: in3Days },
      status: { not: "ANNULEE" },
      format: { not: "CFEPA" },
      reminderSentAt: null,
    },
  });

  if (rounds.length === 0) {
    return { roundsProcessed: 0, remindersSent: 0, remindersFailed: 0 };
  }

  // Tous les membres à jour d'adhésion (ACTIF) — voir prisma/schema.prisma,
  // enum MembershipStatus. Les invités (rôle INVITE, sans fiche Member) ne
  // jouent pas de manches et ne sont donc pas destinataires de ce rappel.
  const members = await prisma.member.findMany({
    where: { membershipStatus: "ACTIF" },
    include: { user: { select: { email: true } } },
  });

  let remindersSent = 0;
  let remindersFailed = 0;

  for (const round of rounds) {
    const label = round.label || `Manche ${round.number}`;
    const formatLabel = FORMAT_LABEL[round.format] ?? round.format;
    const dateStr = new Date(round.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    for (const member of members) {
      const result = await sendEmail({
        to: member.user.email,
        subject: `Rappel : ${label} dans 2 jours`,
        html: `
          <p>Bonjour ${member.firstName},</p>
          <p>Petit rappel : la <strong>${label}</strong> (${formatLabel}) a lieu
          <strong>${dateStr}</strong> à ${round.startTime}, à ${round.location}.</p>
          <p><a href="${SITE_URL}/calendrier">Voir le calendrier et s'inscrire</a></p>
          <p>À bientôt autour des tables !<br/>${SITE_NAME}</p>
        `,
      }).catch(() => ({ sent: false }));

      if (result.sent) remindersSent++;
      else remindersFailed++;
    }

    await prisma.round.update({
      where: { id: round.id },
      data: { reminderSentAt: new Date() },
    });
  }

  return { roundsProcessed: rounds.length, remindersSent, remindersFailed };
}
