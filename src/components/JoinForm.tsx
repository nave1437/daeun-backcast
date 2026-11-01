"use client";
import { useActionState } from "react";
import { addFriend, type ActionError } from "@/app/actions";

export function JoinForm({ readingId, children }: { readingId: string; children: React.ReactNode }) {
  const [state, act, pending] = useActionState<ActionError | null, FormData>(addFriend.bind(null, readingId) as never, null);
  return (
    <form action={act} className="sheet">
      {children}
      {state && !state.ok && <p className="err">{state.error}</p>}
      <button className="btn-cta" disabled={pending}>{pending ? <span className="pulse-dot">계산하고 있어요</span> : "궁합 보기"}</button>
    </form>
  );
}
