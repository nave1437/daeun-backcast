import { NextResponse } from "next/server";
import * as db from "@/lib/store/db";

export const dynamic = "force-dynamic";

/** Supabase 무료 프로젝트는 일주일 동안 요청이 없으면 멈춘다(pause). Vercel 크론이 하루 한 번 이 주소를 불러 조회 한 번을 일으킨다. */
export async function GET() {
  try {
    const n = await db.countReadings();
    return NextResponse.json({ ok: true, readings: n, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
