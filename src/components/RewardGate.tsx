"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/** 보상형 광고 게이트. 광고 한 편을 끝까지 보면 이 브라우저에서 이 결과가 열린다.
 *  - 광고 단위: NEXT_PUBLIC_GAM_REWARDED (구글 애드 매니저, 예: /21xxxxxxx/daeun_rewarded).
 *    비어 있으면 배포 환경에서는 게이트 없이 바로 보여 주고, 개발 환경에서는 구글 공식 데모 단위로 흐름을 시험한다.
 *  - 광고가 안 오면(차단기·채움 없음) 기본은 그냥 연다(저장은 안 함). NEXT_PUBLIC_REWARD_STRICT=1 이면 열지 않는다.
 *  - 구글 정책: 사용자가 무엇을 하면 무엇을 받는지 먼저 보고 스스로 누른다(opt-in). 끝까지 안 보면(granted 없음) 열지 않는다. */
const UNIT = process.env.NEXT_PUBLIC_GAM_REWARDED || (process.env.NODE_ENV === "development" ? "/22639388115/rewarded_web_example" : "");
const STRICT = process.env.NEXT_PUBLIC_REWARD_STRICT === "1";
const WAIT_MS = 8000;
const GPT_SRC = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";

type Slot = { addService: (s: unknown) => Slot };
type Ev = { slot?: Slot; isEmpty?: boolean; makeRewardedVisible?: () => void; payload?: { amount: number; type: string } | null };
type PubAds = { addEventListener: (name: string, cb: (e: Ev) => void) => PubAds };
type Googletag = {
  cmd: Array<() => void>;
  apiReady?: boolean;
  defineOutOfPageSlot: (path: string, format: unknown) => Slot | null;
  enums: { OutOfPageFormat: { REWARDED: unknown } };
  pubads: () => PubAds;
  enableServices: () => void;
  display: (slot: Slot) => void;
  destroySlots: (slots?: Slot[]) => boolean;
};
declare global { interface Window { googletag?: Googletag } }

type Phase = "loading" | "ready" | "showing" | "retry" | "nofill" | "open";

const keyOf = (id: string) => `unlock:${id}`;
const noSub = () => () => {};
const readUnlocked = (id: string) => { try { return localStorage.getItem(keyOf(id)) === "1"; } catch { return false; } };

function ensureScript() {
  if (document.querySelector(`script[src="${GPT_SRC}"]`)) return;
  const sc = document.createElement("script");
  sc.src = GPT_SRC; sc.async = true; sc.crossOrigin = "anonymous";
  document.head.appendChild(sc);
}

export function RewardGate({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  // 서버 렌더에서는 "init"(자리만), 클라이언트에서 localStorage 를 읽어 열림 여부를 정한다
  const mounted = useSyncExternalStore(noSub, () => true, () => false);
  const stored = useSyncExternalStore(noSub, () => readUnlocked(id), () => false);
  const skip = stored || !UNIT;
  const [phase, setPhase] = useState<Phase>("loading");
  const [msg, setMsg] = useState<string | null>(null);
  const slot = useRef<Slot | null>(null);
  const show = useRef<(() => void) | null>(null);
  const granted = useRef(false);
  const listening = useRef(false);
  const timer = useRef(0);

  const open = useCallback((persist: boolean) => {
    if (persist) { try { localStorage.setItem(keyOf(id), "1"); } catch { /* 저장 불가 환경 */ } }
    setPhase("open");
  }, [id]);

  const noFill = useCallback(() => {
    window.clearTimeout(timer.current);
    if (STRICT) setPhase("nofill"); else open(false);
  }, [open]);

  const dropSlot = (gt: Googletag) => {
    const s = slot.current; slot.current = null;
    if (s) gt.destroySlots([s]);
  };

  const again = () => { setPhase("loading"); setMsg(null); request(); };

  const request = useCallback(() => {
    const gt = (window.googletag = window.googletag || ({ cmd: [] } as unknown as Googletag));
    granted.current = false; show.current = null;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(noFill, WAIT_MS);
    gt.cmd.push(() => {
      dropSlot(gt);
      const s = gt.defineOutOfPageSlot(UNIT, gt.enums.OutOfPageFormat.REWARDED);
      if (!s) { noFill(); return; } // 이 기기·페이지에서 보상형을 지원하지 않음
      slot.current = s;
      s.addService(gt.pubads());
      if (!listening.current) {
        listening.current = true;
        const pa = gt.pubads();
        pa.addEventListener("rewardedSlotReady", (e) => { show.current = e.makeRewardedVisible ?? null; window.clearTimeout(timer.current); setPhase("ready"); });
        pa.addEventListener("rewardedSlotGranted", () => { granted.current = true; });
        pa.addEventListener("rewardedSlotClosed", () => {
          dropSlot(gt);
          if (granted.current) open(true);
          else { setMsg("광고를 끝까지 봐야 열려요."); setPhase("retry"); }
        });
        pa.addEventListener("slotRenderEnded", (e) => { if (e.slot === slot.current && e.isEmpty) noFill(); });
      }
      gt.enableServices();
      gt.display(s);
    });
  }, [noFill, open]);

  useEffect(() => {
    if (skip) return;
    ensureScript();
    request();
    return () => {
      window.clearTimeout(timer.current);
      const gt = window.googletag; const s = slot.current; slot.current = null;
      if (gt && s) gt.cmd.push(() => { gt.destroySlots([s]); });
    };
  }, [skip, request]);

  if (skip || phase === "open") return <>{children}</>;
  if (!mounted) return <div className="gate gate-wait" aria-busy="true" />;
  const label = phase === "ready" ? "광고 보고 결과 열기" : phase === "retry" ? "다시 광고 보기" : phase === "showing" ? "광고 재생 중" : "광고를 불러오는 중";
  return (
    <div className="gate">
      <div className="sheet gate-card" role="region" aria-labelledby="gate-title">
                <p className="state" id="gate-title">광고를 끝까지 보면 「{title}」 결과가 열려요</p>
        <p className="cap">이 브라우저에서는 한 번만 보면 돼요. 결제는 없어요.</p>
        {phase === "nofill" ? (
          <>
            <p className="cap">지금은 보여 줄 광고가 없어요. 광고 차단을 끄고 다시 시도해 주세요.</p>
            <button type="button" className="btn-ghost" onClick={again}>다시 시도</button>
          </>
        ) : (
          <button
            type="button"
            className="btn-cta"
            disabled={phase !== "ready" && phase !== "retry"}
            onClick={() => { if (phase === "retry") { again(); return; } setPhase("showing"); show.current?.(); }}
          >{label}</button>
        )}
        {msg && <p className="notice">{msg}</p>}
      </div>
    </div>
  );
}
