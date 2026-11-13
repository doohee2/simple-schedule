"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { HELP_MESSAGE, APP_VERSION } from "@/config";
import NotionTokenModal from "./NotionTokenModal";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { resetFatalSessionError } from "@/lib/fetchWithSessionRetry";

export default function Header() {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);
  const [isSessionExpiredOpen, setIsSessionExpiredOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const isOnline = useNetworkStatus();
  const isHandlingExpiryRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("calendar_font_size") as "sm" | "md" | "lg";
      if (saved && ["sm", "md", "lg"].includes(saved)) {
        setFontSize(saved);
      } else {
        setFontSize("md");
      }
    }
  }, [isHelpOpen]);

  const handleFontSizeChange = (size: "sm" | "md" | "lg") => {
    setFontSize(size);
    if (typeof window !== "undefined") {
      localStorage.setItem("calendar_font_size", size);
      window.dispatchEvent(new Event("calendar_font_size_change"));
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setImgError(false);
  }, [session?.user?.image]);

  // 사용자가 헤더의 프로필 아이콘을 직접 눌러 자발적으로 로그아웃할 때만 PWA 캐시 삭제
  const handleManualSignOut = async () => {
    resetFatalSessionError();
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
        console.log("[PWA Security] Offline runtime caches purged successfully.");
      }
    } catch (e) {
      console.error("[PWA Security] Error purging offline caches:", e);
    }
    signOut({ callbackUrl: "/" });
  };

  useEffect(() => {
    // 💡 오프라인 상태일 때는 세션 만료 처리를 절대 진행하지 않음 (로컬 캐시 보존 및 오프라인 읽기 전용 모드 유지)
    if (!isOnline) {
      return;
    }

    // @ts-ignore
    if ((session as any)?.error === "RefreshAccessTokenError") {
      // 중복 alert/모달 루프 방지: 1회만 모달 노출
      if (!isHandlingExpiryRef.current) {
        isHandlingExpiryRef.current = true;
        setIsSessionExpiredOpen(true);
      }
    } else {
      isHandlingExpiryRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(session as any)?.error, isOnline]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="bg-surface flex items-center justify-between px-2 sm:px-margin-mobile h-12 w-full z-40 relative flex-shrink-0 border-b border-outline-variant max-w-[1200px] mx-auto transition-colors duration-300">
      {/* Left side: Title + Offline Badge */}
      <div className="flex items-center gap-1">
        <div 
          onClick={() => setIsHelpOpen(true)}
          className="flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity active:scale-[0.98]"
          title="앱 정보 및 안내"
        >
          <span className="material-symbols-outlined text-[28px] sm:text-[32px] text-[#0066ff] dark:text-[#d0ebff] transition-colors duration-300 drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            calendar_month
          </span>
          <svg viewBox="0 0 360 60" className="h-[28px] sm:h-[34px] w-auto drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
            <text x="0" y="45" fontWeight="800" fontSize="42" letterSpacing="-0.02em" className="fill-[#0066ff] dark:fill-[#d0ebff] transition-colors duration-300">Simple</text>
            <circle cx="18" cy="10" r="4" className="fill-[#0066ff] dark:fill-[#d0ebff] transition-colors duration-300"/>
            <text x="145" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" className="fill-[#1e293b] dark:fill-[#ffffff] transition-colors duration-300">Schedule</text>
          </svg>
        </div>
        {!isOnline && (
          <div 
            className="flex items-center justify-center text-error ml-0.5"
            title="오프라인 상태 (조회 전용 모드)"
          >
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">cloud_off</span>
          </div>
        )}
      </div>
      
      {/* Right side: Theme + Session controls */}
      <div className="flex items-center gap-0.5">
        <button 
          onClick={toggleTheme}
          className="text-primary hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9"
          title="테마 변경"
        >
          <span className="material-symbols-outlined text-[20px] sm:text-[22px]" style={{ fontVariationSettings: "'FILL' 0" }}>
            {mounted && resolvedTheme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
        {session ? (
          <div className="flex items-center gap-0 sm:gap-0.5">
            <button 
              onClick={() => window.dispatchEvent(new Event("openCalendarSelector"))}
              className="hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-primary bg-transparent rounded-full"
              title="캘린더 선택"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            </button>
            <button 
              onClick={() => setIsNotionModalOpen(true)}
              className="hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-primary bg-transparent rounded-full"
              title="노션 연동 설정"
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V5.354c0-.606-.233-.933-.888-.887L5.86 5.308c-.467.046-.608.28-.608.98z" />
                <path d="M14.643 8.337v7.697c0 .42-.14.7-.514.7L12.5 16.828c-.28.046-.373-.093-.373-.373v-5.692L8.719 17.06c-.187.234-.327.327-.607.327l-1.354-.093c-.234-.047-.327-.234-.327-.514V8.943c0-.373.14-.606.514-.606l1.354-.093c.28-.047.373.093.373.373v5.692l3.361-6.158c.234-.373.467-.467.747-.514l1.354-.093c.327 0 .5.14.5.793z" />
              </svg>
            </button>
            <button 
              onClick={() => handleManualSignOut()} 
              title="로그아웃"
              className="hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 relative group ml-0.5"
            >
              {session.user?.image && !imgError ? (
                <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-primary/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={session.user.image} 
                    alt="Profile" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                    onError={() => setImgError(true)}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <span className="material-symbols-outlined text-white text-[13px]">logout</span>
                  </div>
                </div>
              ) : (
                <span className="material-symbols-outlined text-primary text-[22px] sm:text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_circle
                </span>
              )}
            </button>
          </div>
        ) : (
          <button 
            onClick={() => signIn("google")} 
            title="로그인"
            className="text-outline hover:text-primary hover:opacity-80 transition-all active:scale-95 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 ml-0.5"
          >
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              account_circle
            </span>
          </button>
        )}
      </div>

      {/* Help Modal */}
      {isHelpOpen && (
        <>
          <div className="fixed inset-0 bg-on-background/20 dark:bg-background/40 backdrop-overlay z-[60] transition-opacity duration-300" onClick={() => setIsHelpOpen(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] bg-surface border border-outline-variant rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-[70] overflow-hidden bottom-sheet-enter-active">
            <div className="p-6 pb-6">
              <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[26px] text-[#0066ff] dark:text-[#d0ebff] transition-colors duration-300 drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    calendar_month
                  </span>
                  <svg viewBox="0 0 360 60" className="h-[26px] w-auto drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
                    <text x="0" y="45" fontWeight="800" fontSize="42" letterSpacing="-0.02em" className="fill-[#0066ff] dark:fill-[#d0ebff] transition-colors duration-300">Simple</text>
                    <circle cx="18" cy="10" r="4" className="fill-[#0066ff] dark:fill-[#d0ebff] transition-colors duration-300"/>
                    <text x="145" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" className="fill-[#1e293b] dark:fill-[#ffffff] transition-colors duration-300">Schedule</text>
                  </svg>
                </div>
                <button onClick={() => setIsHelpOpen(false)} className="w-8 h-8 flex items-center justify-center text-outline hover:bg-surface-variant rounded-full transition-colors">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-4 font-body-sm">
                {HELP_MESSAGE}
              </p>
              <div className="mb-6 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60">
                <span className="block text-xs font-bold text-on-surface-variant mb-2.5 font-label">
                  캘린더 글자 크기
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "sm", label: "작게", desc: "9px" },
                    { id: "md", label: "중간", desc: "11px" },
                    { id: "lg", label: "크게", desc: "12px" },
                  ].map((item) => {
                    const isSelected = fontSize === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleFontSizeChange(item.id as "sm" | "md" | "lg")}
                        className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg border text-xs transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-xs ring-1 ring-primary/30"
                            : "bg-surface border-outline-variant text-on-surface hover:bg-surface-variant/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-primary bg-primary" : "border-outline text-transparent"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-on-primary" />}
                          </div>
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[10px] opacity-70 font-normal">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={async () => {
                    if ("serviceWorker" in navigator && "caches" in window) {
                      try {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (const reg of registrations) {
                          await reg.unregister();
                        }
                        const cacheKeys = await caches.keys();
                        for (const key of cacheKeys) {
                          await caches.delete(key);
                        }
                      } catch (err) {
                        console.error("Cache reset error:", err);
                      }
                    }
                    window.location.reload();
                  }}
                  className="w-full h-12 bg-surface-variant text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-variant/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">update</span>
                  <span>최신 버전으로 업데이트</span>
                </button>

                <div className="flex items-center justify-between px-1 pt-1 text-xs text-outline">
                  <a
                    href="https://landing-doohee2.vercel.app/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-on-surface transition-colors"
                  >
                    개인정보처리방침
                  </a>
                  <span className="text-[11px] opacity-75">{APP_VERSION}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notion Token Management Modal */}
      <NotionTokenModal 
        isOpen={isNotionModalOpen} 
        onClose={() => setIsNotionModalOpen(false)} 
      />

      {/* Session Expired In-App Modal */}
      {isSessionExpiredOpen && (
        <>
          <div 
            className="fixed inset-0 bg-on-background/20 dark:bg-background/40 backdrop-overlay z-[80] transition-opacity duration-300" 
            onClick={() => setIsSessionExpiredOpen(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[360px] bg-surface border border-outline-variant rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.16)] z-[90] overflow-hidden bottom-sheet-enter-active">
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-3 text-error">
                <span className="material-symbols-outlined text-[28px]">sync_problem</span>
                <h3 className="text-base font-bold text-on-surface">로그인 세션 만료</h3>
              </div>
              <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed mb-6 font-body-sm">
                Google 계정 연결이 만료되었습니다. 최신 일정과 노션 습관을 안전하게 동기화하려면 다시 로그인해 주세요.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setIsSessionExpiredOpen(false)}
                  className="flex-1 h-11 bg-surface-variant text-on-surface-variant rounded-xl font-bold text-xs hover:bg-surface-variant/80 active:scale-[0.98] transition-all"
                >
                  나중에 (조회 유지)
                </button>
                <button
                  onClick={() => {
                    setIsSessionExpiredOpen(false);
                    signIn("google");
                  }}
                  className="flex-1 h-11 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>다시 로그인</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
