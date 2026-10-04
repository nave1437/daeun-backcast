"use client";
// 레일: 왼쪽 열에 절대배치된 SVG 하나. [data-node] 요소들의 세로 위치를 재서 먹 원·별자리 선·눈길·눈가루를 그린다.
// 아래(지금, i=0)에서 위(목표, i=n-1)로 갈수록 원이 복리로 커진다. 애니메이션은 stroke-dashoffset과 opacity뿐.
// 그리기 조건은 스크롤 위치로 직접 판단한다(IntersectionObserver는 점프·앵커 이동 때 놓친다). 한 번 그려지면 되돌리지 않는다.
import { useEffect, useRef, useState } from "react";
import { mulberry32 } from "@/lib/seed";

type Node = { i: number; x: number; y: number; r: number; w: number; kind: "now" | "hill" | "goal" };

export function Rail({ n, lockedHills, progress }: { n: number; lockedHills: boolean[]; progress: number; reverse?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [H, setH] = useState(0);
  const [W, setW] = useState(72);
  const [drawn, setDrawn] = useState<boolean[]>([]);
  const [reduce, setReduce] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const apply = () => setReduce(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const container = svg.parentElement as HTMLElement;
    const measure = () => {
      const cr = container.getBoundingClientRect();
      const w = svg.getBoundingClientRect().width || 72;
      const desktop = w >= 100;
      const r0 = desktop ? 6 : 4, rMax = desktop ? 34 : 20;
      const g = n <= 1 ? 1 : Math.pow(rMax / r0, 1 / (n - 1));
      const els = Array.from(container.querySelectorAll<HTMLElement>("[data-node]"));
      const list: Node[] = els.map((el) => {
        const i = Number(el.dataset.i);
        const rect = el.getBoundingClientRect();
        const y = rect.top - cr.top + rect.height / 2 + 4; // eyebrow 글자 중심에 맞춘 보정
        // 목표 원은 모바일에서 궤도가 화면 밖으로 나가지 않게 살짝 오른쪽으로
        const sway = i === n - 1 ? (desktop ? 0 : 6) : i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.round(w * 0.14);
        return { i, x: w / 2 + sway, y, r: r0 * Math.pow(g, i), w: Math.min(4, 1 + 0.55 * i), kind: (el.dataset.kind as Node["kind"]) ?? "hill" };
      }).sort((a, b) => a.i - b.i);
      setNodes(list); setH(Math.round(cr.height)); setW(w);
    };
    let raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    document.fonts?.ready.then(schedule);
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(container);
    container.addEventListener("toggle", schedule, true);
    window.addEventListener("resize", schedule);
    return () => { ro.disconnect(); container.removeEventListener("toggle", schedule, true); window.removeEventListener("resize", schedule); cancelAnimationFrame(raf); };
  }, [n]);

  // 노드 행이 뷰포트 아래 10% 선보다 위에 오면(= 이미 지나갔거나 보이면) 그린다.
  useEffect(() => {
    if (reduce || !nodes.length) return;
    const svg = svgRef.current;
    if (!svg) return;
    const container = svg.parentElement as HTMLElement;
    let raf = 0;
    const check = () => {
      raf = 0;
      const cr = container.getBoundingClientRect();
      const limit = window.innerHeight * 0.9;
      setDrawn((prev) => {
        let changed = false;
        const next = [...prev];
        for (const nd of nodes) {
          if (!next[nd.i] && cr.top + nd.y < limit) { next[nd.i] = true; changed = true; }
        }
        return changed ? next : prev;
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [reduce, nodes]);

  const ready = nodes.length === n && n > 0;
  const byI = (i: number) => nodes.find((x) => x.i === i);
  const isIn = (i: number) => reduce || !!drawn[i];
  const dust = mulberry32(13);

  return (
    <svg ref={svgRef} className={`rail-svg ${ready ? "ready" : ""} ${reduce ? "static" : ""}`} height={H || 1} viewBox={`0 0 ${W} ${H || 1}`} aria-hidden="true">
      <defs>
        <radialGradient id="foil" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="var(--foil-1)" /><stop offset=".55" stopColor="var(--sky-foil-2)" /><stop offset="1" stopColor="var(--sky-foil-3)" />
        </radialGradient>
        <linearGradient id="tailgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--line-strong)" /><stop offset="1" stopColor="var(--line-strong)" stopOpacity="0" /></linearGradient>
      </defs>
      {ready && nodes.slice(0, -1).map((lo) => {
        const hi = byI(lo.i + 1)!;
        const dx = lo.x - hi.x, dy = lo.y - hi.y, len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
        const a = { x: hi.x + ux * (hi.r + 3), y: hi.y + uy * (hi.r + 3) };
        const b = { x: lo.x - ux * (lo.r + 3), y: lo.y - uy * (lo.r + 3) };
        const locked = lockedHills[lo.i];
        const inn = isIn(lo.i);
        const pts = [
          `${hi.x + nx * hi.r},${hi.y + ny * hi.r}`, `${hi.x - nx * hi.r},${hi.y - ny * hi.r}`,
          `${lo.x - nx * lo.r},${lo.y - ny * lo.r}`, `${lo.x + nx * lo.r},${lo.y + ny * lo.r}`,
        ].join(" ");
        const dots = [0.2, 0.5, 0.8].map((t) => {
          const cx = hi.x + dx * t, cy = hi.y + dy * t;
          const side = dust() < 0.5 ? 1 : -1;
          const off = lo.r + 4 + dust() * 6;
          return { x: cx + nx * off * side, y: cy + ny * off * side, r: 0.8 + dust() * 0.6 };
        });
        return (
          <g key={`s${lo.i}`}>
            {!locked && <polygon className={`track ${inn ? "is-in" : ""}`} points={pts} />}
            <line className={`seg-line ${inn ? "is-in" : ""}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} pathLength={1} />
            {!locked && dots.map((d, k) => <circle key={k} className={`dust ${inn ? "is-in" : ""}`} cx={d.x} cy={d.y} r={d.r} />)}
          </g>
        );
      })}
      {ready && nodes.map((nd) => {
        const inn = isIn(nd.i);
        const haloO = 0.05 + 0.012 * nd.i;
        if (nd.kind === "now") {
          const tailLen = Math.min(120, Math.max(24, progress * 160));
          return (
            <g key="now" className={inn ? "is-in" : ""} transform={`translate(${nd.x} ${nd.y})`} style={{ ["--halo-o" as string]: haloO }}>
              <line className="ray" x1={nd.r + 4} y1={0} x2={W - nd.x} y2={0} />
              <line className="tail" x1={0} y1={-(nd.r + 6)} x2={0} y2={-(nd.r + 6 + tailLen)} stroke="url(#tailgrad)" />
              <circle className="halo" r={nd.r * 1.45} />
              <circle className="now-dot" r={nd.r} />
              <circle className="now-ring" r={nd.r + 4} />
            </g>
          );
        }
        if (nd.kind === "goal") {
          return (
            <g key="goal" className={inn ? "is-in" : ""} transform={`translate(${nd.x} ${nd.y})`} style={{ ["--halo-o" as string]: haloO }}>
              <line className="ray" x1={nd.r + 4} y1={0} x2={W - nd.x} y2={0} />
              <circle className="orbit" r={nd.r + 8} />
              <circle className="halo" r={nd.r * 1.45} />
              <circle r={nd.r} fill="url(#foil)" />
              <circle className="ring goal-ring" r={nd.r} strokeWidth={nd.w} pathLength={1} transform="rotate(-115)" />
              <path className="glyph" transform={`translate(${nd.r * 0.7} ${-nd.r * 0.7}) scale(1.1)`} d="M0-6 L1.6-1.6 6 0 1.6 1.6 0 6 -1.6 1.6 -6 0 -1.6-1.6Z" />
            </g>
          );
        }
        return (
          <g key={nd.i} className={inn ? "is-in" : ""} transform={`translate(${nd.x} ${nd.y})`} style={{ ["--halo-o" as string]: haloO }}>
            <line className="ray" x1={nd.r + 4} y1={0} x2={W - nd.x} y2={0} />
            <circle className="halo" r={nd.r * 1.45} />
            <circle className="snow" r={nd.r} />
            <circle className="ring" r={nd.r} strokeWidth={nd.w} pathLength={1} transform="rotate(-115)" />
            <circle className="ring2" r={nd.r} strokeWidth={nd.w * 0.5} pathLength={1} transform="translate(.6 .4) rotate(-100)" />
          </g>
        );
      })}
    </svg>
  );
}
