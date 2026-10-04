"use client";
import { useSyncExternalStore } from "react";
import { VERDICT_LABEL } from "@/lib/engine/friends";

type FL = { alias: string; line: string | null; verdict: string };

// localStorage를 외부 스토어로 읽는다(서버 스냅샷은 빈 배열). 체크는 이 브라우저에만 남는다.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; }
function read(key: string) { try { return localStorage.getItem(key) ?? "[]"; } catch { return "[]"; } }
function write(key: string, v: boolean[]) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 무시 */ } listeners.forEach((l) => l()); }

export function TodoCard({ readingId, stepIndex, label, daeun, milestone, tasks, locked, friendLines }: {
  readingId: string; stepIndex: number; label: string; daeun: string | null; milestone?: string; tasks: string[]; locked: boolean; friendLines: FL[];
}) {
  const key = `todo:${readingId}:${stepIndex}`;
  const raw = useSyncExternalStore(subscribe, () => read(key), () => "[]");
  const done: boolean[] = (() => { try { return JSON.parse(raw) as boolean[]; } catch { return []; } })();
  function toggle(i: number) { const next = [...done]; next[i] = !next[i]; write(key, next); }
  return (
    <section className="todo-card">
      <div className="todo-head">
        <span className="eyebrow">{label}{daeun ? <> · <span className="hanja">{daeun} 大運</span></> : null}</span>
        {milestone && !locked && <p className="todo-milestone">{milestone}</p>}
      </div>
      {locked ? (
        <div className="seal-strip" aria-label="봉인된 할 일"><div className="bar" style={{ width: "70%" }} /><div className="bar" style={{ width: "55%" }} /><div className="bar" style={{ width: "62%" }} /><div className="meta"><span>봉인 · 도달 지점과 할 일</span></div></div>
      ) : (
        <ul className="todo-list">
          {tasks.map((t, i) => (
            <li key={t}>
              <label className={done[i] ? "done" : ""}>
                <input type="checkbox" checked={!!done[i]} onChange={() => toggle(i)} />
                <span>{t}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {!locked && friendLines.length > 0 && (
        <div className="todo-friends">
          {friendLines.map((f) => <p key={f.alias}><b>{f.alias}</b> <span className="muted">{VERDICT_LABEL[f.verdict as keyof typeof VERDICT_LABEL]}</span>{f.line ? ` · ${f.line}` : ""}</p>)}
        </div>
      )}
    </section>
  );
}
