"use client";

import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  parseISO,
} from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarEvent } from "@/hooks/useCalendar";

interface MonthCalendarProps {
  currentDate: Date;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  events: CalendarEvent[];
  isLoading: boolean;
  selectedCategory: string;
}

const getCategoryStyle = (color: string) => {
  switch (color) {
    case "pastel-lunch":
      return {
        block: "bg-[#c6f6d5] text-[#137333]",
        dot: "bg-[#137333]"
      };
    case "pastel-dinner":
      return {
        block: "bg-[#d0ebff] text-[#174ea6]",
        dot: "bg-[#174ea6]"
      };
    case "pastel-vacation":
      return {
        block: "bg-[#ffdad6] text-[#c5221f]",
        dot: "bg-[#c5221f]"
      };
    case "pastel-other":
    default:
      return {
        block: "bg-[#e2e8f0] text-[#3c4043]",
        dot: "bg-[#3c4043]"
      };
  }
};

export default function MonthCalendar({
  currentDate,
  selectedDate,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
  events,
  isLoading,
  selectedCategory,
}: MonthCalendarProps) {
  const monthStart = startOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const monthEnd = startOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
  
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const today = startOfDay(new Date());

  // Filter events based on selected category
  const filteredEvents = events.filter((event) => {
    if (selectedCategory === "전체 조회") return true;
    
    const textToSearch = (event.summary + " " + (event.description || "")).toLowerCase();
    
    if (selectedCategory === "기타") {
      const predefined = ["점심", "저녁", "휴가"];
      return !predefined.some(cat => textToSearch.includes(cat.toLowerCase()));
    }
    
    return textToSearch.includes(selectedCategory.toLowerCase());
  });

  return (
    <section className="flex-1 flex flex-col">
      <div className="flex justify-between items-center mb-md px-margin-mobile">
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface flex items-center">
          {format(currentDate, "yyyy년 M월", { locale: ko })}
          {isLoading && <span className="material-symbols-outlined animate-spin text-sm text-outline ml-2">refresh</span>}
        </h2>
        <div className="flex space-x-2">
          <button onClick={onPrevMonth} className="w-8 h-8 flex items-center justify-center text-outline hover:bg-surface-variant">
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button onClick={onNextMonth} className="w-8 h-8 flex items-center justify-center text-outline hover:bg-surface-variant">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col border-t border-b border-outline-variant overflow-hidden bg-surface transition-opacity duration-300">
        <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-low">
          <div className="py-3 text-center font-label-caps text-label-caps text-error">일</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">월</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">화</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">수</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">목</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">금</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-outline-variant">토</div>
        </div>

        <div className={`grid grid-cols-7 flex-1 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          {days.map((day, idx) => {
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isPast = isBefore(day, today);
            const isTodayDay = isSameDay(day, today);
            
            // Check if there are events on this day
            const dayEvents = filteredEvents.filter(e => {
              if (e.start.dateTime) return isSameDay(parseISO(e.start.dateTime), day);
              if (e.start.date) return isSameDay(parseISO(e.start.date), day);
              return false;
            });
            
            // 카테고리 분류 및 제목 추출
            const displayItems: Array<{ id: string; text: string; keyword?: "점심" | "저녁" | "휴가" | "기타"; color: string }> = [];
            
            const otherEvents: typeof dayEvents = [];

            dayEvents.forEach(e => {
              const text = e.summary || "";
              const searchStr = (text + " " + (e.description || "")).toLowerCase();
              
              if (searchStr.includes("점심")) {
                displayItems.push({ id: e.id, text, keyword: "점심", color: "pastel-lunch" });
              } else if (searchStr.includes("저녁")) {
                displayItems.push({ id: e.id, text, keyword: "저녁", color: "pastel-dinner" });
              } else if (searchStr.includes("휴가")) {
                displayItems.push({ id: e.id, text, keyword: "휴가", color: "pastel-vacation" });
              } else {
                otherEvents.push(e);
              }
            });
            
            if (otherEvents.length === 1) {
              displayItems.push({ id: otherEvents[0].id, text: "기타", keyword: "기타", color: "pastel-other" });
            } else if (otherEvents.length > 1) {
              displayItems.push({ id: "other-group", text: `기타 ${otherEvents.length}`, keyword: "기타", color: "pastel-other" });
            }

            // Calculate border classes
            const isRightEdge = (idx + 1) % 7 === 0;
            const borderClasses = `border-b ${!isRightEdge ? 'border-r' : ''} border-outline-variant`;

            if (!isCurrentMonth) {
              return (
                <div key={idx} className={`aspect-[5/6] ${borderClasses} flex flex-col items-center justify-start pt-2 text-outline-variant opacity-30 overflow-hidden`}>
                  {format(day, dateFormat)}
                </div>
              );
            }

            if (isPast && !isTodayDay) {
              return (
                <div key={idx} onClick={() => onDateSelect(day)} className={`aspect-[5/6] ${borderClasses} bg-surface-container-lowest flex flex-col items-center justify-start pt-2 opacity-50 cursor-pointer overflow-hidden`}>
                  <span className={`font-time-display text-time-display ${idx % 7 === 0 ? 'text-error' : 'text-outline'} line-through`}>{format(day, dateFormat)}</span>
                </div>
              );
            }

            return (
              <div 
                key={idx} 
                onClick={() => onDateSelect(day)}
                className={`aspect-[5/6] ${
                  isTodayDay 
                    ? `border-b ${!isRightEdge ? 'border-r' : ''} border-primary bg-primary-container/10 z-10` 
                    : `${borderClasses} bg-surface-container-lowest hover:bg-surface-container-low transition-colors`
                } flex flex-col items-center justify-start pt-2 cursor-pointer relative overflow-hidden ${isSelected ? 'bg-secondary-container/30' : ''}`}
              >
                {isTodayDay ? (
                  <div className="w-6 h-6 bg-primary flex items-center justify-center">
                    <span className="font-time-display text-[14px] leading-none text-on-primary">{format(day, dateFormat)}</span>
                  </div>
                ) : (
                  <span className={`font-time-display text-time-display ${idx % 7 === 0 ? 'text-error' : 'text-on-surface'}`}>
                    {format(day, dateFormat)}
                  </span>
                )}
                
                <div className="mt-auto w-full px-1 pb-1 flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
                  {displayItems.slice(0, 3).map((item, i) => {
                    const style = getCategoryStyle(item.color);
                    
                    let content;
                    if (item.keyword === "기타") {
                      content = (
                        <span className={`${style.block} px-1 rounded-sm`}>
                          {item.text}
                        </span>
                      );
                    } else if (item.keyword) {
                      const parts = item.text.split(item.keyword);
                      content = parts.map((part, index) => (
                        <span key={index}>
                          {part}
                          {index < parts.length - 1 && (
                            <span className={`${style.block} px-0.5 rounded-sm`}>{item.keyword}</span>
                          )}
                        </span>
                      ));
                    } else {
                      content = <span>{item.text}</span>;
                    }

                    return (
                      <div key={i} className="text-[11px] leading-tight text-on-surface truncate py-[1.5px]">
                        {content}
                      </div>
                    );
                  })}
                  {displayItems.length > 3 && (
                    <div className="flex space-x-1 pl-1 mt-0.5 shrink-0">
                      {displayItems.slice(3, 6).map((item, i) => {
                        const style = getCategoryStyle(item.color);
                        return (
                          <div key={i} className={`w-1.5 h-1.5 ${style.dot} rounded-full`} />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
