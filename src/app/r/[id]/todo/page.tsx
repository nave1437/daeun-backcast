import { redirect } from "next/navigation";
// 예전 링크 호환: 할 일은 결과 한 페이지 안에 있다.
export default async function TodoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/r/${id}`);
}
