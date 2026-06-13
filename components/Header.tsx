"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-surface flex items-center justify-between px-margin-mobile h-14 w-full z-40 relative flex-shrink-0 border-b border-outline-variant max-w-[768px] mx-auto">
      <button className="text-primary hover:opacity-80 transition-opacity active:scale-95 transition-transform flex items-center justify-center w-12 h-12">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>calendar_today</span>
      </button>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-display text-display text-primary flex-1 text-center font-bold tracking-tight">약속 잡기</h1>
      
      {session ? (
        <button onClick={() => signOut()} className="text-primary hover:opacity-80 transition-opacity active:scale-95 transition-transform flex items-center justify-center w-12 h-12">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
        </button>
      ) : (
        <button onClick={() => signIn("google")} className="text-primary hover:opacity-80 transition-opacity active:scale-95 transition-transform flex items-center justify-center w-12 h-12">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>login</span>
        </button>
      )}
    </header>
  );
}
