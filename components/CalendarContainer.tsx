"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useCalendarEvents, useCalendarList, useNotionHabitSummary } from "@/hooks/useCalendar";
import FilterCategories from "./FilterCategories";
import MonthCalendar from "./MonthCalendar";
import BottomSheet from "./BottomSheet";
import CalendarSelectorSheet from "./CalendarSelectorSheet";
import { APP_VERSION } from "@/config";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function CalendarContainer() {
  const isOnline = useNetworkStatus();
  const [selectedCategory, setSelectedCategory] = useState("전체 조회");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  
  // State for selected calendars
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(["primary"]);
  const [isCalendarSelectorOpen, setIsCalendarSelectorOpen] = useState(false);
  
  // Custom resize state
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const currentOffset = useRef(0);
  
  const { data: session } = useSession();

  // Load saved calendars when session is available
  useEffect(() => {
    if (session?.user?.email) {
      const saved = localStorage.getItem(`selectedCalendars_${session.user.email}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTimeout(() => setSelectedCalendars(parsed), 0);
          }
        } catch {}
      }
    }
  }, [session?.user?.email]);

  const { data: calendars } = useCalendarList();

  // Fetch events for the current and next month
  const timeMin = startOfMonth(currentDate).toISOString();
  const timeMax = endOfMonth(addMonths(currentDate, 1)).toISOString();
  
  const { data: events, isLoading, isFetching, refetch } = useCalendarEvents(timeMin, timeMax, selectedCalendars);

  // Background fetch for Notion habit summary across the 2-month interval
  const startStr = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const endStr = format(endOfMonth(addMonths(currentDate, 1)), "yyyy-MM-dd");
  const { data: habitSummary } = useNotionHabitSummary(startStr, endStr);

  useEffect(() => {
    const handleOpenCalendarSelector = () => setIsCalendarSelectorOpen(true);
    window.addEventListener("openCalendarSelector", handleOpenCalendarSelector);
    return () => window.removeEventListener("openCalendarSelector", handleOpenCalendarSelector);
  }, []);

  const handlePrevMonth = () => { if (isOnline) setCurrentDate(subMonths(currentDate, 1)); };
  const handleNextMonth = () => { if (isOnline) setCurrentDate(addMonths(currentDate, 1)); };

  const handleToggleCalendar = (calId: string) => {
    setSelectedCalendars(prev => {
      let next;
      if (prev.includes(calId)) {
        // Prevent deselecting if it's the only one left
        if (prev.length === 1) return prev;
        next = prev.filter(id => id !== calId);
      } else {
        next = [...prev, calId];
      }
      
      // Save to localStorage using user's email as key
      if (session?.user?.email) {
        localStorage.setItem(`selectedCalendars_${session.user.email}`, JSON.stringify(next));
      }
      
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    startY.current = e.clientY;
    currentOffset.current = dragOffset;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const diff = e.clientY - startY.current;
    setDragOffset(currentOffset.current + diff);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row w-full flex-1 items-stretch min-h-0">
        <div 
          className="w-full md:flex-1 flex flex-col relative min-h-[400px] shrink-0 overflow-hidden border-b border-outline-variant/50 bg-background"
          style={{ height: `calc(85dvh + ${dragOffset}px)` }}
        >
          <div className="px-margin-mobile py-4 pb-3 flex flex-col gap-3 border-b border-outline-variant/50 mb-1">
            <FilterCategories 
              selected={selectedCategory} 
              onSelect={(cat) => {
                setSelectedCategory(cat);
                if (cat === "전체 조회") {
                  setSelectedDate(new Date());
                  setIsMobileSheetOpen(false);
                }
              }} 
              onRefetch={() => {
                refetch();
                setSelectedDate(new Date());
                setIsMobileSheetOpen(false);
              }}
            />
          </div>
          <MonthCalendar 
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setIsMobileSheetOpen(true);
            }}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            events={events || []}
            isLoading={isLoading || isFetching}
            selectedCategory={selectedCategory}
            habitSummary={habitSummary}
            isOffline={!isOnline}
          />
          <div 
            className="w-full h-10 flex items-center justify-center cursor-row-resize touch-none group relative shrink-0"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className={`w-16 h-1.5 rounded-full transition-colors ${isDragging ? 'bg-primary' : 'bg-outline-variant/40 group-hover:bg-primary/50'}`} />
            <div className="absolute right-margin-mobile text-[10px] text-outline-variant pointer-events-none">
              {APP_VERSION}
            </div>
          </div>
        </div>
        
        <BottomSheet 
          selectedDate={selectedDate} 
          isOpen={isMobileSheetOpen} 
          onClose={() => setIsMobileSheetOpen(false)} 
          events={events || []}
          selectedCategory={selectedCategory}
          calendars={calendars || []}
          isOffline={!isOnline}
        />
      </div>

      <CalendarSelectorSheet
        isOpen={isCalendarSelectorOpen}
        onClose={() => setIsCalendarSelectorOpen(false)}
        selectedCalendars={selectedCalendars}
        onToggleCalendar={handleToggleCalendar}
      />
    </>
  );
}

