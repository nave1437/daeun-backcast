import Link from "next/link";
import { SAMPLE } from "@/content/sample";
import { computeChart, ageIn } from "@/lib/saju/calc";
import { judgeFriend } from "@/lib/engine/friends";
import { paragraphs } from "@/lib/text";
import { eul } from "@/lib/ko";
import { Hero } from "@/components/plan/Hero";
import { PlanBody, type Block } from "@/components/plan/PlanBody";
import { HardList } from "@/components/plan/HardList";

export const metadata = {
  title: "대운 역산 · 예시 결과",
  description: "가상의 인물로 만든 결과 예시. 대운마다 사주풀이와 할 일, 조심할 해가 어떻게 나오는지 그대로 보여 줍니다.",
};

/** 예시 결과. 가상의 인물 「예시」의 결과를 고정 데이터로 보여 준다. 광고 게이트·공유·친구 초대는 없다. */
export default function SamplePage() {
  const s = SAMPLE;
  const chart = computeChart(s.birth);
  const friend = judgeFriend(chart, computeChart(s.friend.birth), s.friend.alias, s.plan);
  const secByStart = new Map(s.prose.sections.map((x) => [x.startYear, x]));
  const todoByStart = new Map(s.prose.todos.map((t) => [t.startYear, t]));
  const goalAge = ageIn(chart, s.goalYear);
  const blocks: Block[] = s.plan.steps.map((st, i) => {
    const sec = secByStart.get(st.startYear);
    const todo = todoByStart.get(st.startYear);
    return {
      index: st.index, startYear: st.startYear, endYear: st.endYear, startAge: st.startAge, endAge: st.endAge, daeun: st.daeunGanZhi ?? null, isNow: i === 0,
      title: sec?.title, paras: sec ? paragraphs(sec.body) : [], milestone: todo?.milestone, tasks: todo?.tasks ?? [],
      badges: [{ alias: friend.alias, level: friend.marks[st.index].level }],
    };
  });
  return (
    <>
      <Hero alias={s.alias} goalYear={s.goalYear} age={goalAge} goalText={s.goalText} endState={s.prose.goal.endState} />
      <p className="read-card sample-note"><b>예시 결과예요</b>「예시」라는 가상의 인물로 만든 결과입니다. 실제 결과는 입력한 생년월일과 꿈, 지금 상황에 맞춰 새로 씁니다. 체크는 이 브라우저에만 남습니다.</p>
      {s.prose.goal.interpretation && <p className="read-card"><b>「{s.goalText}」{eul(s.goalText)} 이렇게 읽었어요</b>{s.prose.goal.interpretation}</p>}
      <PlanBody readingId="sample" blocks={blocks} goal={{ year: s.goalYear, age: goalAge, endState: s.prose.goal.endState, paras: paragraphs(s.prose.closing, 2) }} />
      <section className="sec" id="care" aria-label="조심할 해">
        <h2 className="sec-title">조심할 해</h2>
        <p className="sec-sub">목표의 해까지 가는 동안 사주상 흔들리기 쉬운 해예요. 실제 결과에서는 친구 한 명이 초대 링크로 들어오면 열려요.</p>
        <HardList readingId="sample" years={s.hardReport.years} />
      </section>
      <section className="sec" aria-label="친구와 궁합">
        <h2 className="sec-title">친구와 궁합</h2>
        <p className="sec-sub">초대 링크로 들어온 친구는 대운마다 궁합이 1~5로 표시돼요. 3이 보통이에요. 위 대운마다 붙은 「{friend.alias}」 뱃지가 그 예시예요.</p>
        <ul className="friends"><li><b>{friend.alias}</b><span>{friend.relationWord}</span></li></ul>
      </section>
      <section className="sec share-sec" aria-label="시작">
        <Link href="/start" className="btn-start"><span>내 결과 만들기</span><span className="arrow" aria-hidden>→</span></Link>
        <p className="notice center">가입 없음 · 생년월일 저장 안 함 · 결과 링크 7일</p>
      </section>
    </>
  );
}
