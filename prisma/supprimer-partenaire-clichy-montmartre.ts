/**
 * Script ponctuel : supprime le partenaire "Clichy Montmartre" de la page
 * /partenaires. Ce partenaire vient de la synchronisation avec l'ancien
 * site (voir lib/jimdoSync.ts, syncPartenaires) — il n'existe pas d'écran
 * d'administration dédié pour les retirer un par un, d'où ce script.
 * Usage : npx tsx prisma/supprimer-partenaire-clichy-montmartre.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const partner = await prisma.partner.findFirst({
    where: { name: { contains: "Clichy Montmartre", mode: "insensitive" } },
  });

  if (!partner) {
    console.log('Aucun partenaire correspondant à "Clichy Montmartre" n\'a été trouvé — rien à faire.');
    return;
  }

  console.log(`Suppression du partenaire : "${partner.name}" (id: ${partner.id})`);
  await prisma.partner.delete({ where: { id: partner.id } });
  console.log("✓ Supprimé.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
