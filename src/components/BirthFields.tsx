"use client";
import { useState } from "react";

export function BirthFields({ aliasLabel = "별칭", defaultAlias = "" }: { aliasLabel?: string; defaultAlias?: string }) {
  const [year, setYear] = useState("");
  const y = Number(year);
  const dstEra = (y >= 1948 && y <= 1960) || y === 1987 || y === 1988;
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <>
      <label className="field"><span className="label">{aliasLabel}</span>
        <input name="alias" id="alias" maxLength={12} placeholder="카드에 표시될 이름" defaultValue={defaultAlias} /></label>
      <div className="cols3">
        <label className="field"><span className="label">년</span>
          <input name="year" id="year" inputMode="numeric" placeholder="1995" required value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} /></label>
        <label className="field"><span className="label">월</span><input name="month" id="month" inputMode="numeric" placeholder="3" required maxLength={2} /></label>
        <label className="field"><span className="label">일</span><input name="day" id="day" inputMode="numeric" placeholder="14" required maxLength={2} /></label>
      </div>
      <div className="cols2">
        <label className="field"><span className="label">태어난 시간</span>
          <select name="hour" id="hour" defaultValue="unknown">
            <option value="unknown">모름</option>
            {hours.map((h) => <option key={h} value={`${h}:30`}>{String(h).padStart(2, "0")}시 무렵</option>)}
          </select></label>
        <div className="field"><span className="label">성별 <span className="hint">· 대운 순행·역행 계산에만 씁니다</span></span>
          <div className="seg" style={{ position: "relative" }}>
            <label><input type="radio" name="gender" value="female" defaultChecked />여</label>
            <label><input type="radio" name="gender" value="male" />남</label>
          </div>
        </div>
      </div>
      {dstEra && <label className="cap" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="dst" id="dst" /> 이 해에는 서머타임이 있었습니다. 여름(5~9월) 출생이면 체크</label>}
      <p className="notice">양력 기준입니다. 시각을 모르면 시주 없이 계산하고 대운 시작 나이가 ±1년 흔들립니다. 생년월일은 저장하지 않고 링크에만 담깁니다.</p>
    </>
  );
}
