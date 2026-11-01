import Link from "next/link";
import { SkyStars } from "@/components/Paper";
import { AdSlot } from "@/components/AdSlot";
import { GuideSheet } from "@/components/GuideSheet";
import { GUIDE } from "@/content/guide";

function Snowball() {
  // 위(목표, 금박)에서 아래(지금, 작은 먹 점)로. 지금의 작은 일이 목표까지 커지는 모습.
  return (
    <svg className="land-chart" viewBox="0 0 120 220" aria-hidden="true">
      <defs><radialGradient id="lfoil" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="var(--foil-1)" /><stop offset=".55" stopColor="var(--foil-2)" /><stop offset="1" stopColor="var(--foil-3)" /></radialGradient></defs>
      <line x1="60" y1="66" x2="60" y2="116" stroke="var(--ink)" strokeOpacity=".4" />
      <line x1="60" y1="140" x2="60" y2="190" stroke="var(--ink)" strokeOpacity=".4" />
      <circle cx="60" cy="40" r="22" fill="url(#lfoil)" />
      <circle cx="60" cy="128" r="10" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
      <circle cx="60" cy="196" r="4.5" fill="var(--ink)" />
    </svg>
  );
}

/** 랜딩: 설명 글 없이 한 화면. 설명은 「처음이라면」 시트 안에. */
export default function Landing() {
  const articles = GUIDE.map((g) => ({ title: g.title, body: g.body }));
  return (
    <>
      <section className="zone-sky land-hero">
        <SkyStars />
        <div className="land-hero-in">
          <span className="r-label">대운 역산</span>
          <h1>이루고 싶은 해에서<br />거꾸로 계획을 세워요</h1>
          <p className="sub">생년월일과 꿈, 이루고 싶은 해를 적으면 그때까지의 대운을 사주로 풀고, 대운마다 할 일을 거꾸로 짜 드려요.</p>
          <Snowball />
          <Link href="/start" className="btn-start"><span>시작하기</span><span className="arrow" aria-hidden>→</span></Link>
          <GuideSheet articles={articles} />
          <p className="notice">가입 없음 · 생년월일 저장 안 함 · 결과 링크 7일</p>
        </div>
        <div className="band-space" aria-hidden />
      </section>
      <AdSlot where="landing" />
    </>
  );
}
