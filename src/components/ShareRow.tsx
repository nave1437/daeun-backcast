"use client";
import { useState } from "react";

export function ShareRow({ url, title, caption, inviteUrl, count }: { url: string; title: string; caption: string; inviteUrl?: string; count?: number }) {
  const [toast, setToast] = useState<string | null>(null);
  function say(t: string) { setToast(t); setTimeout(() => setToast(null), 1800); }
  async function copy(text: string, msg: string) {
    try { await navigator.clipboard.writeText(text); say(msg); } catch { window.prompt("복사하세요", text); }
  }
  async function share(u: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title, text, url: u }); return; } catch { /* 취소 */ }
    }
    await copy(u, "링크를 복사했습니다");
  }
  return (
    <div className="grid gap-2">
      <div className="share-row">
        <button type="button" className="btn-cta sm" onClick={() => share(url, title)}>공유하기</button>
        <button type="button" className="btn-ghost" onClick={() => copy(`${caption} ${url}`, "한 줄을 복사했습니다")}>한 줄 복사</button>
      </div>
      {inviteUrl && <button type="button" className="btn-ghost" style={{ width: "fit-content", borderStyle: "dashed" }} onClick={() => share(inviteUrl, `${title} · 내 눈덩이 계획에서 너는 어떤 사람일까`)}>+ 친구한테 던지기</button>}
      <p className="notice">{typeof count === "number" && count >= 100 ? `지금까지 ${count.toLocaleString()}명이 눈덩이를 굴렸습니다. ` : ""}휴대폰에서는 공유하기로 카카오톡에 바로 보낼 수 있습니다.</p>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
