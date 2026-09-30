import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Passe le compte d'Emeric (propriétaire du site) au rôle indiqué.
 * Script à usage unique, réutilisé pour repasser en ADMIN (le rôle le
 * plus élevé) après un précédent passage en RESPONSABLE.
 */

const EMAIL = "eessomba.nc@gmail.com";
const NEW_ROLE = "ADMIN" as const;

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.log(`❌ Aucun compte trouvé avec l'e-mail "${EMAIL}".`);
    return;
  }

  if (user.role === NEW_ROLE) {
    console.log(`ℹ️ Ce compte a déjà le rôle ${NEW_ROLE} — rien à faire.`);
    return;
  }

  const previousRole = user.role;
  await prisma.user.update({
    where: { id: user.id },
    data: { role: NEW_ROLE },
  });

  console.log(`✅ Rôle mis à jour pour ${EMAIL} : ${previousRole} → ${NEW_ROLE}.`);
  console.log("Il faudra se reconnecter (ou se déconnecter/reconnecter) pour que la session prenne en compte le nouveau rôle.");
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
