/**
 * Supprime le compte de test créé pendant la vérification du déploiement du
 * rôle invité (test-invite-verif@example.com) — à exécuter une seule fois,
 * puis ce fichier peut être supprimé.
 *
 * Usage : npx tsx prisma/nettoyer-test-invite.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.user.deleteMany({
    where: { email: "test-invite-verif@example.com" },
  });
  console.log(count > 0 ? `Supprimé (${count}).` : "Rien à supprimer (déjà propre).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
