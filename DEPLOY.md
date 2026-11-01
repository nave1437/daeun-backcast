# 배포 가이드 (Vercel + 광고)

## 1. 구조상 필요한 것
서비스는 Next.js 하나로 끝납니다. 별도 서버는 없지만, 두 가지는 바꿔야 Vercel에서 돕니다.

| 항목 | 지금(로컬) | Vercel에서 |
|---|---|---|
| 문장 생성 | Claude Code 로그인(agent 모드) | **API 키 필수** `PROSE_PROVIDER=api`, `ANTHROPIC_API_KEY` (구독 토큰으로 타인에게 서비스하는 건 약관 위반) |
| 저장소 | `node:sqlite` 파일(`data/daeun.sqlite`) | **Supabase(Postgres)로 교체 완료.** `SUPABASE_URL`·`SUPABASE_SERVICE_KEY`가 있으면 자동으로 Supabase, 없으면 로컬 SQLite. 표 생성 SQL은 아래 |
| 함수 실행 시간 | 제한 없음 | 생성 40~90초. Fluid compute가 켜진 Hobby 플랜은 기본·최대 300초라 충분. 서버 액션이 있는 라우트에 `export const maxDuration = 300;` |
| 결제 | mock | 토스페이먼츠 결제위젯 + 서버 승인(`src/lib/payment.ts` 주석) |

### Supabase 표 생성(SQL Editor에서 1회)
```sql
create table if not exists readings (
  id text primary key, created_at bigint not null, expires_at bigint not null,
  alias text not null, birth jsonb not null, goal_year int not null, goal_text text not null,
  plan jsonb not null, prose_full jsonb, hard_report jsonb,
  paid boolean not null default false, usage jsonb not null default '[]'::jsonb
);
create index if not exists readings_expires on readings(expires_at);
create table if not exists friends (
  id text primary key, reading_id text not null references readings(id) on delete cascade,
  created_at bigint not null, alias text not null, birth jsonb not null, lines jsonb
);
create index if not exists friends_reading on friends(reading_id);
alter table readings enable row level security;
alter table friends enable row level security;
```
코드: `src/lib/store/db.ts`(파사드) → `supabase.ts` / `sqlite.ts`. 서버 전용 Secret 키로 접속하며 RLS를 우회한다. 7일 만료 삭제는 생성 요청 때 `purgeExpired()`가 처리한다.

## 2. Vercel 설정
1. GitHub에 올리고 Vercel에서 Import. Framework = Next.js, Node 22.
2. Project → Settings → Functions → **Fluid compute 켜기**(새 프로젝트는 기본 켜짐).
3. 환경변수
   - `PROSE_PROVIDER=api`, `ANTHROPIC_API_KEY=sk-ant-…`, `CLAUDE_MODEL=claude-sonnet-5`
   - `PROSE_THINKING=disabled`, `PROSE_FIX_PASSES=1`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (Settings → API → Project URL / Secret key)
   - `NEXT_PUBLIC_BASE_URL=https://<도메인>`
   - 결제: `PAYMENT_MODE=real`, `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`
   - 광고: 아래 3절
   - `NEXT_PUBLIC_CONTACT_EMAIL` (개인정보처리방침 연락처)
4. 도메인 연결(광고 심사에 필요).

## 3. 광고 붙이기
코드에는 `AdSlot` 컴포넌트가 이미 네 자리(랜딩 1, 이야기 2, 할 일 1)에 들어 있고, 환경변수가 없으면 아무것도 그리지 않습니다.

### 카카오 애드핏(먼저 추천)
- 개인도 본인 인증 후 가입 가능(법인 아니어도 됨). 매체 등록 → 광고 단위 1개 이상 만들기 → 심사 영업일 1~2일.
- 320×100 모바일 배너 단위를 만들고 ID를 `NEXT_PUBLIC_ADFIT_UNIT`에 넣으면 끝. 스크립트(`ba.min.js`)는 AdSlot이 로드합니다.
- 심사 전에 사이트가 실제로 열려 있어야 하므로 Vercel 배포 뒤에 신청.

### 구글 애드센스(수익은 더 높지만 심사가 까다로움)
- 조건: 만 18세, 독창적 콘텐츠, **개인정보처리방침·연락처 페이지**(`/privacy`에 준비됨), 모바일에서 깨지지 않는 레이아웃, 광고가 본문을 가리지 않을 것.
- 심사 기간 보통 3일~2주, 길면 한 달. 신규 도메인·콘텐츠가 적은 도구형 사이트는 "콘텐츠 부족"으로 거절되기 쉬워, 랜딩에 사주·역산 설명 글(1,000자 이상 글 10~15편) 블로그 섹션을 두면 통과 확률이 오릅니다.
- 승인 후 `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-…`, `NEXT_PUBLIC_ADSENSE_SLOT=…`를 넣으면 레이아웃이 스크립트를 로드하고 AdSlot이 반응형 단위를 그립니다.

### 수익 감각
한국 모바일 웹 디스플레이 eCPM 500~2,000원, 1인당 페이지 4~5회 → 1인당 5~15원. 생성 1건 약 70원이라 광고만으론 적자이고, 990원 리포트 전환 3~4%가 더해져야 손익이 맞습니다.

### 보상형 광고로 결과 열기(구글 애드 매니저)
결과(이야기·할 일·조심할 해)는 광고 한 편을 끝까지 본 브라우저에서만 열린다. 애드센스에는 웹 보상형 광고가 없어서 **구글 애드 매니저(무료)** 를 같이 쓴다.

1. 애드센스 승인이 먼저다. 애드 매니저 가입은 승인된 애드센스 계정을 요구한다(한 번 연결하면 못 바꾼다).
2. admanager.google.com → 애드센스와 같은 구글 계정으로 「계정 만들기」. 끝나면 네트워크 코드(숫자 8~11자리)가 생긴다.
3. 인벤토리 → 사이트 → daeun.nave.io.kr 추가.
4. 인벤토리 → 광고 단위 → 새 광고 단위. 이름 `daeun_rewarded`(코드도 같게). 크기는 영향 없음(1x1 또는 미지정).
5. 관리 → 전체 설정 → 애드센스: 「남은 인벤토리를 애드센스로 채우기」 켜기(애드센스 계정 연결).
6. 보호 → 광고 콘텐츠: 「인스트림 아닌 동영상 광고 차단」이 켜져 있으면 끈다(보상형은 동영상이라 막히면 안 나온다).
7. Vercel 환경변수 `NEXT_PUBLIC_GAM_REWARDED=/네트워크코드/daeun_rewarded` 넣고 재배포.

동작: 페이지가 열리면 광고를 미리 불러오고, 준비되면 「광고 보고 열기」 버튼이 켜진다. 끝까지 보면(granted) `localStorage unlock:<id>` 에 저장되어 그 브라우저에서는 다시 안 묻는다. 광고가 8초 안에 안 오면(차단기·채움 없음) 기본은 그냥 연다. 막으려면 `NEXT_PUBLIC_REWARD_STRICT=1`. 환경변수가 비어 있으면 게이트 자체가 꺼진다(배포 직후 애드 매니저 전까지 안전). 개발 환경에서는 구글 공식 데모 단위(`/22639388115/rewarded_web_example`)로 흐름을 시험한다.

정책: 광고 단위 보상 정책(애드센스 도움말 9121589) — 보상은 현금·상품권 불가(콘텐츠 열기는 가능), 무엇을 하면 무엇을 받는지 누르기 전에 보여 줄 것, 사용자가 스스로 누를 것, 끝까지 안 보면 보상 없음. 조심할 해는 이와 별개로 친구 1명이 들어와야 열린다.

## 4. 배포 전 체크
- [x] Supabase 연결(로컬에서 생성·친구·결제 표시까지 확인)
- [x] `PROSE_PROVIDER=api` 실측: 글 66원·38초, 리포트 18원·16초
- [x] 서버 액션 라우트 `maxDuration = 300`, Vercel 임시 주소에서 생성·결제·카드 확인(2026-10-05)
- [ ] 토스페이먼츠 승인 플로우 + 환불 정책 문구
- [ ] `/privacy` 연락처 채우기, 사업자 정보(결제 시 필요) 푸터
- [ ] 애드핏 매체 등록 → 단위 ID 환경변수

## 5. 애드센스 「가치가 별로 없는 콘텐츠」 거절 대응(2026-10-26)
10월 19일 검토 결과: 사이트 `nave.io.kr` → 주의 필요 / 가치가 별로 없는 콘텐츠 / ads.txt 찾을 수 없음.
- 애드센스는 루트 도메인(nave.io.kr) 단위로 본다. 루트에 같은 앱이 붙어 있어야 하고 `https://nave.io.kr/ads.txt`가 200이어야 한다(현재 둘 다 됨. ads.txt 상태는 다음 크롤 때 갱신).
- 콘텐츠 보강: `/sample`(가상 인물 예시 결과 전체), `/about`(소개·계산 방식·연락처), 읽을거리 18편, 푸터에 전부 연결, sitemap·robots 반영.
- 연락처: Vercel 환경변수 `NEXT_PUBLIC_CONTACT_EMAIL` 에 이메일을 넣어야 소개·개인정보처리방침에 표시된다.
- 배포 뒤 애드센스 → 사이트 → nave.io.kr → 「검토 요청」. 보통 1~2주.

## 6. Supabase 무료 프로젝트 멈춤(pause)
요청이 일주일 없으면 프로젝트가 멈추고 주소(DNS)까지 사라져 `fetch failed`가 난다(2026-10-26 발생). 대시보드 → 프로젝트 → 「Restore project」로 되살린다(몇 분).
재발 방지: `/api/keepalive` 를 Vercel 크론이 매일 03:00 KST에 부른다(`vercel.json`). 로컬에서 Supabase 가 죽어 있으면 `SUPABASE_URL= SUPABASE_SERVICE_KEY= npx next dev -p 3111` 로 SQLite 로 돌릴 수 있다.

