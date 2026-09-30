import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Le lien accepte soit une URL http(s) classique (Drive, YouTube, réseau
// social...), soit une photo glissée/déposée directement dans le formulaire
// et encodée en data URI côté navigateur (voir ContentRequestForm,
// fileToResizedDataUrl) — même principe et même plafond que l'ajout de
// photo en galerie, voir app/api/admin/albums/[id]/photos/route.ts. Les
// vidéos, elles, n'ont pas d'autre moyen de parvenir au bureau qu'un lien
// (pas d'hébergement vidéo sur le site) : un fichier vidéo déposé dans le
// formulaire n'est donc jamais transformé en data URI côté client.
const MAX_LINK_LENGTH = 3_000_000;
const linkValue = z
  .string()
  .trim()
  .max(MAX_LINK_LENGTH, "Image trop volumineuse.")
  .refine(
    (v) => v === "" || /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v),
    { message: "Lien ou image invalide." }
  );

const createSchema = z.object({
  type: z.enum(["ACTU_POKER", "STRATEGIE", "PHOTO_VIDEO"]),
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères.").max(140),
  description: z
    .string()
    .trim()
    .min(10, "Merci de détailler un minimum votre proposition (10 caractères minimum).")
    .max(4000),
  link: linkValue.optional(),
});

/**
 * POST /api/content-requests — formulaire /proposer-contenu, réservé aux
 * membres connectés (fiche Member). N'écrit jamais directement dans
 * PokerNewsItem, StrategieArticle ou Photo : seul un responsable/admin,
 * depuis /admin/demandes-contenu, décide de publier (ou non) la proposition.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) {
    return NextResponse.json({ error: "Réservé aux membres du club." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Requête invalide." },
      { status: 400 }
    );
  }

  // Une photo importée directement compte comme "lien" ici (data URI) — une
  // vidéo, elle, doit toujours passer par un lien externe (pas
  // d'hébergement vidéo sur le site) : dans les deux cas, le champ doit
  // être renseigné pour ce type.
  if (parsed.data.type === "PHOTO_VIDEO" && !parsed.data.link) {
    return NextResponse.json(
      { error: "Merci d'indiquer un lien vers la photo ou la vidéo." },
      { status: 400 }
    );
  }

  const request = await prisma.contentRequest.create({
    data: {
      type: parsed.data.type,
      memberId: member.id,
      title: parsed.data.title,
      description: parsed.data.description,
      link: parsed.data.link || null,
    },
  });

  return NextResponse.json(
    { message: "Votre proposition a bien été transmise au bureau.", id: request.id },
    { status: 201 }
  );
}
