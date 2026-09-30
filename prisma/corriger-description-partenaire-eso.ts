import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Corrige la description du partenaire ESO Suposteo, tronquée en pleine
 * phrase sur le site actuel ("…nous demandons simplement de faire connaître
 * c"). Texte complet restauré depuis la page dédiée de l'ancien site du
 * club (amicalpokerclub.jimdofree.com/partenaires/eso-suposteo/).
 * Script à usage unique.
 */

const FULL_DESCRIPTION = `La Clinique de l'ESO est la plus importante clinique ostéopathique de France, avec 38 cabinets de consultation, et dispense des soins ostéopathiques à des milliers de patients, à titre préventif ou curatif. Afin de promouvoir, auprès du grand public, l'importance de la prévention en matière de santé, la Clinique Ostéopathique de l'ESO a choisi de mettre en œuvre des accords de partenariat avec les Associations, Clubs Sportifs, Syndicats, Comités d'Entreprise, Ligues, Amicales, Etablissements Publics et Administration. Ce partenariat permet au personnel et aux adhérents de ces structures d'avoir accès à des soins ostéopathiques dispensés dans notre Clinique, à des tarifs privilégiés : la première consultation (Bilan Ostéopathique) est gratuite, l'inscription annuelle est offerte, l'adhérent ne règle que le montant de ses consultations (13 €). Bien entendu, ce partenariat n'exige aucun engagement financier de la part du signataire : nous lui demandons simplement de faire connaître ce partenariat auprès de ses membres et participants, montrant ainsi son engagement à nos côtés en faveur d'une meilleure prévention.`;

async function main() {
  const partner = await prisma.partner.findFirst({
    where: { name: { contains: "ESO", mode: "insensitive" } },
  });

  if (!partner) {
    console.log('❌ Aucun partenaire dont le nom contient "ESO" — rien à faire.');
    return;
  }

  await prisma.partner.update({
    where: { id: partner.id },
    data: { description: FULL_DESCRIPTION },
  });

  console.log(`✅ Description corrigée pour le partenaire "${partner.name}" (${partner.id}).`);
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
