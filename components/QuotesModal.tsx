"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface QuoteData {
  en: string;
  ko?: string;
  author: string;
}

interface IdiomData {
  hanja: string;
  hangul: string;
  meaning: string;
  pronunciation: string;
}

interface QuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuotesModal({ isOpen, onClose }: QuotesModalProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOnStartup, setShowOnStartup] = useState(true);
  const [quoteSource, setQuoteSource] = useState<'zen' | 'idiom'>('zen');
  const [useZenQuotes, setUseZenQuotes] = useState(true);
  const [useIdioms, setUseIdioms] = useState(false);
  const isOnline = useNetworkStatus();
  const isOffline = !isOnline;

  useEffect(() => {
    const savedStartup = localStorage.getItem("show_quotes_on_startup");
    if (savedStartup === "false") setShowOnStartup(false);

    const savedZen = localStorage.getItem("use_zen_quotes");
    const savedIdiom = localStorage.getItem("use_idioms");
    
    const zen = savedZen !== "false";
    const idiom = savedIdiom === "true";
    
    setUseZenQuotes(zen);
    setUseIdioms(idiom);
    
    if (isOpen) {
      if (zen && idiom) {
        setQuoteSource(Math.random() < 0.5 ? 'zen' : 'idiom');
      } else if (idiom) {
        setQuoteSource('idiom');
      } else {
        setQuoteSource('zen');
      }
    }
  }, [isOpen]);

  const handleToggleStartup = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newValue = e.target.checked;
    setShowOnStartup(newValue);
    localStorage.setItem("show_quotes_on_startup", newValue ? "true" : "false");
  };

  const fetchQuote = async (): Promise<QuoteData> => {
    if (isOffline) {
      const cached = localStorage.getItem("last_quote_data");
      if (cached) return JSON.parse(cached);
      throw new Error("오프라인 상태이며 저장된 명언이 없습니다.");
    }

    const res = await fetch("/api/quotes");
    if (!res.ok) throw new Error("Failed to fetch quote");
    return res.json();
  };

  const { data: quoteData, isLoading, error, refetch, isFetching } = useQuery<QuoteData, Error>({
    queryKey: ["daily-quote"],
    queryFn: fetchQuote,
    staleTime: Infinity,
    retry: 0,
    enabled: isOpen && quoteSource === 'zen',
  });

  const fetchIdiom = async (): Promise<IdiomData> => {
    if (isOffline) {
      const cached = localStorage.getItem("last_idiom_data");
      if (cached) return JSON.parse(cached);
      throw new Error("오프라인 상태이며 저장된 사자성어가 없습니다.");
    }
    const res = await fetch("/api/idioms");
    if (!res.ok) throw new Error("Failed to fetch idiom");
    const data = await res.json();
    localStorage.setItem("last_idiom_data", JSON.stringify(data));
    return data;
  };

  const { data: idiomData, isLoading: isIdiomLoading, error: idiomError, refetch: refetchIdiom, isFetching: isIdiomFetching } = useQuery<IdiomData, Error>({
    queryKey: ["daily-idiom"],
    queryFn: fetchIdiom,
    staleTime: Infinity,
    retry: 0,
    enabled: isOpen && quoteSource === 'idiom',
  });

  const fetchTranslation = async (text: string) => {
    if (isOffline) {
      const cached = localStorage.getItem("last_quote_data");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.en === text) return { ko: parsed.ko };
      }
      return { ko: "오프라인 상태에서는 번역을 가져올 수 없습니다." };
    }

    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    
    if (!res.ok) throw new Error("Failed to translate");
    const data = await res.json();
    
    if (quoteData) {
      localStorage.setItem("last_quote_data", JSON.stringify({
        en: quoteData.en,
        author: quoteData.author,
        ko: data.ko
      }));
    }
    
    return data;
  };

  const { data: translateData, isLoading: isTranslating } = useQuery({
    queryKey: ["daily-translate", quoteData?.en],
    queryFn: () => fetchTranslation(quoteData!.en),
    staleTime: Infinity,
    enabled: !!quoteData?.en,
  });

  useEffect(() => {
    if (quoteData || idiomData) {
      setShowTranslation(false);
    }
  }, [quoteData, idiomData]);

  useEffect(() => {
    if (!isOpen) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTTS = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    let text = "";
    let lang = "";
    if (quoteSource === 'zen' && quoteData?.en) {
      text = quoteData.en;
      lang = "en-US";
    } else if (quoteSource === 'idiom' && idiomData?.hangul) {
      text = idiomData.hangul;
      lang = "ko-KR";
    }

    if (text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      
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
      
      let nextSource = quoteSource;
      if (useZenQuotes && useIdioms) {
        nextSource = Math.random() < 0.5 ? 'zen' : 'idiom';
        setQuoteSource(nextSource);
      }
      
      if (nextSource === 'zen') refetch();
      else refetchIdiom();
    }
  };

  const koreanTranslation = translateData?.ko || quoteData?.ko || (isTranslating ? "번역 중..." : "");

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
        <div className="px-7 pt-7 pb-2.5 relative min-h-[220px] flex flex-col justify-center">
          
          <div className="absolute top-3 right-3 flex items-center space-x-0.5 z-50">
            <button 
              onClick={handleRefresh}
              disabled={(quoteSource === 'zen' ? isFetching : isIdiomFetching) || isOffline}
              className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${
                isOffline || isFetching ? "text-outline/40 cursor-not-allowed" : "text-outline hover:bg-surface-variant hover:text-on-surface"
              }`}
              title={isOffline ? "오프라인 상태에서는 새 명언을 불러올 수 없습니다." : "새 명언 가져오기"}
            >
              <span className={`material-symbols-outlined text-[22px] ${(quoteSource === 'zen' ? isFetching : isIdiomFetching) ? "animate-spin" : ""}`}>
                refresh
              </span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-11 h-11 flex items-center justify-center text-outline hover:bg-surface-variant hover:text-on-surface rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>

          <div className="absolute top-5 left-5 text-outline/30 select-none">
            <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              lightbulb
            </span>
          </div>

                    {(isLoading || isIdiomLoading) && !(quoteData || idiomData) ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary">
                progress_activity
              </span>
              <p className="text-sm font-medium text-on-surface-variant animate-pulse">
                가져오는 중...
              </p>
            </div>
          ) : (error || idiomError) && !(quoteData || idiomData) ? (
            <div className="text-center py-6">
              <p className="text-error font-medium mb-2">불러오지 못했습니다.</p>
              <p className="text-sm text-on-surface-variant">{(error || idiomError)?.message}</p>
            </div>
          ) : (quoteData || idiomData) ? (
            <div className="relative z-10 pt-6 pb-2">
              {quoteSource === 'zen' && quoteData && (
                <div className="mb-6">
                  <p className="text-xl md:text-2xl font-bold text-on-surface leading-snug tracking-tight font-plus-jakarta">
                    "{quoteData.en}"
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm font-medium text-on-surface-variant/80 font-plus-jakarta">
                      — {quoteData.author}
                    </p>
                    <button
                      onClick={handleTTS}
                      title="발음 듣기"
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors border ${
                        isPlaying 
                          ? "bg-primary/10 text-primary border-primary/30" 
                          : "bg-surface-variant/50 text-on-surface-variant border-outline-variant hover:bg-surface-variant"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isPlaying ? "'FILL' 1" : "'FILL' 0" }}>
                        volume_up
                      </span>
                    </button>
                  </div>
                </div>
              )}
              
              {quoteSource === 'idiom' && idiomData && (
                <div className="mb-6 mt-4">
                  <div className="flex items-end justify-between">
                    <p className="text-4xl md:text-5xl font-bold text-on-surface leading-snug tracking-widest flex-1 text-center pl-8">
                      {idiomData.hanja}
                    </p>
                    <button
                      onClick={handleTTS}
                      title="발음 듣기"
                      className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full transition-colors border ${
                        isPlaying 
                          ? "bg-primary/10 text-primary border-primary/30" 
                          : "bg-surface-variant/50 text-on-surface-variant border-outline-variant hover:bg-surface-variant"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isPlaying ? "'FILL' 1" : "'FILL' 0" }}>
                        volume_up
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div 
                className={`transition-all duration-500 ease-out overflow-hidden ${
                  showTranslation ? "max-h-[250px] opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"
                }`}
              >
                <div className="pt-5 border-t border-outline-variant/50">
                  {quoteSource === 'zen' && (
                    <p className="text-[15px] font-medium text-on-surface leading-relaxed break-keep">
                      {koreanTranslation}
                    </p>
                  )}
                  {quoteSource === 'idiom' && idiomData && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-lg font-bold text-on-surface">
                        {idiomData.hangul}
                      </p>
                      <p className="text-[15px] font-medium text-on-surface leading-relaxed break-keep text-center">
                        {idiomData.meaning}
                      </p>
                      <p className="text-xs text-on-surface-variant/70 mt-1">
                        {idiomData.pronunciation}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap justify-between items-center mt-6 pt-2 gap-y-2">
                  <div className="flex gap-4">
                    <label 
                      className="flex items-center space-x-1.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input 
                        type="checkbox" 
                        checked={useZenQuotes}
                        onChange={(e) => {
                          const val = e.target.checked;
                          if (!val && !useIdioms) return;
                          setUseZenQuotes(val);
                          localStorage.setItem("use_zen_quotes", val ? "true" : "false");
                        }}
                        className="w-3.5 h-3.5 rounded border-outline-variant text-primary focus:ring-primary/50 cursor-pointer accent-primary"
                      />
                      <span className="text-[11px] font-medium text-on-surface-variant">ZenQuotes</span>
                    </label>
                    <label 
                      className="flex items-center space-x-1.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input 
                        type="checkbox" 
                        checked={useIdioms}
                        onChange={(e) => {
                          const val = e.target.checked;
                          if (!val && !useZenQuotes) return;
                          setUseIdioms(val);
                          localStorage.setItem("use_idioms", val ? "true" : "false");
                        }}
                        className="w-3.5 h-3.5 rounded border-outline-variant text-primary focus:ring-primary/50 cursor-pointer accent-primary"
                      />
                      <span className="text-[11px] font-medium text-on-surface-variant">사자성어</span>
                    </label>
                  </div>
                  <label 
                    className="flex items-center space-x-1.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity ml-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input 
                      type="checkbox" 
                      checked={showOnStartup}
                      onChange={handleToggleStartup}
                      className="w-3.5 h-3.5 rounded border-outline-variant text-primary focus:ring-primary/50 cursor-pointer accent-primary"
                    />
                    <span className="text-[11px] font-medium text-on-surface-variant">
                      시작 시 확인
                    </span>
                  </label>
                </div>
              </div>

              {!showTranslation && (
                <div className="mt-8 text-center opacity-70">
                  <hr className="border-t border-outline-variant/30 w-1/4 mx-auto mb-3" />
                  <p className="text-[11px] font-bold text-primary tracking-wide">
                    TAP
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
