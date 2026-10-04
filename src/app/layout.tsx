import type { Metadata } from "next";
import { Hahmlet, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import { Paper } from "@/components/Paper";
import { ThemeToggle } from "@/components/ThemeToggle";
import Script from "next/script";
import Link from "next/link";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

const hahmlet = Hahmlet({ subsets: ["latin"], weight: "variable", display: "swap", variable: "--font-hahmlet", fallback: ["Gowun Batang", "AppleMyungjo", "Batang", "serif"] });
const plex = IBM_Plex_Sans_KR({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-plex", fallback: ["Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"] });

// 간지·오행·封 한자는 Hahmlet·Plex에 글리프가 없어 Noto Serif KR을 40자만 부분 로드한다.
const HANJA = "封印甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水日干大運逆算";
const HANJA_URL = `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600&display=swap&text=${encodeURIComponent(HANJA)}`;

export const metadata: Metadata = {
  title: "대운 역산",
  description: "오늘 한 줌의 눈이 어느 해에 어떤 눈덩이가 되는지. 목표 연도를 고르면 그 사이 모든 대운 고개에서 눈덩이가 얼마나 커져 있어야 하는지 거꾸로 셉니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${hahmlet.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={HANJA_URL} />
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}` }} />
      </head>
      <body>
        {ADSENSE_CLIENT && <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`} crossOrigin="anonymous" strategy="afterInteractive" />}
        <Paper />
        <div className="page">
          {children}
          <footer className="site-foot">
            <ThemeToggle />
            <nav className="foot-links"><Link href="/privacy">개인정보처리방침</Link><Link href="/">소개</Link></nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
