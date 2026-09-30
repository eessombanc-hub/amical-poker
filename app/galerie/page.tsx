import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MarkSectionSeen from "@/components/MarkSectionSeen";
import LoginGate from "@/components/LoginGate";
import MediaLightbox, { type MediaComment, type MediaItem } from "@/components/MediaLightbox";
import GalleryTabs from "@/components/GalleryTabs";
import GalleryAlbumTitle from "@/components/GalleryAlbumTitle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galeries photos & vidéos",
  description:
    "Photos et vidéos souvenirs des manches et événements de l'Amical Poker Club à Villecresnes.",
  alternates: { canonical: "/galerie" },
};

type CommentAuthor = { displayName: string | null; email: string; member: { nickname: string } | null };

/** Nom affiché d'un auteur de commentaire — même convention que le forum
 *  (voir app/forum/page.tsx) : pseudo de la fiche membre en priorité, sinon
 *  le nom affiché d'un compte invité, sinon l'e-mail en dernier recours. */
function resolveAuthorName(author: CommentAuthor): string {
  return author.member?.nickname || author.displayName || author.email;
}

function toComments(
  raw: { id: string; body: string; createdAt: Date; author: CommentAuthor }[]
): MediaComment[] {
  return raw.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    authorName: resolveAuthorName(c.author),
  }));
}

export default async function GaleriePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? ((session.user as any).id as string) : undefined;
  const isMember = userId ? !!(await prisma.member.findUnique({ where: { userId } })) : false;
  // Contrôles de modération (titre, suppression) dans MediaLightbox —
  // réservés RESPONSABLE+, comme les routes API sous-jacentes.
  const isModerator = hasRole((session?.user as any)?.role, "RESPONSABLE");

  if (!session?.user || !userId) {
    return (
      <LoginGate
        title="Galerie réservée aux connectés"
        description="Les photos et vidéos souvenirs des manches et événements sont réservées aux membres et aux invités connectés de l'Amical Poker Club."
      />
    );
  }

  // Photos/vidéos les plus récentes en premier dans chaque album, et albums
  // eux-mêmes triés du plus récent au plus ancien (d'après le média le plus
  // récent qu'ils contiennent) — un tri alphabétique par titre n'a aucun
  // rapport avec la chronologie réelle des souvenirs.
  const [photoAlbumsRaw, videoAlbumsRaw] = await Promise.all([
    prisma.album.findMany({
      where: { type: "PHOTO" },
      include: {
        photos: {
          orderBy: { createdAt: "desc" },
          include: {
            likes: { where: { userId } },
            _count: { select: { likes: true } },
            comments: {
              orderBy: { createdAt: "asc" },
              include: { author: { include: { member: { select: { nickname: true } } } } },
            },
          },
        },
      },
    }),
    prisma.album.findMany({
      where: { type: "VIDEO" },
      include: {
        videos: {
          orderBy: { createdAt: "desc" },
          include: {
            likes: { where: { userId } },
            _count: { select: { likes: true } },
            comments: {
              orderBy: { createdAt: "asc" },
              include: { author: { include: { member: { select: { nickname: true } } } } },
            },
          },
        },
      },
    }),
  ]);

  const photoAlbums = photoAlbumsRaw
    .map((album) => ({
      id: album.id,
      title: album.title,
      mostRecent: album.photos[0]?.createdAt ?? new Date(0),
      items: album.photos.map(
        (p): MediaItem => ({
          id: p.id,
          url: p.photoUrl,
          caption: p.caption,
          likeCount: p._count.likes,
          likedByMe: p.likes.length > 0,
          comments: toComments(p.comments),
        })
      ),
    }))
    .sort((a, b) => b.mostRecent.getTime() - a.mostRecent.getTime());

  const videoAlbums = videoAlbumsRaw
    .map((album) => ({
      id: album.id,
      title: album.title,
      mostRecent: album.videos[0]?.createdAt ?? new Date(0),
      items: album.videos.map(
        (v): MediaItem => ({
          id: v.id,
          url: v.videoUrl,
          caption: v.caption,
          likeCount: v._count.likes,
          likedByMe: v.likes.length > 0,
          comments: toComments(v.comments),
        })
      ),
    }))
    .sort((a, b) => b.mostRecent.getTime() - a.mostRecent.getTime());

  const photoSection = (
    <div className="space-y-10">
      {photoAlbums.map((album) => (
        <div key={album.id}>
          <div className="flex items-center gap-3 mb-4">
            <GalleryAlbumTitle albumId={album.id} title={album.title} isModerator={isModerator} />
            <span className="h-px flex-1 bg-white/15" />
          </div>
          <MediaLightbox items={album.items} kind="photo" isModerator={isModerator} />
        </div>
      ))}
      {photoAlbums.length === 0 && (
        <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
          Pas encore de photos, les premiers clichés arrivent après la prochaine manche !
        </p>
      )}
    </div>
  );

  const videoSection = (
    <div className="space-y-10">
      {videoAlbums.map((album) => (
        <div key={album.id}>
          <div className="flex items-center gap-3 mb-4">
            <GalleryAlbumTitle albumId={album.id} title={album.title} isModerator={isModerator} videoIcon />
            <span className="h-px flex-1 bg-white/15" />
          </div>
          <MediaLightbox items={album.items} kind="video" isModerator={isModerator} />
        </div>
      ))}
      {videoAlbums.length === 0 && (
        <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
          Pas encore de vidéos, les premières arrivent après la prochaine manche !
        </p>
      )}
    </div>
  );

  return (
    <>
      <MarkSectionSeen section="galerie" />

      {/* ── MASTHEAD ── mêmes codes que les autres onglets : titre doré animé
          sur le fond dégradé sombre, halo or (esprit "album souvenirs"). ──── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(240,180,41,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-2 flex-wrap gap-4">
            <div>
              <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
                Souvenirs
              </div>
              <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl leading-tight pb-1 mb-2 max-w-xl">
                Galeries photos &amp; vidéos
              </h1>
            </div>
            {isMember && (
              <Link
                href="/proposer-contenu?type=PHOTO_VIDEO"
                className="text-xs text-forest-glow underline underline-offset-4 font-medium whitespace-nowrap"
              >
                Proposer une photo ou vidéo →
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="px-7 pb-14">
        <div className="max-w-5xl mx-auto">
          <GalleryTabs photos={photoSection} videos={videoSection} />
        </div>
      </div>
    </>
  );
}
