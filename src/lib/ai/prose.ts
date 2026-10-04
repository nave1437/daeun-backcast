// 문장 생성 층. 구간·기운·연도는 코드가 끝낸 뒤 들어오고, 여기서는 설명 글과 할 일 카드만 만든다.
// 모델: Claude Sonnet 5. provider=agent 면 로컬 Claude Code 로그인, provider=api 면 ANTHROPIC_API_KEY.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { jsonrepair } from "jsonrepair";
import type { Chart } from "../saju/calc";
import type { Plan, Step } from "../engine/plan";
import type { FriendProfile } from "../engine/friends";
import { VERDICT_LABEL } from "../engine/friends";
import { ganZhiKo } from "../saju/tables";
import { elementCounts } from "../saju/calc";

export const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
export const PROVIDER: "api" | "agent" = (process.env.PROSE_PROVIDER as "api" | "agent") ?? (process.env.ANTHROPIC_API_KEY ? "api" : "agent");
/** 생각(thinking) 사용 여부. Sonnet 5는 적응형이라 켜 두면 출력 토큰이 본문의 2~3배가 된다. 기본은 끔. */
const THINK_ADAPTIVE = process.env.PROSE_THINKING === "adaptive";

export interface Usage { input: number; output: number; cacheRead: number; model: string }

let _client: Anthropic | null = null;
function client() { return (_client ??= new Anthropic()); }
function usageOf(r: { usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null } }): Usage {
  return { input: r.usage.input_tokens, output: r.usage.output_tokens, cacheRead: r.usage.cache_read_input_tokens ?? 0, model: MODEL };
}

/** 모델이 낸 텍스트에서 JSON 하나를 최대한 복구해 꺼낸다. */
function extractJson(text: string): unknown {
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = t.indexOf("{");
  if (start < 0) throw new Error(`JSON이 아니에요: ${t.slice(0, 120)}`);
  t = t.slice(start);
  // 1) 그대로  2) 마지막 '}'까지  3) jsonrepair  4) 중괄호 균형을 맞춰 잘린 꼬리 닫기
  const candidates: string[] = [t];
  const lastBrace = t.lastIndexOf("}");
  if (lastBrace > 0) candidates.push(t.slice(0, lastBrace + 1));
  for (const c of candidates) { try { return JSON.parse(c); } catch { /* 다음 */ } }
  for (const c of candidates) { try { return JSON.parse(jsonrepair(c)); } catch { /* 다음 */ } }
  let depth = 0, inStr = false, esc = false, cut = t.length;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === "{" || ch === "[") depth++; else if (ch === "}" || ch === "]") depth--;
    if (depth === 0 && i > 0) { cut = i + 1; break; }
  }
  return JSON.parse(jsonrepair(t.slice(0, cut)));
}

async function viaAgent<T>(system: string, payload: unknown, schema: z.ZodType<T>, jsonShape: string): Promise<{ parsed: T; usage: Usage }> {
  let lastErr: unknown = null;
  let lastText = "";
  let lastKind: "syntax" | "schema" | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let text = "";
    let usage: Usage = { input: 0, output: 0, cacheRead: 0, model: MODEL };
    const base = `${JSON.stringify(payload)}\n\n출력은 아래 형태의 JSON 하나만. 코드 펜스나 설명 없이 JSON만 출력한다. 문자열 안에 큰따옴표를 쓰지 않는다. 배열 마지막 원소 뒤에 쉼표를 두지 않는다. 모든 필드를 빠짐없이 채운다(sections와 todos 둘 다, 각 원소의 milestone 포함).\n${jsonShape}`;
    const fixSyntax = `아래 텍스트는 문법이 깨진 JSON이다. 내용은 바꾸지 말고 문법만 고쳐 유효한 JSON 하나로 다시 출력하라. 설명 없이 JSON만.\n\n${lastText.slice(0, 20000)}`;
    const prompt = attempt === 0 ? base
      : lastKind === "syntax" ? fixSyntax
      : `${base}\n\n직전 출력이 형식 검사에서 실패했다: ${lastErr instanceof Error ? lastErr.message.slice(0, 600) : String(lastErr)}\n빠진 필드를 모두 채워 전체를 다시 출력한다.`;
    const sys = attempt > 0 && lastKind === "syntax" ? "너는 JSON 문법 교정기다." : system;
    for await (const m of query({ prompt, options: { model: MODEL, maxTurns: 1, tools: [], allowedTools: [], permissionMode: "bypassPermissions", systemPrompt: sys, settingSources: [], effort: "low", thinking: THINK_ADAPTIVE ? { type: "adaptive" } : { type: "disabled" } } })) {
      if (m.type === "assistant") for (const b of m.message.content) if (b.type === "text") text += b.text;
      if (m.type === "result" && m.subtype === "success") {
        const u = m.usage as { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } | undefined;
        usage = { input: (u?.input_tokens ?? 0) + (u?.cache_creation_input_tokens ?? 0), output: u?.output_tokens ?? 0, cacheRead: u?.cache_read_input_tokens ?? 0, model: MODEL };
      }
    }
    let obj: unknown;
    try { obj = extractJson(text); }
    catch (e) { lastErr = e; lastText = text; lastKind = "syntax"; console.error(`[viaAgent] json failed (attempt ${attempt + 1})`, e instanceof Error ? e.message.slice(0, 200) : e); continue; }
    if (obj && typeof obj === "object" && !("sections" in (obj as Record<string, unknown>))) {
      const inner = Object.values(obj as Record<string, unknown>).find((v) => v && typeof v === "object" && "sections" in (v as Record<string, unknown>));
      if (inner) obj = inner;
    }
    try { return { parsed: schema.parse(obj), usage }; }
    catch (e) { lastErr = e; lastText = text; lastKind = "schema"; console.error(`[viaAgent] schema failed (attempt ${attempt + 1})`, e instanceof Error ? e.message.slice(0, 300) : e); }
  }
  throw lastErr instanceof Error ? lastErr : new Error("문장 생성 실패");
}

const SYSTEM = `당신은 사주 명리 상담가다. 계산(원국·대운·세운·십신·충합)은 끝났고 당신은 풀이 글만 쓴다. 입력: person(일간 dayMaster, pillars 원국 네 기둥과 십신, elements 오행 개수, daeun 대운 목록), dream(꿈), goalYear, sections(구간: 대운 간지, stemGod/branchGod=대운 천간·지지의 십신, spanYears 구간 햇수, keyYear=실행하기 좋은 해, years=세운 간지와 (천간/지지) 십신), style(분량).

절대 규칙(어기면 글 전체가 버려진다)
1 설명 글(sections.body, closing, interpretation)에 숫자는 연도와 나이만. 꿈의 숫자도, 한글 수사(세 권, 스무 명, 다섯 해)도 금지. 할 일 문장(매주 ~하기, 투고, 계약 일정)도 금지. 숫자와 할 일은 endState와 todos에만 쓴다.
2 사주 근거는 데이터에 있는 것만 쓴다. 어떤 해의 십신은 years에 그 해 옆에 적힌 두 값만, 대운의 십신은 stemGod/branchGod만, 원국 십신·오행 개수는 pillars/elements를 센 값 그대로(하나를 「둘이나」「많다」고 하지 않고, 있는 것을 「없다」고 하지 않는다). 세운의 천간·지지 글자는 years의 간지에서만 가져온다. 「겹친다」「포개진다」는 세운 십신이 대운 십신과 같을 때만, 아니면 「만난다」. 다음 대운이 들어오는 해는 person.daeun의 연도를 그대로. 거센 해(특정 연도의 흉운)는 이 글에서 다루지 않는다. 별도 리포트의 몫이다. 특정 세운 연도를 「조심할 해」「흔들리는 해」로 지목하지 않는다.
3 구간 햇수는 spanYears다. 10이 아니면 그 구간 body에 「10년」을 쓰지 않는다(「남은 7년」「이 5년」).
4 같은 문형을 되풀이하지 않는다. 「이 대운이 끝날 즈음엔」「~얹혀 있어요」「~되고 싶은 사람에게」「그래서 이 해는」은 글 전체에서 각각 한 번까지. 두 구간이 같은 첫 어절로 시작하지 않는다.
5 상담가의 담백한 존댓말(~해요, ~돼요). 결정론(반드시·정해져), 따옴표·느낌표·이모지, 장면 묘사(책상·서랍·통장으로 문장 열기), 금지어(올해·내년·꾸준히·성실히·노력·꼼꼼히·신중히·섣부른·중요해요·안전해요·충분해요)는 쓰지 않는다. 호칭은 「당신」.

situation(사용자가 자유롭게 쓴 지금의 상황·지금 하고 있는 노력·꿈의 구체적 모습)은 출발점일 뿐 할 일의 전부가 아니다. endState는 거기 적힌 꿈의 구체적 모습을 도착 상태로 삼는다. seed와 첫 구간 첫 task는 이미 하고 있는 일을 한 단계 키운 형태로 쓰고, 이미 가진 것(자격·경력·저축·관계)은 전제로 삼아 되풀이 제안하지 않는다. 그러나 구간마다 tasks 가운데 최소 1~2개는 사용자가 적지 않은 「넓히는 선택지」여야 한다: 꿈 분야에서 폭을 넓히는 새 길(투자라면 지수 ETF·배당·연금계좌·부동산·소액 사업 지분·외화처럼 자산군을 넓히기, 직업이라면 자격·부업·이직·강의·사이드 프로젝트·업계 모임처럼 활동을 넓히기, 창작이라면 공모전·다른 플랫폼·협업·연재처럼 통로를 넓히기, 건강이라면 종목·검진·코치·대회처럼 수단을 넓히기)을 그 대운의 십신에 어울리게 고른다(재성 대운엔 수입원·자산 넓히기, 관성 대운엔 자격·직함·조직, 식상 대운엔 만들어 내놓기, 인성 대운엔 배움·자격, 비겁 대운엔 사람·동료·네트워크). 상황의 제약(직장·아이·지역·돈)에 맞지 않는 task(직장인에게 전업, 아이 있는 사람에게 장기 체류)는 쓰지 않는다. body에서는 상황을 사주 근거처럼 쓰지 않되, ②에서 구간당 한 번 「직장을 다니며 글을 쓰는 당신에게」처럼 숫자 없이 짚어도 된다.

goal
- endState: dream을 목표 해에 이뤄져 있을 상태 한 줄, 35자 안팎, 「~한 사람」이나 「~인 상태」로 끝낸다. dream의 숫자와 단위는 그대로 보존하고 dream에 없는 수치는 넣지 않는다. 연도·괄호·과정 서술·습관 문구 없음.
- interpretation: 두 문장. 일간과 원국 특징으로 이 사람이 어떤 기운의 사람인지, 그래서 이 꿈이 어떤 길로 열리는지. 이 문장은 body에서 되풀이하지 않는다.

sections — 구간마다 하나. 첫 구간은 지금 대운의 남은 해들, 뒤는 새 대운이 들어오는 해부터.
- title: 14자 이내, 그 대운의 기운에 기능어를 붙여(「재성이 열리는 10년」「인성으로 다지는 해」).
- body: 한 문단, 문장 수는 style.bodySentences. 이 순서로 담는다. ① 대운의 성격: 천간·지지가 일간에게 되는 십신과 원국 과다·부족과의 작용. 첫 문장부터 풀이로 들어가고 첫 문장 서두는 구간마다 바꾼다. ② 이 꿈을 가진 사람에게 이 해가 어떤 해인지. ③ 눈덩이: 앞 대운에서 길러진 기운이 이 대운에서 어떤 기운으로 바뀌는지, 기운의 언어로(사물·개수 아님). ④ 처신 두 문장: 벌일 때인지 거둘 때인지, 사람을 넓힐지 가릴지, 문서·계약·시험·이동 운을 어떻게 쓸지. ⑤ 마음가짐 한 문장, 「~마음이면」「~자세로」가 든 독립 문장. ⑥ 마지막 문장: 이 대운이 끝날 때 꿈을 향한 기운이 어떤 상태인지(서두와 동사를 구간마다 다르게).
- dream의 핵심 명사(책·글, 카페·가게, 회사, 영상·채널, 집, 나라, 몸, 엄마·아이, 부모님, 고향 등)를 모든 body와 closing에 한 번 이상 넣는다. 십신 용어는 글에서 처음 나올 때 한 번만 괄호로 짧게 뜻을 단다.
- milestone: 이 대운이 끝날 때의 나를 한 줄로. 손에 쥔 결과물·자격·자산·자리가 눈에 보이게 쓰고(「원고 60편을 완성해 출판사 세 곳에 투고를 마친 나」「지수 ETF와 배당주로 월 30만원 현금흐름을 만든 나」), 「~한 나」로 끝나는 명사구 35자 안팎. 그 구간 tasks를 전부 끝냈을 때 정확히 그 상태가 되도록 tasks와 맞물린다. todos와 같은 문장, 괄호·쉼표 나열 없음, 마지막 구간은 endState와 같은 문장.

closing — 4문장. 목표 해의 세운이 일간과 마지막 대운에 어떤 기운인지, 굴러온 기운이 어떻게 결실로 바뀌는지(기운의 체인), 그 해의 처신, 마지막은 마음가짐 한 줄. 장면 묘사로 끝내지 않는다.

todos — 구간마다 하나. 여기에만 행동과 숫자를 쓴다.
- milestone: sections와 같은 문장. 그 구간 마지막 task까지 끝난 상태를 그대로 반영한다.
- tasks: 3~5개, 각 20~28자 동사형. 모든 task에 연도 하나 또는 빈도(매일·매주·매달) 하나. 했다/안 했다로 답할 수 있어야 하고, 모호어(조금씩·점검·확인·해보기·피하기·조심·노력), 주관 수식어(무리한·적절히), 내적 상태(마음·평온), 산출물 없는 동사(알아보기·찾아보기·검토·고민·다지기)는 쓰지 않는다. task 하나에 결과 하나.
  - 첫 구간 첫 task는 seed와 글자까지 같다. 뒤 구간은 첫 task로 seed 행동에 「이어가기」를 붙여 같은 빈도로 둔다.
  - keyYear에 되돌릴 수 없는 사건(계약·신청·등록·공개·퇴사·개업·출간·매수·이주·완료) 하나. 만나기·가입·시작하기처럼 약한 사건은 쓰지 않는다. 시작형 사건(계약·신청·투고·등록)이면 1~2년 안의 결과(출간·개업·입주·합격·완료) task를 반드시 둔다(자리가 없으면 다음 구간 첫 task로). 앞 구간에서 끝낸 일을 뒤 구간에서 다시 시작하지 않는다.
  - 특정 연도를 조심하라는 보류형 task(「20XX년엔 ~보류하기」)는 쓰지 않는다. 그것은 별도 리포트에서 다룬다. tasks는 전부 전진하는 행동이다.
  - 구간이 5년 이상이면 연도가 붙은 task 사이가 3년을 넘지 않게 한다.
  - 꿈에 숫자가 있으면 단계로 쪼갠다(5명→12명→20명, 1권→2권→3권). 마지막 구간 전에 절반 이상 지점이 있고, 증가폭은 구간 길이에 비례하며, 순번 항목(첫째~다섯째 나라)은 번호마다 빠짐없이, 돈은 월 저축액·수입 근거 task를 둔다. 기간 조건(5년 유지)은 역산해 goalYear보다 그만큼 앞에 달성하고 그 뒤 해마다 유지 task를 둔다. 완성에 시간이 걸리는 꿈(매출·체류·출간)은 시작 사건을 goalYear보다 1~2년 앞에 두고 goalYear의 task는 완성 자체로 쓴다. 마지막 task는 꿈의 숫자를 직접 채우는 행동이다.

seed: 이번 주부터 할 수 있는 가장 작은 반복 행동 하나, 25자 이내. 꿈의 결과물을 직접 만드는 단위(기획안이 아니라 짧은 글 한 편).
`;


const ProseLoose = z.object({
  goal: z.object({ endState: z.string(), interpretation: z.string().default("") }),
  seed: z.string(),
  sections: z.array(z.object({ startYear: z.coerce.number(), title: z.string().default(""), body: z.string(), milestone: z.string().optional() })),
  closing: z.string().default(""),
  todos: z.array(z.object({ startYear: z.coerce.number(), milestone: z.string().optional(), tasks: z.array(z.string()).default([]) })).default([]),
});
export interface Prose {
  goal: { endState: string; interpretation: string };
  seed: string;
  sections: { startYear: number; title: string; body: string; milestone: string }[];
  closing: string;
  todos: { startYear: number; milestone: string; tasks: string[] }[];
}
/** 빠진 milestone은 sections↔todos에서 서로 채우고, todos가 통째로 없으면 sections로 뼈대를 만든다. */
function normalize(raw: z.infer<typeof ProseLoose>): Prose {
  const todos = raw.todos.length ? raw.todos : raw.sections.map((s) => ({ startYear: s.startYear, milestone: s.milestone, tasks: [] as string[] }));
  const sections = raw.sections.map((s) => ({ startYear: s.startYear, title: s.title, body: s.body, milestone: s.milestone ?? todos.find((t) => t.startYear === s.startYear)?.milestone ?? "" }));
  const todos2 = todos.map((t) => ({ startYear: t.startYear, milestone: t.milestone ?? sections.find((s) => s.startYear === t.startYear)?.milestone ?? "", tasks: t.tasks }));
  if (sections.length) sections[sections.length - 1].milestone = raw.goal.endState;
  if (todos2.length) todos2[todos2.length - 1].milestone = raw.goal.endState;
  return { goal: raw.goal, seed: raw.seed, sections, closing: raw.closing, todos: todos2 };
}
const Prose = ProseLoose.transform(normalize);
/** 모델 출력(JSON 객체)을 관대하게 받아 Prose로 정규화한다. 테스트·복구용. */
export function parseProse(x: unknown): Prose { return Prose.parse(x); }
const SHAPE = '{"goal":{"endState":string,"interpretation":string},"seed":string,"sections":[{"startYear":number,"title":string,"body":string,"milestone":string}],"closing":string,"todos":[{"startYear":number,"milestone":string,"tasks":[string]}]}';

function stepData(s: Step) {
  return {
    startYear: s.startYear, endYear: s.endYear, spanYears: s.endYear - s.startYear + 1, ages: `${s.startAge}~${s.endAge}세`, isPivot: s.isPivot,
    daeun: s.daeunKo, daeunHanja: s.daeunGanZhi, stemGod: s.stemGod, branchGod: s.branchGod, kind: s.kindWord, fit: s.fit,
    keyYear: s.keyYear, keyYearWhy: s.keyYearWhy,
    years: s.years.map((y) => `${y.year} ${y.ganZhiKo}(${y.stemGod}/${y.branchGod})`),
  };
}

/** 기계로 잴 수 있는 규칙만 검사한다. 위반 목록을 돌려주고, SOFT가 아닌 것이 있으면 한 번 다시 쓰게 한다. */
const SAJU_TERMS = /비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인|식상|재성|관성|관살|인성|비겁|일간|천간|지지|원국|대운|세운|충|합|오행|木|火|土|金|水/g;
const TODOISH = /(?:매주|매달|매일|이번 주)[^.]{0,25}(?:하기|쓰기|적기|넣기|모으기|기록하|올리기|보내기|만들기)/;
const COUNTISH = /\d+\s?(명|원|권|편|개|건|%|곳|회|시간|장|만원|억|천|백|쪽|통|부)/;
const GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"] as const;
const GROUPS: Record<string, readonly string[]> = { 식상: ["식신", "상관"], 재성: ["편재", "정재"], 관성: ["편관", "정관"], 관살: ["편관", "정관"], 인성: ["편인", "정인"], 비겁: ["비견", "겁재"] };
const KO_NUM: Record<string, number> = { 둘: 2, 셋: 3, 넷: 4, 다섯: 5 };
export function lintProse(p: Prose, plan: Plan, chart?: Chart): string[] {
  const v: string[] = [];
  const all = [p.goal.endState, p.goal.interpretation, p.seed, p.closing, ...p.sections.flatMap((s) => [s.title, s.body, s.milestone]), ...p.todos.flatMap((t) => [t.milestone, ...t.tasks])].join("\n");
  const prose = [...p.sections.map((s) => s.body), p.closing].join("\n");
  for (const w of ["반드시", "정해져", "꾸준히", "성실히", "꼼꼼히", "신중히", "섣부른", "줄기와 가지"]) if (all.includes(w)) v.push(`금지어 「${w}」 사용`);
  if (/["“”']/.test(all)) v.push("따옴표 사용");
  if (/[!！]|[\u{1F300}-\u{1FAFF}]/u.test(all)) v.push("느낌표 또는 이모지 사용");
  const years = plan.steps.map((s) => s.startYear);
  if (p.sections.length !== years.length || p.sections.some((s) => !years.includes(s.startYear))) v.push("sections의 startYear가 구간과 다름");
  if (p.todos.length !== years.length || p.todos.some((t) => !years.includes(t.startYear))) v.push("todos의 startYear가 구간과 다름");
  // 설명 글: 사주 풀이여야 하고 할 일·수치가 없어야 한다
  if (TODOISH.test(prose)) v.push(`설명 글에 할 일 문구: ${prose.match(TODOISH)?.[0]}`);
  const num = prose.match(COUNTISH) ?? prose.match(/(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|스무|서른) (?:명|권|편|개|건|곳|채|나라|만원|억|kg|킬로|점)/) ?? prose.match(/(?:두|세|네|다섯|여섯|일곱|여덟|아홉|열) 해/);
  if (num) v.push(`설명 글에 수치: ${num[0]}`);
  const endings = (prose.match(/이 대운이 끝날 (?:즈음|때쯤)엔/g) ?? []).length;
  if (endings >= 2) v.push(`틀 문구 과다 ${endings}회: 이 대운이 끝날 즈음엔`);
  for (const [re, label] of [[/얹혀 있어요/g, "얹혀 있어요"], [/그래서 이 (?:해|시기|구간)는/g, "그래서 이 해는"], [/기운이 되어야 해요|해가 되어야 해요/g, "되어야 해요"]] as const) {
    const n = (prose.match(re) ?? []).length;
    if (n >= 3) v.push(`틀 문구 과다 ${n}회: ${label}`);
    else if (n === 2) v.push(`틀 문구 반복 2회: ${label}`);
  }
  const firstWords = new Set<string>();
  for (const s of p.sections) {
    const b = s.body.trim();
    if (s.title.length > 14) v.push(`${s.startYear} title 14자 초과`);
    const sents = b.split(/(?<=[요다까]\.)\s+/).filter(Boolean);
    if (sents.length < 6) v.push(`${s.startYear} body 6문장 미만`);
    const terms = new Set(b.match(SAJU_TERMS) ?? []);
    if (terms.size < 3) v.push(`${s.startYear} 사주 용어 셋 미만`);
    if (!/마음|태도|자세/.test(b)) v.push(`${s.startYear} 마음가짐 문장 없음`);
    const must = (b.match(/해야 해요/g) ?? []).length;
    if (must > 4) v.push(`${s.startYear} 「해야 해요」 ${must}회`);
    if (/^(책상|서랍|통장|테이블|현관|카페|거실)/.test(b)) v.push(`${s.startYear} 장면 묘사로 시작`);
    const fw = b.split(/\s+/)[0] ?? "";
    if (firstWords.has(fw)) v.push(`${s.startYear} 첫 어절 중복: ${fw}`);
    firstWords.add(fw);
    if (/[()（）]/.test(s.milestone)) v.push(`${s.startYear} milestone에 괄호`);
  }
  for (const s of p.sections) {
    const step = plan.steps.find((x) => x.startYear === s.startYear);
    if (!step) continue;
    const span = step.endYear - step.startYear + 1;
    if (span !== 10 && /10년/.test(s.body)) v.push(`${s.startYear} 구간 햇수 오류: ${span}년 구간 body에 「10년」`);
    for (const m of s.body.matchAll(/(\d{4})년[^.]{0,60}겹/g)) {
      const sent = s.body.slice(Math.max(0, m.index! - 80), m.index! + m[0].length + 40).split(/(?<=\.)\s/).find((x) => x.includes(m[0])) ?? m[0];
      if (!/대운/.test(sent)) continue;
      const y = step.years.find((x) => x.year === Number(m[1]));
      if (y && y.stemGod !== step.stemGod && y.stemGod !== step.branchGod && y.branchGod !== step.stemGod && y.branchGod !== step.branchGod) v.push(`${s.startYear} ${m[1]} 세운이 대운과 겹친다는 근거 없음`);
    }
  }
  const dreamWords = plan.goalText.replace(/[()（）,.]/g, " ").split(/\s+/).map((w) => w.replace(/(에서|으로|에게|하기|되기|살기|만들기|모으기|가|이|을|를|의|에|로|은|는|과|와)$/u, "")).filter((w) => w.length >= 2 && !/^\d/.test(w));
  if (dreamWords.length) {
    for (const s of p.sections) if (!dreamWords.some((w) => s.body.includes(w))) v.push(`${s.startYear} 구간에 꿈 단어 없음(${dreamWords.join("/")})`);
    if (!dreamWords.some((w) => p.closing.includes(w))) v.push("closing에 꿈 단어 없음");
  }
  if (/[^.]*(?:손에|쥐고|들고 있|서 있|앉아 있)[^.]*\.?\s*$/.test(p.closing.trim())) v.push("closing이 장면 묘사로 끝남");
  if (/매일|매주|매달|꾸준히/.test(p.goal.endState)) v.push("endState에 습관 문구");
  const KO = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
  for (const d of plan.goalText.match(/\d+/g) ?? []) {
    const n = Number(d);
    if (!p.goal.endState.includes(d) && !(n <= 10 && p.goal.endState.includes(KO[n]))) v.push(`endState에 꿈의 숫자 ${d} 누락`);
  }
  // 세운 십신 근거: 연도가 든 문장의 십신은 그 해(천간/지지)·대운·원국의 십신 안에서만
  const pillarGods = chart ? Object.values(chart.pillars).flatMap((pl) => (pl ? [pl.stemGod, pl.branchGod] : [])).filter((g): g is NonNullable<typeof g> => !!g) : [];
  const daeunGods = chart ? chart.daeun.flatMap((d) => [d.stemGod, d.branchGod]) : [];
  for (const s of p.sections) {
    const step = plan.steps.find((x) => x.startYear === s.startYear);
    if (!step) continue;
    for (const sent of s.body.split(/(?<=\.)\s+/)) {
      const ys = [...sent.matchAll(/(\d{4})년/g)].map((m) => Number(m[1]));
      const yrs = ys.map((y) => step.years.find((x) => x.year === y)).filter(Boolean);
      if (!yrs.length) continue;
      const cand: (string | null)[] = [step.stemGod, step.branchGod, ...pillarGods, ...daeunGods, ...yrs.flatMap((y) => [y!.stemGod, y!.branchGod])];
      const allowed = new Set<string>(cand.filter((g): g is string => typeof g === "string"));
      for (const g of GODS) if (sent.includes(g) && !allowed.has(g)) v.push(`${s.startYear} ${ys[0]}년 문장에 근거 없는 십신 「${g}」`);
      if (!/대운/.test(sent) && yrs.length === 1) {
        const gz = yrs[0]!.ganZhiKo;
        for (const m of sent.matchAll(/(천간|지지) ([가-힣])/g)) {
          const expect = m[1] === "천간" ? gz[0] : gz[1];
          if (m[2] !== expect) v.push(`${s.startYear} ${ys[0]}년 ${m[1]} 글자 오류: ${m[2]} (세운 ${gz})`);
        }
      }
      for (const [grp, members] of Object.entries(GROUPS)) if (sent.includes(grp) && !members.some((m) => allowed.has(m))) v.push(`${s.startYear} ${ys[0]}년 문장에 근거 없는 십신 묶음 「${grp}」`);
    }
    // 원국 개수 과장
    if (chart) {
      const el = elementCounts(chart);
      const elMap: Record<string, number> = { 木: el.wood, 火: el.fire, 土: el.earth, 金: el.metal, 水: el.water };
      for (const m of `${s.body} ${s === p.sections[0] ? p.goal.interpretation + " " + p.closing : ""}`.matchAll(/(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인|木|火|土|金|水)(?:이|가)?\s?(둘|셋|넷|다섯)(?:이나|씩)/g)) {
        const n = KO_NUM[m[2]];
        const actual = m[1] in elMap ? elMap[m[1]] : pillarGods.filter((g) => g === m[1]).length;
        if (actual !== n) v.push(`${s.startYear} 원국 개수 과장: ${m[1]} ${n}개라 했지만 실제 ${actual}개`);
      }
      for (const m of s.body.matchAll(/(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인|木|火|土|金|水)(?:이|가)\s?(?:원국에\s?)?(?:하나도\s?|전혀\s?)?없/g)) {
        const actual = m[1] in elMap ? elMap[m[1]] : pillarGods.filter((g) => g === m[1]).length;
        if (actual > 0) v.push(`${s.startYear} 원국 오류: ${m[1]}이 없다고 했지만 실제 ${actual}개`);
      }
      for (const m of s.body.matchAll(/많은 (비겁|식상|재성|관성|인성)|(비겁|식상|재성|관성|인성)(?:이|가) 많/g)) {
        const grp = m[1] ?? m[2];
        const cnt = pillarGods.filter((g) => GROUPS[grp]?.includes(g)).length;
        if (cnt <= 1) v.push(`${s.startYear} 원국 과장: ${grp}이 많다고 했지만 실제 ${cnt}개`);
      }
    }
    // 다음 대운 시작 연도
    for (const m of s.body.matchAll(/(\d{4})년부터 (?:새로 )?(?:들어오는|시작되는|시작하는|열리는) ([가-힣]{2}) 대운/g)) {
      const y = Number(m[1]); const name = m[2];
      const st = plan.steps.find((x) => x.daeunKo === name && x.isPivot);
      const d = chart?.daeun.find((x) => ganZhiKo(x.ganZhi) === name);
      const expect = st?.startYear ?? d?.startYear;
      if (expect && expect !== y) v.push(`${s.startYear} ${name} 대운 시작 연도 오류: ${y} (실제 ${expect})`);
    }
  }
  const intro = (prose.match(/싶은 사람에게/g) ?? []).length;
  if (intro >= 3) v.push(`틀 문구 과다 ${intro}회: 싶은 사람에게`);
  else if (intro === 2) v.push("틀 문구 반복 2회: 싶은 사람에게");
  {
    const last = plan.steps[plan.steps.length - 1];
    if (last) for (const sent of p.closing.split(/(?<=\.)\s+/)) {
      const ys = [...sent.matchAll(/(\d{4})년/g)].map((m) => Number(m[1]));
      const yrs = ys.map((y) => last.years.find((x) => x.year === y)).filter(Boolean);
      if (!yrs.length) continue;
      const cand: (string | null)[] = [last.stemGod, last.branchGod, ...pillarGods, ...daeunGods, ...yrs.flatMap((y) => [y!.stemGod, y!.branchGod])];
      const allowed = new Set<string>(cand.filter((g): g is string => typeof g === "string"));
      for (const g of GODS) if (sent.includes(g) && !allowed.has(g)) v.push(`closing ${ys[0]}년 문장에 근거 없는 십신 「${g}」`);
    }
    if (chart) for (const m of `${p.goal.interpretation} ${prose}`.matchAll(/원국(?:에|의|엔|에는|에서)\s?(?:[가-힣]{0,6}\s?)?(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인|식상|재성|관성|관살|인성|비겁)(?!이 없|가 없|은 없|는 없|도 없|이 하나도|가 하나도)/g)) {
      const members = GROUPS[m[1]] ?? [m[1]];
      if (!members.some((g) => (pillarGods as string[]).includes(g))) v.push(`원국에 없는 십신 주장 「${m[1]}」`);
    }
  }
  // 「OO 대운의 X」「대운의 X」: X는 그 대운의 천간·지지 십신이어야 한다
  for (const s of p.sections) {
    const step = plan.steps.find((x) => x.startYear === s.startYear);
    if (!step) continue;
    for (const sent of s.body.split(/(?<=\.)\s+/)) {
      for (const m of sent.matchAll(/(?:([가-힣]{2}) )?대운(?:의|이|은|에서|과|와)?\s?(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)/g)) {
        const name = m[1]; const god = m[2];
        const d = name ? chart?.daeun.find((x) => ganZhiKo(x.ganZhi) === name) : undefined;
        const other = !d && name && name !== step.daeunKo && plan.steps.some((x) => x.daeunKo === name);
        const gods = d ? [d.stemGod, d.branchGod] : other ? null : [step.stemGod, step.branchGod];
        if (gods && !(gods as (string | null)[]).includes(god)) v.push(`${s.startYear} ${d ? name : step.daeunKo} 대운에 없는 십신 「${god}」`);
      }
    }
  }
  const endVerbs = (prose.match(/(?:얹혀|여물어|익어|남아) 있/g) ?? []).length;
  if (endVerbs >= 3) v.push(`틀 문구 과다 ${endVerbs}회: ~있어요 결말`);
  else if (endVerbs === 2) v.push("틀 문구 반복 2회: ~있어요 결말");
  const closingTerms = new Set(p.closing.match(SAJU_TERMS) ?? []);
  if (closingTerms.size < 2) v.push("closing 사주 용어 둘 미만");
  // 할 일 카드
  for (const t of p.todos) {
    const step = plan.steps.find((x) => x.startYear === t.startYear);
    if (t.tasks.length < 3 || t.tasks.length > 5) v.push(`${t.startYear} tasks ${t.tasks.length}개`);
    for (const a of t.tasks) {
      if (a.length > 30) v.push(`${t.startYear} task 30자 초과: ${a}`);
      for (const w of ["조금씩", "점검하기", "확인하기", "해보기", "피하기", "조심하기"]) if (a.includes(w)) v.push(`${t.startYear} task에 양·결과 없는 말: ${a}`);
    }
    if (step && step.endYear - step.startYear + 1 >= 5) {
      const ys = [...new Set([step.startYear, ...t.tasks.flatMap((a) => (a.match(/\d{4}/g) ?? []).map(Number)).filter((y) => y >= step.startYear && y <= step.endYear), step.endYear])].sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > 4) { v.push(`${t.startYear} 할 일 공백 ${ys[i - 1]}~${ys[i]}`); break; }
    }
    for (const a of t.tasks) for (const w of ["무리한", "적절히", "충분히", "되도록"]) if (a.includes(w)) v.push(`${t.startYear} task에 주관 수식어: ${a}`);
    const GUARD = /않기|않고|보류|만 받|만 하|만 지키|지키기|유지|거절|미루|옮기|없이|줄이/;
    if (step?.keyYear) {
      const ev = t.tasks.some((a) => a.includes(String(step.keyYear)) && !GUARD.test(a));
      if (!ev) v.push(`${t.startYear} keyYear ${step.keyYear}에 사건형 task 없음`);
    }
    for (const a of t.tasks) {
      if (!/\d{4}|매일|매주|매달|매년|매월|이번 주|오늘|하루|주마다|달마다|해마다|아침마다|저녁마다|주말마다/.test(a)) v.push(`${t.startYear} task에 연도·빈도 없음: ${a}`);
      if (a.replace(/\s/g, "").includes(t.milestone.replace(/\s/g, "").slice(0, 12)) && t.milestone.length >= 12) v.push(`${t.startYear} task가 milestone 재진술: ${a}`);
      if (/마음|평온|받아들이기|여유 갖기|믿기|견디기|자세 갖기/.test(a)) v.push(`${t.startYear} task가 내적 상태: ${a}`);
      if (/알아보기|찾아보기|검토하기|고민하기|생각해보기|재검토/.test(a)) v.push(`${t.startYear} task에 산출물 없는 동사: ${a}`);
      if (/(?:다지기|끌어올리기|키우기|높이기)$/.test(a.trim()) && !/\d/.test(a.replace(/\d{4}년/g, ""))) v.push(`${t.startYear} task에 기준 없는 동사: ${a}`);
    }
  }
  const START = /계약|신청|등록|접수|투고|제출|지원서|예약|착수/;
  const RESULT = /출간|개업|입주|합격|승인|완료|달성|취득|출시|매출|입금|결혼|이주|채용|오픈|발표|수료|졸업|등기|완주|체류|거주|발행|확정|채우기|넘기기/;
  const allTasks = p.todos.flatMap((t) => t.tasks);
  for (const step of plan.steps) {
    const todo = p.todos.find((t) => t.startYear === step.startYear);
    const ev = todo?.tasks.find((a) => a.includes(String(step.keyYear)) && START.test(a) && !RESULT.test(a));
    if (!ev) continue;
    const ok = allTasks.some((a) => RESULT.test(a) && (a.match(/\d{4}/g) ?? []).some((y) => Number(y) > step.keyYear && Number(y) <= step.keyYear + 2));
    if (!ok) v.push(`${step.startYear} keyYear ${step.keyYear} 시작형 사건 뒤 1~2년 안 결과 task 없음`);
  }
  const freq = p.seed.match(/매일|매주|매달/)?.[0];
  if (freq) for (const t of p.todos) if (!t.tasks.some((a) => a.includes(freq))) v.push(`${t.startYear} seed 빈도(${freq}) 반복 task 없음`);
  const first = p.todos.find((t) => t.startYear === years[0]);
  if (first && first.tasks[0] !== p.seed) v.push("seed와 첫 구간 첫 task가 다름");
  if (p.seed.length > 25) v.push("seed 25자 초과");
  const es = p.goal.endState;
  if (es.length > 45) v.push("endState 45자 초과");
  if (/\d{4}년|[()（）]|에서 시작해/.test(es)) v.push("endState에 연도·괄호·과정 서술");
  const known = `${plan.goalText} ${plan.situation ?? ""}`;
  for (const d of es.match(/\d+/g) ?? []) if (!known.includes(d)) { v.push(`endState에 꿈에 없는 숫자 ${d}`); break; }
  const last = p.todos[p.todos.length - 1], lastSec = p.sections[p.sections.length - 1];
  if (last && last.milestone.replace(/\s/g, "") !== es.replace(/\s/g, "")) v.push("마지막 todos.milestone이 endState와 다름");
  if (lastSec && lastSec.milestone.replace(/\s/g, "") !== es.replace(/\s/g, "")) v.push("마지막 sections.milestone이 endState와 다름");
  return v;
}
const SOFT = /title 14자|꿈 단어 없음|장면 묘사로 끝남|보류형 task 연도|seed 빈도|milestone 재진술|task 30자|「해야 해요」|seed|endState|milestone|사주 용어 둘 미만|틀 문구 반복/;
export async function writePlanProse(chart: Chart, alias: string, plan: Plan) {
  const first = await once(chart, alias, plan);
  let best = first;
  let all = lintProse(first.prose, plan, chart);
  let problems = all.filter((x) => !SOFT.test(x));
  if (all.length) console.warn("[prose:lint]", all);
  const FIX_PASSES = Number(process.env.PROSE_FIX_PASSES ?? 1); // 치명 결함이 있을 때만 1회, 생각 끔이라 1회 비용 ≈ 첫 생성과 같음
  for (let pass = 0; pass < FIX_PASSES && problems.length; pass++) {
    let next: { prose: Prose; usage: Usage };
    try { next = await once(chart, alias, plan, { previous: best.prose, problems }); }
    catch (e) { console.error("[prose:retry]", e instanceof Error ? e.message.slice(0, 200) : e); break; }
    const usage = { ...next.usage, input: next.usage.input + best.usage.input, output: next.usage.output + best.usage.output, cacheRead: next.usage.cacheRead + best.usage.cacheRead };
    const nAll = lintProse(next.prose, plan, chart);
    const nProblems = nAll.filter((x) => !SOFT.test(x));
    console.warn(`[prose:lint] fix pass ${pass + 1}`, nAll);
    if (nProblems.length <= problems.length) { best = { prose: next.prose, usage }; all = nAll; problems = nProblems; }
    else best = { ...best, usage };
  }
  return best;
}

async function once(chart: Chart, alias: string, plan: Plan, fix?: { previous: Prose; problems: string[] }) {
  const el = elementCounts(chart);
  const payload = {
    person: { alias, dayMaster: chart.dayMaster, gender: chart.input.gender,
      pillars: Object.fromEntries(Object.entries(chart.pillars).filter(([, p]) => p).map(([k, p]) => [k, { ganZhi: ganZhiKo(p!.ganZhi), hanja: p!.ganZhi, stemGod: p!.stemGod, branchGod: p!.branchGod }])),
      elements: { 木: el.wood, 火: el.fire, 土: el.earth, 金: el.metal, 水: el.water },
      daeun: chart.daeun.filter((d) => d.endYear >= plan.todayYear - 10).map((d) => ({ years: `${d.startYear}-${d.endYear}`, ganZhi: ganZhiKo(d.ganZhi), hanja: d.ganZhi, stemGod: d.stemGod, branchGod: d.branchGod })) },
    dream: plan.goalText, goalYear: plan.goalYear, situation: plan.situation ?? null, todayYear: plan.todayYear,
    style: { bodySentences: plan.steps.length >= 4 ? "6~7문장" : "6~8문장", closingSentences: 4 },
    sections: plan.steps.map(stepData),
    ...(fix ? { previousDraft: fix.previous, problems: fix.problems, note: "previousDraft를 바탕으로 problems만 고쳐 전체를 다시 출력한다." } : {}),
  };
  if (PROVIDER === "agent") {
    const { parsed, usage } = await viaAgent(SYSTEM, payload, Prose, SHAPE);
    return { prose: parsed, usage };
  }
  const res = await client().messages.parse({
    model: MODEL, max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(ProseLoose) }, // transform이 든 Prose는 JSON 스키마로 못 바꾼다 → 느슨한 스키마로 받고 normalize
    thinking: THINK_ADAPTIVE ? { type: "adaptive" } : { type: "disabled" },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });
  if (!res.parsed_output) throw new Error(`문장 생성 실패: ${res.stop_reason}`);
  return { prose: normalize(res.parsed_output), usage: usageOf(res) };
}

// 친구가 들어올 때: 확정된 계획 글을 그대로 주고 그 친구에 대한 구간별 한 문장만 쓴다.
const SYSTEM_FRIEND = `당신은 이미 완성된 계획에 한 사람(친구)에 대한 메모를 덧붙이는 작가다. 계획 글은 바꾸지 않는다.
- 대운 구간마다 한 문장. 그 구간의 계획(title, milestone, tasks)과 친구 판정(verdict, why, friendState)을 근거로, 이 친구가 눈덩이를 같이 굴려줄 사람인지 깨기 쉬운 사람인지와 그래서 무엇을 맡기거나 조심할지를 쓴다. 판정을 바꾸지 않는다.
- 18~40자. 담백한 존댓말. 사주 용어, 따옴표, 이모지, 감탄 없이. 친구 이름을 문장에 넣는다.`;
const FriendLines = z.object({ lines: z.array(z.object({ startYear: z.number(), line: z.string() })) });
const SHAPE_FRIEND = '{"lines":[{"startYear":number,"line":string}]}';

// ===== 거센 해 리포트(유료) =====
const HardReport = z.object({ years: z.array(z.object({ year: z.coerce.number(), title: z.string(), what: z.string(), care: z.string(), tasks: z.array(z.string()) })) });
export type HardReport = z.infer<typeof HardReport>;
const SHAPE_HARD = '{"years":[{"year":number,"title":string,"what":string,"care":string,"tasks":[string]}]}';
const SYSTEM_HARD = `당신은 사주 명리 상담가다. 한 사람의 꿈(dream)으로 가는 길에서 거센 해(hardYears)마다 그 해가 어떤 해인지, 무엇을 조심해야 하는지, 그때 무엇을 하면 좋은지 써 준다. 입력: person(일간 dayMaster, pillars 원국, daeun 대운 목록), dream, goalYear, years(거센 해마다 세운 간지와 (천간/지지) 십신, why=거센 이유의 종류, daeun=그 해의 대운 간지와 십신).

규칙
- years의 각 항목마다 하나씩, 빠짐없이 같은 순서로 쓴다.
- title: 14자 이내, 그 해의 성격(「사람과 돈이 새는 해」「마감이 몰려오는 해」).
- what: 2~3문장. 그 해 세운의 천간·지지가 일간과 대운에 어떤 십신·충·합이 되는지 데이터에 적힌 값만으로 풀고, 그래서 꿈과 관련해 어떤 일이 벌어지기 쉬운지 쓴다. why의 종류(겁재=사람·돈이 샘, 편관=압박·조직·마감, 일간충=정면으로 흔들림)와 어긋나지 않게. 숫자는 연도만.
- care: 1~2문장. 그 해에 특히 조심할 것(계약·보증·동업·건강·관계·큰 결정 중 해당하는 것)을 사주 근거와 함께.
- tasks: 2~3개, 각 20~28자, 「~하기」「~두기」「~않기」로 끝나는 동사형(과거형 「~했다」 금지), 그 연도가 들어가고 했다/안 했다로 답할 수 있는 행동. 보류·지키기형 하나와 그 해에 오히려 해 두면 좋은 행동 하나를 섞는다. 모호어(점검·확인·조심·노력)와 주관 수식어(무리한·적절히) 금지.
- 담백한 존댓말(~해요). 결정론·따옴표·느낌표·이모지 없음. 십신은 처음 나올 때 괄호로 짧게 뜻풀이.`;

export async function writeHardReport(chart: Chart, plan: Plan) {
  const el = elementCounts(chart);
  const years = plan.steps.flatMap((s) => s.hardYears.map((h) => {
    const y = s.years.find((x) => x.year === h.year);
    return { year: h.year, ganZhi: y?.ganZhiKo, stemGod: y?.stemGod, branchGod: y?.branchGod, why: h.why, daeun: { ganZhi: s.daeunKo, stemGod: s.stemGod, branchGod: s.branchGod }, stepStartYear: s.startYear };
  }));
  const payload = {
    person: { dayMaster: chart.dayMaster,
      pillars: Object.fromEntries(Object.entries(chart.pillars).filter(([, p]) => p).map(([k, p]) => [k, { ganZhi: ganZhiKo(p!.ganZhi), stemGod: p!.stemGod, branchGod: p!.branchGod }])),
      elements: { 木: el.wood, 火: el.fire, 土: el.earth, 金: el.metal, 水: el.water },
      daeun: chart.daeun.filter((d) => d.endYear >= plan.todayYear - 10).map((d) => ({ years: `${d.startYear}-${d.endYear}`, ganZhi: ganZhiKo(d.ganZhi), stemGod: d.stemGod, branchGod: d.branchGod })) },
    dream: plan.goalText, goalYear: plan.goalYear, years,
  };
  if (!years.length) return { report: { years: [] } as HardReport, usage: { input: 0, output: 0, cacheRead: 0, model: MODEL } as Usage };
  if (PROVIDER === "agent") {
    const { parsed, usage } = await viaAgent(SYSTEM_HARD, payload, HardReport, SHAPE_HARD);
    return { report: parsed, usage };
  }
  const res = await client().messages.parse({
    model: MODEL, max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(HardReport) },
    thinking: THINK_ADAPTIVE ? { type: "adaptive" } : { type: "disabled" },
    system: [{ type: "text", text: SYSTEM_HARD, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });
  if (!res.parsed_output) throw new Error(`거센 해 리포트 생성 실패: ${res.stop_reason}`);
  return { report: res.parsed_output, usage: usageOf(res) };
}

export async function writeFriendLines(alias: string, plan: Plan, prose: Prose, friend: FriendProfile) {
  const payload = {
    owner: alias, goal: { year: plan.goalYear, text: plan.goalText },
    sections: plan.steps.map((s) => {
      const sec = prose.sections.find((x) => x.startYear === s.startYear);
      const todo = prose.todos.find((x) => x.startYear === s.startYear);
      const m = friend.marks[s.index];
      return { startYear: s.startYear, endYear: s.endYear, kind: s.kindWord, title: sec?.title, milestone: sec?.milestone, tasks: todo?.tasks,
        friend: { alias: friend.alias, verdict: VERDICT_LABEL[m.verdict], why: m.why, friendState: m.friendState } };
    }),
  };
  if (PROVIDER === "agent") {
    const { parsed, usage } = await viaAgent(SYSTEM_FRIEND, payload, FriendLines, SHAPE_FRIEND);
    return { lines: parsed.lines, usage };
  }
  const res = await client().messages.parse({
    model: MODEL, max_tokens: 2000,
    output_config: { effort: "low", format: zodOutputFormat(FriendLines) },
    system: [{ type: "text", text: SYSTEM_FRIEND, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });
  if (!res.parsed_output) throw new Error(`친구 문장 생성 실패: ${res.stop_reason}`);
  return { lines: res.parsed_output.lines, usage: usageOf(res) };
}
