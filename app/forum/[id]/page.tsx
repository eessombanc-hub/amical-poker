import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isForumMuted, muteMessage } from "@/lib/forumModeration";
import ReplyForm from "@/components/ReplyForm";
import DeleteForumButton from "@/components/DeleteForumButton";
import MuteButton from "@/components/MuteButton";
import LoginGate from "@/components/LoginGate";

function authorLabel(u: { email: string; displayName: string | null; member: { firstName: string; lastName: string; nickname: string } | null }) {
  if (u.member) return u.member.nickname;
  return u.displayName || u.email;
}

/**
 * Détail d'un sujet — partagé par le forum commun et le forum du bureau
 * (voir topic.area). Un sujet du bureau n'est accessible qu'aux rôles
 * RESPONSABLE/BUREAU/ADMIN, quelle que soit l'URL empruntée.
 */
export default async function ForumTopicPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;

  if (!session?.user) {
    return (
      <LoginGate
        title="Forum réservé aux connectés"
        description="Ce sujet est réservé aux membres et aux invités connectés de l'Amical Poker Club."
      />
    );
  }

  const topic = await prisma.forumTopic.findUnique({
    where: { id: params.id },
    include: {
      author: { include: { member: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { include: { member: true } } },
      },
    },
  });
  if (!topic) notFound();

  if (topic.area === "BUREAU" && !hasRole(role, "RESPONSABLE")) {
    redirect("/espace-membre");
  }

  const canModerate = hasRole(role, "RESPONSABLE");
  const canMute = canModerate;
  const canUnmute = canModerate;
  const isCommun = topic.area === "COMMUN";

  const me = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { forumMutedUntil: true, forumMutedPermanent: true },
      })
    : null;
  const muted = me ? isForumMuted(me) : false;

  const backHref = isCommun ? "/forum" : "/forum-bureau";
  const backLabel = isCommun ? "← Retour au forum" : "← Retour au forum du bureau";

  return (
    <div className="px-7 py-14">
      <div className="max-w-3xl mx-auto panel">
        <Link href={backHref} className="text-xs text-forest underline underline-offset-4">
          {backLabel}
        </Link>

        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mt-4 mb-2">
          {topic.category} {topic.pinned && "· Épinglé"}
        </div>
        <h1 className="text-3xl mb-6">{topic.title}</h1>

        <div className="border border-ink/10 rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-ink">{authorLabel(topic.author)}</span>
              <span className="text-xs text-sage">
                {new Date(topic.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </span>
              {isCommun && topic.authorId !== userId && (
                <MuteButton
                  userId={topic.authorId}
                  authorLabel={authorLabel(topic.author)}
                  isMuted={isForumMuted(topic.author)}
                  canMute={canMute}
                  canUnmute={canUnmute}
                />
              )}
            </div>
            {canModerate && <DeleteForumButton endpoint={`/api/forum/${topic.id}`} redirectTo={backHref} />}
          </div>
          <p className="text-sm text-ink/85 whitespace-pre-wrap">{topic.body}</p>
        </div>

        <h2 className="text-lg mb-4">
          {topic.replies.length} réponse{topic.replies.length > 1 ? "s" : ""}
        </h2>
        <div className="space-y-3 mb-8">
          {topic.replies.map((r) => (
            <div key={r.id} className="border border-ink/10 rounded-lg p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-ink">{authorLabel(r.author)}</span>
                  <span className="text-xs text-sage">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isCommun && r.authorId !== userId && (
                    <MuteButton
                      userId={r.authorId}
                      authorLabel={authorLabel(r.author)}
                      isMuted={isForumMuted(r.author)}
                      canMute={canMute}
                      canUnmute={canUnmute}
                    />
                  )}
                </div>
                {canModerate && <DeleteForumButton endpoint={`/api/forum/replies/${r.id}`} />}
              </div>
              <p className="text-sm text-ink/85 whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
          {topic.replies.length === 0 && <p className="text-sage text-sm">Aucune réponse pour l&apos;instant.</p>}
        </div>

        {muted ? (
          <p className="text-sm text-burgundy border border-burgundy/30 bg-burgundy/[0.06] rounded-lg p-6">
            {muteMessage(me!)}
          </p>
        ) : (
          <ReplyForm topicId={topic.id} />
        )}
      </div>
    </div>
  );
}
