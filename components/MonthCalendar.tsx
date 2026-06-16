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
  addMonths,
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
        block: "bg-pastel-lunch text-pastel-lunch-on",
        dot: "bg-pastel-lunch-on"
      };
    case "pastel-dinner":
      return {
        block: "bg-pastel-dinner text-pastel-dinner-on",
        dot: "bg-pastel-dinner-on"
      };
    case "pastel-vacation":
      return {
        block: "bg-pastel-vacation text-pastel-vacation-on",
        dot: "bg-pastel-vacation-on"
      };
    case "pastel-other":
    default:
      return {
        block: "bg-pastel-other text-pastel-other-on",
        dot: "bg-pastel-other-on"
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
  const nextMonth = addMonths(currentDate, 1);
  const isSameYr = currentDate.getFullYear() === nextMonth.getFullYear();
  const titleText = isSameYr 
    ? `${format(currentDate, "yyyy년 M월", { locale: ko })}~${format(nextMonth, "M월", { locale: ko })}`
    : `${format(currentDate, "yyyy년 M월", { locale: ko })}~${format(nextMonth, "yyyy년 M월", { locale: ko })}`;

  const today = startOfDay(new Date());

  // Extract holidays separately
  const holidays = events.filter(e => e.isHoliday);

  // Filter regular events based on selected category
  const filteredEvents = events.filter((event) => {
    if (event.isHoliday) return false;
    if (selectedCategory === "전체 조회") return true;
    
    const textToSearch = (event.summary + " " + (event.description || "")).toLowerCase();
    
    if (selectedCategory === "기타") {
      const predefined = ["점심", "저녁", "휴가"];
      return !predefined.some(cat => textToSearch.includes(cat.toLowerCase()));
    }
    
    return textToSearch.includes(selectedCategory.toLowerCase());
  });

  return (
    <section className="flex-1 flex flex-col min-h-0">
      <div className="flex justify-between items-end mb-4 px-margin-mobile shrink-0">
        <h2 className="text-xl text-on-surface flex items-center leading-none tracking-tight">
          {titleText}
          {isLoading && <span className="material-symbols-outlined animate-spin text-sm text-outline ml-2">refresh</span>}
        </h2>
        <div className="flex items-center space-x-2">
          <button onClick={onPrevMonth} className="w-8 h-8 flex items-center justify-center text-outline hover:bg-surface-variant rounded-full transition-colors">
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button onClick={onNextMonth} className="w-8 h-8 flex items-center justify-center text-outline hover:bg-surface-variant rounded-full transition-colors">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col border-t border-b border-outline-variant bg-surface transition-opacity duration-300 min-h-0">
        <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-low shrink-0">
          <div className="py-3 text-center font-label-caps text-label-caps text-error">일</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">월</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">화</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">수</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">목</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">금</div>
          <div className="py-3 text-center font-label-caps text-label-caps text-on-surface-variant">토</div>
        </div>

        <div className={`flex-1 overflow-y-auto ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="flex flex-col">
            <div className="grid grid-cols-7">
              {(() => {
                const month1Start = startOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
                const month2End = startOfDay(new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0));
                
                const startDate = startOfWeek(month1Start);
                const endDate = endOfWeek(month2End);
                const days = eachDayOfInterval({ start: startDate, end: endDate });

                return days.map((day, idx) => {
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isCurrentMonth = isSameMonth(day, month1Start) || isSameMonth(day, nextMonth);
                  const isPast = isBefore(day, today);
                  const isTodayDay = isSameDay(day, today);
                  const isWeekend = idx % 7 === 0 || idx % 7 === 6;
                  const displayDayFormat = day.getDate() === 1 ? "M.d" : "d";
                  
                  const isEventOnDay = (e: CalendarEvent, targetDay: Date) => {
                    if (e.start.date && e.end?.date) {
                      const start = parseISO(e.start.date);
                      const end = parseISO(e.end.date);
                      return targetDay.getTime() >= start.getTime() && targetDay.getTime() < end.getTime();
                    } else if (e.start.dateTime && e.end?.dateTime) {
                      const start = parseISO(e.start.dateTime);
                      const end = parseISO(e.end.dateTime);
                      const targetTime = targetDay.getTime();
                      const startTime = startOfDay(start).getTime();
                      const endTimeObj = end.getTime();
                      if (start.getTime() === endTimeObj) return targetTime === startTime;
                      const lastInclusiveDay = startOfDay(new Date(endTimeObj - 1)).getTime();
                      return targetTime >= startTime && targetTime <= lastInclusiveDay;
                    } else if (e.start.dateTime) {
                      return isSameDay(parseISO(e.start.dateTime), targetDay);
                    } else if (e.start.date) {
                      return isSameDay(parseISO(e.start.date), targetDay);
                    }
                    return false;
                  };

                  // Check if there are holidays on this day
                  const dayHolidays = holidays.filter(e => isEventOnDay(e, day));
                  const isHoliday = dayHolidays.length > 0;
                  const isRedDay = idx % 7 === 0 || isHoliday;
                  
                  // Check if there are regular events on this day
                  const dayEvents = filteredEvents.filter(e => isEventOnDay(e, day));
                  
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
                      <div key={idx} className={`aspect-[2/3] sm:aspect-[5/6] ${borderClasses} flex flex-col items-center justify-start pt-2 text-outline-variant opacity-30 overflow-hidden`}>
                        <span className={`${isWeekend ? 'font-bold' : ''}`}>{format(day, displayDayFormat)}</span>
                      </div>
                    );
                  }

                  let cellBgClass = isTodayDay ? "bg-primary-container/10" : "bg-surface-container-lowest hover:bg-surface-container-low transition-colors";
                  let isCategoryHighlighted = false;
                  
                  if (dayEvents.length > 0) {
                    if (selectedCategory === "점심") { cellBgClass = "bg-pastel-lunch hover:brightness-95 transition-all"; isCategoryHighlighted = true; }
                    else if (selectedCategory === "저녁") { cellBgClass = "bg-pastel-dinner hover:brightness-95 transition-all"; isCategoryHighlighted = true; }
                    else if (selectedCategory === "휴가") { cellBgClass = "bg-pastel-vacation hover:brightness-95 transition-all"; isCategoryHighlighted = true; }
                  }

                  const borderStyle = isTodayDay ? `border-b ${!isRightEdge ? 'border-r' : ''} border-primary z-10` : borderClasses;

                  return (
                    <div 
                      key={idx} 
                      onClick={() => onDateSelect(day)}
                      className={`aspect-[2/3] sm:aspect-[5/6] flex flex-col items-center justify-start pt-2 cursor-pointer relative overflow-hidden ${borderStyle} ${cellBgClass} ${isSelected ? (isCategoryHighlighted ? 'ring-2 ring-inset ring-on-surface/20' : 'bg-secondary-container/30') : ''} ${isPast && !isTodayDay ? 'opacity-50 grayscale' : ''}`}
                    >
                      {isTodayDay ? (
                        <div className="w-6 h-6 bg-primary flex items-center justify-center">
                          <span className={`font-time-display text-[14px] leading-none text-on-primary ${isWeekend ? 'font-bold' : ''}`}>{format(day, displayDayFormat)}</span>
                        </div>
                      ) : (
                        <span className={`font-time-display text-time-display ${isRedDay ? 'text-error' : (isPast ? 'text-outline' : 'text-on-surface')} ${isWeekend ? 'font-bold' : ''} ${isPast ? 'line-through' : ''}`}>
                          {format(day, displayDayFormat)}
                        </span>
                      )}

                      {isHoliday && (
                        <span className={`text-[9px] ${isTodayDay ? 'text-primary' : 'text-error'} mt-0.5 truncate w-full text-center px-0.5 ${isPast && !isTodayDay ? 'line-through' : ''}`}>
                          {dayHolidays[0].summary}
                        </span>
                      )}
                      
                      <div className="mt-auto w-full px-1 pb-1 flex flex-col justify-end gap-0.5 flex-1 min-h-0 overflow-hidden">
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
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
