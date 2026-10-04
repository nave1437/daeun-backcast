"use client";
import { useSyncExternalStore } from "react";
import { VERDICT_LABEL, LEVEL_LABEL } from "@/lib/engine/friends";

export type ChainBlock = {
  index: number; startYear: number; endYear: number; startAge: number; endAge: number;
  daeun: string | null; isNow: boolean; locked: boolean; milestone?: string; tasks: string[];
  friendLines: { alias: string; line: string | null; verdict: string; level?: number }[];
};

// 체크 상태는 localStorage(todo:<id>:<index>)에만 남는다. 서버 스냅샷은 비어 있다.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; }
function readAll(readingId: string, n: number) {
  const out: boolean[][] = [];
  for (let i = 0; i < n; i++) { try { out.push(JSON.parse(localStorage.getItem(`todo:${readingId}:${i}`) ?? "[]") as boolean[]); } catch { out.push([]); } }
  return JSON.stringify(out);
}
function write(readingId: string, key: string, v: boolean[]) { try { localStorage.setItem(`todo:${readingId}:${key}`, JSON.stringify(v)); } catch { /* 무시 */ } listeners.forEach((l) => l()); }

function Ring({ pct, size = 44 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <svg className="pring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

export function TodoChain({ readingId, blocks, goalYear, goalAge, endState }: {
  readingId: string; blocks: ChainBlock[]; goalYear: number; goalAge: number; endState?: string;
}) {
  const raw = useSyncExternalStore(subscribe, () => readAll(readingId, blocks.length), () => "[]");
  const done: boolean[][] = (() => { try { return JSON.parse(raw) as boolean[][]; } catch { return []; } })();
  const counts = blocks.map((b, i) => (done[i] ?? []).filter(Boolean).length);
  const pcts = blocks.map((b, i) => (b.tasks.length ? Math.round((counts[i] / b.tasks.length) * 100) : 0));
  const reached = blocks.map((b, i) => !b.locked && b.tasks.length > 0 && pcts[i] === 100);
  return (
    <>
      {/* 한눈에 보는 사다리: 지금 → 각 대운이 끝날 때의 나 → 목표 */}
      <ol className="ladder" aria-label="대운마다 도달하는 상태">
        <li className="ladder-now"><div className="row"><span className="ladder-dot now" /><span className="ladder-year">지금</span><span className="ladder-txt muted">오늘의 나</span></div></li>
        {blocks.map((b, i) => (
          <li key={b.startYear} className={reached[i] ? "reached" : ""}>
            <a href={`#step-${b.index}`}>
              <span className={`ladder-dot size-${Math.min(i + 1, 4)}${reached[i] ? " gold" : ""}`} />
              <span className="ladder-year">{b.endYear}년 말</span>
              <span className="ladder-txt">{b.locked ? <i className="muted">봉인된 대운</i> : b.milestone ?? "—"}</span>
              {!b.locked && b.tasks.length > 0 && <span className="ladder-pct">{counts[i]}/{b.tasks.length}</span>}
            </a>
          </li>
        ))}
        <li className="ladder-goal"><div className="row"><span className="ladder-dot goal" /><span className="ladder-year accent">{goalYear} · {goalAge}세</span><span className="ladder-txt">{endState ?? "—"}</span></div></li>
      </ol>

      <section className="chain2" aria-label="대운별 상태와 할 일">
        {blocks.map((b, i) => (
          <article key={b.startYear} id={`step-${b.index}`} className={`step${b.locked ? " locked" : ""}${reached[i] ? " reached" : ""}`}>
            <span className="eyebrow">{b.isNow ? "지금" : "기점"} · <span className="num">{b.startYear}</span>{b.endYear !== b.startYear ? `–${b.endYear}` : ""} · {b.startAge}{b.endAge !== b.startAge ? `–${b.endAge}` : ""}세{b.daeun ? <> · <span className="hanja">{b.daeun} 大運</span></> : null}</span>
            {b.locked ? (
              <div className="seal-strip" aria-label="봉인된 할 일"><div className="bar" style={{ width: "70%" }} /><div className="bar" style={{ width: "55%" }} /><div className="meta"><span>봉인 · 이 대운이 끝날 때의 나와 할 일</span></div></div>
            ) : (
              <>
                <div className="state-card">
                  <Ring pct={pcts[i]} />
                  <div className="state-txt">
                    <span className="eyebrow">{reached[i] ? `${b.endYear}년 말, 이렇게 됐어요` : `${b.endYear}년 말, 아래를 다 하면`}</span>
                    <p className="state">{b.milestone}</p>
                    <span className="state-pct">{counts[i]}/{b.tasks.length} 완료{reached[i] ? " · 도달" : ""}</span>
                  </div>
                </div>
                <div className="then"><span>그러려면</span></div>
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
                {b.friendLines.length > 0 && (
                  <div className="todo-friends">
                    {b.friendLines.map((f) => <p key={f.alias}><b>{f.alias}</b> {f.level ? <span className={`badge l${f.level}`}><i>{f.level}</i>{LEVEL_LABEL[f.level as 1 | 2 | 3 | 4 | 5]}</span> : <span className="muted">{VERDICT_LABEL[f.verdict as keyof typeof VERDICT_LABEL]}</span>}{f.line ? ` · ${f.line}` : ""}</p>)}
                  </div>
                )}
              </>
            )}
            {i < blocks.length - 1 && <div className="handoff"><span>{reached[i] ? "이 상태 위에서 다음 대운이 시작돼요" : "이 상태가 되면 다음 대운의 할 일이 시작돼요"}</span></div>}
          </article>
        ))}
        <article className="step step-goal">
          <span className="eyebrow accent">목표의 해 · <span className="num">{goalYear}</span> · {goalAge}세</span>
          <div className="state-card gold">
            <span className="goal-orb" aria-hidden />
            <div className="state-txt">
              <span className="eyebrow">그렇게 굴러가 닿는 곳</span>
              <p className="state">{endState ?? "글을 아직 준비하지 못했습니다."}</p>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
