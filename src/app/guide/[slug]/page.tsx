import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDE, findGuide } from "@/content/guide";

export function generateStaticParams() { return GUIDE.map((g) => ({ slug: g.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const g = findGuide(slug);
  return g ? { title: `${g.title} · 대운 역산`, description: g.summary } : {};
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = findGuide(slug);
  if (!g) notFound();
  const i = GUIDE.indexOf(g);
  const prev = GUIDE[i - 1], next = GUIDE[i + 1];
  return (
    <article className="legal guide-article">
      <Link href="/guide" className="tlink">← 읽을거리</Link>
      <span className="eyebrow accent">{String(i + 1).padStart(2, "0")} / {String(GUIDE.length).padStart(2, "0")}</span>
      <h1>{g.title}</h1>
      <p className="cap">{g.summary}</p>
      <div className="guide-body">{g.body.map((p, k) => <p key={k}>{p}</p>)}</div>
      <nav className="guide-nav">
        {prev ? <Link href={`/guide/${prev.slug}`}>← {prev.title}</Link> : <span />}
        {next ? <Link href={`/guide/${next.slug}`}>{next.title} →</Link> : <Link href="/start">내 꿈 역산하기 →</Link>}
      </nav>
    </article>
  );
}
