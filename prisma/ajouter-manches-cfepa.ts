/**
 * Script à usage unique : ajoute au calendrier de la saison en cours les 5
 * manches de qualification CFEPA (Championnat de France par Équipe de Poker
 * Associatif). Dates relevées directement sur le calendrier officiel du
 * club (https://amicalpokerclub.jimdofree.com/saison-2026-2027-1/
 * calendrier-2026-2027/) : 22/11/2026, 13/12/2026, 17/01/2027, 28/02/2027 et
 * 21/03/2027, toutes à 09h30. Le site historique n'indique aucun lieu pour
 * ces manches ("Non spécifié") — on reprend par défaut Espace Calès, le lieu
 * habituel du club, à corriger si besoin (aucun écran d'admin dédié pour
 * éditer une manche existante : passer par `npx prisma studio`).
 *
 * Idempotent (recherche par date avant création) : peut être relancé sans
 * risque, y compris si prisma/completer-saison-2026-2027.ts a déjà créé ces
 * mêmes manches — dans ce cas ce script ne fait que vérifier/compléter.
 *
 * Comme documenté dans prisma/schema.prisma et
 * app/api/rounds/[id]/register/route.ts, les inscriptions à une manche de
 * format CFEPA sont réservées aux membres de l'Équipe CFEPA (voir
 * Member.cfepaTeam, géré depuis /vie-du-club) : le club y engage une équipe
 * précise, pas l'ensemble de ses membres.
 *
 * Une fois les manches ajoutées, ce script renumérote TOUTES les manches de
 * la saison par ordre chronologique réel (tous formats confondus) — c'est la
 * convention du club pour le numéro de "Manche" (voir l'en-tête de
 * prisma/completer-saison-2026-2027.ts). La renumérotation se fait en deux
 * passes (d'abord des numéros négatifs temporaires, puis les numéros
 * définitifs) pour ne jamais se heurter à la contrainte d'unicité
 * (seasonId, number) en cours de route, quel que soit l'état actuel de la
 * base.
 *
 * Usage : npx tsx prisma/ajouter-manches-cfepa.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ESPACE_CALES = "Espace Calès";
const CFEPA_TIMES = { openTime: "09h30", startTime: "09h30" };

const CFEPA_ROUNDS: { date: string; label: string }[] = [
  { date: "2026-11-22", label: "CFEPA 1" },
  { date: "2026-12-13", label: "CFEPA 2" },
  { date: "2027-01-17", label: "CFEPA 3" },
  { date: "2027-02-28", label: "CFEPA 4" },
  { date: "2027-03-21", label: "CFEPA 5" },
];

async function main() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) {
    console.log("❌ Aucune saison active trouvée — rien à faire.");
    return;
  }

  for (const r of CFEPA_ROUNDS) {
    const date = new Date(r.date);
    const existing = await prisma.round.findFirst({ where: { seasonId: season.id, date } });

    if (!existing) {
      await prisma.round.create({
        data: {
          seasonId: season.id,
          number: 0, // provisoire — corrigé juste après par la renumérotation chronologique
          date,
          openTime: CFEPA_TIMES.openTime,
          startTime: CFEPA_TIMES.startTime,
          location: ESPACE_CALES,
          format: "CFEPA",
          maxSeats: 45,
          status: "A_VENIR",
          label: r.label,
        },
      });
      console.log(`✅ Manche créée : ${r.label} (${r.date}).`);
      continue;
    }

    if (existing.format !== "CFEPA" || existing.label !== r.label) {
      await prisma.round.update({
        where: { id: existing.id },
        data: { format: "CFEPA", label: r.label },
      });
      console.log(`✅ Manche du ${r.date} corrigée en « ${r.label} » (format CFEPA).`);
    } else {
      console.log(`ℹ️  Manche du ${r.date} (${r.label}) déjà présente — rien à faire.`);
    }
  }

  // ── Renumérotation chronologique de toute la saison (voir en-tête) ──
  const allRounds = await prisma.round.findMany({
    where: { seasonId: season.id },
    orderBy: { date: "asc" },
  });

  // Passe 1 : numéros négatifs temporaires, pour ne jamais entrer en
  // conflit avec un numéro définitif pas encore attribué (contrainte
  // unique seasonId+number vérifiée à chaque instruction, pas différée).
  for (let i = 0; i < allRounds.length; i++) {
    await prisma.round.update({ where: { id: allRounds[i].id }, data: { number: -(i + 1) } });
  }
  // Passe 2 : numéros définitifs, par ordre chronologique.
  let renumbered = 0;
  for (let i = 0; i < allRounds.length; i++) {
    const wantedNumber = i + 1;
    await prisma.round.update({ where: { id: allRounds[i].id }, data: { number: wantedNumber } });
    if (allRounds[i].number !== wantedNumber) renumbered++;
  }
  console.log(
    `✅ ${allRounds.length} manche(s) de la saison ${season.label} vérifiée(s), ${renumbered} renumérotée(s) par ordre chronologique.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
