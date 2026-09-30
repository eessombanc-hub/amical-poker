import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Publie l'annonce de lancement du nouveau site dans Actualités du club.
 * Script à usage unique.
 */

const AUTHOR_EMAIL = "eessomba.nc@gmail.com";

const TITLE = "Le nouveau site du club est en ligne !";

const BODY = `Ça y est, le nouveau site de l'Amical Poker Club est en ligne ! Pensé pour toute la communauté, il rassemble tout ce qu'il faut pour suivre la vie du club et jouer plus simplement.

Ce qu'il apporte :

• Inscription aux manches en un clic, avec calendrier complet de la saison et places restantes en direct.

• Classement de la saison mis à jour manche après manche, avec le détail des points, victoires, podiums et kills de chacun.

• La Gazette Poker : l'actualité du poker sélectionnée pour la communauté — circuit, résultats, Winamax et bien plus, avec un bandeau "en direct" toujours à jour.

• 9 fiches stratégie écrites par le club pour progresser à son rythme, des règles du Texas Hold'em aux notions plus avancées comme l'ICM ou le jeu en heads-up.

• Un espace membre sécurisé pour gérer son profil et échanger avec les autres joueurs sur le forum du club.

• Une demande d'adhésion simplifiée pour tous les nouveaux joueurs qui souhaitent nous rejoindre.

Le site continuera d'évoluer au fil de la saison. Bonnes parties à tous !

Le bureau`;

async function main() {
  const author = await prisma.user.findUnique({ where: { email: AUTHOR_EMAIL } });
  if (!author) {
    console.log(`❌ Aucun compte trouvé avec l'e-mail "${AUTHOR_EMAIL}".`);
    return;
  }

  const existing = await prisma.news.findFirst({ where: { title: TITLE } });
  if (existing) {
    console.log(`ℹ️ Une actualité "${TITLE}" existe déjà — rien à faire.`);
    return;
  }

  const news = await prisma.news.create({
    data: {
      title: TITLE,
      body: BODY,
      category: "COMMUNICATION_BUREAU",
      status: "PUBLIE",
      authorId: author.id,
    },
  });

  console.log(`✅ Actualité publiée : "${news.title}" (${news.id}).`);
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
