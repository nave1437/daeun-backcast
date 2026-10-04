import { notFound } from "next/navigation";
import Link from "next/link";
import { loadReading } from "@/lib/flow";
import { ViewTabs } from "@/components/ViewTabs";
import { RetryProse } from "@/components/RetryProse";
import { HardList } from "@/components/plan/HardList";
import { PRICE_KRW } from "@/lib/payment";

export const dynamic = "force-dynamic";

/** 거센 해 리포트. 대운 이야기와는 별개의 유료 콘텐츠다. 결제 전에는 연도를 보여 주지 않는다. */
export default async function HardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await loadReading(id);
  if (!v) notFound();
  const count = v.plan.steps.reduce((a, s) => a + s.hardYears.length, 0);
  return (
    <>
      <header className="todo-head-page">
        <span className="eyebrow">{v.alias}의 거센 해 · <span className="num">{v.plan.goalYear}</span>까지</span>
        <h1>조심해야 할 해</h1>
        <p className="cap">목표의 해까지 가는 동안 세운이 일간이나 대운을 거세게 치는 해가 있습니다. 그 해가 어떤 해인지, 무엇을 조심해야 하는지, 그때 해 두면 좋은 일을 해마다 따로 씁니다.</p>
      </header>
      <ViewTabs id={id} active="hard" />
      {!v.paid ? (
        <section className="sheet hard-pitch">
          <div className="stamp big hanja">封</div>
          <p className="state">{v.plan.goalYear}년까지 거센 해가 <b className="accent">{count}개</b> 있습니다.</p>
          <ul className="land-needs">
            <li><b>어떤 해인지</b> 그 해의 세운이 일간·대운과 이루는 충·합·십신으로 풀이</li>
            <li><b>조심할 것</b> 계약·보증·동업·건강·관계·큰 결정 중 그 해에 해당하는 것</li>
            <li><b>그때 할 일</b> 해마다 2~3개, 체크하며 넘기기</li>
          </ul>
          <Link className="btn-cta" href={`/pay?id=${id}`}>{PRICE_KRW.toLocaleString()}원에 열기</Link>
          <p className="notice">한 번 결제, 이 링크에 7일간 저장 · 테스트 결제</p>
        </section>
      ) : v.hardReportMissing ? (
        <RetryProse id={id} reason="hard" />
      ) : (
        <HardList readingId={id} years={v.hardReport?.years ?? []} />
      )}
    </>
  );
}
