// 종이 레이어 4겹(먹점·별자리와 금박·섬유·그레인). 전부 고정 배치, 페인트 1회, 애니메이션 없음.
import { dotTile, mulberry32 } from "@/lib/seed";

const FIBER = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='f' x='0' y='0' width='100%25' height='100%25'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.35' numOctaves='2' stitchTiles='stitch' seed='11'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0 0 .3 .45'/></feComponentTransfer></filter><rect width='320' height='320' filter='url(%23f)'/></svg>")`;
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='g' x='0' y='0' width='100%25' height='100%25'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch' seed='3'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0 0 .3 .45'/></feComponentTransfer></filter><rect width='240' height='240' filter='url(%23g)'/></svg>")`;

function constellation(seed: number, xMin: number, xMax: number, yMin: number, yMax: number, count: number) {
  const r = mulberry32(seed);
  const pts = Array.from({ length: count }, () => ({ x: xMin + r() * (xMax - xMin), y: yMin + r() * (yMax - yMin) }));
  return pts;
}

export function Paper() {
  const dotsA = dotTile(7, 260, 7, 1.5, "var(--dot-a)");
  const dotsB = dotTile(8, 390, 7, 2, "var(--dot-b)");
  const dotsC = dotTile(9, 520, 6, 2.5, "var(--dot-c)");
  const left = constellation(11, 20, 140, 80, 820, 6);
  const right = constellation(12, 20, 140, 120, 860, 5);
  const flakes = (() => { const r = mulberry32(13); return Array.from({ length: 4 }, () => ({ x: 20 + r() * 100, y: 60 + r() * 800, s: 3 + r() * 4, a: r() * 360 })); })();
  return (
    <>
      <div className="dots" aria-hidden style={{ backgroundImage: `${dotsA},${dotsB},${dotsC}` }} />
      <Chart pts={left} side="l" flakes={[flakes[0], flakes[1]]} />
      <Chart pts={right} side="r" flakes={[flakes[2], flakes[3]]} />
      <div className="fiber" aria-hidden style={{ backgroundImage: FIBER }} />
      <div className="grain" aria-hidden style={{ backgroundImage: GRAIN }} />
    </>
  );
}

type Pt = { x: number; y: number };
type Flake = { x: number; y: number; s: number; a: number };
const poly = (p: Pt[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

function Chart({ pts, side, flakes }: { pts: Pt[]; side: "l" | "r"; flakes: Flake[] }) {
  return (
    <svg className={`chart chart-${side}`} aria-hidden viewBox="0 0 160 900" preserveAspectRatio="xMidYMin meet">
      <defs>
        {flakes.map((f, i) => (
          <linearGradient key={i} id={`foil${side}${i}`} gradientTransform={`rotate(${f.a.toFixed(0)})`}>
            <stop offset="0" stopColor="var(--foil-1)" /><stop offset=".5" stopColor="var(--foil-2)" /><stop offset="1" stopColor="var(--foil-3)" />
          </linearGradient>
        ))}
      </defs>
      <polyline points={poly(pts)} fill="none" stroke="var(--ink)" strokeOpacity=".12" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="var(--ink)" opacity=".5" />)}
      {flakes.map((f, i) => (
        <polygon key={i} fill={`url(#foil${side}${i})`} opacity=".8"
          points={`${f.x},${f.y - f.s} ${f.x + f.s * 0.9},${f.y - f.s * 0.2} ${f.x + f.s * 0.5},${f.y + f.s} ${f.x - f.s * 0.7},${f.y + f.s * 0.6} ${f.x - f.s},${f.y - f.s * 0.3}`} />
      ))}
    </svg>
  );
}

/** 하늘 존 안에서 쓰는 별 레이어(크림 별, 더 촘촘) + 반짝임 */
export function SkyStars() {
  const a = dotTile(21, 260, 11, 1.5, "var(--dot-a)");
  const b = dotTile(22, 390, 11, 2, "var(--dot-b)");
  const c = dotTile(23, 520, 10, 2.5, "var(--dot-c)");
  const tw = dotTile(24, 700, 6, 1.5, "var(--sky-ink)");
  return (
    <>
      <div className="dots-sky" aria-hidden style={{ backgroundImage: `${a},${b},${c}` }} />
      <div className="twinkle" aria-hidden style={{ backgroundImage: tw }} />
      <div className="fiber-sky" aria-hidden style={{ backgroundImage: FIBER }} />
    </>
  );
}
