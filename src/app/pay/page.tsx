import { redirect, notFound } from "next/navigation";

// 결제는 없앴다(2026-10-10). 조심할 해는 친구 초대로 열린다. 옛 링크는 결과 페이지로 보낸다.
export default async function PayPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  if (!id) notFound();
  redirect(`/r/${id}#care`);
}
