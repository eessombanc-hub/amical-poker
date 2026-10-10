/**
 * Qualification automatique au Day 2 d'un Deepstack groupé (voir
 * Round.groupId) — déclenchée par le cron de 3h du matin, heure de Paris
 * (voir app/api/cron/deepstack-day2/route.ts, vercel.json), le lendemain de
 * chaque Day 1. Inscrit automatiquement, sur CHAQUE manche suivante du
 * groupe (en pratique le Day 2), tout joueur qui était inscrit (statut
 * INSCRIT) au Day 1 et n'a PAS été éliminé (absent de RoundBust pour tout le
 * groupe) — même règle d'éligibilité que lib/ranking.ts,
 * isQualifiedForDeepstackDay2, revérifiée côté API pour tout ajout manuel.
 *
 * Idempotent par manche Day 1 grâce à Round.day2AutoRegisteredAt : si le
 * cron se déclenche plusieurs fois le même jour, la qualification
 * automatique n'a lieu qu'une seule fois. Elle ne touche jamais une
 * inscription déjà existante sur le Day 2 (même ANNULE) : si le bureau a
 * déjà retiré un joueur manuellement, ou l'a déjà ajouté avec un stack
 * précis (voir components/AdminRegisterPanel.tsx), ce passage automatique
 * ne l'écrase pas.
 */
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { notifyBureauNewsPublished, resolveSystemAuthorId } from "@/lib/socialAnnounce";
import { pruneOldPublishedNews } from "@/lib/contentPruning";

/**
 * "Hier" en jour calendaire de Paris, retourné comme un DateTime à minuit
 * UTC — directement comparable à Round.date, qui est toujours stockée ainsi
 * (voir lib/roundReminder.ts, même convention). Paris étant toujours en
 * avance sur UTC (+1 l'hiver, +2 l'été), minuit UTC d'un jour donné tombe
 * toujours dans la même journée calendaire à Paris : pas de décalage à
 * corriger entre les deux.
 */
function yesterdayAsUtcMidnight(): Date {
  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return new Date(startOfTodayUtc.getTime() - 24 * 60 * 60 * 1000);
}

export async function autoRegisterDeepstackDay2(): Promise<{
  day1RoundsProcessed: number;
  playersRegistered: number;
}> {
  const yesterday = yesterdayAsUtcMidnight();

  // Candidats : manches Deepstack groupées datées d'hier, pas déjà traitées.
  // Un Day 2 (daté d'une autre date, en pratique une semaine plus tard)
  // n'est jamais candidat ici — seule une manche datée d'hier peut l'être,
  // et on revérifie juste après qu'il s'agit bien du Day 1 (la plus
  // ancienne de son groupe), jamais d'un Day 2 ou Day 3 qui tomberait par
  // coïncidence la veille d'une autre manche du même groupe.
  const candidates = await prisma.round.findMany({
    where: {
      format: "DEEPSTACK",
      groupId: { not: null },
      date: yesterday,
      day2AutoRegisteredAt: null,
    },
    select: { id: true, groupId: true, seasonId: true },
  });

  let day1RoundsProcessed = 0;
  let playersRegistered = 0;

  for (const day1 of candidates) {
    const siblings = await prisma.round.findMany({
      where: { groupId: day1.groupId!, seasonId: day1.seasonId },
      select: { id: true, date: true },
      orderBy: { date: "asc" },
    });
    if (siblings.length < 2 || siblings[0].id !== day1.id) {
      // Pas réellement le Day 1 (groupe à une seule manche, ou celle-ci
      // n'est pas la plus ancienne) : rien à qualifier automatiquement.
      continue;
    }
    const continuationRoundIds = siblings.slice(1).map((s) => s.id);
    const groupRoundIds = siblings.map((s) => s.id);

    const [day1Registrations, groupBusts] = await Promise.all([
      prisma.roundRegistration.findMany({
        where: { roundId: day1.id, status: "INSCRIT" },
        select: { memberId: true },
      }),
      prisma.roundBust.findMany({
        where: { roundId: { in: groupRoundIds } },
        select: { bustedMemberId: true },
      }),
    ]);
    const bustedIds = new Set(groupBusts.map((b) => b.bustedMemberId));
    const survivorIds = day1Registrations.map((r) => r.memberId).filter((id) => !bustedIds.has(id));

    for (const continuationRoundId of continuationRoundIds) {
      const existing = await prisma.roundRegistration.findMany({
        where: { roundId: continuationRoundId, memberId: { in: survivorIds } },
        select: { memberId: true },
      });
      const alreadyPresentIds = new Set(existing.map((r) => r.memberId));

      for (const memberId of survivorIds) {
        // Jamais d'écrasement d'une inscription déjà existante (même
        // ANNULE, qui reflète un retrait manuel volontaire) — voir le
        // commentaire d'en-tête.
        if (alreadyPresentIds.has(memberId)) continue;
        await prisma.roundRegistration.create({
          data: { roundId: continuationRoundId, memberId, status: "INSCRIT" },
        });
        playersRegistered++;
      }
    }

    await prisma.round.update({
      where: { id: day1.id },
      data: { day2AutoRegisteredAt: new Date() },
    });
    day1RoundsProcessed++;
  }

  return { day1RoundsProcessed, playersRegistered };
}

/**
 * Lundi matin de l'ISO 8601 (minuit UTC) contenant `d` — ex. pour un `d` un
 * mercredi, retourne le lundi de cette même semaine. Même convention UTC
 * que yesterdayAsUtcMidnight ci-dessus.
 */
function startOfIsoWeekUtc(d: Date): Date {
  const utcMidnight = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utcMidnight.getUTCDay(); // 0 = dimanche, 1 = lundi, ... 6 = samedi
  const diffToMonday = day === 0 ? 6 : day - 1;
  return new Date(utcMidnight.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
}

/**
 * Publie dans Actualités, chaque lundi, la liste des joueurs qualifiés pour
 * le Day 2 de chaque Deepstack groupé dont le Day 1 a eu lieu la semaine
 * précédente — avec le stack de chacun (voir RoundRegistration.
 * startingStack, renseigné par le bureau depuis la fiche du Day 2,
 * components/StartingStackInput.tsx). Publiée le lundi (et non la nuit
 * suivant le Day 1, voir autoRegisterDeepstackDay2 ci-dessus) pour laisser
 * au bureau le week-end pour renseigner les stacks de chacun.
 *
 * Même règle de confidentialité que partout ailleurs sur le site
 * (classement, fin de manche — voir lib/ranking.ts,
 * syncPositionsFromBusts) : un pseudo n'est cité que si le membre a choisi
 * de rendre ses résultats publics (Member.publicResults) ; les autres sont
 * comptés sans être nommés.
 *
 * Idempotent par manche Day 1 grâce à Round.day2AnnouncementSentAt. Fenêtre
 * de recherche : tout Day 1 daté de la semaine civile précédente (lundi à
 * dimanche), pour ne jamais republier un Day 1 déjà traité, ni remonter
 * indéfiniment dans l'historique si le cron a été interrompu une semaine.
 * Si aucun joueur n'est qualifié (cas très rare : le Day 1 s'est terminé
 * sur un vainqueur, pas de Day 2 nécessaire), la manche est marquée traitée
 * sans qu'aucune actu ne soit publiée.
 */
export async function publishDeepstackDay2Announcements(): Promise<{
  roundsAnnounced: number;
  roundsSkippedNoQualifier: number;
}> {
  const thisWeekMonday = startOfIsoWeekUtc(new Date());
  const lastWeekMonday = new Date(thisWeekMonday.getTime() - 7 * 24 * 60 * 60 * 1000);

  const candidates = await prisma.round.findMany({
    where: {
      format: "DEEPSTACK",
      groupId: { not: null },
      day2AnnouncementSentAt: null,
      date: { gte: lastWeekMonday, lt: thisWeekMonday },
    },
    select: { id: true, groupId: true, seasonId: true, label: true, number: true },
  });

  let roundsAnnounced = 0;
  let roundsSkippedNoQualifier = 0;

  for (const day1 of candidates) {
    const siblings = await prisma.round.findMany({
      where: { groupId: day1.groupId!, seasonId: day1.seasonId },
      select: { id: true, date: true, label: true, number: true, startTime: true, location: true },
      orderBy: { date: "asc" },
    });
    if (siblings.length < 2 || siblings[0].id !== day1.id) {
      // Pas réellement le Day 1 : rien à annoncer.
      continue;
    }
    // Premier jour suivant du groupe — en pratique le seul (Day 2).
    const day2 = siblings[1];

    const qualified = await prisma.roundRegistration.findMany({
      where: { roundId: day2.id, status: "INSCRIT" },
      include: { member: { select: { nickname: true, publicResults: true } } },
    });

    if (qualified.length === 0) {
      await prisma.round.update({ where: { id: day1.id }, data: { day2AnnouncementSentAt: new Date() } });
      roundsSkippedNoQualifier++;
      continue;
    }

    // Classement par stack décroissant (chip leader en tête) ; stacks non
    // encore renseignés (null) placés en dernier, triés par pseudo entre eux.
    const sorted = [...qualified].sort((a, b) => {
      if (a.startingStack == null && b.startingStack == null) {
        return a.member.nickname.localeCompare(b.member.nickname, "fr", { sensitivity: "base" });
      }
      if (a.startingStack == null) return 1;
      if (b.startingStack == null) return -1;
      return b.startingStack - a.startingStack;
    });

    const publicRows = sorted.filter((r) => r.member.publicResults);
    const privateCount = sorted.length - publicRows.length;

    const day1Label = day1.label ?? `Manche ${day1.number}`;
    const day2Label = day2.label ?? `Manche ${day2.number}`;
    // "Deepstack 1 — Day 1" → "Deepstack 1", pour un titre d'actu générique
    // qui ne répète pas "Day 1" (déjà implicite : c'est son issue qu'on annonce).
    const deepstackTitle = day1Label.replace(/\s*[—-]\s*Day\s*1\s*$/i, "").trim() || day1Label;

    const lines = publicRows.map(
      (r) =>
        `${r.member.nickname} — ${
          r.startingStack != null ? `${r.startingStack.toLocaleString("fr-FR")} jetons` : "stack non renseigné"
        }`
    );

    const day2DateLabel = new Date(day2.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const bodyLines = [
      `Le Day 1 du ${deepstackTitle} est terminé ! Voici les joueurs qualifiés pour le ${day2Label}, avec le stack qu'ils conservent pour la suite du tournoi :`,
      "",
      ...lines.map((l) => `- ${l}`),
      ...(privateCount > 0
        ? [
            "",
            `(+${privateCount} joueur${privateCount > 1 ? "s" : ""} qualifié${
              privateCount > 1 ? "s" : ""
            } supplémentaire${privateCount > 1 ? "s" : ""}, ayant choisi de garder ses résultats privés.)`,
          ]
        : []),
      "",
      `Rendez-vous le ${day2DateLabel} à ${day2.startTime}, ${day2.location}, pour la suite du tournoi !`,
    ];

    // Best-effort, comme syncPositionsFromBusts (lib/ranking.ts) : un échec
    // de publication ici ne doit jamais faire échouer le cron tout entier.
    try {
      const authorId = await resolveSystemAuthorId();
      if (authorId) {
        const news = await prisma.news.create({
          data: {
            title: `Day 2 qualifiés — ${deepstackTitle}`,
            body: bodyLines.join("\n"),
            category: "RESULTATS",
            status: "PUBLIE",
            publishAt: new Date(),
            authorId,
          },
        });
        after(() => notifyBureauNewsPublished({ id: news.id, title: news.title, body: news.body }));
        after(() => pruneOldPublishedNews());
      } else {
        console.warn("[deepstackDay2] aucun auteur système trouvé, annonce Day 2 non publiée pour", day1.id);
      }
    } catch (err) {
      console.error("[deepstackDay2] échec de la publication de l'annonce Day 2 pour", day1.id, err);
    }

    await prisma.round.update({
      where: { id: day1.id },
      data: { day2AnnouncementSentAt: new Date() },
    });
    roundsAnnounced++;
  }

  return { roundsAnnounced, roundsSkippedNoQualifier };
}
