import "server-only";
import { headers } from "next/headers";

/** 공유 링크에 쓸 절대 주소. 환경변수가 없으면 요청 헤더(호스트)로 만든다 → Vercel 임시 주소·커스텀 도메인 모두 자동. */
export async function siteBase(): Promise<string> {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
