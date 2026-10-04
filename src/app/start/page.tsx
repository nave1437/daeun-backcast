import Link from "next/link";
import { StartFlow } from "@/components/StartFlow";
import { TODAY_YEAR } from "@/lib/flow";

// Vercel 함수 실행 한도: createReading(생성 40~90초). Fluid compute Hobby 최대 300초.
export const maxDuration = 300;

export const metadata = { title: "대운 역산 · 시작" };

export default function StartPage() {
  return (
    <>
      <header className="start-head">
        <Link href="/" className="tlink">← 소개로</Link>
        <span className="eyebrow star">대운 역산</span>
        <h1>나와 꿈을 적어 주세요</h1>
        <p className="cap">생년월일로 대운을 세고, 꿈과 이루고 싶은 해에서 거꾸로 내려옵니다. 가입 없음, 링크는 7일 뒤 사라집니다.</p>
      </header>
      <StartFlow todayYear={TODAY_YEAR} />
    </>
  );
}
