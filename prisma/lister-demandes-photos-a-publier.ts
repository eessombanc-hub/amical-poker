/**
 * Script de diagnostic (lecture seule, ne modifie rien) : liste les
 * propositions de contenu de type "Photo / vidéo" marquées comme TRAITÉES
 * mais qui n'ont pourtant pas encore été réellement ajoutées à un album de
 * la Galerie.
 *
 * Contexte : sur /admin/demandes-contenu, le bouton "Marquer comme traitée"
 * archive seulement la demande — il ne crée PAS la photo/vidéo dans la
 * Galerie (voir app/api/admin/content-requests/[id]/route.ts, qui le
 * documente explicitement). Publier réellement une photo demande une étape
 * manuelle en plus, sur /admin/galerie, en copiant le lien fourni par le
 * membre. Ce script retrouve les demandes qui ont été marquées "traitées"
 * (donc disparues de la liste d'attente sur /admin/demandes-contenu) sans
 * qu'on puisse savoir automatiquement si la photo a bien été ajoutée
 * ensuite — d'où l'intérêt de tout relister ici pour vérifier.
 *
 * Usage : npx tsx prisma/lister-demandes-photos-a-publier.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const requests = await prisma.contentRequest.findMany({
    where: { type: "PHOTO_VIDEO", status: "TRAITEE" },
    orderBy: { processedAt: "desc" },
    include: { member: { select: { nickname: true, firstName: true, lastName: true } } },
  });

  if (requests.length === 0) {
    console.log("Aucune demande photo/vidéo marquée comme traitée pour l'instant.");
    return;
  }

  console.log(`${requests.length} demande(s) photo/vidéo marquée(s) « traitée » :\n`);
  for (const r of requests) {
    console.log("─".repeat(60));
    console.log(`Titre        : ${r.title}`);
    console.log(`Proposé par  : ${r.member.nickname} (${r.member.firstName} ${r.member.lastName})`);
    console.log(`Traité le    : ${r.processedAt?.toLocaleString("fr-FR") ?? "?"}`);
    console.log(`Description  : ${r.description}`);
    console.log(`Lien/photo   : ${r.link ?? "(aucun lien fourni)"}`);
  }
  console.log("─".repeat(60));
  console.log(
    "\nPour chacune de ces demandes, vérifiez si la photo/vidéo est déjà visible sur /galerie."
  );
  console.log(
    "Si non : allez sur /admin/galerie, choisissez (ou créez) l'album adapté, puis collez le\n" +
      "lien ci-dessus (« Lien/photo ») dans le champ d'ajout, avec la description en légende."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
