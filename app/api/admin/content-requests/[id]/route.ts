import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlausibleVideoUrl } from "@/lib/media";

const bodySchema = z.object({
  action: z.enum(["traiter", "refuser", "publier"]),
  adminNote: z.string().trim().max(500).optional(),
  // Utilisés uniquement par l'action "publier" (proposition Photo / vidéo) :
  // voir plus bas.
  albumId: z.string().optional(),
  caption: z.string().trim().max(200).optional(),
});

// Même tolérance que /api/admin/albums/:id/photos pour un lien photo (lien
// http(s) classique — les demandes de contenu ne proposent jamais d'image
// importée en data URI, contrairement à la Galerie elle-même).
function isValidPhotoLink(link: string) {
  return /^https?:\/\//i.test(link) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(link);
}

/**
 * PATCH /api/admin/content-requests/[id] — traite une proposition de
 * contenu (réservé RESPONSABLE+), avec trois actions possibles :
 *  - "refuser" : archive la demande sans rien publier.
 *  - "traiter" : archive la demande seule — pour une actu poker ou un
 *    article stratégie, que le responsable crée lui-même ailleurs
 *    (/admin/poker-news, /admin/strategie), ou pour une photo/vidéo déjà
 *    ajoutée manuellement à la Galerie avant de traiter la demande.
 *  - "publier" : réservé aux propositions Photo / vidéo — crée directement
 *    la Photo ou la Vidéo dans l'album choisi (albumId) ET archive la
 *    demande, en une seule transaction, pour éviter le clic manuel oublié
 *    sur /admin/galerie qui laissait des photos validées mais jamais
 *    publiées.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !hasRole(role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Requête invalide." },
      { status: 400 }
    );
  }

  const request = await prisma.contentRequest.findUnique({ where: { id: params.id } });
  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }
  if (request.status !== "EN_ATTENTE") {
    return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
  }

  const currentUserId = (session.user as any).id as string;

  if (parsed.data.action === "publier") {
    if (request.type !== "PHOTO_VIDEO") {
      return NextResponse.json(
        { error: "Seules les propositions Photo / vidéo peuvent être publiées directement." },
        { status: 400 }
      );
    }
    if (!request.link) {
      return NextResponse.json({ error: "Cette proposition n'a pas de lien à publier." }, { status: 400 });
    }
    if (!parsed.data.albumId) {
      return NextResponse.json({ error: "Choisissez un album." }, { status: 400 });
    }
    const album = await prisma.album.findUnique({ where: { id: parsed.data.albumId } });
    if (!album) {
      return NextResponse.json({ error: "Album introuvable." }, { status: 404 });
    }

    const isVideo = isPlausibleVideoUrl(request.link);
    if (album.type === "VIDEO" && !isVideo) {
      return NextResponse.json(
        {
          error:
            "Ce lien ne ressemble pas à une vidéo valide (YouTube, Vimeo ou fichier vidéo) — choisissez un album photo, ou ajoutez ce contenu manuellement depuis /admin/galerie.",
        },
        { status: 400 }
      );
    }
    if (album.type === "PHOTO" && !isValidPhotoLink(request.link)) {
      return NextResponse.json(
        {
          error:
            "Ce lien n'est pas exploitable comme photo — ajoutez ce contenu manuellement depuis /admin/galerie.",
        },
        { status: 400 }
      );
    }

    const caption = (parsed.data.caption || request.title).slice(0, 200);
    const [created] = await prisma.$transaction([
      album.type === "VIDEO"
        ? prisma.video.create({ data: { albumId: album.id, videoUrl: request.link, caption } })
        : prisma.photo.create({ data: { albumId: album.id, photoUrl: request.link, caption } }),
      prisma.contentRequest.update({
        where: { id: request.id },
        data: {
          status: "TRAITEE",
          processedAt: new Date(),
          processedById: currentUserId,
          adminNote: parsed.data.adminNote || null,
        },
      }),
    ]);

    return NextResponse.json({
      message: album.type === "VIDEO" ? "Vidéo publiée dans la Galerie." : "Photo publiée dans la Galerie.",
      created,
    });
  }

  await prisma.contentRequest.update({
    where: { id: request.id },
    data: {
      status: parsed.data.action === "traiter" ? "TRAITEE" : "REJETEE",
      processedAt: new Date(),
      processedById: currentUserId,
      adminNote: parsed.data.adminNote || null,
    },
  });

  return NextResponse.json({
    message: parsed.data.action === "traiter" ? "Demande marquée comme traitée." : "Demande refusée.",
  });
}
