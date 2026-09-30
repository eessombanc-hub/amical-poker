import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Saison ──
  const season = await prisma.season.upsert({
    where: { label: "2026/2027" },
    update: {},
    create: {
      label: "2026/2027",
      startDate: new Date("2026-09-04"),
      endDate: new Date("2027-06-30"),
      isActive: true,
    },
  });

  await prisma.rankingConfig.upsert({
    where: { seasonId: season.id },
    update: {},
    create: {
      seasonId: season.id,
      pointsTable: { "1": 100, "2": 82, "3": 68, "4": 55, "5": 44, "6": 35 },
      nbRoundsCounted: null, // toutes les manches comptent
      tieBreakRule: "nb_victoires",
    },
  });

  // ── Manches — calendrier réel synchronisé ──
  const rounds = [
    { number: 1, date: "2026-09-04", format: "MTT" as const, maxSeats: 45 },
    { number: 2, date: "2026-09-18", format: "MTT" as const, maxSeats: 45 },
    { number: 3, date: "2026-09-25", format: "MTT" as const, maxSeats: 45 },
    { number: 4, date: "2026-11-13", format: "MTT" as const, maxSeats: 45 },
    { number: 5, date: "2026-11-27", format: "MTT" as const, maxSeats: 45 },
  ];
  for (const r of rounds) {
    await prisma.round.upsert({
      where: { seasonId_number: { seasonId: season.id, number: r.number } },
      update: {},
      create: {
        seasonId: season.id,
        number: r.number,
        date: new Date(r.date),
        openTime: "20h15",
        startTime: "20h45",
        location: "Espace Calès",
        format: r.format,
        maxSeats: r.maxSeats,
        status: r.number === 1 ? "INSCRIPTIONS_OUVERTES" : "A_VENIR",
      },
    });
  }

  // ── Un membre de démonstration (admin) ──
  const passwordHash = await bcrypt.hash("motdepasse123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@apcv-poker.fr" },
    update: {},
    create: { email: "demo@apcv-poker.fr", passwordHash, role: "ADMIN" },
  });

  await prisma.member.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      firstName: "Demo",
      lastName: "Membre",
      nickname: "Hammer",
      membershipStatus: "ACTIF",
      publicResults: true,
    },
  });

  // ── Quelques actus poker de démonstration ──
  // (les anciens exemples pointaient vers winamax.fr avec des liens
  // génériques factices — retirés à la demande du club, qui préfère ne
  // pas afficher d'actu Winamax tant qu'aucun vrai article n'est ajouté
  // manuellement depuis /admin/poker-news)
  await prisma.pokerNewsItem.createMany({
    data: [
      {
        title: "Résultats du dernier Main Event à Barrière",
        summary:
          "Retour sur la table finale et les temps forts du tournoi principal, avec les réactions des joueurs qualifiés.",
        sourceName: "Les clubs de jeux parisiens",
        sourceUrl: "https://lesclubsdejeuxparisiens.fr/",
        category: "Résultats",
        status: "PUBLIE",
        submittedByName: "Bureau APCV",
        publishedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed terminé — connectez-vous avec demo@apcv-poker.fr / motdepasse123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
