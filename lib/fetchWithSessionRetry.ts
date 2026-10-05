import { getSession } from "next-auth/react";

/**
 * 401 Unauthorized 에러 발생 시, 세션을 한 번 새로고침(getSession)하여 
 * 서버에서 구글 토큰을 갱신하도록 유도한 뒤 딱 1회만 재시도하는 헬퍼 함수.
 * 클라이언트(Browser) 환경에서만 사용 가능합니다.
 */
export async function fetchWithSessionRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let res = await fetch(input, init);

  // 401이고 온라인 상태일 때만 재시도
  if (res.status === 401 && navigator.onLine) {
    console.log("[Auth] 401 received. Attempting to refresh session...");
    
    // getSession() 호출 시 클라이언트->서버 NextAuth 엔드포인트로 요청이 가면서, 
    // 서버의 jwt 콜백이 실행되어 만료된 토큰이 있으면 구글로부터 새 토큰을 받아옴
    const session = await getSession();

    // @ts-ignore
    if (session?.error === "RefreshAccessTokenError") {
      console.error("[Auth] Session refresh failed fatally.");
      return res; // 그냥 401을 리턴해서 상위 에러 핸들러로 넘김. 로그아웃은 Header.tsx가 알아서 처리.
    }

    // 세션 갱신 성공(또는 일시적 오류지만 아직 치명적 실패는 아님) 후 1회 재시도
    console.log("[Auth] Session refreshed, retrying request...");
    res = await fetch(input, init);
  }

  return res;
}
