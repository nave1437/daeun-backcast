// 친구의 사주가 내 대운표의 각 시기에 도움이 되는지 판정한다. 전부 표 조회라 즉시·무료로 계산된다.
// 기준: 친구의 일간이 나에게 어떤 십신인가(관계의 성격) × 그 시기 내 기운(십신 계열)의 상생상극 × 친구가 그 시기에 처한 자기 대운.

import { type Chart, daeunAt } from "../saju/calc";
import { tenGod, TEN_GOD_GROUP, stemsClash, stemsCombine, type TenGodGroup } from "../saju/tables";
import type { Plan, Kind } from "./plan";

const KIND_TO_GROUP: Record<Kind, TenGodGroup> = { people: "비겁", make: "식상", money: "재성", duty: "관성", learn: "인성" };
// 십신 계열의 상생: 비겁→식상→재성→관성→인성→비겁
const GEN: Record<TenGodGroup, TenGodGroup> = { 비겁: "식상", 식상: "재성", 재성: "관성", 관성: "인성", 인성: "비겁" };
// 상극: 비겁극재성, 식상극관성, 재성극인성, 관성극비겁, 인성극식상
const CTRL: Record<TenGodGroup, TenGodGroup> = { 비겁: "재성", 식상: "관성", 재성: "인성", 관성: "비겁", 인성: "식상" };

export type FriendVerdict = "push" | "with" | "care" | "block" | "drain" | "rival" | "neutral";
export const VERDICT_LABEL: Record<FriendVerdict, string> = {
  push: "밀어주는 사람", with: "같이 뛰는 사람", care: "받쳐주는 사람",
  block: "제동을 거는 사람", drain: "기운을 빼가는 사람", rival: "부딪히는 사람", neutral: "영향 적음",
};
export const VERDICT_SCORE: Record<FriendVerdict, number> = { push: 2, with: 1, care: 1, neutral: 0, drain: -1, block: -2, rival: -2 };

/** 받침 유무로 을/를을 고른다 */
function eul(w: string) { const c = w.charCodeAt(w.length - 1); return (c - 0xac00) % 28 ? `${w}을` : `${w}를`; }
const GROUP_WORD: Record<TenGodGroup, string> = { 비겁: "사람", 식상: "만들기", 재성: "돈", 관성: "책임", 인성: "배움" };
/** 친구 일간이 나에게 어떤 십신인지의 생활 언어 */
export const RELATION_WORD: Record<string, string> = {
  비견: "나와 같은 결의 사람", 겁재: "나와 닮았지만 몫이 갈리는 사람",
  식신: "내 말과 결과물을 끌어내는 사람", 상관: "내 표현을 자극하는 사람",
  편재: "나에게 기회를 물어오는 사람", 정재: "나에게 안정적인 돈이 되는 사람",
  편관: "나를 몰아붙이는 사람", 정관: "나에게 책임과 틀을 주는 사람",
  편인: "나에게 생각거리를 주는 사람", 정인: "나를 받쳐주는 사람",
};

/** 궁합도 5단계. 3이 보통. 점수(-4~+4)를 접는다. */
export function levelOf(score: number): 1 | 2 | 3 | 4 | 5 { return score <= -3 ? 1 : score <= -1 ? 2 : score === 0 ? 3 : score <= 2 ? 4 : 5; }
export const LEVEL_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = { 1: "크게 어긋남", 2: "조금 어긋남", 3: "보통", 4: "잘 맞음", 5: "아주 잘 맞음" };

export interface FriendMark {
  stepIndex: number;
  verdict: FriendVerdict;
  score: number;
  level: 1 | 2 | 3 | 4 | 5;
  why: string;
  /** 그 시기 친구 자신의 상태 */
  friendState: string;
}

export interface FriendProfile {
  alias: string;
  dayMaster: string;
  relation: string;        // 친구 일간이 나에게 어떤 십신인가
  relationWord: string;    // 그 생활 언어
  relationGroup: TenGodGroup;
  clash: boolean;
  combine: boolean;
  overall: number;         // 전체 시기 점수 합
  marks: FriendMark[];
}

export function judgeFriend(me: Chart, friend: Chart, alias: string, plan: Plan): FriendProfile {
  const rel = tenGod(me.dayMaster, friend.dayMaster);
  const g = TEN_GOD_GROUP[rel];
  const clash = stemsClash(me.dayMaster, friend.dayMaster);
  const combine = stemsCombine(me.dayMaster, friend.dayMaster);

  const marks: FriendMark[] = plan.steps.map((step) => {
    const need = KIND_TO_GROUP[step.kind];
    let verdict: FriendVerdict = "neutral";
    const why: string[] = [];
    if (GEN[g] === need) { verdict = "push"; why.push(`${alias}의 기운(${GROUP_WORD[g]})이 이 시기에 필요한 ${eul(GROUP_WORD[need])} 만들어 준다`); }
    else if (g === need) { verdict = g === "비겁" ? "rival" : "with"; why.push(g === "비겁" ? `같은 결이라 이 시기엔 경쟁이 된다` : `같은 결(${GROUP_WORD[g]})이라 같이 뛰기 좋다`); }
    else if (CTRL[g] === need) { verdict = "block"; why.push(`${alias}의 기운(${GROUP_WORD[g]})이 이 시기에 필요한 ${eul(GROUP_WORD[need])} 누른다`); }
    else if (CTRL[need] === g) { verdict = "drain"; why.push(`이 시기의 기운이 ${alias} 쪽으로 새어 나간다`); }
    else if (g === "인성") { verdict = "care"; why.push("나를 받쳐주는 기운이라 어느 시기든 조용히 도움이 된다"); }
    if (clash && verdict !== "block") { why.push("일간이 충해서 말이 세게 부딪힌다"); }
    if (combine) { why.push("일간이 합해서 가까워지기 쉽다"); }

    // 친구 자신의 그 시기 상태
    const fd = daeunAt(friend, step.keyYear);
    let friendState = "흐름 정보 없음";
    let adj = 0;
    if (fd) {
      const fg = TEN_GOD_GROUP[fd.branchGod];
      if (fg === "관성") { friendState = "본인이 책임과 압박에 눌려 있는 시기라 여유가 적다"; adj = -1; }
      else if (fg === "재성") { friendState = "본인도 돈과 기회를 좇는 시기라 거래로 엮기 좋다"; adj = step.kind === "money" ? 1 : 0; }
      else if (fg === "식상") { friendState = "본인이 만들고 표현하는 시기라 같이 만들기 좋다"; adj = step.kind === "make" ? 1 : 0; }
      else if (fg === "인성") { friendState = "본인이 배우고 정리하는 시기라 조언자로 좋다"; adj = 0; }
      else { friendState = "본인이 사람을 모으고 독립하려는 시기다"; adj = step.kind === "people" ? 1 : 0; }
    }
    let score = VERDICT_SCORE[verdict] + adj;
    if (clash) score -= 1;
    if (combine) score += 1;
    return { stepIndex: step.index, verdict, score, level: levelOf(score), why: why.join(". "), friendState };
  });

  return {
    alias, dayMaster: friend.dayMaster, relation: rel, relationWord: RELATION_WORD[rel], relationGroup: g, clash, combine,
    overall: marks.reduce((a, m) => a + m.score, 0), marks,
  };
}
