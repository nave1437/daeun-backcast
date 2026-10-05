import Link from "next/link";
import { SkyStars } from "@/components/Paper";
import { AdSlot } from "@/components/AdSlot";
import { GUIDE } from "@/content/guide";

function Snowball() {
  // 아래(지금)에서 위(목표)로 커지는 먹 원 셋. 맨 위만 금박.
  return (
    <svg className="land-chart" viewBox="0 0 120 220" aria-hidden="true">
      <defs><radialGradient id="lfoil" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="var(--foil-1)" /><stop offset=".55" stopColor="var(--foil-2)" /><stop offset="1" stopColor="var(--foil-3)" /></radialGradient></defs>
      <polygon points="42,40 78,40 70,128 50,128" fill="var(--track)" />
      <polygon points="50,128 70,128 64,196 56,196" fill="var(--track)" />
      <line x1="60" y1="66" x2="60" y2="116" stroke="var(--ink)" strokeOpacity=".5" />
      <line x1="60" y1="140" x2="60" y2="190" stroke="var(--ink)" strokeOpacity=".5" />
      <circle cx="60" cy="40" r="30" fill="var(--ink)" opacity=".06" />
      <circle cx="60" cy="40" r="22" fill="url(#lfoil)" stroke="var(--sky-ink)" strokeWidth="2.5" />
      <path transform="translate(76 24)" d="M0-5 L1.3-1.3 5 0 1.3 1.3 0 5 -1.3 1.3 -5 0 -1.3-1.3Z" fill="var(--foil-1)" />
      <circle cx="60" cy="128" r="10" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
      <circle cx="60" cy="196" r="4.5" fill="var(--ink)" />
      <circle cx="60" cy="196" r="8" fill="none" stroke="var(--ink)" strokeOpacity=".5" />
    </svg>
  );
}

export default function Landing() {
  return (
    <>
      <section className="zone-sky land-hero">
        <SkyStars />
        <div className="land-hero-in">
          <span className="eyebrow star">대운 역산</span>
          <h1>꿈을 미래에서부터<br />거꾸로 셉니다</h1>
          <p className="sub">이루고 싶은 해를 정하면, 그 해에서 지금까지 대운이 바뀌는 해마다 사주로 그 해가 어떤 해인지, 어떻게 지내야 하는지 풀어 드립니다. 할 일은 눈덩이처럼 이어집니다.</p>
          <Snowball />
          <Link href="/start" className="btn-cta">내 꿈 역산하기</Link>
          <p className="notice">가입 없음 · 생년월일은 저장하지 않음 · 결과 링크는 7일</p>
        </div>
        <div className="band-space" aria-hidden />
      </section>

      <section className="land-sec">
        <span className="eyebrow accent">역산이란</span>
        <h2>끝에서 시작해 지금으로 내려옵니다</h2>
        <ol className="land-steps">
          <li>
            <b>목표의 해에서 출발</b>
            <p>그 해에 꿈이 이뤄져 있으려면 그 전 대운이 끝날 때 무엇이 되어 있어야 하는지, 또 그 전에는, 그리고 지금은. 거꾸로 세어 대운마다 도달 지점을 정합니다.</p>
          </li>
          <li>
            <b>대운이 바뀌는 해마다 사주로 풉니다</b>
            <p>그 해 들어오는 대운의 천간·지지가 내 일간에게 어떤 기운인지, 그래서 벌일 때인지 거둘 때인지, 사람을 넓힐지 가릴지, 어떤 마음으로 지내야 하는지를 사주풀이 문장으로 씁니다.</p>
          </li>
          <li>
            <b>할 일이 눈덩이처럼 이어집니다</b>
            <p>이번 주부터 할 작은 반복이 이번 대운의 도달 지점이 되고, 그 위에서 다음 대운의 할 일이 시작됩니다. 할 일 카드에서 하나씩 체크하며 굴립니다.</p>
          </li>
        </ol>
      </section>

      <section className="land-sec">
        <span className="eyebrow accent">이렇게 나옵니다</span>
        <figure className="land-sample">
          <span className="eyebrow">기점 · 2030 · 癸未 大運이 들어오는 해</span>
          <blockquote className="prose">2030년부터 들어오는 계미 대운은 무토 일간에게 천간 계수가 정재(차곡차곡 쌓이는 결실의 기운), 지지 미토가 겁재가 되는 10년이에요. 앞 대운에서 다져진 식신의 완결력이 이 정재를 만나 글이 계약과 출판이라는 결실의 기운으로 굴러가요. 벌이는 시기이니 사람을 넓게 만나되, 겁재가 겹치는 해엔 동업이나 보증처럼 나누는 자리를 가리는 자세가 좋아요.</blockquote>
          <figcaption>
            <span className="eyebrow">이 대운의 할 일</span>
            <ul>
              <li>매주 짧은 글 한 편 쓰기 이어가기</li>
              <li>2030년 출판사 세 곳에 투고하기</li>
              <li>2031년 첫 책 출간하기</li>
            </ul>
          </figcaption>
        </figure>
      </section>

      <section className="land-sec">
        <span className="eyebrow accent">읽을거리</span>
        <h2>사주와 역산을 처음 보신다면</h2>
        <ul className="land-guide">
          {GUIDE.slice(0, 4).map((g) => <li key={g.slug}><Link href={`/guide/${g.slug}`}><b>{g.title}</b><span>{g.summary}</span></Link></li>)}
        </ul>
        <Link href="/guide" className="tlink">열 편 전부 보기 →</Link>
      </section>
      <AdSlot where="landing" />
      <section className="land-sec">
        <span className="eyebrow accent">준비물</span>
        <ul className="land-needs">
          <li><b>생년월일</b> 태어난 시간은 모르면 생략</li>
          <li><b>꿈 한 줄</b> 마음대로 적으면 됩니다</li>
          <li><b>이루고 싶은 해</b> 멀수록 대운이 여러 번 바뀝니다</li>
          <li><b>지금의 나</b> 상황, 지금 하고 있는 것, 꿈의 모습을 자유롭게</li>
        </ul>
        <Link href="/start" className="btn-cta">내 꿈 역산하기</Link>
        <p className="notice">사주의 경향을 읽어 옮긴 글입니다. 정해진 미래가 아니라 흐름을 타기 쉬운 길입니다.</p>
      </section>
    </>
  );
}
