import type { MetadataRoute } from "next";
import { GUIDE } from "@/content/guide";
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nave.io.kr";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/start`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/guide`, changeFrequency: "monthly", priority: 0.7 },
    ...GUIDE.map((g) => ({ url: `${BASE}/guide/${g.slug}`, changeFrequency: "yearly" as const, priority: 0.6 })),
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
