import { SkyStars } from "@/components/Paper";
import type { Prose } from "@/lib/ai/prose";
import { eul } from "@/lib/ko";

export function Header({ alias, goalYear, age, goalText, prose }: { alias: string; goalYear: number; age: number; goalText: string; prose: Prose | null }) {
  return (
    <section className="zone-sky goal-zone full" aria-label="꿈">
      <SkyStars />
      <div className="goal-inner">
        <div className="goal-node-cell" aria-hidden>
          <svg width="56" height="56" viewBox="0 0 56 56" className="hero-orb">
            <defs><radialGradient id="hfoil2" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="var(--foil-1)" /><stop offset=".55" stopColor="var(--foil-2)" /><stop offset="1" stopColor="var(--foil-3)" /></radialGradient></defs>
            <circle cx="28" cy="28" r="27" fill="none" stroke="var(--sky-ink)" strokeOpacity=".35" strokeDasharray="1 5" />
            <circle cx="28" cy="28" r="18" fill="url(#hfoil2)" stroke="var(--sky-ink)" strokeWidth="2.5" />
            <path transform="translate(42 14) scale(1.1)" d="M0-6 L1.6-1.6 6 0 1.6 1.6 0 6 -1.6 1.6 -6 0 -1.6-1.6Z" fill="var(--foil-1)" />
          </svg>
        </div>
        <div>
          <span className="eyebrow m-eye accent">{alias}의 꿈 · <span className="num">{goalYear}</span></span>
          <div className="goal-year">{goalYear}<span className="goal-age">· {age}세</span></div>
          <h1 className="goal-name">「{goalText}」</h1>
          {prose?.goal.endState && <p className="goal-end">{prose.goal.endState}</p>}
          {prose?.goal.interpretation && <p className="goal-read">「{goalText}」{eul(goalText)} 이렇게 읽었습니다 — {prose.goal.interpretation}</p>}
          <p className="goal-down">아래는 지금부터 이 해까지, 대운이 들어오는 해를 기점으로 눈덩이가 굴러가는 이야기입니다</p>
        </div>
      </div>
    </section>
  );
}
