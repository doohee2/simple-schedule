# Simple Schedule PWA - 통합 개발 문서

본 문서는 구글 캘린더 연동 및 노션(Notion) 일일 습관 트래커를 통합한 Progressive Web App(PWA) **'Simple Schedule'** 프로젝트의 전체적인 프로그램 소개, 시스템 아키텍처, 기술 스택, 핵심 기능, 세부 구현 특징, 주요 수정 히스토리 및 향후 유지보수 가이드라인을 종합적으로 정리한 기술 문서입니다.

---

## 1. 프로그램 소개 (Overview & Introduction)

**Simple Schedule**은 복잡하고 무거운 기존 캘린더 앱의 단점을 극복하고, 사용자가 매일의 일정과 습관을 한 화면에서 가장 빠르고 직관적으로 관리할 수 있도록 설계된 **웹 기반 모바일/데스크톱 반응형 PWA(Progressive Web App)**입니다.

### 🎯 기획 배경 및 핵심 가치
1. **일정과 일일 습관의 유기적 결합**: 단순 스케줄 관리에 그치지 않고, 노션(Notion) 데이터베이스와 실시간 연동되어 오늘 실천해야 할 습관 체크리스트와 진행 현황을 달력 날짜 칸 위에서 한눈에 직관적으로 파악할 수 있습니다.
2. **설치가 필요 없는 네이티브 앱 경험 (PWA)**: 별도의 앱스토어 다운로드 없이 브라우저의 '홈 화면에 추가'를 통해 네이티브 앱처럼 동작하며, 오프라인 환경에서도 최근 2달치 데이터의 완벽한 조회가 가능합니다.
3. **가벼움과 제로 레이턴시(Zero-Latency)**: 불필요한 장식과 무거운 애니메이션을 배제한 플랫(Flat) 디자인을 채택하였으며, 배치 쿼리(Batch Query)와 프론트엔드 캐시 재활용 기술을 통해 로딩 지연 없는 쾌적한 사용성을 보장합니다.
4. **반응형 멀티 디바이스 환경 지원**: 모바일 화면에서는 친숙한 '바텀 시트(Bottom Sheet)'로, 태블릿 및 데스크톱 모니터에서는 '좌우 2분할(Split-Screen)' 화면으로 자동 전환되어 최적의 공간 활용성을 제공합니다.

---

## 2. 주요 기능 설명 (Core Features)

### 📅 1) 2달 연속 무한 스크롤 캘린더 (Seamless 2-Month Grid)
- 이번 달과 다음 달의 날짜를 단일 CSS Grid(`eachDayOfInterval`)로 끊김 없이 이어붙여, 달과 달 사이의 빈 여백 없이 연속적으로 탐색할 수 있습니다.
- 첫 번째 달과 두 번째 달의 경계선(마지막 주차 하단 및 마지막 날짜 우측)에 동적 테두리(`border-2`)를 렌더링하여 월의 구분을 시각적으로 명확히 표시합니다.
- 상단 연/월 헤더와 요일 행(`일 월 화 수 목 금 토`)은 화면 상단에 고정(`sticky`)되며, 날짜 그리드 영역만 부드럽게 스크롤됩니다.

### 🗓️ 2) 구글 캘린더 연동 및 일정 관리 (Google Calendar Sync)
- **일정 조회 / 추가 / 수정 / 삭제 (CRUD)**: 구글 공식 API를 프록시 라우트로 중계하여 안정적인 일정 관리를 지원합니다. React Query의 낙관적 업데이트(Optimistic Update)를 통해 네트워크 지연 없이 즉각적인 UI 반영을 제공합니다.
- **다중 캘린더 병렬 조회**: 기본 캘린더뿐만 아니라 사용자의 구글 계정에 등록된 다양한 보조/공유 캘린더 목록을 불러와 자유롭게 켜고 끌 수 있는 `CalendarSelectorSheet`를 제공합니다.
- **대한민국 공휴일 연동**: 구글 대한민국 공휴일 캘린더(`ko.south_korea#holiday@...`)를 병렬로 함께 가져와 일요일 및 공휴일을 빨간색(`text-error`)으로 강조하고 공휴일 명칭을 날짜 아래 표기합니다.
- **스마트 카테고리 필터링**: '전체', '점심', '저녁', '휴가', '기타' 등 제목 및 메모 기반의 스마트 키워드 필터를 칩 버튼 형태로 제공합니다.
- **과거 일정 시각적 구분**: 이미 지나간 날짜의 일정 블록은 투명도(`opacity-50`)와 흑백 필터(`grayscale`)를 적용해 완료된 일정임을 자연스럽게 구분합니다.
- **음력 날짜 자동 병기**: `lunar-javascript`를 결합하여 일정 상세/추가 화면에서 양력 날짜 옆에 음력 날짜(예: 음력 6.3)를 실시간 표기합니다.

### ✅ 3) 노션(Notion) 습관 트래커 연동 (Habit Tracker Integration)
- **날짜 기반 자동 매칭**: 노션 데이터베이스의 "날짜(`date`)" 속성을 기준으로 선택한 날짜의 일일 체크리스트 페이지를 자동으로 탐색하여 가져옵니다.
- **속성별 맞춤형 실시간 편집**:
  - `checkbox`: 원클릭 토글 (취소선 및 완료 상태 동기화).
  - `status` / `select`: 진행 상황(시작 전, 진행 중, 완료 등)을 변경할 수 있는 커스텀 드롭다운.
  - `rich_text` / `title` / `number`: 내용 길이에 따라 높이가 자동 조절되는 유동형 텍스트 입력창(`AutoResizeTextarea`).
- **캘린더 내 실시간 4단계 모노톤 진행률 아이콘 (`HabitProgressIcon`)**:
  - 2달치 노션 데이터를 단 한 번의 비동기 배치 쿼리(`/api/notion/habits/summary`)로 백그라운드에서 불러와, 날짜 번호 옆에 19px 크기의 정교한 SVG 아이콘으로 실시간 표시합니다.
  - 노션의 "상태(Status)" 속성 또는 체크박스 달성률(0%, 1~49%, 50~99%, 100%)에 따라 사각형 테두리의 점선/실선 패턴 및 내부 체크표시의 크기가 동적으로 변화합니다.
  - '오늘 일정 조회 시 노션 우선' 옵션 활성화 시 오늘 날짜 클릭 시 일반 일정 대신 노션 체크리스트 화면이 기본으로 즉시 열립니다.

### 💬 4) 매일의 명언 및 사자성어 듀얼 모드 (Quotes & Idioms Modal)
- 앱 최초 진입 시(세션당 1회) 또는 헤더의 명언 아이콘(`format_quote`) 클릭 시 오픈되는 인용구 모달입니다.
- **영문 명언 (ZenQuotes)**: 랜덤 영문 명언을 불러오며, Google Gemini AI 번역(`gemini-flash-lite-latest`)을 통해 격조 높은 문어체(해라체/한다체) 한국어로 번역합니다. (Gemini 실패 또는 키 부재 시 크롬 확장프로그램용 무료 구글 번역 엔드포인트를 폴백으로 안전하게 사용).
- **한자 사자성어 (Idioms)**: 내부 CSV(`public/four_character_Chinese_idiom.csv`)에서 무작위로 추출하여 한자 4글자를 대형 폰트로 렌더링하고, 화면 탭 시 뜻과 훈음을 표시합니다.
- **선택 제어 & TTS 발음 지원**: 하단 체크박스를 통해 두 인용구 소스를 자유롭게 토글할 수 있으며(동시 선택 시 50:50 무작위 노출), Web Speech API를 활용해 원문 음성을 들을 수 있습니다.

### 📱 5) PWA 오프라인 지원 및 모바일/데스크톱 적응형 UI
- **Offline-First 아키텍처**: Serwist 서비스 워커와 React Query 캐시를 결합하여 인터넷이 끊겨도 최근 2달치 캘린더 및 노션 습관 데이터를 제로 레이턴시로 열람할 수 있습니다.
- **오프라인 읽기 전용(Read-Only) 방어 모드**: 오프라인 상태 감지 시 헤더에 `cloud_off` 빨간색 펄스 뱃지가 활성화되며, 데이터 오염 방지를 위해 월 이동, 일정 수정/삭제, 노션 체크박스 변경이 자동으로 차단됩니다.
- **반응형 2분할(Split-Screen) 레이아웃**: 모바일 화면에서는 드래그 제스처로 높낮이 조절이 가능한 하단 바텀 시트로 작동하고, 브라우저 가로 폭이 768px(`md`) 이상인 데스크톱 환경에서는 좌측 캘린더와 우측 일정 패널이 나란히 배치되는 2분할 UI로 매끄럽게 전환됩니다.
- **캘린더 글자 크기 조절 & 다크 모드**: 앱 정보 모달에서 글자 크기를 3단계(작게 9px / 중간 11px / 크게 12px)로 변경할 수 있으며, 시스템 테마와 연동되는 다크 모드를 완벽 지원합니다.

---

## 3. 사용된 기술 스택 및 프레임워크 (Tech Stack)

### 3.1 기술 스택 명세

| 구분 | 기술 / 라이브러리 | 버전 | 도입 목적 및 역할 |
| :--- | :--- | :--- | :--- |
| **Framework** | **Next.js (App Router)** | `v16.2.9` | 서버 컴포넌트(RSC), API Route 백엔드 프록시, 최적화 번들링 |
| **UI Library** | **React** | `v19.2.4` | 클라이언트 UI 컴포넌트 렌더링 및 모던 훅 기반 상태 관리 |
| **Styling** | **Tailwind CSS** | `v4.x` | 최신 `@theme` 기반 CSS 변수 시스템 제어 및 플랫 디자인 구현 |
| **Authentication** | **NextAuth.js** | `v5 (Beta)` | Google OAuth 로그인, 180일 장기 세션 유지, 백엔드 토큰 로테이션 |
| **State Management** | **TanStack React Query** | `v5.101.0` | 서버 상태 캐싱, 낙관적 업데이트, 백그라운드 동기화 |
| **PWA / Service Worker** | **Serwist (`@serwist/next`)** | `v9.5.11` | 모던 Workbox 기반 오프라인 런타임 캐싱, 백그라운드 자산 사전 캐싱 |
| **Database** | **Supabase (`@supabase/supabase-js`)** | `v2.110.8` | 구글 계정별 노션 API 토큰 및 데이터베이스 ID 안전 저장(BFF 연동) |
| **Schema Validation** | **Zod** | `v4.4.3` | 서버 API 라우트 입력 파라미터 엄격 검증 및 에러 메시지 위생화 |
| **Date Utility** | **date-fns** | `v4.4.0` | 캘린더 그리드 날짜 연산, 인터벌 계산 및 한국어 포맷팅 |
| **Lunar Calendar** | **lunar-javascript** | `v1.7.7` | 양력 기준 음력 날짜(월/일) 정밀 변환 및 표기 |
| **Generative AI** | **@google/generative-ai** | `v0.24.1` | 영어 명언의 품격 있는 문어체(해라체/한다체) 한국어 자동 번역 |
| **Theme Management** | **next-themes** | `v0.4.6` | 라이트/다크 모드 시스템 감지 및 클래스 기반 테마 전환 유지 |

### 3.2 필수 환경 변수 명세 (Environment Variables)

`.env.local` 파일 또는 배포 플랫폼(Vercel 등)에 설정되어야 하는 환경 변수 목록입니다. 클라이언트 노출을 방지하기 위해 `NEXT_PUBLIC_` 접두사를 일절 사용하지 않습니다.

| 환경 변수명 | 필수 여부 | 기본값 / 설명 |
| :--- | :---: | :--- |
| `AUTH_SECRET` | **필수** | NextAuth v5 JWT 암호화에 사용되는 32자 이상의 무작위 비밀키 |
| `GOOGLE_CLIENT_ID` | **필수** | Google Cloud Console OAuth 2.0 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | **필수** | Google Cloud Console OAuth 2.0 클라이언트 보안 비밀번호 |
| `SUPABASE_URL` | **필수** | Supabase 프로젝트 URL (`https://<project-ref>.supabase.co`) |
| `SUPABASE_ANON_KEY` | **필수** | Supabase Anon 공개 API 키 (서버 라우트 내부에서만 호출됨) |
| `SUPABASE_SERVICE_ROLE_KEY` | 선택 | Supabase Service Role 키 (설정 시 Anon Key 대신 우선 적용) |
| `GEMINI_API_KEY` | 선택 | Google Gemini API 키 (미설정 시 무료 Google Translate로 자동 폴백) |
| `NEXTAUTH_URL` | 선택 | 로컬 개발(`http://localhost:3000`) 또는 배포 도메인 URL |

### 3.3 Supabase Database 스키마 구조

사용자의 노션 자격증명은 구글 이메일을 고유 식별자로 하여 Supabase의 `user_notion_tokens` 테이블에 보관됩니다:

```sql
create table public.user_notion_tokens (
  user_email text primary key,
  access_token text not null,
  database_id text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

---

## 4. 전체적인 프로그램 구조 및 파일별 역할

### 🏗️ 시스템 계층 구조 (Layered Architecture)

```
[ 브라우저 클라이언트 UI ]
       │  ▲ (React Query / 낙관적 업데이트)
       ▼  │
[ Next.js API Routes (BFF 프록시 & Zod 검증) ]
   ├── Google OAuth Token 자동 갱신 (auth.ts - 180일 세션)
   ├── Supabase DB 조회 (사용자별 노션 자격증명 보관)
   │
   ├──▶ [ Google Calendar API ] (일정 CRUD, 대한민국 공휴일)
   ├──▶ [ Notion Database API ] (습관 체크리스트, 속성 동기화)
   ├──▶ [ Google Gemini AI API ] (영문 명언 고급 번역)
   └──▶ [ ZenQuotes API ] (데일리 영문 명언 수급)
```

### 📂 프로젝트 파일 구조 및 세부 역할

```
simple-schedule/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth API 핸들러
│   │   ├── calendar/route.ts           # 구글 캘린더 일정 조회(GET) 및 추가(POST)
│   │   ├── calendar/[eventId]/route.ts # 특정 일정 수정(PATCH) 및 삭제(DELETE)
│   │   ├── calendars/route.ts          # 구글 캘린더 목록 조회 (기본/공유 캘린더)
│   │   ├── notion/token/route.ts       # Supabase 연동 노션 토큰/DB_ID 조회 및 저장
│   │   ├── notion/habits/route.ts      # 노션 체크리스트 조회(GET) 및 실시간 수정(PATCH)
│   │   ├── notion/habits/summary/route.ts # 2달치 습관 일괄 배치 쿼리 및 진행률 요약
│   │   ├── quotes/route.ts             # ZenQuotes 명언 호출 백엔드 라우트
│   │   ├── translate/route.ts          # Gemini AI 번역 및 무료 구글 번역 폴백 라우트
│   │   └── idioms/route.ts             # CSV 기반 한자 사자성어 무작위 파싱 라우트
│   ├── globals.css                     # Tailwind v4 @theme 전역 변수 및 플랫 디자인 정의
│   ├── layout.tsx                      # 루트 레이아웃 (뷰포트 줌 방지, 폰트, Providers)
│   ├── page.tsx                        # 메인 진입 페이지 (Header 및 CalendarContainer 렌더링)
│   ├── providers.tsx                   # NextAuth, React Query, next-themes Context 주입
│   └── sw.ts                           # Serwist 서비스 워커 런타임 캐싱 설정 (4가지 캐시 전략)
│
├── components/
│   ├── Header.tsx                      # 상단 네비게이션, 앱정보 모달, 테마/노션/캘린더 트리거, 로그아웃
│   ├── CalendarContainer.tsx           # 캘린더 전역 상태 허브 (날짜, 카테고리, 패널 높이 조절)
│   ├── MonthCalendar.tsx               # 2달 연속 무한 스크롤 CSS 그리드 달력 및 노션 4단계 아이콘
│   ├── FilterCategories.tsx            # 카테고리 필터 칩 버튼 (전체, 점심, 저녁, 휴가 등)
│   ├── BottomSheet.tsx                 # 모바일 바텀시트 / 데스크톱 우측 패널 전환 반응형 인터페이스
│   ├── CalendarSelectorSheet.tsx       # 다중 구글 캘린더 선택 및 즐겨찾기 바텀 시트
│   ├── NotionTokenModal.tsx            # 노션 API 토큰/DB_ID 등록 모달 및 '노션 우선' 설정
│   ├── NotionHabitChecklist.tsx         # 노션 체크리스트 실시간 편집기 (AutoResizeTextarea 포함)
│   └── QuotesModal.tsx                 # 매일의 명언 및 사자성어 듀얼 모드 모달 (TTS 발음 포함)
│
├── hooks/
│   ├── useCalendar.ts                  # 구글 캘린더 React Query 커스텀 훅 (재시도 래퍼 결합)
│   └── useNetworkStatus.ts             # 온라인/오프라인 네트워크 연결 상태 실시간 감지 훅
│
├── lib/
│   └── fetchWithSessionRetry.ts        # 401 발생 시 세션 새로고침 후 1회 자동 재시도하는 Fetch 래퍼
│
├── public/
│   ├── four_character_Chinese_idiom.csv # 한자 사자성어 데이터셋 (사자성어, 한글, 뜻, 훈음)
│   ├── manifest.json                   # PWA 매니페스트 메타데이터
│   ├── icons/ 및 images/               # PWA 투명 모서리 아이콘 및 테마 로고 이미지
│   └── sw.js                           # Serwist 빌드 결과 서비스 워커 파일
│
├── auth.ts                             # NextAuth v5 설정 (Google Provider, 180일 세션, 토큰 로테이션)
├── config.ts                           # 전역 설정 상수 (APP_VERSION, HELP_MESSAGE)
├── next.config.ts                      # Serwist PWA 빌드 래퍼 및 6대 HTTP 응답 보안 헤더 설정
├── eslint.config.mjs                   # ESLint 설정 파일 (public/sw.js 자동 배제)
└── types/                              # 외부 라이브러리 타입 선언 (lunar-javascript.d.ts 등)
```

---

## 5. 핵심 구현 특징 및 기술적 상세 (Technical Highlights)

### 5.1 BFF(Backend-For-Frontend) 보안 프록시 및 Zod 유효성 검증
- **민감 자격증명 보호**: 클라이언트 브라우저에는 구글 Access Token, 노션 Secret Key, Supabase Service Role Key가 절대 노출되지 않습니다. 모든 외부 API 통신은 Next.js 서버 라우트를 통해서만 수행됩니다.
- **엄격한 스키마 검증**: 모든 백엔드 엔드포인트는 `zod`를 도입하여 쿼리스트링 및 Request Body 파라미터를 철저하게 검증(Type/Value Validation)합니다.
- **에러 메시지 위생화(Sanitization)**: 서버 내부 오류 발생 시 데이터베이스 쿼리나 스택 트레이스를 클라이언트로 반환하지 않고, 서버 터미널 로깅 후 범용 메시지만 응답하여 정보 유출을 차단합니다.

### 5.2 180일 지속 Google OAuth 세션 및 무중단 자동 복구 (`fetchWithSessionRetry`)
- **180일 Rolling JWT 세션**: 모바일 PWA 환경에서 사용자가 매번 재로그인하는 불편을 해소하기 위해 세션 수명을 `180일(maxAge)`로 설정하고, 24시간 주기로 세션을 자동 갱신합니다.
- **치명적 오류와 일시적 오류의 분리**: Access Token 만료 시 Refresh Token을 이용해 백엔드에서 자동 재발급(Token Rotation)을 수행합니다. 이때 일시적인 네트워크 순단 오류는 묵인하고, 구글 서버에서 명시적으로 `invalid_grant`를 응답한 경우에만 치명적 오류로 간주하여 안전하게 로그아웃시킵니다.
- **만료 60초 전 사전 갱신(Early Refresh)**: 토큰 만료 60초 전부터 선제적으로 갱신을 트리거하여 요청 도중 토큰이 끊기는 레이스 컨디션을 방지합니다.
- **투명한 401 자동 재시도**: 프론트엔드 통신 중 401 응답을 수신하면 `fetchWithSessionRetry` 헬퍼가 즉시 `getSession()`을 호출해 서버의 토큰 갱신을 유도한 뒤, 실패했던 요청을 단 1회 조용히 재시도하여 사용자 작업 흐름이 끊기지 않도록 방어합니다.

### 5.3 Serwist 기반 Offline-First PWA 아키텍처 및 런타임 캐시 전략
`app/sw.ts`에 4단계 맞춤형 런타임 캐싱 규칙을 적용하여 오프라인 환경에서도 앱이 온전히 작동합니다:
1. **정적 내부 불변 자산 (`/_next/static/*`, 로고)**: `CacheFirst` (1년 TTL) 적용으로 제로 레이턴시 로딩.
2. **외부 프로필 이미지 (`*.googleusercontent.com`)**: `StaleWhileRevalidate` (30일 TTL) 및 `CacheableResponsePlugin({ statuses: [0, 200] })` 적용으로 캐시 깨짐 방지.
3. **캘린더 & 노션 API 데이터 (`/api/calendar`, `/api/notion/*`)**: `NetworkFirst` (네트워크 우선 시도 후 실패 시 직전 캐시 반환).
4. **오프라인 개인정보 즉시 청기(Purge)**: 사용자가 로그아웃하거나 세션이 만료될 경우 `handleSignOut` 루틴이 `window.caches.delete`를 일괄 실행하여 브라우저에 남은 2달치 개인 일정 및 습관 캐시를 영구 삭제합니다.
5. **Vercel 6대 HTTP 응답 보안 헤더 장착**: CSP(Content-Security-Policy), HSTS(1년), X-Frame-Options(DENY), X-Content-Type-Options(nosniff), Referrer-Policy, Permissions-Policy를 완비했습니다.

### 5.4 노션 습관 데이터의 제로 레이턴시 배치 쿼리 및 4단계 동적 SVG 아이콘
- **단 1번의 Batch Query (`/api/notion/habits/summary`)**: 캘린더에 표시되는 2달간의 노션 습관 데이터를 백그라운드에서 한 번에 쿼리하여 캐시에 저장합니다.
- **캐시 직접 재활용**: 사용자가 특정 날짜의 노션 체크리스트(`NotionHabitChecklist`)로 진입할 때 추가 네트워크 요청 없이 이미 로드된 배치 요약 캐시를 0.01초 내에 즉시 활용하여 렌더링 지연을 없앴습니다.
- **4단계 동적 SVG 아이콘 (`HabitProgressIcon`)**:
  - `0%` / `시작 전`: 비어 있는 깔끔한 점선 사각형.
  - `1% ~ 49%` / `진행 중`: 좌측/상단 모서리 점선, 우측/하단 모서리 실선 + 극소형 중앙 체크마크.
  - `50% ~ 99%`: 중간 크기 체크마크.
  - `100%` / `완료`: 사각형 바깥으로 역동적으로 뻗어나가는 대형 완료 체크마크.
  - 모든 날짜 헤더 행을 `20x20px (w-5 h-5)` 규격으로 일원화하여 오늘 날짜 박스 유무와 상관없이 1픽셀의 높낮이 오차 없이 완벽한 수평 정렬을 유지합니다.

### 5.5 데스크톱 2분할(Split-Screen) 및 모바일 적응형 UI
- 가로 폭 768px(`md`) 이상 환경에서는 팝업 형태의 모달이 사라지고 우측 사이드 패널로 자연스럽게 전환되어, 좌측의 2달 캘린더를 보면서 우측에서 선택 날짜의 일정을 실시간으로 열람/수정할 수 있습니다.
- 모바일 환경에서는 사용자가 터치 드래그로 캘린더 영역의 높이를 자유롭게 조절할 수 있도록 리사이징 핸들러와 Webkit Flex 패딩 버그를 우회하는 동적 높이 스페이서를 내장했습니다.

### 5.6 매일의 명언 및 사자성어 듀얼 인용구 시스템
- **Gemini AI + 무료 구글 번역 Fallback 구조**: Gemini API 키가 등록되어 있으면 자연스러운 문어체(해라체/한다체) 한국어로 번역하고, 키가 없거나 할당량 초과 시 크롬 확장프로그램용 무료 구글 번역 엔드포인트(`client=dict-chrome-ex`) 및 User-Agent 헤더를 조합해 봇 차단 없이 안전하게 자동 전환되어 중단 없이 번역을 제공합니다.
- **CSV 사자성어 파서**: `four_character_Chinese_idiom.csv`의 뜻이나 훈음에 콤마(`,`) 및 따옴표가 포함되어 있어도 데이터 유실 없이 안전하게 행을 파싱하는 전용 알고리즘을 구현했습니다.

### 5.7 클라이언트 LocalStorage 상태 키 명세

브라우저 로컬 저장소(`localStorage`)에 저장되어 사용자 개인화 설정을 유지하는 키 목록입니다:

| 스토리지 키 | 데이터 타입 | 기본값 | 기능 및 설명 |
| :--- | :---: | :---: | :--- |
| `calendar_font_size` | `"sm"` \| `"md"` \| `"lg"` | `"md"` | 캘린더 날짜 및 일정 글자 크기 (9px / 11px / 12px) |
| `notion_prefer_today` | `"true"` \| `"false"` | `"false"` | '전체 조회' 상태에서 오늘 날짜 클릭 시 노션 화면 우선 실행 |
| `show_quotes_on_startup` | `"true"` \| `"false"` | `"true"` | 앱 접속 시 명언 모달 자동 팝업 여부 |
| `use_zen_quotes` | `"true"` \| `"false"` | `"true"` | ZenQuotes 영문 명언 소스 사용 여부 |
| `use_idioms` | `"true"` \| `"false"` | `"true"` | 한자 사자성어 소스 사용 여부 |
| `last_quote_data` | JSON String | `{}` | 오프라인 환경에서 즉시 렌더링하기 위한 마지막 인용구 캐시 |

---

## 6. 주요 기능 및 수정 히스토리 (Changelog: Updates 1 ~ 25)

1. **상태 분기 처리 (조회 모드 vs 추가 모드)**: '전체 조회' 카테고리에서 날짜 탭 시 추가 폼 대신 일정 목록(조회 모드)을 우선 표시하고 상호 전환 버튼 제공.
2. **대한민국 공휴일 연동 및 주말 강조**: 구글 대한민국 휴일 캘린더 병렬 패치, 일요일/공휴일 빨간색 표시 및 공휴일 명칭 표기.
3. **UI 디테일 최적화**: 일정 마커 최하단 정렬(`justify-end`), 연/월 헤더 가독성 강화, 요일 폰트 일치, 필터 버튼 스타일 정돈.
4. **다크 모드 지원 및 지나간 일정 처리**: `next-themes` 기반 다크 모드 토글, 과거 일정 투명도(`opacity-50`) 및 그레이스케일(`grayscale`) 필터 적용.
5. **일정 수정/삭제 및 날짜 변경 기능**: 낙관적 업데이트 기반 일정 수정/삭제, 약속 날짜 변경용 Date Input 및 종일/시간 일정 충돌 방어 로직 탑재.
6. **다중 공유 캘린더 조회 및 방어 로직**: 구글 계정 내 공유 캘린더 다중 선택 바텀 시트(`CalendarSelectorSheet`), 읽기 전용/반복 일정 수정 제한 방어벽 구현.
7. **UX 및 헤더 디자인 개편**: 'Simple Schedule' 타이포그래피 로고 개편, 모바일 텍스트 줄바꿈 방지, 카테고리 필터 버튼 Material 아이콘 결합.
8. **두 달 연속 무한 스크롤 캘린더**: 이번 달과 다음 달을 단일 CSS Grid로 이어붙인 무한 스크롤 그리드 구현, 월 경계선 테두리 동적 렌더링, 상단 헤더 sticky 고정.
9. **UI 가용 공간 확대 및 음력 날짜 지원**: 캘린더 세로 높이 확대(75dvh -> 85dvh), `lunar-javascript` 도입으로 양력 옆 음력 날짜 자동 표기, 요일 헤더 정렬 일치.
10. **데스크톱 좌우 2분할 반응형 레이아웃**: 최대 너비 1200px 확장, 데스크톱(`md` 이상) 환경에서 우측 사이드 패널로 자동 전환되는 2분할 UI 구현.
11. **노션 액세스 토큰 & DB ID 관리 모달 및 Supabase 연동**: 헤더 내 노션 아이콘 신설, 마스킹 없는 직관적 설정 모달(`NotionTokenModal`), 구글 이메일 기준 Supabase DB 안전 저장.
12. **노션 실시간 습관 체크리스트 연동**: 일정 화면 내 체크박스 바로가기 버튼 추가, "날짜" 속성 기준 매칭, 체크박스/상태/텍스트 맞춤 편집 UI 및 실시간 동기화.
13. **캘린더 내 노션 습관 진행 현황 실시간 표기**: 2달치 노션 습관 데이터를 1번의 비동기 배치 쿼리(`/api/notion/habits/summary`)로 호출하여 제로 레이턴시 렌더링 구현.
14. **노션 습관 캐시 재활용 및 UX 개선**: 배치 요약 캐시를 체크리스트 상세 진입 시 0.01초 만에 즉시 재활용, 모바일 포커스 시 화면 자동 줌 차단 메타태그 설정, '오늘 일정 조회 시 노션 우선' 옵션 추가.
15. **PWA 오프라인 지원 아키텍처 (Offline-First)**: Serwist 4중 런타임 캐시 전략 수립, 오프라인 시 100% 읽기 전용 방어 모드 및 `cloud_off` 빨간색 펄스 뱃지 도입, 앱 정보 모달에 '최신 버전으로 업데이트' 캐시 초기화 기능 신설.
16. **노션 체크리스트 UI 고도화 및 4단계 동적 아이콘**: `AutoResizeTextarea` 유동형 텍스트 입력창 도입, 캘린더 날짜 칸 동적 4단계 모노톤 SVG 아이콘(`HabitProgressIcon`) 구현, 전 날짜 행 높이 규격화(`w-5 h-5`).
17. **서버리스 종합 보안 검증 및 하드닝**: Zod 기반 전체 API 입력 검증 및 에러 메시지 위생화, 서버 환경 변수에서 `NEXT_PUBLIC_` 접두사 제거, 로그아웃 시 브라우저 오프라인 개인정보 캐시 강제 청기(`caches.delete`), Vercel 6대 HTTP 보안 헤더 장착.
18. **PWA 이미지 캐시 전략 분리 및 프로필 Fallback**: 구글 아바타 이미지를 `StaleWhileRevalidate`로 분리하여 캐시 깨짐 방지, 구글 아바타 로딩 실패 시 기본 프로필 아이콘(`account_circle`) 자동 폴백.
19. **매일의 명언(Quotes) 모달 및 무료 자동 번역/TTS**: 최초 진입 시 명언 모달 렌더링, Gemini Flash Lite AI 번역(Fallback: 구글 번역), Touch & Reveal 인터랙션, Web Speech API 음성 재생, 로컬 캐시 오프라인 지원.
20. **명언 모달 내 '사자성어' 무작위 노출 (Dual Quotes Mode)**: CSV 기반 사자성어 라우트 신설(콤마 포함 문자열 안전 파싱), 하단 ZenQuotes/사자성어 토글 체크박스, 우측 TTS 발음 버튼 배치.
21. **노션 습관 진행 현황 상태별 시각화**: 노션의 '상태(Status)' 속성값(시작 전: 전체 점선, 진행 중: 상/좌 점선, 완료: 전체 실선)에 따른 동적 SVG 테두리 렌더링.
22. **바텀 시트(BottomSheet) 스크롤 및 드래그 버그 수정**: Webkit Flex 패딩 버그를 우회하는 동적 높이 스페이서 삽입으로 시트 높이 변경 시 내부 스크롤 가림 현상 완벽 해결.
23. **Google OAuth 세션 유지 및 토큰 갱신 안정화 (Session Persistence)**: 치명적 오류(`invalid_grant`)와 일시적 오류 분리, 401 수신 시 세션 갱신 후 1회 조용한 자동 재시도(`fetchWithSessionRetry`) 구현, 토큰 만료 60초 전 선제 갱신, 세션 수명 180일 연장.
24. **앱 정보 모달 UI 개편 및 개인정보처리방침/버전 표기**: 모달 하단의 불필요한 '확인' 버튼 제거, 좌측에 새 창으로 열리는 **'개인정보처리방침'(`https://landing-doohee2.vercel.app/privacy`)** 링크 및 우측에 **`APP_VERSION`** 텍스트를 배치하여 UI 완성도 향상.
25. **구글 무료 번역 API 엔드포인트 안정화 및 ESLint 빌드 배제 최적화**: 구글 무료 번역의 기존 gtx 엔드포인트 429 차단 이슈를 해소하기 위해 `dict-chrome-ex` 엔드포인트 및 브라우저 User-Agent 헤더로 전환하고, `eslint.config.mjs`의 `globalIgnores`에 서비스 워커 번들 산출물(`public/sw.js`)을 추가하여 빌드 파이프라인 무결성을 확보.

---

## 7. 향후 유지보수 및 운영 가이드라인 (Maintenance Guide)

### ⚠️ 1) Google Cloud Console OAuth 동의 화면 "프로덕션" 게시 필수
- 현재 코드는 180일 장기 세션과 백그라운드 Token Rotation을 완벽히 지원하도록 작성되어 있습니다.
- **[주의]** 만약 사용자가 **정확히 7일마다 로그인 세션이 끊기는 현상**을 겪는다면, 이는 코드가 아니라 Google Cloud Console의 **'OAuth 동의 화면' 상태가 "테스트(Testing)"로 머물러 있기 때문**입니다.
- 테스트 상태의 OAuth 앱은 구글 보안 정책상 Refresh Token이 무조건 7일 후 강제 만료됩니다. 개인/소규모 사용 목적의 경우 복잡한 구글 심사 없이도 상태를 **"프로덕션(In Production)"**으로 즉시 전환할 수 있으므로, 반드시 프로덕션으로 게시하여 영구 토큰 유지를 활성화해야 합니다.

### ⚠️ 2) Tailwind CSS v4와 빌드 환경 (Webpack 강제 이유)
- 본 프로젝트는 최신 Tailwind CSS v4를 도입하여 `globals.css` 내 `@theme` 지시어로 테마를 제어합니다.
- Next.js 16+ 환경에서 Tailwind v4는 아직 기본 번들러인 Turbopack과 일부 호환성 이슈가 발생할 수 있어, `package.json`의 스크립트가 `next dev --webpack` 및 `next build --webpack`으로 고정되어 있습니다. 향후 공식 호환성이 완전히 검증되기 전까지는 임의로 `--webpack` 플래그를 제거하지 않는 것을 권장합니다.

### ⚠️ 3) 환경 변수 보안 및 접두사 관리
- Supabase 연결 정보(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), Gemini API 키(`GEMINI_API_KEY`), 구글 클라이언트 시크릿(`GOOGLE_CLIENT_SECRET`) 등은 **절대 `NEXT_PUBLIC_` 접두사를 붙여서는 안 됩니다.**
- 오직 서버 사이드 API Route 및 `auth.ts`에서만 `process.env`로 호출되어야 브라우저 클라이언트 JS 번들에 비밀 정보가 유출되지 않습니다.

### ⚠️ 4) 이벤트 카테고리 식별 방식의 향후 고도화
- 현재 `MonthCalendar.tsx` 및 `CalendarContainer.tsx`에서의 카테고리 분류(점심, 저녁, 휴가 등)는 구글 캘린더 일정의 `summary`(제목) 및 `description`(메모)에 특정 단어가 포함되어 있는지(`includes()`)를 검사하는 방식에 기반합니다.
- 향후 다국어 지원이나 정밀한 카테고리 관리가 필요할 경우, Google Calendar API의 `extendedProperties` 메타데이터 속성을 활용하여 일정 생성/수정 시 카테고리 고유 식별자를 직접 저장하고 필터링하는 방식으로 확장을 고려할 수 있습니다.

### ⚠️ 5) 타임존(Timezone) 컨벤션
- 현재 모든 날짜 계산은 `date-fns`를 통해 브라우저가 위치한 현지 로컬 타임존(KST, UTC+9)을 기준으로 동작합니다.
- 만약 글로벌 사용자를 대상으로 하거나 해외 여행 중 일정 오차를 방지해야 할 경우, `date-fns-tz`를 도입하여 사용자 설정에 기반한 고정 타임존 앵커링을 적용하는 것을 권장합니다.
