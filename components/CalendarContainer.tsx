"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { useCalendarEvents, useCalendarList } from "@/hooks/useCalendar";
import FilterCategories from "./FilterCategories";
import MonthCalendar from "./MonthCalendar";
import BottomSheet from "./BottomSheet";
import CalendarSelectorSheet from "./CalendarSelectorSheet";
import { APP_VERSION } from "@/config";

export default function CalendarContainer() {
  const [selectedCategory, setSelectedCategory] = useState("전체 조회");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // State for selected calendars
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(["primary"]);
  const [isCalendarSelectorOpen, setIsCalendarSelectorOpen] = useState(false);
  const { data: session } = useSession();

  // Load saved calendars when session is available
  useEffect(() => {
    if (session?.user?.email) {
      const saved = localStorage.getItem(`selectedCalendars_${session.user.email}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedCalendars(parsed);
          }
        } catch (e) {}
      }
    }
  }, [session?.user?.email]);

  const { data: calendars } = useCalendarList();

  // Fetch events for the current and next month
  const timeMin = startOfMonth(currentDate).toISOString();
  const timeMax = endOfMonth(addMonths(currentDate, 1)).toISOString();
  
  const { data: events, isLoading, isFetching, refetch } = useCalendarEvents(timeMin, timeMax, selectedCalendars);

  useEffect(() => {
    const handleOpenCalendarSelector = () => setIsCalendarSelectorOpen(true);
    window.addEventListener("openCalendarSelector", handleOpenCalendarSelector);
    return () => window.removeEventListener("openCalendarSelector", handleOpenCalendarSelector);
  }, []);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

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

  return (
    <>
      <div className="w-full flex flex-col relative h-[75dvh] min-h-[400px] shrink-0 resize-y overflow-hidden border-b border-outline-variant/50">
        <div className="px-margin-mobile py-4 pb-3 flex flex-col gap-3 border-b border-outline-variant/50 mb-1">
          <FilterCategories 
            selected={selectedCategory} 
            onSelect={setSelectedCategory} 
            onRefetch={refetch}
          />
        </div>
        <MonthCalendar 
          currentDate={currentDate}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          events={events || []}
          isLoading={isLoading || isFetching}
          selectedCategory={selectedCategory}
        />
        <div className="px-margin-mobile py-2 text-right">
          <span className="text-[10px] text-outline-variant">{APP_VERSION}</span>
        </div>
      </div>
      
      <BottomSheet 
        selectedDate={selectedDate} 
        isOpen={!!selectedDate} 
        onClose={() => setSelectedDate(null)} 
        events={events || []}
        selectedCategory={selectedCategory}
        calendars={calendars || []}
      />

      <CalendarSelectorSheet
        isOpen={isCalendarSelectorOpen}
        onClose={() => setIsCalendarSelectorOpen(false)}
        selectedCalendars={selectedCalendars}
        onToggleCalendar={handleToggleCalendar}
      />
    </>
  );
}

