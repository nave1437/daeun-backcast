import { SkyStars } from "@/components/Paper";

/** 결과 맨 위. 가운데 정렬: 금박 원 → 누구의 계획 → 목표의 해 → 꿈 → 이루어진 모습 한 줄 */
export function Hero({ alias, goalYear, age, goalText, endState }: { alias: string; goalYear: number; age: number; goalText: string; endState?: string }) {
  return (
    <section className="zone-sky r-hero" aria-label="목표">
      <SkyStars />
      <div className="r-hero-in">
        <span className="orb goal" aria-hidden />
        <span className="r-label">{alias}의 계획</span>
        <div className="r-year">{goalYear}<small>{age}세</small></div>
        <h1 className="r-goal">「{goalText}」</h1>
        {endState && <p className="r-end">{endState}</p>}
      </div>
    </section>
  );
}
