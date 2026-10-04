import Link from "next/link";

export function SealBlock({ readingId, lockedCount, goalYear }: { readingId: string; lockedCount: number; goalYear: number }) {
  return (
    <>
      <div className="cell-rail" />
      <div className="cell-body" id="seal">
        <div className="seal-block">
          <div className="stamp big hanja">封</div>
          <div className="body">
            <span className="eyebrow">봉인 · 남은 대운 {lockedCount}개</span>
            <h2>봉인을 뜯으면 {goalYear}년까지의 대운 {lockedCount}개가 열립니다</h2>
            <p className="cap">기점마다의 설명 글과 도달 지점, 목표의 해 이야기, 할 일 카드 전체, 친구별 메모 · 한 번 결제, 이 링크에 7일간 저장</p>
            <div className="price">1,000원<small>1회 · 가입 없음</small></div>
            <Link className="btn-cta" href={`/pay?id=${readingId}`}>1,000원에 봉인 뜯기</Link>
            <p className="notice">테스트 결제 · 생년월일은 저장하지 않습니다</p>
          </div>
        </div>
      </div>
    </>
  );
}
