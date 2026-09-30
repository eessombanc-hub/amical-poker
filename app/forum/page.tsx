import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isForumMuted, muteMessage } from "@/lib/forumModeration";
import NewTopicForm from "@/components/NewTopicForm";
import DeleteForumButton from "@/components/DeleteForumButton";
import MarkSectionSeen from "@/components/MarkSectionSeen";
import LoginGate from "@/components/LoginGate";

export default async function ForumPage(props: {
  searchParams?: Promise<{ newTopic?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;
  const canModerate = hasRole(role, "RESPONSABLE");

  if (!session?.user) {
    return (
      <LoginGate
        title="Forum réservé aux connectés"
        description="Le forum du club (sujets et réponses) est réservé aux membres et aux invités connectés de l'Amical Poker Club."
      />
    );
  }

  const [topics, me] = await Promise.all([
    prisma.forumTopic.findMany({
      where: { area: "COMMUN" },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: {
        author: { include: { member: true } },
        _count: { select: { replies: true } },
      },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { forumMutedUntil: true, forumMutedPermanent: true },
        })
      : null,
  ]);

  const muted = me ? isForumMuted(me) : false;

  return (
    <div className="px-7 py-14">
      <MarkSectionSeen section="forum" />
      <div className="max-w-3xl mx-auto panel">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
          <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
            Entre membres
          </div>
          {canModerate && (
            <Link href="/forum-bureau" className="text-xs text-forest underline underline-offset-4 font-medium">
              Forum du bureau →
            </Link>
          )}
        </div>
        <h1 className="text-3xl mb-8">Forum du club</h1>

        <div className="space-y-2 mb-10">
          {topics.map((t) => (
            <div key={t.id} className="border border-ink/10 rounded-lg px-5 py-4 flex items-center justify-between gap-4">
              <Link href={`/forum/${t.id}`} className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wide text-sage mb-1">
                  {t.category} {t.pinned && "· Épinglé"}
                </div>
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-sage mt-1">
                  par {t.author.member?.nickname || t.author.displayName || t.author.email}
                </div>
              </Link>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-sage font-mono-club whitespace-nowrap">
                  {t._count.replies} réponse{t._count.replies > 1 ? "s" : ""}
                </span>
                {canModerate && <DeleteForumButton endpoint={`/api/forum/${t.id}`} />}
              </div>
            </div>
          ))}
          {topics.length === 0 && (
            <p className="text-sage text-sm">Aucun sujet pour l&apos;instant, lancez la discussion !</p>
          )}
        </div>

        {muted ? (
          <p className="text-sm text-burgundy border border-burgundy/30 bg-burgundy/[0.06] rounded-lg p-6">
            {muteMessage(me!)}
          </p>
        ) : (
          <NewTopicForm initialTitle={searchParams?.newTopic ?? ""} />
        )}
      </div>
    </div>
  );
}
