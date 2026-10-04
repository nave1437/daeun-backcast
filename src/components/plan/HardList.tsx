"use client";
import { useSyncExternalStore } from "react";
import type { HardReport } from "@/lib/ai/prose";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; }
function read(key: string) { try { return localStorage.getItem(key) ?? "{}"; } catch { return "{}"; } }
function write(key: string, v: Record<string, boolean>) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 무시 */ } listeners.forEach((l) => l()); }

/** 결제 후 보이는 거센 해 목록. 해마다 풀이·조심할 것·할 일(체크 가능). */
export function HardList({ readingId, years }: { readingId: string; years: HardReport["years"] }) {
  const key = `hard:${readingId}`;
  const raw = useSyncExternalStore(subscribe, () => read(key), () => "{}");
  const done: Record<string, boolean> = (() => { try { return JSON.parse(raw) as Record<string, boolean>; } catch { return {}; } })();
  if (!years.length) return <p className="cap" style={{ marginTop: 24 }}>목표의 해까지 거센 해가 없습니다. 흐름이 순한 편이에요.</p>;
  return (
    <section className="hard-list">
      {years.map((y) => (
        <article key={y.year} className="hard-year">
          <div className="hard-head"><b className="num">{y.year}</b><span>{y.title}</span></div>
          <div className="hard-body">
            <p>{y.what}</p>
            <p className="hard-care"><span className="eyebrow">조심할 것</span>{y.care}</p>
          </div>
          <ul className="chain-tasks">
            {y.tasks.map((t, k) => { const id = `${y.year}:${k}`; return (
              <li key={id}><label className={done[id] ? "done" : ""}>
                <input type="checkbox" checked={!!done[id]} onChange={() => write(key, { ...done, [id]: !done[id] })} />
                <span>{t}</span></label></li>
            ); })}
          </ul>
        </article>
      ))}
    </section>
  );
}
