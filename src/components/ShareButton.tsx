"use client";
import { useState } from "react";

/** 공유 버튼 하나. 휴대폰은 공유 시트(카카오톡 등), 아니면 링크 복사. */
export function ShareButton({ url, title, text, label, className = "btn-cta" }: { url: string; title: string; text?: string; label: string; className?: string }) {
  const [toast, setToast] = useState<string | null>(null);
  function say(t: string) { setToast(t); setTimeout(() => setToast(null), 1800); }
  async function go() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch { /* 취소 */ }
    }
    try { await navigator.clipboard.writeText(url); say("링크를 복사했어요"); } catch { window.prompt("링크를 복사하세요", url); }
  }
  return (
    <>
      <button type="button" className={className} onClick={go}>{label}</button>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
