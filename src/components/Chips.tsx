import type { Kind } from "@/lib/engine/plan";
import type { FriendView } from "@/lib/flow";
import { VERDICT_LABEL } from "@/lib/engine/friends";

const KIND_HANJA: Record<Kind, string> = { people: "木", make: "火", money: "土", duty: "金", learn: "水" };
const KIND_GROUP: Record<Kind, string> = { people: "비겁", make: "식상", money: "재성", duty: "관성", learn: "인성" };
const TONE: Record<string, string> = { push: "tone-good", with: "tone-good", care: "tone-care", block: "tone-bad", rival: "tone-bad", drain: "tone-warn", neutral: "tone-muted" };

/** 십신 계열 칩: 라벨은 항상 ink, 오행은 점·틴트·한자 1글자로만 */
export function KindChip({ kind, word }: { kind: Kind; word: string }) {
  return <span className={`chip k-${kind}`}>{KIND_GROUP[kind]} · {word}<span className="hanja">{KIND_HANJA[kind]}</span></span>;
}

export function FriendChips({ friends, stepIndex }: { friends: FriendView[]; stepIndex: number }) {
  if (!friends.length) return null;
  return (
    <div className="chips">
      {friends.map((f) => { const m = f.marks[stepIndex]; return <span key={f.id} className={`chip ${TONE[m.verdict]}`} title={m.why}>{f.alias} · {VERDICT_LABEL[m.verdict]}</span>; })}
    </div>
  );
}
