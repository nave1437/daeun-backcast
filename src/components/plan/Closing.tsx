import type { Prose } from "@/lib/ai/prose";

export function Closing({ goalYear, age, prose, n }: { goalYear: number; age: number; prose: Prose | null; n: number }) {
  return (
    <>
      <div className="cell-rail story-node-cell"><span data-node data-i={n - 1} data-kind="goal" /></div>
      <section className="cell-body story story-goal" aria-label="목표의 해">
        <span className="eyebrow m-eye accent">목표의 해 · <span className="num">{goalYear}</span></span>
        <div className="m-year">{goalYear}<small>· {age}세</small></div>
        {prose ? <p className="s-body prose">{prose.closing}</p> : <p className="cap">글을 아직 준비하지 못했습니다.</p>}
      </section>
    </>
  );
}
