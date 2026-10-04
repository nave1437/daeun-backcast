import Link from "next/link";

export const metadata = { title: "대운 역산 · 개인정보처리방침" };
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "(연락처 이메일을 NEXT_PUBLIC_CONTACT_EMAIL 에 넣어 주세요)";

export default function Privacy() {
  return (
    <article className="legal">
      <Link href="/" className="tlink">← 소개로</Link>
      <h1>개인정보처리방침</h1>
      <p className="cap">대운 역산(이하 「서비스」)은 가입 없이 쓰는 서비스로, 아래 정보만 최소한으로 다룹니다.</p>
      <h2>수집하는 정보</h2>
      <ul>
        <li>생년월일·태어난 시간·성별: 사주를 계산하기 위해 입력받고, 결과 링크에 묶여 7일간 보관된 뒤 자동 삭제됩니다.</li>
        <li>별칭, 꿈, 이루고 싶은 해, 「지금의 나」 서술: 결과 글과 할 일을 만들기 위해 쓰이고 같은 기간 보관됩니다.</li>
        <li>친구 초대로 입력된 친구의 생년월일·별칭: 궁합 뱃지 계산에 쓰이고 같은 결과 링크와 함께 삭제됩니다.</li>
        <li>결제 정보: 카드 정보는 결제대행사(PG)가 처리하며 서비스는 결제 완료 여부만 저장합니다.</li>
      </ul>
      <h2>문장 생성</h2>
      <p>입력한 정보는 결과 글을 만들기 위해 Anthropic의 Claude API로 전송됩니다. 전송된 내용은 서비스 품질 개선 목적의 모델 학습에 쓰이지 않습니다.</p>
      <h2>광고와 쿠키</h2>
      <p>서비스는 운영비를 위해 광고를 게재할 수 있습니다. 광고 제공자(구글 애드센스, 카카오 애드핏)는 쿠키를 사용해 방문 기록에 따른 광고를 보여 줄 수 있으며, 브라우저 설정이나 각 제공자의 광고 설정 페이지에서 맞춤 광고를 끌 수 있습니다.</p>
      <h2>보관과 삭제</h2>
      <p>결과 링크와 거기 묶인 모든 입력은 만든 날로부터 7일 뒤 자동으로 삭제됩니다. 그 전에 삭제를 원하면 아래 연락처로 링크 주소를 보내 주세요.</p>
      <h2>연락처</h2>
      <p>{CONTACT}</p>
      <p className="notice">시행일 2026년 10월 4일</p>
    </article>
  );
}
