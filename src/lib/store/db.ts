// 저장소 파사드. SUPABASE_URL/SUPABASE_SERVICE_KEY 가 있으면 Supabase(배포), 없으면 로컬 SQLite 파일.
// 모든 함수는 비동기다. 호출부는 어느 쪽인지 몰라도 된다.
import * as sqlite from "./sqlite";
import * as supa from "./supabase";
export type { ReadingRow, FriendRow } from "./sqlite";
export { LINK_TTL_DAYS } from "./sqlite";

export const BACKEND: "supabase" | "sqlite" = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY ? "supabase" : "sqlite";
const useSupa = BACKEND === "supabase";

export async function purgeExpired() { return useSupa ? supa.purgeExpired() : sqlite.purgeExpired(); }
export async function createReading(v: { alias: string; birth: unknown; goalYear: number; goalText: string; plan: unknown }) { return useSupa ? supa.createReading(v) : sqlite.createReading(v); }
export async function getReading(id: string) { return useSupa ? supa.getReading(id) : sqlite.getReading(id); }
export async function setProse(id: string, prose: unknown, usage: unknown) { return useSupa ? supa.setProse(id, prose, usage) : sqlite.setProse(id, prose, usage); }
export async function setHardReport(id: string, report: unknown, usage: unknown) { return useSupa ? supa.setHardReport(id, report, usage) : sqlite.setHardReport(id, report, usage); }
export async function setFriendLines(readingId: string, friendId: string, lines: unknown, usage: unknown) { return useSupa ? supa.setFriendLines(readingId, friendId, lines, usage) : sqlite.setFriendLines(readingId, friendId, lines, usage); }
export async function usageStats() { return useSupa ? supa.usageStats() : sqlite.usageStats(); }
export async function countReadings() { return useSupa ? supa.countReadings() : sqlite.countReadings(); }
export async function markPaid(id: string) { return useSupa ? supa.markPaid(id) : sqlite.markPaid(id); }
export async function addFriend(readingId: string, alias: string, birth: unknown) { return useSupa ? supa.addFriend(readingId, alias, birth) : sqlite.addFriend(readingId, alias, birth); }
export async function listFriends(readingId: string) { return useSupa ? supa.listFriends(readingId) : sqlite.listFriends(readingId); }
export async function removeFriend(readingId: string, friendId: string) { return useSupa ? supa.removeFriend(readingId, friendId) : sqlite.removeFriend(readingId, friendId); }
