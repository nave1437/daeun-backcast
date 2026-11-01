"use client";
import { useSyncExternalStore } from "react";
import { AdSlot } from "@/components/AdSlot";
import { LEVEL_LABEL } from "@/lib/engine/friends";

export type Block = {
  index: number; startYear: number; endYear: number; startAge: number; endAge: number; daeun: string | null; isNow: boolean;
  title?: string; paras: string[]; milestone?: string; tasks: string[];
  badges: { alias: string; level: 1 | 2 | 3 | 4 | 5 }[];
};
export type Goal = { year: number; age: number; endState?: string; paras: string[] };

// 체크 상태는 localStorage(todo:<id>:<index>)에만 남는다. 서버 스냅샷은 비어 있다.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; }
function readAll(readingId: string, n: number) {
  const out: boolean[][] = [];
  for (let i = 0; i < n; i++) { try { out.push(JSON.parse(localStorage.getItem(`todo:${readingId}:${i}`) ?? "[]") as boolean[]); } catch { out.push([]); } }
  return JSON.stringify(out);
}
function write(readingId: string, key: string, v: boolean[]) { try { localStorage.setItem(`todo:${readingId}:${key}`, JSON.stringify(v)); } catch { /* 무시 */ } listeners.forEach((l) => l()); }

function Ring({ pct, size = 40 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <svg className="pring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

const yearsOf = (b: Block) => b.endYear !== b.startYear ? `${b.startYear}–${b.endYear}` : String(b.startYear);
const agesOf = (b: Block) => b.endAge !== b.startAge ? `${b.startAge}~${b.endAge}세` : `${b.startAge}세`;

/** 결과 본문: 한눈에 보기 → 대운마다(풀이 + 할 일) → 목표의 해. 탭 없이 한 흐름. */
export function PlanBody({ readingId, blocks, goal }: { readingId: string; blocks: Block[]; goal: Goal }) {
  const raw = useSyncExternalStore(subscribe, () => readAll(readingId, blocks.length), () => "[]");
  const done: boolean[][] = (() => { try { return JSON.parse(raw) as boolean[][]; } catch { return []; } })();
  const counts = blocks.map((b, i) => (done[i] ?? []).filter(Boolean).length);
  const pcts = blocks.map((b, i) => (b.tasks.length ? Math.round((counts[i] / b.tasks.length) * 100) : 0));
  const reached = blocks.map((b, i) => b.tasks.length > 0 && pcts[i] === 100);

  return (
    <>
      <section className="sec" aria-label="한눈에 보기">
        <h2 className="sec-title">한눈에 보기</h2>
        <p className="sec-sub">대운이 바뀔 때마다 어떤 내가 되어 있어야 하는지, 지금부터 거꾸로 세운 순서예요.</p>
        <ol className="ladder">
          <li className="ladder-now"><div className="row"><span className="ladder-dot now" /><span className="ladder-year">지금</span><span className="ladder-txt muted">오늘의 나</span></div></li>
          {blocks.map((b, i) => {
            // 마지막 대운이 끝나는 해 = 목표의 해. 도달 모습이 같으니 줄 하나로 합친다.
            const isGoal = i === blocks.length - 1 && b.endYear === goal.year;
            return (
              <li key={b.startYear} className={`${reached[i] ? "reached" : ""}${isGoal ? " ladder-goal" : ""}`}>
                <a href={`#y-${b.startYear}`}>
                  <span className={isGoal ? "ladder-dot goal" : `ladder-dot size-${Math.min(i + 1, 4)}${reached[i] ? " gold" : ""}`} />
                  <span className={`ladder-year${isGoal ? " accent" : ""}`}>{isGoal ? `${goal.year} · ${goal.age}세` : `${b.endYear}년 말`}</span>
                  <span className="ladder-txt">{b.milestone ?? goal.endState ?? "—"}</span>
                  {b.tasks.length > 0 && <span className="ladder-pct">{counts[i]}/{b.tasks.length}</span>}
                </a>
              </li>
            );
          })}
          {!(blocks.length > 0 && blocks[blocks.length - 1].endYear === goal.year) && (
            <li className="ladder-goal"><div className="row"><span className="ladder-dot goal" /><span className="ladder-year accent">{goal.year} · {goal.age}세</span><span className="ladder-txt">{goal.endState ?? "—"}</span></div></li>
          )}
        </ol>
      </section>

      <section className="sec plan" aria-label="대운별 풀이와 할 일">
        <h2 className="sec-title">대운마다 풀이와 할 일</h2>
        <p className="sec-sub">그 해가 사주로 어떤 해인지 먼저 읽고, 그 대운 동안 할 일을 체크해요. 체크는 이 브라우저에만 남아요.</p>
        {blocks.map((b, i) => (
          <article key={b.startYear} id={`y-${b.startYear}`} className={`blk${reached[i] ? " reached" : ""}`}>
            <span className="blk-line" aria-hidden />
            <span className={`orb s${Math.min(i + 1, 4)}${reached[i] ? " gold" : ""}`} aria-hidden />
            <p className="blk-years">{yearsOf(b)}<small>{agesOf(b)}{b.daeun ? <> · <span className="hanja">{b.daeun}</span> 대운</> : null}{b.isNow ? " · 지금" : ""}</small></p>
            {b.badges.length > 0 && (
              <ul className="badges" aria-label="이 대운의 친구 궁합">
                {b.badges.map((f) => <li key={f.alias} className={`badge l${f.level}`} title={LEVEL_LABEL[f.level]}><i>{f.level}</i>{f.alias}</li>)}
              </ul>
            )}
            {b.title && <h3 className="blk-title">{b.title}</h3>}
            {b.paras.length > 0 ? <div className="blk-body">{b.paras.map((t, k) => <p key={k}>{t}</p>)}</div> : <p className="cap">글을 아직 준비하지 못했어요.</p>}
            {(b.milestone || b.tasks.length > 0) && (
              <section className="todo" aria-label="이 대운의 할 일">
                <div className="todo-head">
                  <Ring pct={pcts[i]} />
                  <div>
                    <span className="todo-k">{reached[i] ? `${b.endYear}년 말, 이렇게 됐어요` : `${b.endYear}년 말까지 이렇게 되려면`}</span>
                    <p className="todo-state">{b.milestone}</p>
                    {b.tasks.length > 0 && <span className="todo-pct">{counts[i]}/{b.tasks.length} 완료</span>}
                  </div>
                </div>
                {b.tasks.length > 0 && (
                  <ul className="chain-tasks">
                    {b.tasks.map((t, k) => (
                      <li key={t}>
                        <label className={done[i]?.[k] ? "done" : ""}>
                          <input type="checkbox" checked={!!done[i]?.[k]} onChange={() => { const next = [...(done[i] ?? [])]; next[k] = !next[k]; write(readingId, String(b.index), next); }} />
                          <span>{t}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {i === 0 && blocks.length > 1 && <AdSlot where="story" />}
            {i === 2 && blocks.length > 3 && <AdSlot where="story-2" />}
          </article>
        ))}

        <article className="blk blk-goal" id="goal">
          <span className="blk-line" aria-hidden />
          <span className="orb goal" aria-hidden />
          <p className="blk-years">{goal.year}<small>{goal.age}세 · 목표의 해</small></p>
          {goal.paras.length > 0 ? <div className="blk-body">{goal.paras.map((t, k) => <p key={k}>{t}</p>)}</div> : <p className="cap">글을 아직 준비하지 못했어요.</p>}
        </article>
      </section>
    </>
  );
}
