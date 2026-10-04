// 배포용 저장소: Supabase(Postgres). 서버 전용 Secret 키로 접속하며 RLS를 우회한다.
// jsonb 칸은 호출부가 JSON.parse 하던 기존 계약을 지키기 위해 문자열로 되돌려 준다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import type { ReadingRow, FriendRow } from "./sqlite";
import { LINK_TTL_DAYS } from "./sqlite";

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY 가 없습니다");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
const now = () => Date.now();
const ttl = () => now() + LINK_TTL_DAYS * 86_400_000;
const str = (v: unknown) => (v === null || v === undefined ? null : typeof v === "string" ? v : JSON.stringify(v));
function fail(where: string, e: { message: string } | null) { if (e) throw new Error(`[supabase:${where}] ${e.message}`); }

type RRow = { id: string; created_at: number; expires_at: number; alias: string; birth: unknown; goal_year: number; goal_text: string; plan: unknown; prose_full: unknown; hard_report: unknown; paid: boolean; usage: unknown };
function toReading(r: RRow): ReadingRow {
  return { id: r.id, created_at: Number(r.created_at), expires_at: Number(r.expires_at), alias: r.alias, birth: str(r.birth) as string, goal_year: r.goal_year, goal_text: r.goal_text,
    plan: str(r.plan) as string, prose_full: str(r.prose_full), hard_report: str(r.hard_report), paid: r.paid ? 1 : 0, usage: str(r.usage) ?? "[]" };
}
type FRow = { id: string; reading_id: string; created_at: number; alias: string; birth: unknown; lines: unknown };
function toFriend(f: FRow): FriendRow { return { id: f.id, reading_id: f.reading_id, created_at: Number(f.created_at), alias: f.alias, birth: str(f.birth) as string, lines: str(f.lines) }; }

export async function purgeExpired() {
  // friends는 on delete cascade 라 readings만 지우면 된다
  const { error } = await sb().from("readings").delete().lt("expires_at", now());
  fail("purge", error);
}
export async function createReading(v: { alias: string; birth: unknown; goalYear: number; goalText: string; plan: unknown }): Promise<string> {
  const id = nanoid(10);
  const { error } = await sb().from("readings").insert({ id, created_at: now(), expires_at: ttl(), alias: v.alias, birth: v.birth, goal_year: v.goalYear, goal_text: v.goalText, plan: v.plan });
  fail("createReading", error);
  return id;
}
export async function getReading(id: string): Promise<ReadingRow | null> {
  const { data, error } = await sb().from("readings").select("*").eq("id", id).gte("expires_at", now()).maybeSingle();
  fail("getReading", error);
  return data ? toReading(data as RRow) : null;
}
async function appendUsage(id: string, usage: unknown) {
  const { data, error } = await sb().from("readings").select("usage").eq("id", id).maybeSingle();
  fail("usage.read", error);
  const arr = Array.isArray(data?.usage) ? (data!.usage as unknown[]) : [];
  return [...arr, usage];
}
export async function setProse(id: string, prose: unknown, usage: unknown) {
  const { error } = await sb().from("readings").update({ prose_full: prose, usage: await appendUsage(id, usage) }).eq("id", id);
  fail("setProse", error);
}
export async function setHardReport(id: string, report: unknown, usage: unknown) {
  const { error } = await sb().from("readings").update({ hard_report: report, usage: await appendUsage(id, usage) }).eq("id", id);
  fail("setHardReport", error);
}
export async function setFriendLines(readingId: string, friendId: string, lines: unknown, usage: unknown) {
  const a = await sb().from("friends").update({ lines }).eq("id", friendId).eq("reading_id", readingId);
  fail("setFriendLines", a.error);
  const b = await sb().from("readings").update({ usage: await appendUsage(readingId, usage) }).eq("id", readingId);
  fail("setFriendLines.usage", b.error);
}
export async function usageStats(): Promise<{ readings: number; input: number; output: number; cacheRead: number }> {
  const { data, error } = await sb().from("readings").select("usage");
  fail("usageStats", error);
  let input = 0, output = 0, cacheRead = 0;
  for (const r of (data ?? []) as { usage: { input: number; output: number; cacheRead: number }[] }[]) for (const u of r.usage ?? []) { input += u.input; output += u.output; cacheRead += u.cacheRead; }
  return { readings: data?.length ?? 0, input, output, cacheRead };
}
export async function countReadings(): Promise<number> {
  const { count, error } = await sb().from("readings").select("id", { count: "exact", head: true });
  fail("countReadings", error);
  return count ?? 0;
}
export async function markPaid(id: string) {
  const { error } = await sb().from("readings").update({ paid: true }).eq("id", id);
  fail("markPaid", error);
}
export async function addFriend(readingId: string, alias: string, birth: unknown): Promise<string> {
  const id = nanoid(8);
  const { error } = await sb().from("friends").insert({ id, reading_id: readingId, created_at: now(), alias, birth });
  fail("addFriend", error);
  return id;
}
export async function listFriends(readingId: string): Promise<FriendRow[]> {
  const { data, error } = await sb().from("friends").select("*").eq("reading_id", readingId).order("created_at");
  fail("listFriends", error);
  return ((data ?? []) as FRow[]).map(toFriend);
}
export async function removeFriend(readingId: string, friendId: string) {
  const { error } = await sb().from("friends").delete().eq("id", friendId).eq("reading_id", readingId);
  fail("removeFriend", error);
}
