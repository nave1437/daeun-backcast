/** 긴 풀이 문단을 2~3문장씩 끊어 읽기 쉽게 만든다. 문장 끝(요./다./까./죠.) 기준. */
export function paragraphs(text: string, per = 3): string[] {
  const sents = text.trim().split(/(?<=[요다까죠]\.)\s+/).filter(Boolean);
  if (sents.length <= per) return [text.trim()];
  const out: string[] = [];
  // 마지막 묶음이 1문장만 남지 않게 균등 분배
  const n = Math.ceil(sents.length / per);
  const size = Math.ceil(sents.length / n);
  for (let i = 0; i < sents.length; i += size) out.push(sents.slice(i, i + size).join(" "));
  return out;
}
