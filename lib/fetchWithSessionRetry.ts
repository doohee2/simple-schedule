import { getSession } from "next-auth/react";

let isFatalSessionError = false;

export function resetFatalSessionError() {
  isFatalSessionError = false;
}

/**
 * 401 Unauthorized 에러 발생 시, 세션을 한 번 새로고침(getSession)하여 
 * 서버에서 구글 토큰을 갱신하도록 유도한 뒤 딱 1회만 재시도하는 헬퍼 함수.
 * 클라이언트(Browser) 환경에서만 사용 가능합니다.
 */
export async function fetchWithSessionRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let res = await fetch(input, init);

  // 401이고 온라인 상태이며, 아직 치명적 세션 오류가 확인되지 않았을 때만 1회 재시도
  if (res.status === 401 && navigator.onLine && !isFatalSessionError) {
    console.log("[Auth] 401 received. Attempting to refresh session...");
    
    // getSession() 호출 시 클라이언트->서버 NextAuth 엔드포인트로 요청이 가면서, 
    // 서버의 jwt 콜백이 실행되어 만료된 토큰이 있으면 구글로부터 새 토큰을 받아옴
    const session = await getSession();

    // @ts-ignore
    if (session?.error === "RefreshAccessTokenError") {
      console.error("[Auth] Session refresh failed fatally.");
      isFatalSessionError = true;
      return res; // 그냥 401을 리턴해서 상위 에러 핸들러로 넘김. UI 알림은 Header.tsx가 전담.
    }

    // 세션 갱신 성공(또는 일시적 오류지만 아직 치명적 실패는 아님) 후 1회 재시도
    console.log("[Auth] Session refreshed, retrying request...");
    res = await fetch(input, init);
  }

  return res;
}
