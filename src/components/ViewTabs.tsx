import Link from "next/link";

/** 결과 화면 상단 탭. 스크롤하면 위에 붙는다. 거센 해는 별도 유료 콘텐츠라 따로 둔다. */
export function ViewTabs({ id, active }: { id: string; active: "story" | "todo" | "hard" }) {
  const tab = (key: typeof active, href: string, label: string) => (
    <Link href={href} className={active === key ? "on" : ""} aria-current={active === key ? "page" : undefined}>{label}</Link>
  );
  return (
    <nav className="tabs tabs-3" aria-label="보기 전환">
      {tab("story", `/r/${id}`, "이야기")}
      {tab("todo", `/r/${id}/todo`, "할 일")}
      {tab("hard", `/r/${id}/hard`, "거센 해")}
    </nav>
  );
}
