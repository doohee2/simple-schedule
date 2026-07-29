"use client";

import { useState, useEffect, useCallback } from "react";

export function useNetworkStatus() {
  // 0단계 동기적 판단: 마운트되는 즉시 0초 만에 브라우저 오프라인 여부를 동기적으로 판단 (불필요한 타임아웃 지연 원천 차단)
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== "undefined" ? navigator.onLine : true
  );

  const checkConnection = useCallback(async () => {
    // 1차 검증: 물리 네트워크가 꺼져 있으면 즉시 오프라인 처리
    if (typeof window !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      return;
    }

    // 2차 검증: 초고속 1.2초 컷 능동 생존 테스트 (가상 접속/오프라인 대기 스피너 차단 및 회복 감지)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2초 타임아웃 (초고속 판별)

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

      // 네트워크 응답 도달 시 (온라인 회복 완료!)
      if (response.ok || (response.status >= 200 && response.status < 400)) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // 초기 진입 시 즉석 검증
      checkConnection();

      // 온라인 회복 시 즉각 실망 회전율 검증 후 회복 처리
      const handleOnline = () => checkConnection();
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("focus", checkConnection);

      // 온라인 복구 여부 및 생존 상태를 15초마다 주기적으로 검증하여 회신 회복 보장
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
