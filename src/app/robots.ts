import type { MetadataRoute } from "next";
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nave.io.kr";
export default function robots(): MetadataRoute.Robots {
  // 개인 결과 링크(/r/…)는 검색에 안 올린다
  return { rules: [{ userAgent: "*", allow: ["/", "/start", "/guide", "/privacy"], disallow: ["/r/", "/pay"] }], sitemap: `${BASE}/sitemap.xml` };
}
