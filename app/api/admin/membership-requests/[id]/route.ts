import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlaceholderMember } from "@/lib/placeholderMembers";
import { sendEmail } from "@/lib/email";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * E-mail de confirmation envoyé au demandeur dès que sa demande d'adhésion
 * (ou d'accès invité) est validée. Best-effort : une erreur d'envoi (ex.
 * Resend indisponible) ne doit jamais faire échouer la validation elle-même,
 * le compte étant déjà créé en base à ce stade.
 */
function sendMembershipAcceptedEmail({
  to,
  nickname,
  guestOnly,
}: {
  to: string;
  nickname: string;
  guestOnly: boolean;
}) {
  const subject = guestOnly
    ? `${SITE_NAME}, votre accès invité a été validé`
    : `${SITE_NAME}, votre adhésion a été validée`;
  const intro = guestOnly
    ? `Votre demande d'accès invité a été validée par le bureau. Bienvenue chez ${SITE_NAME} ! Vous pouvez dès à présent vous connecter pour accéder au forum du club.`
    : `Votre demande d'adhésion a été validée par le bureau. Bienvenue chez ${SITE_NAME} ! Vous pouvez dès à présent vous connecter à votre espace membre.`;

  return sendEmail({
    to,
    subject,
    html: `
      <p>Bonjour ${nickname},</p>
      <p>${intro}</p>
      <p><a href="${SITE_URL}/connexion">Se connecter</a></p>
    `,
  }).catch(() => ({ sent: false }));
}

const ROLES = ["MEMBRE", "RESPONSABLE", "BUREAU", "ADMIN"] as const;

const validateSchema = z.object({
  action: z.literal("valider"),
  // Le prénom/nom viennent normalement de la demande elle-même (formulaire
  // /demande-adhesion) — ces champs ne servent plus que de repli pour une
  // ancienne demande envoyée avant leur ajout.
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(ROLES).default("MEMBRE"),
});

const rejectSchema = z.object({
  action: z.literal("refuser"),
  reason: z.string().max(500).optional(),
});

const bodySchema = z.discriminatedUnion("action", [validateSchema, rejectSchema]);

/**
 * PATCH /api/admin/membership-requests/[id] — valide ou refuse une demande
 * d'adhésion (réservé ADMIN/RESPONSABLE+). La validation est le seul moment
 * où le compte (User + Member) est réellement créé — avant cela, la demande
 * ne donne accès à rien.
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

  const request = await prisma.membershipRequest.findUnique({ where: { id: params.id } });
  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }
  if (request.status !== "EN_ATTENTE") {
    return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
  }

  const currentUserId = (session.user as any).id as string;

  if (parsed.data.action === "refuser") {
    await prisma.membershipRequest.update({
      where: { id: request.id },
      data: {
        status: "REJETEE",
        processedAt: new Date(),
        processedById: currentUserId,
        rejectReason: parsed.data.reason || null,
      },
    });
    return NextResponse.json({ message: "Demande refusée." });
  }

  // Un compte a pu être créé entre-temps avec cet e-mail.
  const existingEmail = await prisma.user.findUnique({ where: { email: request.email } });
  if (existingEmail) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  // ── Demande d'accès invité : simple compte User, rôle INVITE forcé, ─────
  // aucune fiche Member (pas de classement, pas d'inscription aux manches).
  if (request.type === "INVITE_FORUM") {
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: request.email,
          passwordHash: request.passwordHash,
          role: "INVITE",
          displayName: request.nickname,
        },
      }),
      prisma.membershipRequest.update({
        where: { id: request.id },
        data: { status: "VALIDEE", processedAt: new Date(), processedById: currentUserId },
      }),
    ]);

    await sendMembershipAcceptedEmail({ to: user.email, nickname: request.nickname, guestOnly: true });

    return NextResponse.json({
      message: "Demande validée, l'accès invité a été créé.",
      user: { id: user.id, email: user.email, role: user.role, member: null },
    });
  }

  // ── Demande d'adhésion complète : compte User + fiche Member ────────────
  // Prénom/nom viennent normalement de la demande elle-même ; le corps de la
  // requête n'est utilisé qu'en repli pour une ancienne demande qui ne les
  // avait pas encore (voir MembershipRequestsPanel).
  const firstName = (request.firstName || parsed.data.firstName || "").trim();
  const lastName = (request.lastName || parsed.data.lastName || "").trim();
  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "Le prénom et le nom sont obligatoires pour créer l'espace membre." },
      { status: 400 }
    );
  }

  // Seul le propriétaire du site peut valider une demande avec le rôle ADMIN.
  if (parsed.data.role === "ADMIN" && !isSuperAdmin((session.user as any).email)) {
    return NextResponse.json(
      { error: "Seul le propriétaire du site peut accorder le rôle administrateur." },
      { status: 403 }
    );
  }

  const existingNickname = await prisma.member.findFirst({
    where: { nickname: { equals: request.nickname, mode: "insensitive" } },
    include: { user: { select: { id: true, email: true } } },
  });

  // Fiche "placeholder historique" (voir lib/placeholderMembers.ts) : la
  // personne qui valide ici n'a pas créé de nouveau compte, elle réclame
  // celui déjà rattaché à ses résultats d'une ancienne manche. On met à
  // jour ce compte existant (vraies coordonnées, mot de passe choisi,
  // statut ACTIF) plutôt que d'en créer un second — ce qui préserverait un
  // doublon et laisserait l'historique de résultats orphelin de son pseudo.
  if (existingNickname && isPlaceholderMember(existingNickname)) {
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: existingNickname.user!.id },
        data: { email: request.email, passwordHash: request.passwordHash, role: parsed.data.role },
      }),
      prisma.member.update({
        where: { id: existingNickname.id },
        data: { firstName, lastName, birthDate: request.birthDate, membershipStatus: "ACTIF" },
      }),
      prisma.membershipRequest.update({
        where: { id: request.id },
        data: { status: "VALIDEE", processedAt: new Date(), processedById: currentUserId },
      }),
    ]);

    await sendMembershipAcceptedEmail({ to: user.email, nickname: request.nickname, guestOnly: false });

    return NextResponse.json({
      message:
        "Demande validée. Cette personne apparaissait déjà dans l'historique d'une ancienne manche : son compte a été rattaché à cette fiche (résultats conservés) plutôt que d'en créer une nouvelle.",
      user: { id: user.id, email: user.email, role: user.role },
    });
  }

  if (existingNickname) {
    return NextResponse.json({ error: "Ce pseudo est déjà utilisé par un autre membre." }, { status: 409 });
  }

  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: request.email,
        passwordHash: request.passwordHash,
        role: parsed.data.role,
        member: {
          create: {
            firstName,
            lastName,
            nickname: request.nickname,
            birthDate: request.birthDate,
            membershipStatus: "ACTIF",
          },
        },
      },
      include: { member: true },
    }),
    prisma.membershipRequest.update({
      where: { id: request.id },
      data: { status: "VALIDEE", processedAt: new Date(), processedById: currentUserId },
    }),
  ]);

  await sendMembershipAcceptedEmail({ to: user.email, nickname: request.nickname, guestOnly: false });

  return NextResponse.json({
    message: "Demande validée, l'espace membre a été créé.",
    user: { id: user.id, email: user.email, role: user.role, member: user.member },
  });
}
