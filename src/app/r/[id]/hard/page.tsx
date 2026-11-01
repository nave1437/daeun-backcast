import { redirect } from "next/navigation";
// 예전 링크 호환: 조심할 해는 결과 한 페이지 안에 있다.
export default async function HardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/r/${id}#care`);
}
