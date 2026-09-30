/**
 * Rappel automatique par e-mail envoyé, 2 jours avant une manche CFEPA, aux
 * membres INSCRITS à cette manche précise — avec la liste des joueurs
 * présents et leur rôle (capitaine, matin, après-midi), voir
 * prisma/schema.prisma (CfepaRoundRole) et
 * components/CfepaRoundRolesPanel.tsx où ces rôles sont attribués.
 *
 * Distinct du rappel général (voir lib/roundReminder.ts), qui exclut
 * désormais les manches CFEPA de son envoi : une manche CFEPA n'étant
 * ouverte qu'à l'Équipe CFEPA, un rappel "inscrivez-vous" à tous les membres
 * actifs n'aurait pas de sens. Les deux rappels sont déclenchés par le même
 * cron quotidien (voir app/api/cron/round-reminder/route.ts, vercel.json) et
 * partagent Round.reminderSentAt pour éviter un double envoi — sans risque
 * de collision entre les deux puisqu'une même manche ne relève jamais que
 * d'un seul des deux (CFEPA ou non).
 */
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

type CfepaRoleValue = "CAPITAINE" | "MATIN" | "APRES_MIDI";

type RegisteredPlayer = {
  memberId: string;
  nickname: string;
  email: string;
};

function playersListHtml(players: RegisteredPlayer[]): string {
  if (players.length === 0) {
    return `<p style="color:#777;margin:0 0 12px">Aucun joueur pour l&apos;instant.</p>`;
  }
  return `<ul style="margin:0 0 12px">${players
    .map((p) => `<li>${p.nickname}</li>`)
    .join("")}</ul>`;
}

export async function sendCfepaRoundReminders(): Promise<{
  roundsProcessed: number;
  remindersSent: number;
  remindersFailed: number;
}> {
  // Round.date est stockée sans heure (minuit UTC, voir lib/seo.ts) : on
  // compare donc à la journée civile "aujourd'hui + 2 jours" dans son
  // ensemble, comme lib/roundReminder.ts.
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in2Days = new Date(startOfToday.getTime() + 2 * 24 * 60 * 60 * 1000);
  const in3Days = new Date(startOfToday.getTime() + 3 * 24 * 60 * 60 * 1000);

  const rounds = await prisma.round.findMany({
    where: {
      format: "CFEPA",
      date: { gte: in2Days, lt: in3Days },
      status: { not: "ANNULEE" },
      reminderSentAt: null,
    },
  });

  if (rounds.length === 0) {
    return { roundsProcessed: 0, remindersSent: 0, remindersFailed: 0 };
  }

  let remindersSent = 0;
  let remindersFailed = 0;

  for (const round of rounds) {
    const label = round.label || `Manche ${round.number}`;
    const dateStr = new Date(round.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const [registrations, roles] = await Promise.all([
      prisma.roundRegistration.findMany({
        where: { roundId: round.id, status: "INSCRIT" },
        include: { member: { include: { user: { select: { email: true } } } } },
      }),
      prisma.cfepaRoundRole.findMany({ where: { roundId: round.id } }),
    ]);

    // Rien à envoyer si personne n'est finalement inscrit — mais on marque
    // quand même la manche pour ne pas la réessayer indéfiniment.
    if (registrations.length === 0) {
      await prisma.round.update({ where: { id: round.id }, data: { reminderSentAt: new Date() } });
      continue;
    }

    const roleByMemberId = new Map<string, CfepaRoleValue>(
      roles.map((r) => [r.memberId, r.role as CfepaRoleValue])
    );
    const players: RegisteredPlayer[] = registrations
      .map((r) => ({ memberId: r.memberId, nickname: r.member.nickname, email: r.member.user.email }))
      .sort((a, b) => a.nickname.localeCompare(b.nickname, "fr", { sensitivity: "base" }));

    const captain = players.find((p) => roleByMemberId.get(p.memberId) === "CAPITAINE") ?? null;
    const morning = players.filter((p) => roleByMemberId.get(p.memberId) === "MATIN");
    const afternoon = players.filter((p) => roleByMemberId.get(p.memberId) === "APRES_MIDI");
    const unassigned = players.filter((p) => !roleByMemberId.has(p.memberId));

    const html = `
      <p>Bonjour,</p>
      <p>La manche <strong>${label}</strong> a lieu <strong>${dateStr}</strong> à
      ${round.startTime}, à ${round.location}. Voici la liste des joueurs
      présents et leur rôle :</p>
      <p style="margin:0 0 4px"><strong>Capitaine :</strong> ${captain ? captain.nickname : "non désigné pour l'instant"}</p>
      <p style="margin:16px 0 4px"><strong>Joueurs — matin :</strong></p>
      ${playersListHtml(morning)}
      <p style="margin:16px 0 4px"><strong>Joueurs — après-midi :</strong></p>
      ${playersListHtml(afternoon)}
      ${
        unassigned.length > 0
          ? `<p style="margin:16px 0 4px"><strong>Rôle à confirmer :</strong></p>${playersListHtml(unassigned)}`
          : ""
      }
      <p><a href="${SITE_URL}/calendrier/manche/${round.id}">Voir la fiche de la manche</a></p>
      <p>Bonne chance à l&apos;équipe !<br/>${SITE_NAME}</p>
    `;

    for (const player of players) {
      const result = await sendEmail({
        to: player.email,
        subject: `${label} dans 2 jours — équipe et rôles`,
        html,
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
