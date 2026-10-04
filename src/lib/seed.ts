// 결정적 난수(mulberry32). 별·눈가루 좌표는 서버에서 1회 생성해야 hydration이 어긋나지 않는다.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** radial-gradient 타일 문자열. size px 정사각형 안에 count개의 점 */
export function dotTile(seed: number, size: number, count: number, px: number, color: string): string {
  const r = mulberry32(seed);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(r() * size);
    const y = Math.round(r() * size);
    parts.push(`radial-gradient(${px}px ${px}px at ${x}px ${y}px, ${color} 50%, transparent 60%)`);
  }
  return parts.join(",");
}
