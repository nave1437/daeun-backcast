import { notFound } from "next/navigation";
import Link from "next/link";
import { loadReading, TODAY_YEAR } from "@/lib/flow";
import { ageIn, daeunAt } from "@/lib/saju/calc";
import { Header } from "@/components/plan/Header";
import { Story } from "@/components/plan/Story";
import { Closing } from "@/components/plan/Closing";
import { Rail } from "@/components/Rail";
import { ShareRow } from "@/components/ShareRow";
import { RetryProse } from "@/components/RetryProse";
import { ViewTabs } from "@/components/ViewTabs";
import { AdSlot } from "@/components/AdSlot";

export const dynamic = "force-dynamic";
// Vercel 함수 실행 한도: retryProse. Fluid compute Hobby 최대 300초.
export const maxDuration = 300;

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await loadReading(id);
  if (!v) notFound();
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const steps = v.plan.steps;
  const n = steps.length + 1; // 노드 = 구간들(지금 포함) + 목표
  const secByStart = new Map((v.prose?.sections ?? []).map((s) => [s.startYear, s]));
  const title = `${v.plan.goalYear}년, ${v.plan.goalText}`;
  const d = daeunAt(v.chart, TODAY_YEAR);
  const progress = d ? (TODAY_YEAR - d.startYear + 1) / 10 : 0;
  // 레일 i 구간(노드 i ↔ i+1)의 눈길은 그 구간이 잠기면 비운다
  const lockedHills = steps.map((s) => !v.visible[s.index]);

  const rows: React.ReactNode[] = [];
  steps.forEach((s, i) => {
    const badges = v.friends.map((f) => ({ alias: f.alias, level: f.marks[s.index].level }));
    rows.push(<Story key={s.startYear} step={s} sec={secByStart.get(s.startYear)} isNow={i === 0} badges={badges} />);
    if (i === 0 && steps.length > 1) rows.push(<div key="ad-story" className="full"><AdSlot where="story" /></div>);
  });

  return (
    <>
      <section className="timeline" aria-label="지금부터 목표의 해까지 대운을 기점으로 굴러가는 이야기">
        <Rail n={n} lockedHills={lockedHills} progress={progress} reverse />
        <Header alias={v.alias} goalYear={v.plan.goalYear} age={ageIn(v.chart, v.plan.goalYear)} goalText={v.plan.goalText} prose={v.prose} />
        <div className="full"><ViewTabs id={id} active="story" /></div>
        {v.proseMissing && <><div className="cell-rail" /><div className="cell-body" style={{ paddingTop: 24 }}><RetryProse id={id} /></div></>}
        {rows}
        <Closing goalYear={v.plan.goalYear} age={ageIn(v.chart, v.plan.goalYear)} prose={v.prose} n={n} />
        <div className="cell-rail" />
        <div className="cell-body grid gap-4" style={{ paddingTop: 8 }}>
          <Link className="btn-cta sm" href={`/r/${id}/todo`}>할 일 보기 →</Link>
          <ShareRow url={`${base}/r/${id}`} title={title} caption={`나 ${v.plan.goalYear}년에 눈덩이 다 굴린대`} inviteUrl={`${base}/r/${id}/join`} count={v.readingCount} />
        </div>
      </section>

      <section className="section after-rail">
        <h2>이 눈덩이를 같이 굴려줄 사람은</h2>
        <p className="cap">친구에게 초대 링크를 던지면 친구는 생년월일만 넣습니다. 대운마다 그 친구와의 궁합이 1~5 뱃지로 각 해 옆에 붙습니다(3이 보통). 무료입니다.</p>
        {v.friends.length > 0 && <ul className="friend-list">{v.friends.map((f) => <li key={f.id}><b>{f.alias}</b> · {f.relationWord}</li>)}</ul>}
        <div className="flex flex-wrap gap-3" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn-ghost" href={`/r/${id}/join`}>초대 페이지 보기</Link>
          <a className="tlink" href={`/r/${id}/card`} target="_blank" rel="noreferrer">스토리 카드 열기</a>
        </div>
      </section>
      <AdSlot where="story-bottom" />
      <p className="notice after-rail" style={{ marginTop: 32 }}>사주의 경향을 읽어 옮긴 이야기입니다. 정해진 미래가 아니라 흐름을 타기 쉬운 길입니다. 이 링크와 생년월일은 만든 날로부터 7일 뒤 지워집니다.</p>
    </>
  );
}
