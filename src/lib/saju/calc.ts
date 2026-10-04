// 만세력 계산. lunar-javascript(6tail)를 사용하고, 한국 시간 보정을 얹는다.
// - 연주·월주(절기 경계)는 절입 시각을 정확히 비교해야 하므로 KST를 CST(UTC+8)로 바꿔 계산한다.
// - 일주·시주는 서울 진태양시(KST−30분)로 계산한다.
// - 출생 시각을 모르면 시주 없이 3주로 계산하고 정오로 가정한다.

import { Solar } from "lunar-javascript";
import {
  splitGanZhi, tenGod, tenGodOfBranch, yearGanZhi, STEM_INFO, BRANCH_MAIN_STEM,
  type Stem, type Branch, type TenGod, type Element,
} from "./tables";

export type Gender = "male" | "female";

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour?: number;   // 0-23, undefined = 모름
  minute?: number;
  gender: Gender;
  /** 1948~1960, 1987~1988 서머타임 출생자는 true로 두면 1시간을 빼서 계산한다. */
  daylightSaving?: boolean;
}

export interface Pillar {
  ganZhi: string;
  stem: Stem;
  branch: Branch;
  stemGod: TenGod | null;   // 일간 자신은 null
  branchGod: TenGod;
}

export interface DaeunPeriod {
  index: number;
  startYear: number;
  endYear: number;
  startAge: number;
  ganZhi: string;
  stem: Stem;
  branch: Branch;
  stemGod: TenGod;
  branchGod: TenGod;
}

export interface SeunYear {
  year: number;
  ganZhi: string;
  stem: Stem;
  branch: Branch;
  stemGod: TenGod;
  branchGod: TenGod;
  daeunIndex: number;
}

export interface Chart {
  input: BirthInput;
  dayMaster: Stem;
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  forward: boolean;
  daeun: DaeunPeriod[];
  /** 대운이 시작하기 전 구간(출생~첫 대운) */
  preDaeun: { startYear: number; endYear: number } | null;
}

function shiftMinutes(input: BirthInput, hour: number, minute: number, deltaMin: number) {
  const base = new Date(Date.UTC(input.year, input.month - 1, input.day, hour, minute));
  const shifted = new Date(base.getTime() + deltaMin * 60_000);
  return {
    y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate(),
    h: shifted.getUTCHours(), mi: shifted.getUTCMinutes(),
  };
}

function pillarOf(dayMaster: Stem, gz: string, isDay = false): Pillar {
  const { stem, branch } = splitGanZhi(gz);
  return {
    ganZhi: gz, stem, branch,
    stemGod: isDay ? null : tenGod(dayMaster, stem),
    branchGod: tenGodOfBranch(dayMaster, branch),
  };
}

export function computeChart(input: BirthInput): Chart {
  const hasHour = typeof input.hour === "number";
  const hour = hasHour ? (input.hour as number) : 12;
  const minute = hasHour ? (input.minute ?? 0) : 0;
  const dst = input.daylightSaving ? -60 : 0;

  // 절기 비교용(CST) 과 진태양시(서울)용 두 개의 시각을 만든다.
  const cst = shiftMinutes(input, hour, minute, -60 + dst);
  const sol = shiftMinutes(input, hour, minute, -30 + dst);

  const lunarCst = Solar.fromYmdHms(cst.y, cst.m, cst.d, cst.h, cst.mi, 0).getLunar();
  const lunarSol = Solar.fromYmdHms(sol.y, sol.m, sol.d, sol.h, sol.mi, 0).getLunar();
  const ecCst = lunarCst.getEightChar();
  const ecSol = lunarSol.getEightChar();
  ecCst.setSect(2); // 야자시(23시 이후)를 당일로 취급. 유파 옵션.
  ecSol.setSect(2);

  const dayGz: string = ecSol.getDay();
  const dayMaster = splitGanZhi(dayGz).stem;

  const pillars = {
    year: pillarOf(dayMaster, ecCst.getYear()),
    month: pillarOf(dayMaster, ecCst.getMonth()),
    day: pillarOf(dayMaster, dayGz, true),
    hour: hasHour ? pillarOf(dayMaster, ecSol.getTime()) : null,
  };

  // 대운은 절기 기준이라 CST 차트로 계산한다. getYun(1=남, 0=여)
  const yun = ecCst.getYun(input.gender === "male" ? 1 : 0);
  const raw = yun.getDaYun() as Array<{
    getIndex(): number; getStartYear(): number; getEndYear(): number;
    getStartAge(): number; getGanZhi(): string;
  }>;

  const daeun: DaeunPeriod[] = [];
  let preDaeun: Chart["preDaeun"] = null;
  for (const d of raw) {
    const gz = d.getGanZhi();
    if (!gz) { preDaeun = { startYear: d.getStartYear(), endYear: d.getEndYear() }; continue; }
    const { stem, branch } = splitGanZhi(gz);
    daeun.push({
      index: d.getIndex(), startYear: d.getStartYear(), endYear: d.getEndYear(), startAge: d.getStartAge(),
      ganZhi: gz, stem, branch,
      stemGod: tenGod(dayMaster, stem), branchGod: tenGodOfBranch(dayMaster, branch),
    });
  }

  return { input, dayMaster, pillars, forward: yun.isForward(), daeun, preDaeun };
}

export function daeunAt(chart: Chart, year: number): DaeunPeriod | null {
  return chart.daeun.find((d) => year >= d.startYear && year <= d.endYear) ?? null;
}

/** 지정 구간의 세운을 일간 기준 십신과 함께 나열한다. */
export function seunRange(chart: Chart, fromYear: number, toYear: number): SeunYear[] {
  const out: SeunYear[] = [];
  for (let y = fromYear; y <= toYear; y++) {
    const gz = yearGanZhi(y);
    const { stem, branch } = splitGanZhi(gz);
    out.push({
      year: y, ganZhi: gz, stem, branch,
      stemGod: tenGod(chart.dayMaster, stem), branchGod: tenGodOfBranch(chart.dayMaster, branch),
      daeunIndex: daeunAt(chart, y)?.index ?? -1,
    });
  }
  return out;
}

export function ageIn(chart: Chart, year: number): number {
  return year - chart.input.year + 1; // 한국식 세는나이
}

/** 원국 8글자(시주 없으면 6글자)의 오행 개수 */
export function elementCounts(chart: Chart): Record<Element, number> {
  const out: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const ps = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour].filter((x): x is Pillar => !!x);
  for (const p of ps) { out[STEM_INFO[p.stem].element]++; out[STEM_INFO[BRANCH_MAIN_STEM[p.branch]].element]++; }
  return out;
}
