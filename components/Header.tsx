"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { HELP_MESSAGE } from "@/config";

export default function Header() {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
    <header className="bg-surface flex items-center justify-between px-2 sm:px-margin-mobile h-12 w-full z-40 relative flex-shrink-0 border-b border-outline-variant max-w-[768px] mx-auto transition-colors duration-300">
      {/* Left side: Title + 'i' button */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center pointer-events-none">
          <svg viewBox="0 0 360 60" className="h-[31px] sm:h-[38px] w-auto drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
            <text x="0" y="45" fontWeight="800" fontSize="42" letterSpacing="-0.02em" className="fill-[#0066ff] dark:fill-[#d0ebff] transition-colors duration-300">Simple</text>
            <circle cx="18" cy="10" r="4" className="fill-[#0066ff] dark:fill-[#d0ebff] transition-colors duration-300"/>
            <text x="145" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" className="fill-[#1e293b] dark:fill-[#ffffff] transition-colors duration-300">Schedule</text>
          </svg>
        </div>
        <button 
          onClick={() => setIsHelpOpen(true)} 
          className="text-outline hover:text-primary transition-colors flex items-center justify-center w-8 h-8 rounded-full"
          title="도움말"
        >
          <span className="material-symbols-outlined text-[20px]">info</span>
        </button>
      </div>
      
      {/* Right side: Theme + Session controls */}
      <div className="flex items-center gap-1">
        <button 
          onClick={toggleTheme}
          className="text-primary hover:opacity-80 transition-opacity active:scale-95 transition-transform flex items-center justify-center w-12 h-12"
          title="테마 변경"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
            {mounted && resolvedTheme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
        {session ? (
          <div className="flex items-center gap-1">
            <button 
              onClick={() => window.dispatchEvent(new Event("openCalendarSelector"))}
              className="hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center w-12 h-12 text-primary bg-transparent rounded-full"
              title="캘린더 선택"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            </button>
            <button 
              onClick={() => signOut()} 
              title="로그아웃"
              className="hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center w-12 h-12 relative group"
            >
              {session.user?.image ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-primary/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={session.user.image} 
                    alt="Profile" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <span className="material-symbols-outlined text-white text-[16px]">logout</span>
                  </div>
                </div>
              ) : (
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_circle
                </span>
              )}
            </button>
          </div>
        ) : (
          <button 
            onClick={() => signIn("google")} 
            title="로그인"
            className="text-outline hover:text-primary hover:opacity-80 transition-all active:scale-95 flex items-center justify-center w-12 h-12"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
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
              <h3 className="text-xl font-bold text-on-surface mb-3">안내사항</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6 font-body-sm">
                {HELP_MESSAGE}
              </p>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
              >
                확인
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
