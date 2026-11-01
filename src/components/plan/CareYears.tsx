import type { HardReport } from "@/lib/ai/prose";
import { HardList } from "@/components/plan/HardList";
import { RetryProse } from "@/components/RetryProse";
import { ShareButton } from "@/components/ShareButton";

/** 조심할 해. 대운 풀이와 별개의 내용. 친구 한 명이 초대 링크로 들어오면 열린다. */
export function CareYears({ id, alias, goalYear, count, unlocked, missing, report, inviteUrl }: {
  id: string; alias: string; goalYear: number; count: number; unlocked: boolean; missing: boolean; report: HardReport | null; inviteUrl: string;
}) {
  return (
    <section className="sec" id="care" aria-label="조심할 해">
      <h2 className="sec-title">조심할 해</h2>
      <p className="sec-sub">목표의 해까지 가는 동안 사주상 흔들리기 쉬운 해예요. 어떤 해인지, 무엇을 조심할지, 그해 할 일을 따로 써요.</p>
      {!unlocked ? (
        <div className="lock-card">
          <p className="n">{goalYear}년까지 {count}개</p>
          <p>친구 한 명이 초대 링크로 생년월일을 넣으면 열려요. 친구에게는 당신과의 궁합이, 당신에게는 조심할 해가 보여요.</p>
          <ShareButton url={inviteUrl} title={`${alias}의 ${goalYear}년 계획`} text={`내 ${goalYear}년 계획에서 우리 궁합 한번 봐 줘`} label="친구 초대하기" className="btn-cta sm" />
          <p className="notice">결제 없음 · 친구의 생년월일도 7일 뒤 함께 지워져요</p>
        </div>
      ) : missing ? (
        <RetryProse id={id} reason="hard" />
      ) : (
        <HardList readingId={id} years={report?.years ?? []} />
      )}
    </section>
  );
}
