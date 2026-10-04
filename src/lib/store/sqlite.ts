// 로컬 개발용 저장소: Node 22 내장 SQLite(파일). 배포(Vercel)에서는 supabase.ts가 쓰인다. 인터페이스는 db.ts가 맞춘다.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "daeun.sqlite");
export const LINK_TTL_DAYS = 7;

let db: DatabaseSync | null = null;
function conn(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  // 서버와 보조 스크립트가 같은 파일을 동시에 쓸 수 있어 WAL + busy_timeout 으로 잠금 충돌을 줄인다
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS readings2 (
      id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
      alias TEXT NOT NULL, birth TEXT NOT NULL, goal_year INTEGER NOT NULL, goal_text TEXT NOT NULL,
      plan TEXT NOT NULL, prose_free TEXT, prose_paid TEXT, paid INTEGER NOT NULL DEFAULT 0, usage TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS friends (
      id TEXT PRIMARY KEY, reading_id TEXT NOT NULL, created_at INTEGER NOT NULL,
      alias TEXT NOT NULL, birth TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS friends_reading ON friends(reading_id);
  `);
  // 스키마 보강(이미 있으면 무시)
  for (const sql of [
    `ALTER TABLE readings2 ADD COLUMN prose_full TEXT`,
    `ALTER TABLE friends ADD COLUMN lines TEXT`,
    `ALTER TABLE readings2 ADD COLUMN hard_report TEXT`,
  ]) { try { db.exec(sql); } catch { /* 이미 있음 */ } }
  return db;
}

export interface ReadingRow {
  id: string; created_at: number; expires_at: number; alias: string; birth: string;
  goal_year: number; goal_text: string; plan: string; prose_full: string | null; hard_report: string | null; paid: number; usage: string;
}
export interface FriendRow { id: string; reading_id: string; created_at: number; alias: string; birth: string; lines: string | null }

const now = () => Date.now();
const ttl = () => now() + LINK_TTL_DAYS * 86_400_000;

export function purgeExpired() {
  const d = conn();
  d.prepare(`DELETE FROM friends WHERE reading_id IN (SELECT id FROM readings2 WHERE expires_at < ?)`).run(now());
  d.prepare(`DELETE FROM readings2 WHERE expires_at < ?`).run(now());
  d.prepare(`DELETE FROM friends WHERE reading_id NOT IN (SELECT id FROM readings2)`).run();
}

export function createReading(v: { alias: string; birth: unknown; goalYear: number; goalText: string; plan: unknown }): string {
  const id = nanoid(10);
  conn().prepare(`INSERT INTO readings2 (id, created_at, expires_at, alias, birth, goal_year, goal_text, plan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, now(), ttl(), v.alias, JSON.stringify(v.birth), v.goalYear, v.goalText, JSON.stringify(v.plan));
  return id;
}
export function getReading(id: string): ReadingRow | null {
  return (conn().prepare(`SELECT * FROM readings2 WHERE id = ? AND expires_at >= ?`).get(id, now()) as ReadingRow | undefined) ?? null;
}
export function setProse(id: string, prose: unknown, usage: unknown) {
  conn().prepare(`UPDATE readings2 SET prose_full = ?, usage = json_insert(usage, '$[#]', json(?)) WHERE id = ?`).run(JSON.stringify(prose), JSON.stringify(usage), id);
}
export function setHardReport(id: string, report: unknown, usage: unknown) {
  conn().prepare(`UPDATE readings2 SET hard_report = ?, usage = json_insert(usage, '$[#]', json(?)) WHERE id = ?`).run(JSON.stringify(report), JSON.stringify(usage), id);
}
export function setFriendLines(readingId: string, friendId: string, lines: unknown, usage: unknown) {
  conn().prepare(`UPDATE friends SET lines = ? WHERE id = ? AND reading_id = ?`).run(JSON.stringify(lines), friendId, readingId);
  conn().prepare(`UPDATE readings2 SET usage = json_insert(usage, '$[#]', json(?)) WHERE id = ?`).run(JSON.stringify(usage), readingId);
}
/** 비용 집계: 기록별 usage 합 */
export function usageStats(): { readings: number; input: number; output: number; cacheRead: number } {
  const rows = conn().prepare(`SELECT usage FROM readings2`).all() as unknown as { usage: string }[];
  let input = 0, output = 0, cacheRead = 0;
  for (const r of rows) for (const u of JSON.parse(r.usage) as { input: number; output: number; cacheRead: number }[]) { input += u.input; output += u.output; cacheRead += u.cacheRead; }
  return { readings: rows.length, input, output, cacheRead };
}
export function countReadings(): number { return Number((conn().prepare(`SELECT COUNT(*) AS n FROM readings2`).get() as { n: number }).n); }
export function markPaid(id: string) { conn().prepare(`UPDATE readings2 SET paid = 1 WHERE id = ?`).run(id); }

export function addFriend(readingId: string, alias: string, birth: unknown): string {
  const id = nanoid(8);
  conn().prepare(`INSERT INTO friends (id, reading_id, created_at, alias, birth) VALUES (?, ?, ?, ?, ?)`).run(id, readingId, now(), alias, JSON.stringify(birth));
  return id;
}
export function listFriends(readingId: string): FriendRow[] {
  return conn().prepare(`SELECT * FROM friends WHERE reading_id = ? ORDER BY created_at`).all(readingId) as unknown as FriendRow[];
}
export function removeFriend(readingId: string, friendId: string) {
  conn().prepare(`DELETE FROM friends WHERE id = ? AND reading_id = ?`).run(friendId, readingId);
}
