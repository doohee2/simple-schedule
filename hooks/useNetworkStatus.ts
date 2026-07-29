"use client";

import { useState, useEffect, useCallback } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const checkConnection = useCallback(async () => {
    // 1차 검증: 브라우저 물리 네트워크 자체가 끊겨 있으면 즉시 오프라인 확정
    if (typeof window !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      return;
    }

    // 2차 검증: 실제 인터넷/백엔드 생존 여부 능동 핑 테스트 (SW 캐시 및 HEAD 요청 우회)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5초 타임아웃

      // HEAD 메서드 + timestamp 쿼리와 no-store로 서비스 워커 캐시를 우회하고 실제 망 상태만 진단
      const response = await fetch(`/manifest.json?_t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || (response.status >= 200 && response.status < 400)) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      // 네트워크 차단, 와이파이 단절, DNS 에러, 타임아웃 감지 시 즉시 오프라인 전환
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      checkConnection();

      const handleOnline = () => checkConnection();
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("focus", checkConnection);

      // 탭이 활성화되어 있는 동안 15초 주기 능동 생존 체크
      const intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          checkConnection();
        }
      }, 15000);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("focus", checkConnection);
        clearInterval(intervalId);
      };
    }
  }, [checkConnection]);

  return isOnline;
}
