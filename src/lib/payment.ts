// 결제 어댑터. mock 모드는 버튼 한 번으로 결제 완료 처리한다.
// 토스페이먼츠로 바꿀 때: 결제위젯(clientKey)으로 결제 요청 → successUrl에서 paymentKey/orderId/amount 받아
// 서버에서 https://api.tosspayments.com/v1/payments/confirm 에 secretKey로 승인 → 승인 성공 시 markPaid.
export const PRICE_KRW = 990;
export const PAYMENT_MODE = (process.env.PAYMENT_MODE ?? "mock") as "mock" | "real";
