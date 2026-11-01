"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Article = { title: string; body: string[] };

/** 「처음이라면」 글자 버튼 → 아래에서 올라오는 설명 시트. 3단계 + 설명 글 전부를 한 시트 안에서 스크롤로 읽는다.
 *  <dialog> 대신 body 끝에 붙이는 일반 div 로 만든다. 사파리에서 overflow:hidden 조상 안의 dialog 가 잘려 안 보이는 문제를 피한다. */
export function GuideSheet({ articles }: { articles: Article[] }) {
  const [mounted, setMounted] = useState(false); // DOM 에 붙어 있는지
  const [on, setOn] = useState(false); // 올라와 있는지(전환용)
  const show = useCallback(() => setMounted(true), []);
  const hide = useCallback(() => { setOn(false); setTimeout(() => setMounted(false), 300); }, []);
  useEffect(() => {
    if (!mounted) return;
    const raf = requestAnimationFrame(() => setOn(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("sheet-lock");
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); document.body.classList.remove("sheet-lock"); };
  }, [mounted, hide]);

  return (
    <>
      <button type="button" className="tlink sheet-link" onClick={show}>처음이라면</button>
      {mounted && createPortal(
        <div className={`bsheet-root${on ? " on" : ""}`}>
          <div className="bsheet-dim" onClick={hide} aria-hidden />
          <div className="bsheet" role="dialog" aria-modal="true" aria-labelledby="bsheet-title">
            <div className="bsheet-in">
              <span className="bsheet-handle" aria-hidden />
              <div className="bsheet-head">
                <h2 id="bsheet-title">처음이라면</h2>
                <button type="button" className="bsheet-x" onClick={hide} aria-label="닫기">×</button>
              </div>
              <ol className="land-steps">
                <li>
                  <b>목표의 해에서 출발해요</b>
                  <p>그 해에 꿈이 이뤄져 있으려면 그 전 대운이 끝날 때 어떤 내가 되어 있어야 하는지, 또 그 전에는, 그리고 지금은. 거꾸로 세어 대운마다 도달할 모습을 정해요.</p>
                </li>
                <li>
                  <b>대운이 바뀌는 해마다 사주로 풀어요</b>
                  <p>그 해 들어오는 대운이 내 사주에 어떤 기운인지, 벌일 때인지 다질 때인지, 사람을 넓힐지 가릴지, 어떤 마음으로 지내면 좋은지를 써요.</p>
                </li>
                <li>
                  <b>할 일이 다음 대운으로 이어져요</b>
                  <p>지금 하는 작은 일이 이번 대운의 도달점이 되고, 그 위에서 다음 대운의 할 일이 시작돼요. 하나씩 체크하면서 가요.</p>
                </li>
              </ol>
              {articles.map((a) => (
                <section key={a.title} className="bsheet-art">
                  <h3>{a.title}</h3>
                  {a.body.map((t, i) => <p key={i}>{t}</p>)}
                </section>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
