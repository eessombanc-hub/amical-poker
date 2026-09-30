/**
 * Script d'analyse ponctuelle du site (comptes, connexions, trafic, contenu)
 * pour nourrir un audit complet — voir la demande d'Emeric du 15/09/2026
 * ("analyse complète du site, sa visibilité, ses résultats de connexion
 * depuis le lancement"). Purement en lecture : aucune écriture en base.
 *
 * Usage : npx tsx prisma/analyse-site.ts
 * (à lancer depuis la racine du projet, avec le .env pointant vers la base
 * de production, comme pour prisma/nettoyer-articles-publies.ts)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function section(title: string, fn: () => Promise<void>) {
  console.log(`\n${"=".repeat(70)}\n${title}\n${"=".repeat(70)}`);
  try {
    await fn();
  } catch (err) {
    console.log(`  (erreur pendant cette section : ${err instanceof Error ? err.message : err})`);
  }
}

async function main() {
  await section("1. COMPTES & RÔLES", async () => {
    const totalUsers = await prisma.user.count();
    const byRole = await prisma.user.groupBy({ by: ["role"], _count: true });
    const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
    const lastUser = await prisma.user.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    console.log(`Total comptes : ${totalUsers}`);
    byRole.forEach((r) => console.log(`  - ${r.role} : ${r._count}`));
    console.log(`Premier compte créé : ${fmtDate(firstUser?.createdAt)} (= date de lancement approx.)`);
    console.log(`Dernier compte créé : ${fmtDate(lastUser?.createdAt)}`);

    const totalMembers = await prisma.member.count();
    const byStatus = await prisma.member.groupBy({ by: ["membershipStatus"], _count: true });
    console.log(`\nFiches membre (Member) : ${totalMembers}`);
    byStatus.forEach((s) => console.log(`  - ${s.membershipStatus} : ${s._count}`));
  });

  await section("2. CONNEXIONS DEPUIS LE LANCEMENT", async () => {
    const totalUsers = await prisma.user.count();
    const neverLoggedIn = await prisma.user.count({ where: { lastLoginAt: null } });
    const loggedInAtLeastOnce = totalUsers - neverLoggedIn;
    console.log(`Comptes s'étant connectés au moins une fois : ${loggedInAtLeastOnce} / ${totalUsers}`);
    console.log(`Comptes créés mais jamais connectés : ${neverLoggedIn}`);

    for (const [label, days] of [["24 dernières heures", 1], ["7 derniers jours", 7], ["30 derniers jours", 30], ["90 derniers jours", 90]] as const) {
      const count = await prisma.user.count({ where: { lastLoginAt: { gte: daysAgo(days) } } });
      console.log(`  - connectés sur les ${label} : ${count}`);
    }

    const lastLogins = await prisma.user.findMany({
      where: { lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: "desc" },
      take: 5,
      select: { email: true, role: true, lastLoginAt: true },
    });
    console.log(`\n5 dernières connexions :`);
    lastLogins.forEach((u) => console.log(`  - ${fmtDate(u.lastLoginAt)} — ${u.role} (${u.email})`));
  });

  await section("3. FUNNEL D'ADHÉSION / DEMANDES D'ACCÈS", async () => {
    const byTypeStatus = await prisma.membershipRequest.groupBy({
      by: ["type", "status"],
      _count: true,
    });
    if (byTypeStatus.length === 0) console.log("Aucune demande enregistrée.");
    byTypeStatus.forEach((r) => console.log(`  - ${r.type} / ${r.status} : ${r._count}`));

    const total = await prisma.membershipRequest.count();
    const validated = await prisma.membershipRequest.count({ where: { status: "VALIDEE" } });
    if (total > 0) {
      console.log(`\nTaux de conversion global (demandes validées / total) : ${((validated / total) * 100).toFixed(1)}%`);
    }
  });

  await section("4. TRAFIC DU SITE (PageView)", async () => {
    const total = await prisma.pageView.count();
    if (total === 0) {
      console.log("Aucune donnée de trafic enregistrée (compteur maison PageView vide).");
      return;
    }
    const first = await prisma.pageView.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
    console.log(`Total pages vues (depuis ${fmtDate(first?.createdAt)}) : ${total}`);

    for (const [label, days] of [["24 dernières heures", 1], ["7 derniers jours", 7], ["30 derniers jours", 30]] as const) {
      const count = await prisma.pageView.count({ where: { createdAt: { gte: daysAgo(days) } } });
      console.log(`  - ${label} : ${count}`);
    }

    const authCount = await prisma.pageView.count({ where: { authenticated: true } });
    console.log(`\nVues avec session connectée : ${authCount} (${((authCount / total) * 100).toFixed(1)}%)`);
    console.log(`Vues anonymes : ${total - authCount} (${(((total - authCount) / total) * 100).toFixed(1)}%)`);

    const topPaths = await prisma.pageView.groupBy({
      by: ["path"],
      _count: true,
      orderBy: { _count: { path: "desc" } },
      take: 12,
    });
    console.log(`\nTop 12 pages les plus vues :`);
    topPaths.forEach((p) => console.log(`  - ${p.path} : ${p._count}`));
  });

  await section("5. NEWSLETTER", async () => {
    const total = await prisma.newsletterSubscriber.count();
    console.log(`Total inscrits newsletter : ${total}`);
    const bySource = await prisma.newsletterSubscriber.groupBy({ by: ["source"], _count: true });
    bySource.forEach((s) => console.log(`  - source "${s.source ?? "inconnue"}" : ${s._count}`));
  });

  await section("6. CONTENU PUBLIÉ", async () => {
    const newsByStatus = await prisma.news.groupBy({ by: ["status"], _count: true });
    console.log("Actualités du club (News) :");
    newsByStatus.forEach((n) => console.log(`  - ${n.status} : ${n._count}`));

    const pokerNewsByStatus = await prisma.pokerNewsItem.groupBy({ by: ["status"], _count: true });
    console.log("\nGazette Poker (PokerNewsItem) :");
    pokerNewsByStatus.forEach((n) => console.log(`  - ${n.status} : ${n._count}`));

    const strategieByLevelStatus = await prisma.strategieArticle.groupBy({
      by: ["level", "status"],
      _count: true,
    });
    console.log("\nArticles Stratégie (StrategieArticle) :");
    strategieByLevelStatus.forEach((s) => console.log(`  - ${s.level} / ${s.status} : ${s._count}`));

    const topicCount = await prisma.forumTopic.count();
    const replyCount = await prisma.forumReply.count();
    console.log(`\nForum : ${topicCount} sujet(s), ${replyCount} réponse(s)`);

    const albumCount = await prisma.album.count();
    const photoCount = await prisma.photo.count();
    console.log(`Galerie : ${albumCount} album(s), ${photoCount} photo(s)`);

    const portraitCount = await prisma.portrait.count({ where: { published: true } });
    console.log(`Portraits publiés : ${portraitCount}`);
  });

  await section("7. ACTIVITÉ MANCHES / SAISON", async () => {
    const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
    console.log(`Saison active : ${activeSeason?.label ?? "aucune"}`);
    const roundCount = await prisma.round.count();
    const registrationCount = await prisma.roundRegistration.count({ where: { status: "INSCRIT" } });
    console.log(`Total manches (toutes saisons) : ${roundCount}`);
    console.log(`Total inscriptions (statut INSCRIT) : ${registrationCount}`);
    if (roundCount > 0) {
      console.log(`Moyenne d'inscrits par manche : ${(registrationCount / roundCount).toFixed(1)}`);
    }
  });

  console.log(`\n${"=".repeat(70)}\nFin de l'analyse.\n${"=".repeat(70)}`);
}

main()
  .catch((err) => {
    console.error("Erreur pendant l'analyse :", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
