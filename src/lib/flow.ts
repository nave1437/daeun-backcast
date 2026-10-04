// 화면과 저장소, 엔진, AI를 잇는 서비스 함수. 서버에서만 실행된다.
import "server-only";
import { computeChart, elementCounts, type BirthInput, type Chart } from "./saju/calc";
import { buildPlan, type Plan } from "./engine/plan";
import { judgeFriend, type FriendProfile } from "./engine/friends";
import { writePlanProse, writeFriendLines, writeHardReport, type Prose, type HardReport } from "./ai/prose";
import * as db from "./store/db";

export const TODAY_YEAR = new Date().getFullYear();

export function parseBirth(form: FormData): BirthInput {
  const year = Number(form.get("year"));
  const month = Number(form.get("month"));
  const day = Number(form.get("day"));
  const hourRaw = String(form.get("hour") ?? "");
  const gender = String(form.get("gender")) === "female" ? "female" : "male";
  if (!year || !month || !day || year < 1900 || year > TODAY_YEAR) throw new Error("생년월일을 확인해 주세요");
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) throw new Error("존재하지 않는 날짜예요");
  const input: BirthInput = { year, month, day, gender };
  if (hourRaw !== "" && hourRaw !== "unknown") {
    const [h, m] = hourRaw.split(":").map(Number);
    input.hour = h; input.minute = m || 0;
  }
  if ((year >= 1948 && year <= 1960) || year === 1987 || year === 1988) input.daylightSaving = form.get("dst") === "on";
  return input;
}

export function chartOf(birth: BirthInput): Chart { return computeChart(birth); }

export const FRIEND_REWARD_COUNT = 3;

export type FriendView = FriendProfile & { id: string; lines: { startYear: number; line: string }[] | null };

export interface ReadingView {
  id: string; alias: string; chart: Chart; plan: Plan; paid: boolean;
  prose: Prose | null; proseMissing: boolean;
  friends: FriendView[];
  /** 결제됐는데 메모가 없는 친구가 있으면 다시 쓰기 버튼을 보여준다 */
  friendLinesMissing: boolean;
  /** 거센 해 리포트(유료). 결제 전엔 null */
  hardReport: HardReport | null;
  /** 결제됐는데 리포트가 아직 없음 */
  hardReportMissing: boolean;
  /** 시기별로 문단이 보이는지. 무료: 지금 시기 + 친구 보상으로 열린 시기 */
  visible: boolean[];
  elements: ReturnType<typeof elementCounts>;
  readingCount: number;
}

/** 무료 구간에서 보이는 시기. 지금 시기는 항상, 친구가 FRIEND_REWARD_COUNT명 이상이면 다음 시기 하나 더. */
function visibleSteps(plan: Plan): boolean[] {
  // 2026-10-04 BM 변경: 대운 타임라인 전체와 공유는 무료. 유료는 거센 해 리포트.
  return plan.steps.map(() => true);
}
/** 친구 메모(LLM)는 비용 때문에 끈다. 궁합 뱃지와 판정 문장은 표 계산이라 무료로 보여 준다. */
const FRIEND_LINES = false;

export async function loadReading(id: string): Promise<ReadingView | null> {
  const r = await db.getReading(id);
  if (!r) return null;
  const chart = computeChart(JSON.parse(r.birth) as BirthInput);
  let plan = JSON.parse(r.plan) as Plan;
  // 옛 스키마 기록은 같은 입력으로 다시 계산한다
  if (!Array.isArray(plan.steps) || plan.steps.some((s) => s.isPivot === undefined)) plan = buildPlan(chart, r.goal_year, r.goal_text, plan.todayYear ?? TODAY_YEAR, plan.situation);
  const paid = r.paid === 1;
  let prose = r.prose_full ? (JSON.parse(r.prose_full) as Prose) : null;
  if (prose && !Array.isArray(prose.sections)) prose = null; // 옛 스키마는 다시 쓴다
  const friends: FriendView[] = (await db.listFriends(id)).map((f) => ({
    id: f.id,
    ...judgeFriend(chart, computeChart(JSON.parse(f.birth) as BirthInput), f.alias, plan),
    lines: f.lines ? (JSON.parse(f.lines) as { startYear: number; line: string }[]) : null,
  }));
  const hardReport = r.hard_report ? (JSON.parse(r.hard_report) as HardReport) : null;
  const hardCount = plan.steps.reduce((a, s) => a + s.hardYears.length, 0);
  return {
    id, alias: r.alias, chart, plan, paid, prose, proseMissing: !prose,
    friends, friendLinesMissing: FRIEND_LINES && !!prose && friends.some((f) => !f.lines),
    hardReport, hardReportMissing: paid && hardCount > 0 && !hardReport,
    visible: visibleSteps(plan), elements: elementCounts(chart), readingCount: await db.countReadings(),
  };
}

export async function createReadingFlow(alias: string, birth: BirthInput, goalYear: number, goalText: string, situation?: string) {
  await db.purgeExpired();
  const chart = computeChart(birth);
  const plan = buildPlan(chart, goalYear, goalText, TODAY_YEAR, situation);
  const id = await db.createReading({ alias, birth, goalYear, goalText, plan });
  // 계획은 처음에 한 번 전부 쓴다. 무료·유료는 화면에서만 가린다.
  try {
    const { prose, usage } = await writePlanProse(chart, alias, plan);
    await db.setProse(id, prose, usage);
  } catch (e) { console.error("[prose]", e); }
  return id;
}

/** 계획 문장이 없으면 쓴다(force면 다시 쓴다). 친구 문장이 빠진 친구도 채운다. */
export async function generateProse(id: string, force = false) {
  const v = await loadReading(id);
  if (!v) return;
  let prose = v.prose;
  if (!prose || force) {
    const r = await writePlanProse(v.chart, v.alias, v.plan);
    await db.setProse(id, r.prose, r.usage);
    prose = r.prose;
  }
  if (FRIEND_LINES) for (const f of v.friends) {
    if (f.lines && !force) continue;
    try { const r = await writeFriendLines(v.alias, v.plan, prose, f); await db.setFriendLines(id, f.id, r.lines, r.usage); }
    catch (e) { console.error("[prose:friend]", e); }
  }
  if (v.paid && (!v.hardReport || force)) await generateHardReport(id);
}

/** 거센 해 리포트(유료). 결제 직후 1회 생성해 저장한다. */
export async function generateHardReport(id: string) {
  const v = await loadReading(id);
  if (!v) return;
  try { const r = await writeHardReport(v.chart, v.plan); await db.setHardReport(id, r.report, r.usage); }
  catch (e) { console.error("[prose:hard]", e); }
}

export async function addFriendFlow(readingId: string, alias: string, birth: BirthInput) {
  if (!(await db.getReading(readingId))) throw new Error("이 링크는 없거나 만료됐습니다");
  const friendChart = computeChart(birth);
  const fid = await db.addFriend(readingId, alias, birth);
  const v = await loadReading(readingId);
  if (FRIEND_LINES && v?.prose) {
    // 계획 본문은 그대로 두고 이 친구에 대한 시기별 한 문장만 쓴다.
    try {
      const profile = judgeFriend(v.chart, friendChart, alias, v.plan);
      const r = await writeFriendLines(v.alias, v.plan, v.prose, profile);
      await db.setFriendLines(readingId, fid, r.lines, r.usage);
    } catch (e) { console.error("[prose:friend]", e); }
  }
  return fid;
}

export async function removeFriendFlow(readingId: string, friendId: string) {
  await db.removeFriend(readingId, friendId);
}

/** 결제: 이미 생성된 문장을 여는 것뿐이라 즉시 끝난다. */
export async function payFlow(id: string) {
  await db.markPaid(id);
  await generateHardReport(id);
}
