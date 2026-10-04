// 실측 비용 집계: npx tsx scripts/cost.mts
import { usageStats } from "../src/lib/store/db";
const s = await usageStats();
const IN = 2, OUT = 10, CACHE = 0.2; // Sonnet 5 $/1M
const usd = (s.input * IN + s.output * OUT + s.cacheRead * CACHE) / 1e6;
console.log(`기록 ${s.readings}건 · 입력 ${s.input} · 출력 ${s.output} · 캐시읽기 ${s.cacheRead}`);
console.log(`총 $${usd.toFixed(3)} · 1건당 $${(usd / Math.max(1, s.readings)).toFixed(4)} ≈ ${Math.round((usd / Math.max(1, s.readings)) * 1400)}원`);
console.log(`※ agent 모드에선 Claude Code 시스템 프롬프트 토큰이 입력에 섞여 실제 API 비용보다 크게 나와요. api 모드로 잰 값이 정확해요.`);
