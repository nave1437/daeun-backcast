import Link from "next/link";
import { notFound } from "next/navigation";
import { payAction } from "@/app/actions";
import { PRICE_KRW, PAYMENT_MODE } from "@/lib/payment";
import { ActionButton } from "@/components/ActionButton";

// Vercel 함수 실행 한도: payAction(리포트 생성). Fluid compute Hobby 최대 300초.
export const maxDuration = 300;

export default async function PayPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  if (!id) notFound();
  return (
    <>
      <header className="grid gap-3" style={{ paddingTop: 48 }}>
        <span className="eyebrow">결제</span>
        <h1>거센 해 리포트</h1>
        <p className="cap">대운 이야기와 할 일, 친구 궁합은 무료입니다. 이 리포트는 목표의 해까지 거센 해마다 그 해가 사주로 어떤 해인지, 무엇을 조심해야 하는지, 그때 해 두면 좋은 일을 따로 써 드립니다. 결제 직후 1분 안에 거센 해 탭에 채워집니다. 링크는 만든 날로부터 7일 뒤 사라집니다.</p>
      </header>
      <section className="sheet">
        <dl className="tgrid" style={{ margin: 0 }}>
          <dt>상품</dt><dd>거센 해 리포트 · 해마다 풀이와 조심할 것, 그때 할 일</dd>
          <dt>금액</dt><dd>{PRICE_KRW.toLocaleString()}원 (부가세 포함)</dd>
          <dt>환불</dt><dd>디지털 콘텐츠 특성상 열람 후 환불이 어렵습니다. 리포트가 생성되지 않으면 전액 환불합니다.</dd>
        </dl>
        {PAYMENT_MODE === "mock" ? (
          <ActionButton action={payAction.bind(null, id)} label="990원 결제하기 (테스트 모드)" pendingLabel="리포트를 쓰는 중" className="btn-cta" />
        ) : (
          <p className="err">실결제 모드는 아직 연결되지 않았어요. src/lib/payment.ts의 안내대로 토스페이먼츠를 붙이세요.</p>
        )}
        <Link className="tlink" href={`/r/${id}/hard`}>돌아가기</Link>
      </section>
    </>
  );
}
