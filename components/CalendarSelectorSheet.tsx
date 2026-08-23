"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCalendarList, CalendarListEntry } from "@/hooks/useCalendar";

interface CalendarSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCalendars: string[];
  onToggleCalendar: (calendarId: string) => void;
  starredCalendarId: string | null;
  onToggleStar: (calendarId: string) => void;
}

export default function CalendarSelectorSheet({ isOpen, onClose, selectedCalendars, onToggleCalendar, starredCalendarId, onToggleStar }: CalendarSelectorSheetProps) {
  const { data: calendars, isLoading } = useCalendarList();

  // Swipe/Drag state
  const [isMinimized, setIsMinimized] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const wasDragged = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset drag state when opening
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
      setTranslateY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isMobile) return;
    setIsDragging(true);
    wasDragged.current = false;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const currentOffset = isMinimized ? (sheetRef.current?.offsetHeight || 400) - 90 : translateY;
    startYRef.current = clientY - currentOffset;
  };

  const handleTouchMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!isDragging || !isMobile) return;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    let newOffset = clientY - startYRef.current;
    if (newOffset < 0) newOffset = 0; // Prevent dragging above expanded state
    
    if (Math.abs(newOffset - (isMinimized ? (sheetRef.current?.offsetHeight || 400) - 90 : 0)) > 10) {
      wasDragged.current = true;
    }
    
    setTranslateY(newOffset);
    if (isMinimized) setIsMinimized(false);
  }, [isDragging, isMobile, isMinimized]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !isMobile) return;
    setIsDragging(false);
    
    const height = sheetRef.current?.offsetHeight || 400;
    
    if (translateY >= height - 90) {
      onClose();
      setTranslateY(0);
    } else if (translateY >= height - 160) {
      setIsMinimized(true);
      setTranslateY(0);
    } else {
      setIsMinimized(false);
      // Keep translateY to maintain intermediate height
    }
    
    setTimeout(() => { wasDragged.current = false; }, 50);
  }, [isDragging, isMobile, translateY, onClose]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('mousemove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('mouseup', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousemove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mouseup', handleTouchEnd);
    };
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  const handleHandlebarClick = () => {
    if (wasDragged.current) return;
    if (isMinimized) {
      setTranslateY(0);
      setIsMinimized(false);
    } else {
      setIsMinimized(true);
    }
  };


  if (!isOpen) return null;

  return (
    <>
      <div className={`
        ${isOpen ? 'fixed bottom-0 bottom-sheet-enter bottom-sheet-enter-active' : 'hidden'} left-1/2 -translate-x-1/2 w-full z-50 
        md:flex md:static md:translate-x-0 md:w-[360px] lg:w-[400px] md:h-auto md:z-10 md:shrink-0 pointer-events-none
      `}>
        <div 
          ref={sheetRef}
          className={`bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.2)] md:shadow-none border-t md:border-t-0 md:border-l border-outline-variant flex flex-col max-w-[768px] mx-auto w-full max-h-[60vh] md:max-h-none md:h-full pointer-events-auto overflow-hidden`}
          style={isMobile ? {
            transform: isDragging 
              ? `translateY(${translateY}px)` 
              : (isMinimized ? `translateY(calc(100% - 90px))` : `translateY(${translateY}px)`),
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
          } : {}}
        >
          {/* Header (Sticky) */}
          <div className="shrink-0 bg-surface z-20 px-lg pt-3 pb-2 flex flex-col border-b border-outline-variant/20">
            {/* Grabber Handle */}
            <div 
              className="w-full pb-4 cursor-pointer md:hidden touch-none flex justify-center" 
              onMouseDown={handleTouchStart}
              onTouchStart={handleTouchStart}
              onClick={handleHandlebarClick}
            >
              <div className="w-12 h-1.5 bg-outline-variant rounded-full pointer-events-none"></div>
            </div>
            
            <div className="flex items-center justify-between">
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
                조회할 캘린더 선택
              </h3>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-outline hover:bg-surface-variant rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div 
            className={`flex flex-col gap-2 px-lg pb-8 flex-1 min-h-0 pt-2 ${isMinimized || isDragging ? 'overflow-hidden' : 'overflow-y-auto'}`}
            style={isMobile && translateY > 0 && !isMinimized ? { paddingBottom: `${translateY + 32}px` } : {}}
          >
            {isLoading ? (
              <div className="flex justify-center p-4">
                <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
              </div>
            ) : !calendars ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <span className="material-symbols-outlined text-error mb-2 text-[32px]">error</span>
                <p className="text-body-sm text-on-surface">캘린더 목록을 가져올 수 없습니다.</p>
                <p className="text-label-sm text-on-surface-variant mt-1">권한이 부족할 수 있습니다. 다시 로그인해주세요.</p>
              </div>
            ) : (
              calendars.map((cal: CalendarListEntry) => {
                const isSelected = selectedCalendars.includes(cal.id) || (!!cal.primary && selectedCalendars.includes("primary"));
                
                // If it's primary, we want to handle toggle by its actual ID
                const handleCheck = () => {
                  if (cal.primary && selectedCalendars.includes("primary")) {
                    // special handling in container, but for now it's easier to just pass the ID
                    onToggleCalendar(cal.id);
                    // Also we should tell the container to remove "primary" if it exists, but actually onToggleCalendar just toggles.
                    // Let's rely on container to clean up "primary" string if we want, or just let them coexist.
                  } else {
                    onToggleCalendar(cal.id);
                  }
                };
                
                return (
                  <label 
                    key={cal.id} 
                    className="flex items-center gap-3 p-3 border border-outline-variant bg-surface-container-lowest cursor-pointer hover:bg-surface-container-low transition-colors"
                  >
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleCalendar(cal.primary ? "primary" : cal.id)}
                      className="w-5 h-5 accent-primary rounded-none border-outline-variant text-primary focus:ring-primary"
                    />
                    <div className="flex flex-col flex-1 truncate">
                      <span className="font-body-md text-on-surface truncate">{cal.summary}</span>
                      {cal.description && (
                        <span className="text-[11px] text-on-surface-variant truncate">{cal.description}</span>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStar(cal.primary ? "primary" : cal.id); }} 
                      disabled={!isSelected}
                      className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors shrink-0 ${
                        (starredCalendarId === (cal.primary ? "primary" : cal.id)) ? 'text-yellow-500' : 'text-outline-variant hover:text-on-surface hover:bg-surface-variant'
                      } ${!isSelected ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <span 
                        className="material-symbols-outlined text-[24px]" 
                        style={(starredCalendarId === (cal.primary ? "primary" : cal.id)) ? { fontVariationSettings: "'FILL' 1" } : { fontVariationSettings: "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>
                  </label>
                );
              })
            )}
            {!isLoading && calendars?.length === 0 && (
              <p className="text-body-sm text-on-surface-variant text-center py-4">표시할 추가 캘린더가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
