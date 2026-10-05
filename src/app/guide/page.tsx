import Link from "next/link";
import { GUIDE } from "@/content/guide";

export const metadata = { title: "대운 역산 · 읽을거리", description: "사주, 대운, 미래로부터의 역산을 쉽게 설명한 글 모음." };

export default function GuideIndex() {
  return (
    <article className="legal guide-index">
      <Link href="/" className="tlink">← 소개로</Link>
      <span className="eyebrow accent">읽을거리</span>
      <h1>사주와 역산, 열 가지 질문</h1>
      <p className="cap">서비스가 쓰는 개념을 하나씩 풀어 둔 글입니다. 순서대로 읽으면 결과 글이 더 잘 읽힙니다.</p>
      <ol className="guide-list">
        {GUIDE.map((g, i) => (
          <li key={g.slug}>
            <Link href={`/guide/${g.slug}`}>
              <span className="guide-no">{String(i + 1).padStart(2, "0")}</span>
              <span className="guide-title">{g.title}</span>
              <span className="guide-sum">{g.summary}</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link href="/start" className="btn-cta">내 꿈 역산하기</Link>
    </article>
  );
}
