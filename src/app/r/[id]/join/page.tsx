import { notFound } from "next/navigation";
import { siteBase } from "@/lib/site";
import Link from "next/link";
import { loadReading } from "@/lib/flow";
import { BirthFields } from "@/components/BirthFields";
import { JoinForm } from "@/components/JoinForm";
import { ShareButton } from "@/components/ShareButton";
import { VERDICT_LABEL, LEVEL_LABEL } from "@/lib/engine/friends";
import { range } from "@/lib/ko";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = { push: "tone-good", with: "tone-good", care: "tone-care", block: "tone-bad", rival: "tone-bad", drain: "tone-warn", neutral: "tone-muted" };

/** 친구 초대 페이지. 생년월일만 넣으면 대운마다 궁합이 나온다. */
export default async function JoinPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ me?: string }> }) {
  const { id } = await params;
  const { me } = await searchParams;
  const v = await loadReading(id);
  if (!v) notFound();
  const base = await siteBase();
  const mine = me ? v.friends.find((f) => f.id === me) : null;
  const steps = [...v.plan.steps].reverse();

  if (mine) {
    // 친구가 받는 결과: 가장 점수 높은 시기 하나를 제목으로
    const best = [...mine.marks].sort((a, b) => b.score - a.score)[0];
    const bestStep = v.plan.steps[best.stepIndex];
    const span = range(bestStep.startYear, bestStep.endYear, "년");
    const positive = best.score > 0 && best.verdict !== "neutral";
    const head = positive ? `${mine.alias}, ${v.alias}의 ${span}을 ${VERDICT_LABEL[best.verdict].replace("사람", "")}사람` : `${mine.alias}, ${v.alias}의 계획에는 영향이 적은 사람`;
    return (
      <>
        <header className="start-head">
          <span className="r-label">{v.alias}의 계획에서 당신은</span>
          <h1>{head}</h1>
          <p className="cap">{v.alias}에게 {mine.relationWord}이에요. 「{v.plan.goalYear}년, {v.plan.goalText}」로 가는 길에서 대운마다 당신의 자리가 이렇게 바뀌어요.</p>
        </header>
        <section className="sheet" style={{ gap: 0, padding: 0 }}>
          {steps.map((s) => { const m = mine.marks[s.index]; return (
            <div key={s.startYear} className="join-row grid grid-cols-[118px_1fr] border-t first:border-t-0" style={{ borderColor: "var(--line)" }}>
              <div className="px-4 py-3 tabular"><b className="display">{range(s.startYear, s.endYear)}</b><div className="notice">{s.kindWord}의 대운</div></div>
              <div className="px-4 py-3 grid gap-1 text-sm"><span className={`w-fit rounded px-2 py-0.5 text-xs font-medium ${TONE[m.verdict]}`}>{m.level ? `${m.level} · ${LEVEL_LABEL[m.level]}` : VERDICT_LABEL[m.verdict]}</span><span className="cap">{m.why}</span></div>
            </div>
          ); })}
        </section>
        <section className="sec share-sec">
          <ShareButton url={`${base}/r/${id}/join?me=${mine.id}`} title={head} text={positive ? `나 ${v.alias} 계획에서 ${span} ${VERDICT_LABEL[best.verdict]}이래` : `나 ${v.alias} 계획엔 영향이 적대`} label="내 결과 공유하기" />
          <p className="cap center">{v.alias}의 화면에도 같은 표시가 붙었어요. 내 계획도 만들어 보려면 <Link className="tlink" href="/">여기서</Link> 시작해요.</p>
        </section>
      </>
    );
  }

  return (
    <>
      <header className="start-head">
        <span className="r-label">{v.alias}의 초대</span>
        <h1>{v.alias}와 당신의 궁합을 봐요</h1>
        <p className="cap">{v.alias}는 {v.plan.goalYear}년에 「{v.plan.goalText}」를 목표로 잡았어요. 생년월일만 넣으면 대운마다 {v.alias}와의 궁합이 나와요. 가입 없음, 7일 뒤 삭제.</p>
      </header>
      <section className="grid gap-2">
        <JoinForm readingId={id}><BirthFields aliasLabel="당신의 이름" /></JoinForm>
        <p className="notice center">{v.friends.length > 0 ? `이미 ${v.friends.length}명이 들어와 있어요: ${v.friends.map((f) => f.alias).join(", ")}. ` : ""}{!v.hardUnlocked ? `당신이 들어오면 ${v.alias}에게 조심할 해가 열려요.` : ""}</p>
      </section>
    </>
  );
}
