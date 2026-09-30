import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TARGET_ROLES = ["MEMBRE", "RESPONSABLE", "BUREAU", "ADMIN"] as const;

const bodySchema = z.object({
  message: z
    .string()
    .trim()
    .min(5, "Le message doit contenir au moins 5 caractères.")
    .max(1000, "Le message est trop long (1000 caractères maximum)."),
  // ALL : tous les membres. ROLE : uniquement les membres ayant exactement
  // ce rôle. MEMBERS : une sélection précise de fiches Member (voir
  // memberIds ci-dessous).
  target: z.enum(["ALL", "ROLE", "MEMBERS"]).default("ALL"),
  role: z.enum(TARGET_ROLES).optional(),
  memberIds: z.array(z.string()).optional(),
});

/**
 * POST /api/admin/urgent-message — diffuse un message urgent à tout ou
 * partie des membres (comptes ayant une fiche Member — les accès invité,
 * rôle INVITE, n'en ont pas et ne sont jamais concernés), selon `target` :
 * tous les membres, un rôle précis, ou une sélection de membres. Réservé
 * BUREAU/ADMIN, comme la newsletter (voir /admin/newsletter).
 *
 * Réutilise le modèle Notification existant (type="URGENT") : une ligne par
 * destinataire, affichée en popup au prochain passage sur /espace-membre
 * (voir components/UrgentMessagePopup.tsx) jusqu'à ce que le membre
 * l'acquitte (POST /api/member/notifications/[id]/read).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !hasRole(role, "BUREAU")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Requête invalide." },
      { status: 400 }
    );
  }

  let recipientUserIds: string[];

  if (parsed.data.target === "ROLE") {
    if (!parsed.data.role) {
      return NextResponse.json({ error: "Merci de choisir un rôle." }, { status: 400 });
    }
    const users = await prisma.user.findMany({
      where: { role: parsed.data.role, member: { isNot: null } },
      select: { id: true },
    });
    recipientUserIds = users.map((u) => u.id);
  } else if (parsed.data.target === "MEMBERS") {
    const memberIds = parsed.data.memberIds ?? [];
    if (memberIds.length === 0) {
      return NextResponse.json({ error: "Merci de sélectionner au moins un membre." }, { status: 400 });
    }
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { userId: true },
    });
    recipientUserIds = members.map((m) => m.userId);
  } else {
    const users = await prisma.user.findMany({
      where: { member: { isNot: null } },
      select: { id: true },
    });
    recipientUserIds = users.map((u) => u.id);
  }

  if (recipientUserIds.length === 0) {
    return NextResponse.json({ error: "Aucun destinataire ne correspond à cette sélection." }, { status: 400 });
  }

  await prisma.notification.createMany({
    data: recipientUserIds.map((userId) => ({ userId, type: "URGENT", message: parsed.data.message })),
  });

  return NextResponse.json({
    message: `Message envoyé à ${recipientUserIds.length} membre${recipientUserIds.length > 1 ? "s" : ""}.`,
    count: recipientUserIds.length,
  });
}
