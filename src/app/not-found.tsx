import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid gap-3" style={{ paddingTop: 64 }}>
      <h1>이 링크는 없거나 만료됐습니다</h1>
      <p className="cap">링크는 만들어진 날로부터 7일 뒤 사라집니다. 생년월일도 그때 같이 지워집니다.</p>
      <Link className="btn-ghost" style={{ width: "fit-content" }} href="/">처음부터 다시</Link>
    </div>
  );
}
