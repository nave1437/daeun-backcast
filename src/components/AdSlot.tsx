"use client";
import { useEffect, useRef } from "react";

/** 광고 자리. 환경변수가 있을 때만 실제 광고를 그린다.
 *  - 카카오 애드핏: NEXT_PUBLIC_ADFIT_UNIT (320x100 모바일 배너 단위 ID)
 *  - 구글 애드센스: NEXT_PUBLIC_ADSENSE_CLIENT(ca-pub-…) + NEXT_PUBLIC_ADSENSE_SLOT
 *  둘 다 없으면 개발 환경에서만 점선 자리를 보여 준다. */
const ADFIT = process.env.NEXT_PUBLIC_ADFIT_UNIT;
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

declare global { interface Window { adsbygoogle?: unknown[] } }

export function AdSlot({ where }: { where: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ADFIT) {
      const el = ref.current; if (!el) return;
      el.innerHTML = `<ins class="kakao_ad_area" style="display:none;" data-ad-unit="${ADFIT}" data-ad-width="320" data-ad-height="100"></ins>`;
      const sc = document.createElement("script"); sc.async = true; sc.type = "text/javascript"; sc.src = "//t1.daumcdn.net/kas/static/ba.min.js"; sc.charset = "utf-8";
      el.appendChild(sc);
      return;
    }
    if (ADSENSE_CLIENT && ADSENSE_SLOT) {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* 차단기 */ }
    }
  }, []);
  if (ADFIT) return <div className="ad" data-where={where} aria-label="광고"><div ref={ref} /></div>;
  if (ADSENSE_CLIENT && ADSENSE_SLOT) {
    return (
      <div className="ad" data-where={where} aria-label="광고">
        <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={ADSENSE_CLIENT} data-ad-slot={ADSENSE_SLOT} data-ad-format="auto" data-full-width-responsive="true" />
      </div>
    );
  }
  if (process.env.NODE_ENV !== "development") return null;
  return <div className="ad ad-dev" data-where={where} aria-hidden>광고 자리 · {where}</div>;
}
