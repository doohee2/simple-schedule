"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { HELP_MESSAGE } from "@/config";
import NotionTokenModal from "./NotionTokenModal";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function Header() {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);
  const isOnline = useNetworkStatus();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // @ts-ignore
    if (session?.error === "RefreshAccessTokenError") {
      signOut();
    }
  }, [session]);

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
              onClick={() => signOut()} 
              title="로그아웃"
              className="hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 relative group ml-0.5"
            >
              {session.user?.image ? (
                <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-primary/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={session.user.image} 
                    alt="Profile" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
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
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6 font-body-sm">
                {HELP_MESSAGE}
              </p>
              <div className="flex flex-col gap-2">
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
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  확인
                </button>
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
    </header>
  );
}
