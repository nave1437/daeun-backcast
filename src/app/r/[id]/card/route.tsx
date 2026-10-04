import { ImageResponse } from "next/og";
import { loadReading, TODAY_YEAR } from "@/lib/flow";
import { loadCardFonts } from "@/lib/font";
import { mulberry32 } from "@/lib/seed";
import { ageIn } from "@/lib/saju/calc";

export const dynamic = "force-dynamic";

const SKY = "#12100E", PAPER = "#F1ECE3", CREAM = "#EDE6D9", CREAM_MUTED = "#A9A092", INK = "#1C1A18", INK_MUTED = "#655F56", GOLD = "#D4B15E", SEAL = "#A9352B";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const v = await loadReading(id);
  if (!v) return new Response("not found", { status: 404 });
  const fonts = await loadCardFonts();
  const steps = v.plan.steps;
  const n = steps.length + 1;
  const rnd = mulberry32(7);
  const stars = Array.from({ length: 140 }, () => ({ x: rnd() * 1080, y: rnd() * 560, r: 0.8 + rnd() * 1.6, a: 0.3 + rnd() * 0.5 }));
  // 위 = 지금(작음) → 아래 = 목표(큼). 카드에서는 지금부터 굴러 내려가는 모습으로 그린다.
  const yTop = 960, yBottom = 1480;
  const nodes = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 1 : i / (n - 1);
    const y = yTop + (yBottom - yTop) * t;
    const r = 12 + (52 - 12) * t;
    const sway = i === 0 || i === n - 1 ? 0 : (i % 2 ? 1 : -1) * 36;
    const year = i === n - 1 ? v.plan.goalYear : steps[i].startYear;
    const title = i === n - 1 ? "목표의 해" : v.prose?.sections.find((s) => s.startYear === year)?.title ?? (i === 0 ? "지금" : "새 대운");
    return { i, x: 300 + sway, y, r, year, age: ageIn(v.chart, year), title };
  });
  const seed = v.prose?.seed ?? "";
  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", position: "relative", background: PAPER, fontFamily: "NotoSansKR" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 560, display: "flex", background: SKY }} />
        <div style={{ position: "absolute", left: 0, top: 560, width: 1080, height: 320, display: "flex", background: `linear-gradient(to bottom, ${SKY}, #2A2622 25%, #6E685F 50%, #C9C3B8 75%, ${PAPER})` }} />
        <div style={{ position: "absolute", left: 240, top: 120, width: 600, height: 600, display: "flex", borderRadius: 300, background: "radial-gradient(circle, rgba(239,213,138,.16), rgba(239,213,138,0) 70%)" }} />
        {stars.map((s, k) => <div key={k} style={{ position: "absolute", left: s.x, top: s.y, width: s.r * 2, height: s.r * 2, borderRadius: s.r, background: CREAM, opacity: s.a, display: "flex" }} />)}
        <div style={{ position: "absolute", left: 80, top: 280, display: "flex", fontSize: 32, letterSpacing: 2, color: CREAM_MUTED }}>대운 역산 · {v.alias}</div>
        <div style={{ position: "absolute", left: 80, top: 330, width: 920, display: "flex", fontFamily: "Hahmlet", fontWeight: 500, fontSize: 56, lineHeight: 1.3, color: CREAM, wordBreak: "keep-all" }}>「{v.plan.goalText}」</div>
        <div style={{ position: "absolute", left: 80, top: 500, display: "flex", alignItems: "baseline", gap: 24 }}>
          <div style={{ display: "flex", fontFamily: "Hahmlet", fontWeight: 300, fontSize: 220, lineHeight: 1, letterSpacing: -6, color: GOLD }}>{String(v.plan.goalYear)}</div>
          <div style={{ display: "flex", fontSize: 44, color: CREAM_MUTED }}>· {ageIn(v.chart, v.plan.goalYear)}세</div>
        </div>
        {v.prose?.goal.endState && <div style={{ position: "absolute", left: 80, top: 760, width: 920, display: "flex", fontSize: 36, lineHeight: 1.5, color: PAPER, wordBreak: "keep-all" }}>{v.prose.goal.endState}</div>}
        <svg style={{ position: "absolute", left: 0, top: 0 }} width={1080} height={1920} viewBox="0 0 1080 1920">
          <defs><radialGradient id="cfoil" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#EFD58A" /><stop offset=".55" stopColor="#D4B15E" /><stop offset="1" stopColor="#8E6E22" /></radialGradient></defs>
          {nodes.slice(0, -1).map((a) => {
            const b = nodes[a.i + 1];
            const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
            const pts = `${a.x + nx * a.r},${a.y + ny * a.r} ${a.x - nx * a.r},${a.y - ny * a.r} ${b.x - nx * b.r},${b.y - ny * b.r} ${b.x + nx * b.r},${b.y + ny * b.r}`;
            return <g key={a.i}><polygon points={pts} fill={INK} opacity=".06" /><line x1={a.x + ux * (a.r + 4)} y1={a.y + uy * (a.r + 4)} x2={b.x - ux * (b.r + 4)} y2={b.y - uy * (b.r + 4)} stroke={INK} strokeOpacity=".55" strokeWidth="2" /></g>;
          })}
          {nodes.map((nd) => nd.i === n - 1 ? (
            <g key={nd.i}><circle cx={nd.x} cy={nd.y} r={nd.r * 1.4} fill={INK} opacity=".06" /><circle cx={nd.x} cy={nd.y} r={nd.r} fill="url(#cfoil)" stroke={INK} strokeWidth="5" /></g>
          ) : nd.i === 0 ? (
            <g key={nd.i}><circle cx={nd.x} cy={nd.y} r={nd.r} fill={INK} /><circle cx={nd.x} cy={nd.y} r={nd.r + 8} fill="none" stroke={INK} strokeOpacity=".5" strokeWidth="2" /></g>
          ) : (
            <g key={nd.i}><circle cx={nd.x} cy={nd.y} r={nd.r * 1.4} fill={INK} opacity=".06" /><circle cx={nd.x} cy={nd.y} r={nd.r} fill="#FAF7F1" stroke={INK} strokeWidth={3 + nd.i} /></g>
          ))}
        </svg>
        {nodes.map((nd) => (
          <div key={`l${nd.i}`} style={{ position: "absolute", left: 420, top: nd.y - 40, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 40, color: INK }}>{nd.year} · {nd.age}세</div>
            <div style={{ display: "flex", fontSize: 34, color: INK_MUTED }}>{nd.title}</div>
          </div>
        ))}
        <div style={{ position: "absolute", left: 80, top: 1600, width: 920, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, color: SEAL, letterSpacing: 1 }}>이번 주부터</div>
          <div style={{ display: "flex", fontFamily: "Hahmlet", fontWeight: 600, fontSize: seed.length > 22 ? 36 : 42, lineHeight: 1.4, color: INK, wordBreak: "keep-all" }}>{seed || "링크에서 확인"}</div>
        </div>
        <div style={{ position: "absolute", left: 80, top: 1760, width: 920, height: 2, display: "flex", background: "#D7D3CB" }} />
        <div style={{ position: "absolute", left: 80, top: 1790, width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", background: SEAL, color: PAPER, fontFamily: "Hahmlet", fontWeight: 600, fontSize: 26, transform: "rotate(-5deg)" }}>지금</div>
        <div style={{ position: "absolute", right: 80, top: 1808, display: "flex", fontSize: 30, color: INK_MUTED }}>대운 역산 · {TODAY_YEAR}</div>
      </div>
    ),
    { width: 1080, height: 1920, fonts },
  );
}
