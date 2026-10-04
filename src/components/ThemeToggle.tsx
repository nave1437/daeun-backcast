"use client";
// 먹지(다크, 기본) ↔ 한지(라이트). 선택은 이 브라우저에만 남는다. head의 인라인 스크립트가 먼저 data-theme을 세팅한다.
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const getSnapshot = () => document.documentElement.dataset.theme === "light";
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const light = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  function toggle() {
    const next = !light;
    try { localStorage.setItem("theme", next ? "light" : "dark"); } catch { /* 무시 */ }
    if (next) document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme;
  }
  return <button type="button" className="tlink" onClick={toggle}>{light ? "먹지로 보기" : "한지로 보기"}</button>;
}
