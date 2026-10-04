// 천간·지지 기본표와 십신 판정. 모든 값은 결정적이며 AI를 거치지 않는다.

export type Element = "wood" | "fire" | "earth" | "metal" | "water";
export type Polarity = "yang" | "yin";

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export type Stem = (typeof STEMS)[number];
export type Branch = (typeof BRANCHES)[number];

export const STEM_KO: Record<Stem, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
export const BRANCH_KO: Record<Branch, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

export const STEM_INFO: Record<Stem, { element: Element; polarity: Polarity }> = {
  甲: { element: "wood", polarity: "yang" },
  乙: { element: "wood", polarity: "yin" },
  丙: { element: "fire", polarity: "yang" },
  丁: { element: "fire", polarity: "yin" },
  戊: { element: "earth", polarity: "yang" },
  己: { element: "earth", polarity: "yin" },
  庚: { element: "metal", polarity: "yang" },
  辛: { element: "metal", polarity: "yin" },
  壬: { element: "water", polarity: "yang" },
  癸: { element: "water", polarity: "yin" },
};

// 지지는 지장간 본기(本氣)를 기준으로 십신을 판정한다.
export const BRANCH_MAIN_STEM: Record<Branch, Stem> = {
  子: "癸", 丑: "己", 寅: "甲", 卯: "乙", 辰: "戊", 巳: "丙",
  午: "丁", 未: "己", 申: "庚", 酉: "辛", 戌: "戊", 亥: "壬",
};

export const ELEMENT_KO: Record<Element, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

// 상생: wood→fire→earth→metal→water→wood
const GENERATES: Record<Element, Element> = {
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
};
// 상극: wood→earth→water→fire→metal→wood
const CONTROLS: Record<Element, Element> = {
  wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood",
};

export type TenGod =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "편재" | "정재"
  | "편관" | "정관"
  | "편인" | "정인";

export type TenGodGroup = "비겁" | "식상" | "재성" | "관성" | "인성";

export const TEN_GOD_GROUP: Record<TenGod, TenGodGroup> = {
  비견: "비겁", 겁재: "비겁",
  식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성",
  편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};

/** 일간(day master) 기준으로 대상 천간이 어떤 십신인지 판정한다. */
export function tenGod(dayMaster: Stem, target: Stem): TenGod {
  const me = STEM_INFO[dayMaster];
  const it = STEM_INFO[target];
  const same = me.polarity === it.polarity;
  if (me.element === it.element) return same ? "비견" : "겁재";
  if (GENERATES[me.element] === it.element) return same ? "식신" : "상관";
  if (CONTROLS[me.element] === it.element) return same ? "편재" : "정재";
  if (CONTROLS[it.element] === me.element) return same ? "편관" : "정관";
  if (GENERATES[it.element] === me.element) return same ? "편인" : "정인";
  throw new Error(`십신 판정 불가: ${dayMaster} ${target}`);
}

export function tenGodOfBranch(dayMaster: Stem, branch: Branch): TenGod {
  return tenGod(dayMaster, BRANCH_MAIN_STEM[branch]);
}

/** 천간충: 甲庚, 乙辛, 丙壬, 丁癸 (戊己는 충이 없다) */
const STEM_CLASH: [Stem, Stem][] = [["甲", "庚"], ["乙", "辛"], ["丙", "壬"], ["丁", "癸"]];
export function stemsClash(a: Stem, b: Stem): boolean {
  return STEM_CLASH.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/** 천간합: 甲己, 乙庚, 丙辛, 丁壬, 戊癸 */
const STEM_COMBINE: [Stem, Stem][] = [["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"]];
export function stemsCombine(a: Stem, b: Stem): boolean {
  return STEM_COMBINE.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/** 지지충: 子午, 丑未, 寅申, 卯酉, 辰戌, 巳亥 */
export function branchesClash(a: Branch, b: Branch): boolean {
  const ia = BRANCHES.indexOf(a);
  const ib = BRANCHES.indexOf(b);
  return (ia + 6) % 12 === ib;
}

/** 지지육합: 子丑, 寅亥, 卯戌, 辰酉, 巳申, 午未 */
const BRANCH_COMBINE: [Branch, Branch][] = [["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"]];
export function branchesCombine(a: Branch, b: Branch): boolean {
  return BRANCH_COMBINE.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

export function splitGanZhi(gz: string): { stem: Stem; branch: Branch } {
  const stem = gz[0] as Stem;
  const branch = gz[1] as Branch;
  if (!STEMS.includes(stem) || !BRANCHES.includes(branch)) throw new Error(`간지 아님: ${gz}`);
  return { stem, branch };
}

export function ganZhiKo(gz: string): string {
  const { stem, branch } = splitGanZhi(gz);
  return `${STEM_KO[stem]}${BRANCH_KO[branch]}`;
}

/** 세운 간지: 서기 연도 → 간지 (1984년 = 甲子) */
export function yearGanZhi(year: number): string {
  const i = ((year - 1984) % 60 + 60) % 60;
  return STEMS[i % 10] + BRANCHES[i % 12];
}
