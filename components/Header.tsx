"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Header() {
  const { data: session } = useSession();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <header className="bg-surface flex items-center justify-between px-margin-mobile h-14 w-full z-40 relative flex-shrink-0 border-b border-outline-variant max-w-[768px] mx-auto transition-colors duration-300">
      <button 
        onClick={toggleTheme}
        className="text-primary hover:opacity-80 transition-opacity active:scale-95 transition-transform flex items-center justify-center w-12 h-12"
        title="테마 변경"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
          {mounted && isDark ? "light_mode" : "dark_mode"}
        </span>
      </button>
      <h1 className="text-2xl font-bold text-primary flex-1 text-center tracking-tight">약속 잡기</h1>
      
      {session ? (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.dispatchEvent(new Event("openCalendarSelector"))}
            className="hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center w-10 h-10 text-primary bg-primary-container/20 rounded-full"
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
    </header>
  );
}
