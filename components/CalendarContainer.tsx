"use client";

import { useState, useEffect } from "react";
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

  const { data: calendars } = useCalendarList();

  // Fetch events for the current month
  const timeMin = startOfMonth(currentDate).toISOString();
  const timeMax = endOfMonth(currentDate).toISOString();
  
  const { data: events, isLoading } = useCalendarEvents(timeMin, timeMax, selectedCalendars);

  useEffect(() => {
    const handleOpenCalendarSelector = () => setIsCalendarSelectorOpen(true);
    window.addEventListener("openCalendarSelector", handleOpenCalendarSelector);
    return () => window.removeEventListener("openCalendarSelector", handleOpenCalendarSelector);
  }, []);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleToggleCalendar = (calId: string) => {
    setSelectedCalendars(prev => {
      if (prev.includes(calId)) {
        // Prevent deselecting if it's the only one left
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== calId);
      } else {
        return [...prev, calId];
      }
    });
  };

  return (
    <>
      <div className="flex-1 w-full flex flex-col relative overflow-y-auto hide-scrollbar">
        <div className="px-margin-mobile py-lg pb-4 flex flex-col gap-3 border-b border-outline-variant/50 mb-2">
          <FilterCategories 
            selected={selectedCategory} 
            onSelect={setSelectedCategory} 
          />
        </div>
        <MonthCalendar 
          currentDate={currentDate}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          events={events || []}
          isLoading={isLoading}
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

