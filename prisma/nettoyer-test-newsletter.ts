/**
 * Supprime l'adresse de test créée pendant la vérification du déploiement
 * de la newsletter (test-verif-deploiement@example.com) — à exécuter une
 * seule fois, puis ce fichier peut être supprimé.
 *
 * Usage : npx tsx prisma/nettoyer-test-newsletter.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.newsletterSubscriber.deleteMany({
    where: { email: "test-verif-deploiement@example.com" },
  });
  console.log(count > 0 ? `Supprimé (${count}).` : "Rien à supprimer (déjà propre).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
