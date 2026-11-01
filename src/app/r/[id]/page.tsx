import { notFound } from "next/navigation";
import { siteBase } from "@/lib/site";
import { loadReading } from "@/lib/flow";
import { ageIn } from "@/lib/saju/calc";
import { paragraphs } from "@/lib/text";
import { eul } from "@/lib/ko";
import { Hero } from "@/components/plan/Hero";
import { PlanBody, type Block } from "@/components/plan/PlanBody";
import { CareYears } from "@/components/plan/CareYears";
import { ShareButton } from "@/components/ShareButton";
import { RetryProse } from "@/components/RetryProse";
import { RewardGate } from "@/components/RewardGate";
import { AdSlot } from "@/components/AdSlot";

export const dynamic = "force-dynamic";
// Vercel 함수 실행 한도: retryProse. Fluid compute Hobby 최대 300초.
export const maxDuration = 300;

/** 결과 한 페이지: 목표 → 한눈에 보기 → 대운마다(풀이+할 일) → 목표의 해 → 조심할 해 → 친구 → 공유 */
export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await loadReading(id);
  if (!v) notFound();
  const base = await siteBase();
  const secByStart = new Map((v.prose?.sections ?? []).map((s) => [s.startYear, s]));
  const todoByStart = new Map((v.prose?.todos ?? []).map((t) => [t.startYear, t]));
  const title = `${v.plan.goalYear}년, ${v.plan.goalText}`;
  const goalAge = ageIn(v.chart, v.plan.goalYear);
  const blocks: Block[] = v.plan.steps.map((s, i) => {
    const sec = secByStart.get(s.startYear);
    const todo = todoByStart.get(s.startYear);
    return {
      index: s.index, startYear: s.startYear, endYear: s.endYear, startAge: s.startAge, endAge: s.endAge, daeun: s.daeunGanZhi ?? null, isNow: i === 0,
      title: sec?.title, paras: sec ? paragraphs(sec.body) : [], milestone: todo?.milestone, tasks: todo?.tasks ?? [],
      badges: v.friends.map((f) => ({ alias: f.alias, level: f.marks[s.index].level })),
    };
  });
  const inviteUrl = `${base}/r/${id}/join`;

  return (
    <>
      <Hero alias={v.alias} goalYear={v.plan.goalYear} age={goalAge} goalText={v.plan.goalText} endState={v.prose?.goal.endState} />
      <RewardGate id={id} title={title}>
        {v.proseMissing && <RetryProse id={id} />}
        {v.prose?.goal.interpretation && <p className="read-card"><b>「{v.plan.goalText}」{eul(v.plan.goalText)} 이렇게 읽었어요</b>{v.prose.goal.interpretation}</p>}
        <PlanBody readingId={id} blocks={blocks} goal={{ year: v.plan.goalYear, age: goalAge, endState: v.prose?.goal.endState, paras: v.prose ? paragraphs(v.prose.closing, 2) : [] }} />
        <CareYears id={id} alias={v.alias} goalYear={v.plan.goalYear} count={v.hardCount} unlocked={v.hardUnlocked} missing={v.hardReportMissing} report={v.hardReport ?? null} inviteUrl={inviteUrl} />

        <section className="sec" id="friends" aria-label="친구와 궁합">
          <h2 className="sec-title">친구와 궁합</h2>
          <p className="sec-sub">초대 링크로 들어온 친구는 대운마다 궁합이 1~5로 표시돼요. 3이 보통이에요.</p>
          {v.friends.length > 0 ? (
            <ul className="friends">{v.friends.map((f) => <li key={f.id}><b>{f.alias}</b><span>{f.relationWord}</span></li>)}</ul>
          ) : (
            <p className="cap center">아직 들어온 친구가 없어요.</p>
          )}
          {v.hardUnlocked && <ShareButton url={inviteUrl} title={`${v.alias}의 ${v.plan.goalYear}년 계획`} text={`내 ${v.plan.goalYear}년 계획에서 우리 궁합 한번 봐 줘`} label="친구 더 초대하기" className="btn-ghost" />}
        </section>

        <section className="sec share-sec" aria-label="공유">
          <ShareButton url={`${base}/r/${id}`} title={title} text={`${v.plan.goalYear}년까지 내 계획이에요`} label="결과 공유하기" />
          <a className="tlink" href={`/r/${id}/card`} target="_blank" rel="noreferrer">이미지로 저장</a>
          <p className="notice center">사주의 흐름을 읽어 쓴 글이에요. 정해진 미래가 아니라 가기 쉬운 길이에요. 이 링크와 생년월일은 만든 날로부터 7일 뒤 지워져요.</p>
        </section>
        <AdSlot where="bottom" />
      </RewardGate>
    </>
  );
}
