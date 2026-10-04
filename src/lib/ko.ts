/** 받침 유무로 을/를, 이/가 를 고른다 */
function hasBatchim(w: string): boolean {
  const c = w.replace(/[」』)\]\s]+$/, "").slice(-1).charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}
export const eul = (w: string) => (hasBatchim(w) ? "을" : "를");
export const i_ga = (w: string) => (hasBatchim(w) ? "이" : "가");
/** 같은 값이면 하나만, 다르면 범위 */
export const range = (a: number, b: number, unit = "") => (a === b ? `${a}${unit}` : `${a}–${b}${unit}`);
