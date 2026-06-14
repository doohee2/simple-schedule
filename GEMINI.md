# Simple Schedule PWA - 개발 문서

본 문서는 구글 캘린더 연동 기반의 PWA(Progressive Web App) 'Simple Schedule' 프로젝트의 전체적인 구조와 사용된 기술 스택, 그리고 각 소스 파일의 역할 및 향후 유지보수를 위한 가이드라인을 정리한 문서입니다.

## 1. 사용된 기술 스택 및 프레임워크

- **Next.js (App Router, v15+)**: 애플리케이션의 핵심 뼈대입니다. 서버 사이드 렌더링(SSR), API 라우트, 페이지 라우팅을 담당합니다.
- **React (v18+)**: UI 컴포넌트를 구성하는 기반 라이브러리입니다.
- **Tailwind CSS (v4)**: 유틸리티 기반의 CSS 프레임워크입니다. 최신 v4 버전의 `@theme` 지시어를 사용하여 `globals.css`에서 통합적으로 컬러 및 타이포그래피 변수를 제어하고 있습니다.
- **NextAuth.js (v5, `next-auth`)**: 사용자 인증을 담당합니다. Google OAuth Provider를 사용하여 사용자의 구글 계정으로 로그인하고 구글 캘린더 접근 권한(Access Token)을 획득합니다.
- **React Query (`@tanstack/react-query`)**: 서버 상태(Server State) 관리 라이브러리입니다. 구글 캘린더 API 호출의 캐싱, 로딩 상태 관리, 낙관적 업데이트 및 데이터 동기화를 처리합니다.
- **date-fns**: 자바스크립트의 복잡한 날짜 연산을 직관적이고 쉽게 처리하기 위해 사용된 유틸리티 라이브러리입니다. 달력의 그리드 계산 및 날짜 포맷팅에 사용됩니다.
- **Serwist (next-pwa 대체)**: 애플리케이션이 모바일 기기에서 네이티브 앱처럼 동작(오프라인 캐싱, 홈 화면 추가 등)할 수 있도록 Service Worker와 `manifest.json`을 구성해 줍니다.

---

## 2. 전체적인 프로그램 구조

프로젝트는 크게 **(1) 인증 및 서버 API 계층**, **(2) 데이터 통신 계층 (Hooks)**, **(3) 클라이언트 UI 컴포넌트 계층**으로 나뉩니다.

사용자가 앱에 접속하여 Google 로그인을 수행하면, NextAuth가 Google로부터 받은 Access Token을 세션에 저장합니다. 이후 클라이언트에서 캘린더 데이터를 요청하면, React Query가 Next.js의 API 엔드포인트(`/api/calendar`)를 호출하고, 이 API 라우트 내부에서 세션에 저장된 토큰을 꺼내어 실제 Google Calendar API와 통신을 중계하는 구조입니다.

이러한 **프록시(Proxy) 구조**를 채택함으로써, 클라이언트 측(브라우저)에 민감한 Access Token이 직접 노출되는 것을 방지하고 CORS 이슈를 해결할 수 있습니다.

---

## 3. 주요 소스 파일별 기능과 역할

### 📂 `app/` (Next.js App Router)
- **`layout.tsx`**: 앱의 최상위 레이아웃입니다. 구글 웹 폰트(`Plus Jakarta Sans`, `Be Vietnam Pro`)를 로드하고, `Providers` 컴포넌트를 감싸 전역 상태 컨텍스트를 주입합니다.
- **`page.tsx`**: 앱의 메인 페이지입니다. 상단 `Header`와 메인 달력 영역인 `CalendarContainer`를 렌더링합니다.
- **`globals.css`**: Tailwind v4의 글로벌 스타일이 정의된 곳입니다. `--color-*`, `--spacing-*`, `--radius-*` (모두 0px로 플랫 디자인 적용됨) 등의 테마 변수가 중앙 집중적으로 관리됩니다.
- **`api/auth/[...nextauth]/route.ts`**: NextAuth의 API 라우트로, 로그인/로그아웃 요청을 처리합니다. 실제 설정은 루트의 `auth.ts`에 위임되어 있습니다.
- **`api/calendar/route.ts`**: 구글 API와의 통신을 대행하는 백엔드 라우트입니다.
  - `GET`: 구글 캘린더의 일정 목록을 가져옵니다. (`timeMin`, `timeMax`로 기간 필터링)
  - `POST`: 새로운 일정을 구글 캘린더에 생성합니다.

### 📂 `components/` (클라이언트 UI 컴포넌트)
- **`Providers.tsx`**: NextAuth의 `SessionProvider`와 React Query의 `QueryClientProvider`를 묶어 하위 컴포넌트들에 제공합니다.
- **`Header.tsx`**: 앱 상단의 네비게이션 바입니다. 로고 및 타이틀, 그리고 사용자의 로그인/로그아웃 버튼을 포함합니다.
- **`CalendarContainer.tsx`**: 달력 시스템의 **상태 관리 허브**입니다. 사용자가 선택한 날짜(`selectedDate`), 선택한 카테고리(`selectedCategory`), 현재 보고 있는 달(`currentDate`)의 상태를 관리하고, `useCalendarEvents` 훅을 호출해 데이터를 하위 컴포넌트들로 내려줍니다(Props Drilling).
- **`MonthCalendar.tsx`**: 실제 7열(그리드) 구조의 달력을 그리는 컴포넌트입니다. `date-fns`를 이용해 해당 월의 날짜 배열을 생성하고, 이벤트 데이터와 매핑하여 점심/저녁/휴가 등 파스텔톤 블록으로 일정을 표시합니다. 플랫(Flat)한 풀 위드스 디자인이 적용되어 있습니다.
- **`FilterCategories.tsx`**: '전체', '점심', '저녁', '기타' 등 카테고리 칩 버튼들을 렌더링하며, 사용자의 클릭에 따라 필터 상태를 변경합니다.
- **`BottomSheet.tsx`**: 달력에서 특정 날짜를 클릭 시 하단에서 올라오는 시트 컴포넌트입니다. 약속 대상(제목), 메모, 시작/종료 시간을 입력받는 폼(Form)을 가지고 있으며, 작성 후 `POST` API를 호출해 이벤트를 추가합니다.

### 📂 `hooks/` & 기타
- **`hooks/useCalendar.ts`**: React Query를 래핑한 커스텀 훅입니다.
  - `useCalendarEvents`: 달력 이벤트를 GET하는 쿼리입니다.
  - `useAddCalendarEvent`: 일정을 추가하는 POST 뮤테이션입니다. `onSuccess` 시 캐시를 무효화(invalidate)하여 달력을 자동 갱신합니다.
- **`auth.ts`**: NextAuth의 설정 파일입니다. 구글 프로바이더 등록 및 `https://www.googleapis.com/auth/calendar.events` 스코프 권한 요청 로직이 들어있습니다.

---

## 4. 최근 업데이트 및 주요 기능 (Recent Updates)

프로젝트 개발 과정에서 다음과 같은 UI/UX 및 기능 개선이 이루어졌습니다:

1. **상태 분기 처리 (조회 모드 vs 추가 모드)**:
   - '전체 조회' 카테고리가 선택된 상태에서 날짜를 탭하면, 일정을 추가하는 폼이 아닌 해당 날짜의 **일정 목록(조회 모드)**이 먼저 바텀 시트로 나타납니다.
   - 종일 일정은 가나다순, 일반 일정은 시간순으로 정렬되어 노출되며, 좌상단의 뒤로가기(`←`) 버튼 및 우상단의 추가(`+`) 버튼을 통해 조회/추가 모드를 자유롭게 전환할 수 있습니다.
2. **대한민국 공휴일 연동 및 주말 강조**:
   - `GET /api/calendar`에서 기본 캘린더 데이터뿐만 아니라 구글이 제공하는 **대한민국 휴일 캘린더(`ko.south_korea#holiday@...`)** 데이터를 병렬(`Promise.all`)로 함께 패치합니다.
   - 달력에서 주말(토, 일)은 조금 더 굵은 글씨체(`font-bold`)로 강조되며, 일요일과 공휴일은 텍스트가 빨간색(`text-error`)으로 표시됩니다.
   - 공휴일인 경우 날짜 숫자 바로 아래에 공휴일 이름(예: 광복절)이 표기됩니다.
3. **UI 디테일 최적화**:
   - 일정 마커(점심, 저녁, 휴가 등)들이 각 날짜 칸의 최하단에 밑에서부터 차곡차곡 쌓이도록 정렬(`justify-end`)을 개선했습니다.
   - 캘린더 상단 헤더(연도/월)의 크기와 굵기를 키워 가독성을 높였으며, 요일 헤더의 '토' 글씨 색상을 평일과 동일한 진하기로 일치시켰습니다.
   - 상단 카테고리 필터 버튼들은 부드러운 둥근 모서리(`rounded-md`)를 가지며, 선택 시 굵은 글씨(`font-bold`)로 활성화 상태를 명확히 보여줍니다.
4. **다크 모드 지원 및 추가 UI 최적화**:
   - `Header` 컴포넌트의 테마 토글 버튼을 통해 다크 모드를 지원하며, `localStorage`와 Tailwind의 `@custom-variant`를 활용해 상태를 유지합니다.
   - 캘린더 상단의 헤더 정렬과 글꼴 통일성을 맞추었고, 앱 하단에 `config.ts` 기반의 버전 정보를 표기했습니다.
   - 지난 과거의 일정은 달력 상에서 투명도(`opacity-50`)와 흑백 필터(`grayscale`)가 적용되어 지나간 일정임을 시각적으로 명확히 구분할 수 있습니다.
5. **일정 수정/삭제 및 날짜 변경 기능**:
   - 바텀 시트에서 특정 일정을 탭해 상세 내용을 수정(PATCH)하거나 삭제(DELETE)할 수 있으며, React Query의 낙관적 업데이트(Optimistic Update)를 통해 빠른 사용자 피드백을 제공합니다.
   - 약속의 "날짜" 자체를 변경할 수 있는 Date Input을 추가하였으며, 종일 일정과 시간 지정 일정 간의 상호 변환 시 Google Calendar API 충돌 문제를 방지하는 로직을 적용했습니다.
6. **다중 공유 캘린더 조회 및 방어 로직**:
   - 상단의 '캘린더 선택' 바텀 시트(`CalendarSelectorSheet`)를 통해 사용자의 구글 계정에 연동된 여러 공유 캘린더들을 한 번에 켜고 끌 수 있습니다 (`Promise.all` 병렬 패치 활용).
   - '읽기 전용' 권한(`reader` 등)을 가진 캘린더나 '반복 일정'의 경우, 데이터 수정을 막고 안내 배지를 띄워 에러를 방지하는 예외 처리 방어 로직이 꼼꼼하게 적용되어 있습니다.
   - 로그아웃 상태일 때는 불필요한 API 요청을 원천 차단(`enabled` 옵션 활용)하여 앱 초기 렌더링 속도를 대폭 개선했습니다.

---

## 5. 향후 유지보수 시 고려사항 (Implications)

### 1) Google OAuth Refresh Token 전략 (구현 완료)
현재 구현은 세션 유지 기간 동안 Google API Access Token을 활용하며, Access Token이 만료(일반적으로 1시간)될 경우 `auth.ts` 내부의 JWT 콜백을 통해 Refresh Token으로 **새로운 Access Token을 자동 갱신(Token Rotation)** 하도록 처리되어 있습니다.
만약 토큰 갱신 중 문제가 발생할 경우 세션 객체에 `error: "RefreshAccessTokenError"`를 반환하여 클라이언트 측에서 재로그인을 유도할 수 있는 기반이 마련되어 있습니다.

### 2) Tailwind v4와 빌드 환경 (Turbopack)
현재 프로젝트는 Tailwind CSS v4를 도입하여 css 파일 내 `@theme` 지시어로 테마를 관리하고 있습니다. Next.js 15+ 환경에서 Tailwind v4는 아직 기본 번들러인 Turbopack과 일부 호환성 이슈가 발생할 수 있어, `package.json`의 스크립트가 `next dev --webpack` 및 `next build --webpack`으로 강제되어 있습니다. 추후 호환성 이슈가 패치되면 `--webpack` 플래그를 제거하여 빌드 속도를 향상시킬 수 있습니다.

### 3) 이벤트 카테고리 식별 방식의 한계
현재 `MonthCalendar.tsx` 및 `CalendarContainer.tsx`에서의 카테고리 필터링(점심, 저녁, 휴가 등) 로직은 단순히 구글 캘린더 이벤트의 **`summary`(제목) 및 `description`(메모) 텍스트에 해당 단어가 포함되어 있는지(`includes()`)**를 검사하는 방식에 의존하고 있습니다. 
**대응 방안:** 추후 분류가 복잡해지거나 언어가 달라질 경우를 대비하여, Google Calendar API의 `extendedProperties` 필드를 이용해 이벤트 생성(POST) 시 메타데이터로 카테고리 값을 명시적으로 저장하고, 이를 통해 필터링하도록 고도화하는 것을 권장합니다.

### 4) 타임존(Timezone) 처리
현재 `date-fns`를 통해 브라우저 로컬 타임존 기반으로 일정을 생성하고 있습니다. 만약 글로벌 서비스를 목표로 하거나, 사용자가 여행 중 타임존이 변경되었을 때 일정을 다르게 렌더링해야 하는 이슈가 생길 수 있습니다. 필요하다면 `date-fns-tz`를 활용하여 서버/클라이언트 간 일관된 타임존 컨벤션을 지정해야 합니다.
