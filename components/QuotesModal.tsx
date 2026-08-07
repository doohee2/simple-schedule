"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface QuoteData {
  en: string;
  ko: string;
  author: string;
}

interface QuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuotesModal({ isOpen, onClose }: QuotesModalProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isOnline = useNetworkStatus();
  const isOffline = !isOnline;

  const fetchQuote = async (): Promise<QuoteData> => {
    // If offline, try to get from localStorage
    if (isOffline) {
      const cached = localStorage.getItem("last_quote_data");
      if (cached) return JSON.parse(cached);
      throw new Error("오프라인 상태이며 저장된 명언이 없습니다.");
    }

    const res = await fetch("/api/quotes");
    if (!res.ok) throw new Error("Failed to fetch quote");
    const data = await res.json();
    
    // Save to localStorage for offline access
    localStorage.setItem("last_quote_data", JSON.stringify(data));
    return data;
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery<QuoteData, Error>({
    queryKey: ["daily-quote"],
    queryFn: fetchQuote,
    staleTime: Infinity, // Don't refetch automatically
    retry: 0,
    enabled: isOpen,
  });

  // Reset translation visibility when data changes
  useEffect(() => {
    if (data) {
      setShowTranslation(false);
    }
  }, [data]);

  // Cleanup speech synthesis when modal closes
  useEffect(() => {
    if (!isOpen) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTTS = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the translation reveal
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (data?.en) {
      const utterance = new SpeechSynthesisUtterance(data.en);
      utterance.lang = "en-US";
      utterance.rate = 0.9; // Slightly slower for clarity
      
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOffline) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      refetch();
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-on-background/30 dark:bg-background/60 backdrop-overlay z-[80] transition-opacity duration-300" 
        onClick={onClose}
      />
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[420px] bg-surface border border-outline-variant rounded-3xl shadow-[0_12px_48px_rgba(0,0,0,0.15)] z-[90] overflow-hidden bottom-sheet-enter-active flex flex-col cursor-pointer"
        onClick={() => setShowTranslation(true)}
      >
        <div className="p-7 relative min-h-[240px] flex flex-col justify-center">
          
          {/* Header Controls */}
          <div className="absolute top-4 right-4 flex items-center space-x-1 z-10">
            <button 
              onClick={handleRefresh}
              disabled={isFetching || isOffline}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                isOffline || isFetching ? "text-outline/40 cursor-not-allowed" : "text-outline hover:bg-surface-variant hover:text-on-surface"
              }`}
              title={isOffline ? "오프라인 상태에서는 새 명언을 불러올 수 없습니다." : "새 명언 가져오기"}
            >
              <span className={`material-symbols-outlined text-[20px] ${isFetching ? "animate-spin" : ""}`}>
                refresh
              </span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-9 h-9 flex items-center justify-center text-outline hover:bg-surface-variant hover:text-on-surface rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          <div className="absolute top-5 left-5 text-outline/30 select-none">
            <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              format_quote
            </span>
          </div>

          {isLoading && !data ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary">
                progress_activity
              </span>
              <p className="text-sm font-medium text-on-surface-variant animate-pulse">
                영감을 가져오는 중...
              </p>
            </div>
          ) : error && !data ? (
            <div className="text-center py-6">
              <p className="text-error font-medium mb-2">명언을 불러오지 못했습니다.</p>
              <p className="text-sm text-on-surface-variant">{error.message}</p>
            </div>
          ) : data ? (
            <div className="relative z-10 pt-6 pb-2">
              <div className="mb-6">
                <p className="text-xl md:text-2xl font-bold text-on-surface leading-snug tracking-tight font-plus-jakarta">
                  "{data.en}"
                </p>
                
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm font-medium text-on-surface-variant/80 font-plus-jakarta">
                    — {data.author}
                  </p>
                  <button
                    onClick={handleTTS}
                    className={`flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                      isPlaying 
                        ? "bg-primary/10 text-primary border-primary/30" 
                        : "bg-surface-variant/50 text-on-surface-variant border-outline-variant hover:bg-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] mr-1.5" style={{ fontVariationSettings: isPlaying ? "'FILL' 1" : "'FILL' 0" }}>
                      {isPlaying ? "volume_up" : "volume_up"}
                    </span>
                    {isPlaying ? "듣는 중" : "발음 듣기"}
                  </button>
                </div>
              </div>

              {/* Translation Area */}
              <div 
                className={`transition-all duration-500 ease-out overflow-hidden ${
                  showTranslation ? "max-h-[200px] opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"
                }`}
              >
                <div className="pt-5 border-t border-outline-variant/50">
                  <p className="text-[15px] font-medium text-on-surface leading-relaxed break-keep">
                    {data.ko}
                  </p>
                </div>
              </div>

              {/* Tap to reveal hint */}
              {!showTranslation && (
                <div className="absolute -bottom-8 left-0 right-0 text-center animate-bounce opacity-70">
                  <p className="text-[11px] font-bold text-primary tracking-wide">
                    TAP TO TRANSLATE
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
