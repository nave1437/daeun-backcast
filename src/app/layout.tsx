import type { Metadata } from "next";
import { Hahmlet, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import { Paper } from "@/components/Paper";
import Link from "next/link";

// 애드센스 게시자 ID. 환경변수가 없으면 기본값(nave.io.kr 계정)을 쓴다.
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-8219059284975523";

const hahmlet = Hahmlet({ subsets: ["latin"], weight: "variable", display: "swap", variable: "--font-hahmlet", fallback: ["Gowun Batang", "AppleMyungjo", "Batang", "serif"] });
const plex = IBM_Plex_Sans_KR({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-plex", fallback: ["Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"] });

// 간지·오행·封 한자는 Hahmlet·Plex에 글리프가 없어 Noto Serif KR을 40자만 부분 로드한다.
const HANJA = "封印甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水日干大運逆算";
const HANJA_URL = `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600&display=swap&text=${encodeURIComponent(HANJA)}`;

export const metadata: Metadata = {
  title: "대운 역산",
  description: "이루고 싶은 해를 정하면 그때까지의 대운을 사주로 풀고, 대운마다 할 일을 거꾸로 짜 드려요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${hahmlet.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={HANJA_URL} />
        {ADSENSE_CLIENT && <meta name="google-adsense-account" content={ADSENSE_CLIENT} />}
        {ADSENSE_CLIENT && <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`} crossOrigin="anonymous" />}
      </head>
      <body>
        <Paper />
        <div className="page">
          {children}
          <footer className="site-foot">
            <nav className="foot-links"><Link href="/sample">예시 결과</Link><Link href="/guide">읽을거리</Link><Link href="/about">소개</Link><Link href="/privacy">개인정보처리방침</Link></nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
