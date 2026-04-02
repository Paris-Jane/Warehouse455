import { NextResponse } from "next/server";

import { runScoringWithFlaggedOrders } from "@/lib/scoring/run-scoring";

export const dynamic = "force-dynamic";

/**
 * Secured cron endpoint: schedule daily in `vercel.json` or call from system crontab.
 * Send header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!secret || bearer !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScoringWithFlaggedOrders();
  return NextResponse.json(result);
}
