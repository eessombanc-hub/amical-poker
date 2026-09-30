import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions, hasRole, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTempPassword } from "@/lib/tempPassword";

const ROLES = ["INVITE", "MEMBRE", "RESPONSABLE", "BUREAU", "ADMIN"] as const;
const STATUSES = ["ACTIF", "EN_ATTENTE", "INACTIF"] as const;
const COTISATION_STATUSES = ["NON_PAYEE", "PARTIELLE", "PAYEE"] as const;

const updateSchema = z.object({
  role: z.enum(ROLES).optional(),
  membershipStatus: z.enum(STATUSES).optional(),
  publicResults: z.boolean().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  resetPassword: z.boolean().optional(),
  // Cotisation annuelle — voir prisma/schema.prisma, enum CotisationStatus.
  cotisationStatus: z.enum(COTISATION_STATUSES).optional(),
});

/**
 * PATCH /api/admin/members/:id — modifie le rôle/statut d'un compte (dont
 * la cotisation annuelle), ou réinitialise son mot de passe (nouveau mot de
 * passe temporaire renvoyé une seule fois). Réservé aux administrateurs.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id as string | undefined;
  if (!session?.user || !hasRole((session.user as any).role, "ADMIN")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const data = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: params.id }, include: { member: true } });
  if (!target) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  // Garde-fou : un admin ne peut pas se retirer lui-même le rôle admin
  // (évite de se retrouver bloqué hors de l'administration).
  if (target.id === currentUserId && data.role && data.role !== "ADMIN") {
    return NextResponse.json({ error: "Vous ne pouvez pas retirer votre propre rôle admin." }, { status: 400 });
  }

  // Seul le propriétaire du site peut accorder le rôle ADMIN à un compte —
  // les autres admins peuvent valider des membres et changer leur statut,
  // jamais désigner un autre admin.
  if (data.role === "ADMIN" && target.role !== "ADMIN" && !isSuperAdmin((session.user as any).email)) {
    return NextResponse.json(
      { error: "Seul le propriétaire du site peut accorder le rôle administrateur." },
      { status: 403 }
    );
  }

  let generatedPassword: string | null = null;
  const userUpdate: { role?: (typeof ROLES)[number]; passwordHash?: string } = {};
  if (data.role) userUpdate.role = data.role;
  if (data.resetPassword) {
    generatedPassword = generateTempPassword();
    userUpdate.passwordHash = await bcrypt.hash(generatedPassword, 12);
  }

  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({ where: { id: target.id }, data: userUpdate });
  }

  if (
    target.member &&
    (data.membershipStatus ||
      data.publicResults !== undefined ||
      data.birthDate !== undefined ||
      data.cotisationStatus)
  ) {
    await prisma.member.update({
      where: { id: target.member.id },
      data: {
        ...(data.membershipStatus ? { membershipStatus: data.membershipStatus } : {}),
        ...(data.publicResults !== undefined ? { publicResults: data.publicResults } : {}),
        ...(data.birthDate !== undefined ? { birthDate: data.birthDate ? new Date(data.birthDate) : null } : {}),
        ...(data.cotisationStatus ? { cotisationStatus: data.cotisationStatus } : {}),
      },
    });
  }

  return NextResponse.json({ ok: true, generatedPassword });
}

/**
 * DELETE /api/admin/members/:id — supprime définitivement un compte (utile
 * pour retirer un compte de test ou une fiche créée par erreur). Réservé
 * aux administrateurs. Nettoie tout ce qui se rattache au compte pour éviter
 * un blocage lié aux clés étrangères — fiche membre et ses inscriptions/
 * résultats/classements/mandats de bureau, messages du forum, jetons de
 * réinitialisation, notifications et journal d'audit. Les portraits publiés
 * liés à ce membre sont conservés (juste détachés) plutôt que supprimés.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id as string | undefined;
  if (!session?.user || !hasRole((session.user as any).role, "ADMIN")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  if (params.id === currentUserId) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id }, include: { member: true } });
  if (!target) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  // Seul le propriétaire du site peut supprimer un autre compte administrateur.
  if (target.role === "ADMIN" && !isSuperAdmin((session.user as any).email)) {
    return NextResponse.json(
      { error: "Seul le propriétaire du site peut supprimer un compte administrateur." },
      { status: 403 }
    );
  }

  const memberId = target.member?.id;

  // Sujets de forum créés par ce compte : leurs réponses (y compris celles
  // d'autres membres) doivent être supprimées avant le sujet lui-même.
  const authoredTopics = await prisma.forumTopic.findMany({
    where: { authorId: target.id },
    select: { id: true },
  });
  const authoredTopicIds = authoredTopics.map((t) => t.id);

  await prisma.$transaction([
    ...(memberId
      ? [
          prisma.portrait.updateMany({ where: { memberId }, data: { memberId: null } }),
          prisma.boardMember.deleteMany({ where: { memberId } }),
          prisma.roundOperationLog.deleteMany({ where: { memberId } }),
          prisma.result.deleteMany({ where: { memberId } }),
          prisma.ranking.deleteMany({ where: { memberId } }),
          prisma.roundRegistration.deleteMany({ where: { memberId } }),
          prisma.member.delete({ where: { id: memberId } }),
        ]
      : []),
    prisma.forumReply.deleteMany({
      where: { OR: [{ authorId: target.id }, { topicId: { in: authoredTopicIds } }] },
    }),
    prisma.forumTopic.deleteMany({ where: { id: { in: authoredTopicIds } } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: target.id } }),
    prisma.notification.deleteMany({ where: { userId: target.id } }),
    prisma.auditLog.deleteMany({ where: { userId: target.id } }),
    prisma.user.delete({ where: { id: target.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
