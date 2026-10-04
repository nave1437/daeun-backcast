"use client";
import { useActionState } from "react";
import { addFriend, type ActionError } from "@/app/actions";

export function JoinForm({ readingId, children }: { readingId: string; children: React.ReactNode }) {
  const [state, act, pending] = useActionState<ActionError | null, FormData>(addFriend.bind(null, readingId) as never, null);
  return (
    <form action={act} className="sheet">
      {children}
      {state && !state.ok && <p className="err">{state.error}</p>}
      <button className="btn-cta" disabled={pending}>{pending ? <span className="pulse-dot">먹을 갈고 있습니다</span> : "내 사주 올리기"}</button>
    </form>
  );
}
