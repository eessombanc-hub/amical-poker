import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { sendRoundReminders } from "@/lib/roundReminder";
import { sendCfepaRoundReminders } from "@/lib/cfepaRoundReminder";

function hasValidCronSecret(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * GET /api/cron/round-reminder — appelé par le planificateur (voir
 * vercel.json). Envoie, pour chaque manche ayant lieu dans exactement 2
 * jours : un rappel général à tous les membres actifs (voir
 * lib/roundReminder.ts, qui exclut les manches CFEPA), et pour une manche
 * CFEPA un rappel dédié aux seuls joueurs inscrits avec la liste des rôles
 * capitaine/matin/après-midi (voir lib/cfepaRoundReminder.ts). Pas de double
 * envoi grâce à Round.reminderSentAt, partagé sans risque de collision
 * puisqu'une même manche ne relève jamais que d'un seul des deux rappels.
 */
export async function GET(req: NextRequest) {
  if (!hasValidCronSecret(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [general, cfepa] = await Promise.all([sendRoundReminders(), sendCfepaRoundReminders()]);
  return NextResponse.json({ general, cfepa });
}

/**
 * POST /api/cron/round-reminder — déclenchement manuel (session BUREAU/
 * ADMIN), pour tester sans attendre le cron quotidien, ou via le même
 * secret que ci-dessus si appelé par un autre outil.
 */
export async function POST(req: NextRequest) {
  if (!hasValidCronSecret(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
    }
  }
  const [general, cfepa] = await Promise.all([sendRoundReminders(), sendCfepaRoundReminders()]);
  return NextResponse.json({ general, cfepa });
}
