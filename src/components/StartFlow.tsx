"use client";
import { useActionState } from "react";
import { createReading, type ActionError } from "@/app/actions";
import { BirthFields } from "./BirthFields";

export function StartFlow({ todayYear }: { todayYear: number }) {
  const [state, act, pending] = useActionState<ActionError | null, FormData>(createReading as never, null);
  return (
    <form action={act} className="sheet start-sheet" id="start-form">
      <div className="start-step"><span className="eyebrow accent">1 · 나</span></div>
      <BirthFields />
      <div className="start-step"><span className="eyebrow accent">2 · 꿈</span></div>
      <label className="field"><span className="label">꿈</span>
        <input name="goalText" id="goalText" maxLength={100} placeholder="예: 내 이름으로 책 한 권 내기" required />
        <span className="notice">마음대로 적으세요. 사주에 맞춰 확인할 수 있는 도착 지점으로 바꿔 읽습니다.</span></label>
      <label className="field"><span className="label">이루고 싶은 해</span>
        <input name="goalYear" id="goalYear" inputMode="numeric" placeholder={String(todayYear + 8)} required min={todayYear + 1} max={todayYear + 40} type="number" /></label>
      <div className="start-step"><span className="eyebrow accent">3 · 지금의 나</span></div>
      <label className="field"><span className="label">자유롭게 적어 주세요</span>
        <ul className="guide">
          <li>지금 어떤 상황인지(일, 가족, 돈, 시간)</li>
          <li>이 꿈을 위해 지금 하고 있는 것</li>
          <li>꿈이 이뤄진 모습을 구체적으로</li>
        </ul>
        <textarea name="situation" id="situation" rows={6} maxLength={700} required minLength={10}
          placeholder={"예: 회사 다니면서 퇴근 후 글을 써요. 블로그에 50편쯤 올렸고 아직 투고는 안 해봤어요. 에세이집 한 권을 서점 매대에서 보는 게 꿈이에요."} />
        <span className="notice">할 일 카드가 이 글을 바탕으로 만들어집니다. 이미 하고 있는 일은 다음 단계로 이어 주고, 지금 상황에 맞지 않는 일은 넣지 않습니다.</span></label>
      {state && !state.ok && <p className="err">{state.error}</p>}
      <button className="btn-cta" disabled={pending}>{pending ? <span className="pulse-dot">먹을 갈고 있습니다 · 1분쯤</span> : "내 꿈 역산하기"}</button>
    </form>
  );
}
