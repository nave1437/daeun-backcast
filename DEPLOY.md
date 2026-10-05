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

## 4. 배포 전 체크
- [x] Supabase 연결(로컬에서 생성·친구·결제 표시까지 확인)
- [x] `PROSE_PROVIDER=api` 실측: 글 66원·38초, 리포트 18원·16초
- [x] 서버 액션 라우트 `maxDuration = 300`, Vercel 임시 주소에서 생성·결제·카드 확인(2026-10-05)
- [ ] 토스페이먼츠 승인 플로우 + 환불 정책 문구
- [ ] `/privacy` 연락처 채우기, 사업자 정보(결제 시 필요) 푸터
- [ ] 애드핏 매체 등록 → 단위 ID 환경변수
