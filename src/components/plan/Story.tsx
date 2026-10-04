import type { Step } from "@/lib/engine/plan";
import type { Prose } from "@/lib/ai/prose";
import { LEVEL_LABEL } from "@/lib/engine/friends";
import { range } from "@/lib/ko";

export type Badge = { alias: string; level: 1 | 2 | 3 | 4 | 5 };
/** 구간 하나의 설명 글. 첫 구간은 지금 대운, 그 뒤는 대운이 들어오는 해(기점)로 시작한다. */
export function Story({ step, sec, isNow, badges = [] }: { step: Step; sec?: Prose["sections"][number]; isNow: boolean; badges?: Badge[]; locked?: boolean; lockNote?: string }) {
  return (
    <>
      <div className="cell-rail story-node-cell"><span data-node data-i={step.index} data-kind={isNow ? "now" : "hill"} /></div>
      <section className={`cell-body story ${isNow ? "story-now" : ""}`} aria-label={`${step.startYear}년부터`}>
        <span className="eyebrow m-eye accent">{isNow ? "지금" : "기점"} · <span className="num">{step.startYear}</span></span>
        <div className="m-year">{step.startYear}<small>· {step.startAge}세{step.endYear !== step.startYear ? ` · ${range(step.startYear, step.endYear)}` : ""}</small></div>
        <p className="s-daeun">{step.daeunGanZhi ? <><span className="hanja">{step.daeunGanZhi} 大運</span>{isNow ? "의 남은 해들" : "이 들어오는 해"}</> : "대운 정보 없음"}</p>
        {badges.length > 0 && (
          <ul className="badges" aria-label="이 대운의 친구 궁합">
            {badges.map((b) => <li key={b.alias} className={`badge l${b.level}`} title={LEVEL_LABEL[b.level]}><i>{b.level}</i>{b.alias}</li>)}
          </ul>
        )}
        {sec && <h2 className="s-title">{sec.title}</h2>}
        {sec ? <p className="s-body prose">{sec.body}</p> : <p className="cap">글을 아직 준비하지 못했습니다.</p>}
      </section>
    </>
  );
}
