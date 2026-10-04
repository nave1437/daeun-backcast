// 계획의 뼈대. 오늘부터 목표 해까지를 대운이 들어오는 해(기점)로 자른다. 문장은 AI가 쓰고, 구간·기운·연도는 여기서 확정된다.

import { type Chart, type SeunYear, daeunAt, seunRange, ageIn } from "../saju/calc";
import { TEN_GOD_GROUP, type TenGod, type TenGodGroup, stemsClash, ganZhiKo } from "../saju/tables";

export type Kind = "people" | "make" | "money" | "duty" | "learn";
export const GROUP_TO_KIND: Record<TenGodGroup, Kind> = { 비겁: "people", 식상: "make", 재성: "money", 관성: "duty", 인성: "learn" };
export const KIND_WORD: Record<Kind, string> = { people: "사람", make: "만들기", money: "돈", duty: "책임", learn: "배움" };
/** 이 기운의 시기에 잘 되는 일. AI 프롬프트에 그대로 들어간다. */
export const KIND_FIT: Record<Kind, string> = {
  people: "사람을 모으고, 동료를 붙이고, 독립을 준비하는 일",
  make: "만들고, 표현하고, 세상에 내놓는 일",
  money: "수입 구조를 세우고, 기회를 실제 거래로 바꾸는 일",
  duty: "계약·조직·책임을 정식으로 정리하고, 압박을 견디는 일",
  learn: "배우고, 기록하고, 만든 것을 다시 다듬는 일",
};
const HARD: TenGod[] = ["겁재", "상관", "편재", "편관", "편인"];

export interface Step {
  index: number;           // 0 = 지금 대운(남은 구간), 마지막 = 목표가 들어 있는 대운
  startYear: number;       // index 0 이면 올해, 그 외는 대운이 들어오는 해(기점)
  endYear: number;
  startAge: number;
  endAge: number;
  isPivot: boolean;        // 대운이 새로 들어오는 해로 시작하는가
  daeunGanZhi: string | null;
  daeunKo: string | null;
  stemGod: TenGod | null;
  branchGod: TenGod | null;
  kind: Kind;
  kindWord: string;
  fit: string;
  keyYear: number;
  keyYearWhy: string;
  hardYears: { year: number; why: string }[];
  years: { year: number; ganZhiKo: string; stemGod: TenGod; branchGod: TenGod }[];
  freeVisible: boolean;
}

export interface Plan {
  goalYear: number;
  goalText: string;
  situation?: string;
  todayYear: number;
  steps: Step[];
}

function scoreSeun(chart: Chart, s: SeunYear, kind: Kind): { score: number; why: string } {
  const bg = GROUP_TO_KIND[TEN_GOD_GROUP[s.branchGod]];
  const sg = GROUP_TO_KIND[TEN_GOD_GROUP[s.stemGod]];
  let score = 0; const why: string[] = [];
  if (bg === kind) { score += 2; why.push(`그 해의 바탕이 이 대운의 기운(${KIND_WORD[kind]})과 같다`); }
  if (sg === kind) { score += 1; why.push(`그 해의 사건도 ${KIND_WORD[kind]} 쪽이다`); }
  if (!HARD.includes(s.branchGod) && !HARD.includes(s.stemGod)) { score += 1; why.push("거센 기운이 없어 실행이 순하다"); }
  if (stemsClash(chart.dayMaster, s.stem)) score -= 2;
  return { score, why: why.join(", ") };
}
function hardWhy(chart: Chart, s: SeunYear): string | null {
  const r: string[] = [];
  if (stemsClash(chart.dayMaster, s.stem)) r.push("그 해의 기운이 나를 정면으로 친다(압박·이탈 유혹)");
  if (s.branchGod === "편관") r.push("압박과 조직의 요구가 세게 오는 해");
  if (s.branchGod === "겁재") r.push("사람과 돈이 새기 쉬운 해");
  return r.length ? r.join(". ") : null;
}

/** 오늘~목표를 대운이 들어오는 해로 자른다. 대운 전환이 없으면 구간 하나. */
export function buildPlan(chart: Chart, goalYear: number, goalText: string, todayYear: number, situation?: string): Plan {
  if (goalYear <= todayYear) throw new Error("목표 연도는 올해보다 뒤여야 합니다");
  const ranges: { start: number; end: number }[] = [];
  let y = todayYear;
  while (y <= goalYear) {
    const d = daeunAt(chart, y);
    const end = Math.min(d ? d.endYear : y + 9, goalYear);
    ranges.push({ start: y, end });
    y = end + 1;
  }
  const steps: Step[] = ranges.map((r, i) => {
    const seun = seunRange(chart, r.start, r.end);
    const mid = seun[Math.floor(seun.length / 2)];
    const d = daeunAt(chart, mid.year);
    const kind: Kind = d ? GROUP_TO_KIND[TEN_GOD_GROUP[d.branchGod]] : GROUP_TO_KIND[TEN_GOD_GROUP[mid.branchGod]];
    const scored = seun.map((s) => ({ s, ...scoreSeun(chart, s, kind) })).sort((a, b) => b.score - a.score || a.s.year - b.s.year);
    return {
      index: i, startYear: r.start, endYear: r.end, startAge: ageIn(chart, r.start), endAge: ageIn(chart, r.end),
      isPivot: i > 0,
      daeunGanZhi: d?.ganZhi ?? null, daeunKo: d ? ganZhiKo(d.ganZhi) : null,
      stemGod: d?.stemGod ?? null, branchGod: d?.branchGod ?? null,
      kind, kindWord: KIND_WORD[kind], fit: KIND_FIT[kind],
      keyYear: scored[0].s.year, keyYearWhy: scored[0].why || "구간 안에서 가장 순한 해",
      hardYears: seun.map((s) => ({ year: s.year, why: hardWhy(chart, s) })).filter((x): x is { year: number; why: string } => !!x.why),
      years: seun.map((s) => ({ year: s.year, ganZhiKo: ganZhiKo(s.ganZhi), stemGod: s.stemGod, branchGod: s.branchGod })),
      freeVisible: i === 0,
    };
  });
  return { goalYear, goalText, situation, todayYear, steps };
}
