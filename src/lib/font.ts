// 공유 카드(next/og) 렌더용 폰트. Google Fonts에서 받아 메모리에 캐시한다. satori는 woff2를 못 읽어 옛 UA로 요청한다.
type F = { name: string; data: ArrayBuffer; weight: 300 | 400 | 500 | 600 | 700; style: "normal" };
let cache: F[] | null = null;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36";

async function fetchFace(family: string, weight: number): Promise<ArrayBuffer> {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`, { headers: { "User-Agent": UA } }).then((r) => r.text());
  const m = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype|woff)'\)/) ?? css.match(/url\(([^)]+\.(?:ttf|otf|woff))\)/);
  if (!m) throw new Error(`폰트 URL을 찾지 못했어요: ${family} ${weight}`);
  return fetch(m[1]).then((r) => r.arrayBuffer());
}

export async function loadCardFonts(): Promise<F[]> {
  if (cache) return cache;
  const spec: [string, string, F["weight"]][] = [
    ["Hahmlet", "Hahmlet", 300], ["Hahmlet", "Hahmlet", 500], ["Hahmlet", "Hahmlet", 600],
    ["Noto Sans KR", "NotoSansKR", 400], ["Noto Sans KR", "NotoSansKR", 500],
  ];
  const faces = await Promise.all(spec.map(async ([family, name, weight]) => ({ name, data: await fetchFace(family, weight), weight, style: "normal" as const })));
  cache = faces;
  return faces;
}
