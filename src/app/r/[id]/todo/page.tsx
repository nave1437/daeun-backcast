import { notFound } from "next/navigation";
import Link from "next/link";
import { loadReading } from "@/lib/flow";
import { ageIn } from "@/lib/saju/calc";
import { TodoChain, type ChainBlock } from "@/components/plan/TodoChain";
import { ViewTabs } from "@/components/ViewTabs";
import { AdSlot } from "@/components/AdSlot";

export const dynamic = "force-dynamic";

export default async function TodoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await loadReading(id);
  if (!v) notFound();
  const todoByStart = new Map((v.prose?.todos ?? []).map((t) => [t.startYear, t]));
  const blocks: ChainBlock[] = v.plan.steps.map((s) => {
    const todo = todoByStart.get(s.startYear);
    return {
      index: s.index, startYear: s.startYear, endYear: s.endYear, startAge: s.startAge, endAge: s.endAge,
      daeun: s.daeunGanZhi, isNow: s.index === 0, locked: !v.visible[s.index], milestone: todo?.milestone, tasks: todo?.tasks ?? [],
      friendLines: v.friends.map((f) => ({ alias: f.alias, line: f.marks[s.index].why || null, verdict: f.marks[s.index].verdict, level: f.marks[s.index].level })),
    };
  });
  return (
    <>
      <header className="todo-head-page">
        <span className="eyebrow">{v.alias}의 할 일 · <span className="num">{v.plan.goalYear}</span></span>
        <h1>「{v.plan.goalText}」</h1>
        <p className="cap">대운마다 「이 할 일을 다 하면 이런 내가 된다」를 먼저 보여 줍니다. 그 상태 위에서 다음 대운의 할 일이 시작됩니다. 체크는 이 브라우저에만 저장됩니다.</p>
      </header>
      <ViewTabs id={id} active="todo" />
      <TodoChain readingId={id} blocks={blocks} goalYear={v.plan.goalYear} goalAge={ageIn(v.chart, v.plan.goalYear)} endState={v.prose?.goal.endState} />
      <AdSlot where="todo" />
      {!v.paid && <p className="cap" style={{ marginTop: 24 }}>거센 해마다 조심할 것과 그때 할 일은 <Link className="tlink" href={`/pay?id=${id}`}>990원 리포트</Link>에 들어 있습니다.</p>}
    </>
  );
}
