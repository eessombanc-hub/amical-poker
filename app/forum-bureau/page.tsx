import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewTopicForm from "@/components/NewTopicForm";
import DeleteForumButton from "@/components/DeleteForumButton";
import MarkSectionSeen from "@/components/MarkSectionSeen";

/**
 * Forum interne réservé aux rôles RESPONSABLE/BUREAU/ADMIN — distinct du
 * forum commun (/forum), invisible et inaccessible aux membres et invités.
 */
export default async function ForumBureauPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "RESPONSABLE")) redirect("/espace-membre");

  const topics = await prisma.forumTopic.findMany({
    where: { area: "BUREAU" },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { include: { member: true } },
      _count: { select: { replies: true } },
    },
  });

  return (
    <div className="px-7 py-14">
      <MarkSectionSeen section="forum-bureau" />
      <div className="max-w-3xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Espace réservé
        </div>
        <h1 className="text-3xl mb-2">Forum du bureau</h1>
        <p className="text-sage text-sm mb-8">
          Réservé aux responsables, membres du bureau et administrateurs, invisible du forum commun.
        </p>

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
                <DeleteForumButton endpoint={`/api/forum/${t.id}`} />
              </div>
            </div>
          ))}
          {topics.length === 0 && (
            <p className="text-sage text-sm">Aucun sujet pour l&apos;instant, lancez la discussion !</p>
          )}
        </div>

        <NewTopicForm area="BUREAU" />

        <p className="text-sm text-sage mt-8">
          <Link href="/forum" className="text-forest underline underline-offset-4">
            ← Retour au forum du club
          </Link>
        </p>
      </div>
    </div>
  );
}
