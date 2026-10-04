// 십신 → 관문 번역과 개인 역산 로드맵 뼈대. 문장은 AI가 쓰지만 종류·연도·순서는 여기서 확정된다.

import { type Chart, type SeunYear, daeunAt, seunRange, ageIn } from "../saju/calc";
import { TEN_GOD_GROUP, type TenGod, type TenGodGroup, stemsClash } from "../saju/tables";

export type GateKind =
  | "people"     // 비겁: 사람·경쟁·독립
  | "make"       // 식상: 제작·표현·출시
  | "money"      // 재성: 돈 구조·기회
  | "duty"       // 관성: 책임·계약·압박
  | "learn";     // 인성: 배움·문서·리뉴얼

export const GROUP_TO_KIND: Record<TenGodGroup, GateKind> = {
  비겁: "people", 식상: "make", 재성: "money", 관성: "duty", 인성: "learn",
};

export const KIND_LABEL: Record<GateKind, string> = {
  people: "사람이 붙는 해", make: "만드는 힘이 센 해", money: "돈의 구조가 잡히는 해",
  duty: "정식으로 정리되는 해", learn: "다시 배우는 해",
};

export const KIND_LABEL_HARD: Record<GateKind, string> = {
  people: "따로 하고 싶어지는 해", make: "말이 앞서는 해", money: "큰 기회와 유혹이 같이 오는 해",
  duty: "흔들리는 해", learn: "생각이 많아지는 해",
};

export type GateRole = "goal" | "gate" | "crisis" | "shift" | "today";

export interface Gate {
  role: GateRole;
  year: number;
  age: number;
  ganZhi: string;
  stemGod: TenGod;
  branchGod: TenGod;
  kind: GateKind;
  /** 편(偏) 계열이거나 충이 걸린 해는 hard */
  hard: boolean;
  title: string;
  /** 대운 전환이 이 해에 걸리면 표시 */
  daeunShift?: { from: string; to: string };
  /** 무료 구간에서 문장까지 보여주는지 */
  freeVisible: boolean;
  /** 어떤 근거로 이 해가 선택됐는지. AI 프롬프트에 그대로 들어간다. */
  why: string[];
}

export interface Roadmap {
  goalYear: number;
  goalText: string;
  todayYear: number;
  gates: Gate[]; // goal → ... → today (역순)
}

const HARD_GODS: TenGod[] = ["겁재", "상관", "편재", "편관", "편인"];

function scoreYear(chart: Chart, s: SeunYear): { score: number; why: string[] } {
  const why: string[] = [];
  let score = 0;
  const d = daeunAt(chart, s.year);
  // 1. 대운 지지와 세운 지지가 같으면(복음) 그 기운이 두 배
  if (d && d.branch === s.branch) { score += 3; why.push(`대운 ${d.ganZhi}의 ${d.branch}와 세운 ${s.branch}가 겹친다(${s.branchGod} 강화)`); }
  if (d && d.stem === s.stem) { score += 2; why.push(`대운 천간 ${d.stem}와 세운 천간이 같다(${s.stemGod} 강화)`); }
  // 2. 세운 천간이 일간을 충하면 압박의 해
  if (stemsClash(chart.dayMaster, s.stem)) { score += 3; why.push(`세운 천간 ${s.stem}이 일간 ${chart.dayMaster}을 정면으로 친다`); }
  // 3. 대운 전환 연도
  if (d && d.startYear === s.year) { score += 2; why.push(`이 해에 대운이 ${d.ganZhi}로 바뀐다`); }
  // 4. 재성·관성은 구조가 바뀌는 해라 가중
  if (TEN_GOD_GROUP[s.branchGod] === "재성" || TEN_GOD_GROUP[s.stemGod] === "재성") { score += 1; why.push("재성이 들어온다"); }
  if (TEN_GOD_GROUP[s.stemGod] === "관성") { score += 1; why.push("관성이 들어온다"); }
  return { score, why };
}

function kindOf(s: SeunYear): GateKind {
  // 지지 십신을 우선으로 본다(1년의 바탕). 천간은 사건.
  return GROUP_TO_KIND[TEN_GOD_GROUP[s.branchGod]];
}

function isHard(chart: Chart, s: SeunYear): boolean {
  return HARD_GODS.includes(s.branchGod) || HARD_GODS.includes(s.stemGod) || stemsClash(chart.dayMaster, s.stem);
}

/**
 * 목표 연도에서 오늘까지 역순으로 관문을 세운다.
 * - 목표(goal), 오늘(today)은 항상 포함
 * - 그 사이에서 점수가 높은 해를 최대 maxMid개 고르고, 그중 가장 압박이 센 해 하나를 crisis로 표시
 * - 대운 전환 연도는 shift로 표시
 */
export function buildRoadmap(chart: Chart, goalYear: number, goalText: string, todayYear: number, maxMid = 4): Roadmap {
  if (goalYear <= todayYear) throw new Error("목표 연도는 올해보다 뒤여야 합니다");
  const seun = seunRange(chart, todayYear, goalYear);
  const byYear = new Map(seun.map((s) => [s.year, s]));

  const mids = seun
    .filter((s) => s.year > todayYear && s.year < goalYear)
    .map((s) => ({ s, ...scoreYear(chart, s) }))
    .sort((a, b) => b.score - a.score || a.s.year - b.s.year)
    .slice(0, maxMid)
    .sort((a, b) => b.s.year - a.s.year);

  // 고비: 중간 관문 중 hard이면서 점수가 가장 높은 해
  const crisis = [...mids].filter((m) => isHard(chart, m.s)).sort((a, b) => b.score - a.score)[0];

  const toGate = (s: SeunYear, role: GateRole, why: string[]): Gate => {
    const kind = kindOf(s);
    const hard = isHard(chart, s);
    const d = daeunAt(chart, s.year);
    const prev = d ? chart.daeun.find((x) => x.index === d.index - 1) : undefined;
    const daeunShift = d && d.startYear === s.year && prev ? { from: prev.ganZhi, to: d.ganZhi } : undefined;
    return {
      role, year: s.year, age: ageIn(chart, s.year), ganZhi: s.ganZhi,
      stemGod: s.stemGod, branchGod: s.branchGod, kind, hard,
      title: role === "goal" ? "목표 도달" : role === "today" ? "오늘의 첫 고리" : hard ? KIND_LABEL_HARD[kind] : KIND_LABEL[kind],
      daeunShift,
      freeVisible: role === "goal" || role === "today" || role === "shift",
      why,
    };
  };

  const goalS = byYear.get(goalYear)!;
  const todayS = byYear.get(todayYear)!;
  const gates: Gate[] = [toGate(goalS, "goal", scoreYear(chart, goalS).why)];
  for (const m of mids) {
    const role: GateRole = crisis && m.s.year === crisis.s.year ? "crisis" : (daeunAt(chart, m.s.year)?.startYear === m.s.year ? "shift" : "gate");
    gates.push(toGate(m.s, role, m.why));
  }
  gates.push(toGate(todayS, "today", scoreYear(chart, todayS).why));

  // 시작 관문(오늘 다음 관문)은 무료로 연다. 결제 동기는 고비와 중간 관문에 둔다.
  const firstAfterToday = gates[gates.length - 2];
  if (firstAfterToday && firstAfterToday.role === "gate") firstAfterToday.freeVisible = true;

  return { goalYear, goalText, todayYear, gates };
}
