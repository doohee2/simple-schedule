"use client";

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { useCalendarEvents } from "@/hooks/useCalendar";
import FilterCategories from "./FilterCategories";
import MonthCalendar from "./MonthCalendar";
import BottomSheet from "./BottomSheet";

export default function CalendarContainer() {
  const [selectedCategory, setSelectedCategory] = useState("전체 조회");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch events for the current month
  const timeMin = startOfMonth(currentDate).toISOString();
  const timeMax = endOfMonth(currentDate).toISOString();
  
  const { data: events, isLoading } = useCalendarEvents(timeMin, timeMax);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <>
      <div className="flex-1 w-full flex flex-col relative overflow-y-auto hide-scrollbar">
        <div className="px-margin-mobile py-lg">
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
      </div>
      <BottomSheet 
        selectedDate={selectedDate} 
        isOpen={!!selectedDate} 
        onClose={() => setSelectedDate(null)} 
        events={events || []}
        selectedCategory={selectedCategory}
      />
    </>
  );
}
