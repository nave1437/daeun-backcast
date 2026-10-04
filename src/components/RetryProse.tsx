"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { retryProse } from "@/app/actions";

/** 글이 없으면 들어오자마자 한 번 자동으로 다시 쓴다. 그래도 없으면 버튼을 보여준다. */
export function RetryProse({ id, reason = "plan" }: { id: string; reason?: "plan" | "friends" | "hard" }) {
  const [pending, start] = useTransition();
  const [tried, setTried] = useState(false);
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || reason === "friends") return;
    fired.current = true;
    start(async () => { await retryProse(id); setTried(true); });
  }, [id, reason]);
  return (
    <div className="sheet" style={{ gap: 12 }}>
      {pending ? (
        <p className="cap"><span className="pulse-dot">먹을 갈고 있습니다. 글을 쓰는 데 30초쯤 걸립니다.</span></p>
      ) : (
        <>
          <p className="cap">{reason === "plan"
            ? (tried ? "글을 쓰다가 연결이 끊겼습니다. 한 번 더 시도해 주세요." : "글을 아직 준비하지 못했습니다. 다시 시도하면 채워집니다.")
            : reason === "hard" ? "거센 해 리포트를 아직 쓰지 못했습니다. 다시 시도하면 채워집니다."
            : "친구 메모를 아직 쓰지 못한 친구가 있습니다. 다시 시도하면 빠진 메모만 채웁니다."}</p>
          <button type="button" className="btn-ghost" style={{ width: "fit-content" }} onClick={() => start(async () => { await retryProse(id); setTried(true); })}>다시 쓰기</button>
        </>
      )}
    </div>
  );
}
