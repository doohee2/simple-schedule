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
import { CalendarEvent, HabitSummaryMap } from "@/hooks/useCalendar";

interface MonthCalendarProps {
  currentDate: Date;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  events: CalendarEvent[];
  isLoading: boolean;
  selectedCategory: string;
  habitSummary?: HabitSummaryMap;
  isOffline?: boolean;
}

function HabitProgressIcon({ checked, total }: { checked: number; total: number }) {
  const ratio = total > 0 ? checked / total : 0;

  if (ratio === 0) {
    return (
      <svg viewBox="0 0 16 16" className="w-[19px] h-[19px] text-on-surface-variant/65 shrink-0 select-none" fill="none" stroke="currentColor">
        <title>{`노션 습관 미완료 (${checked}/${total})`}</title>
        <rect x="2.5" y="3.5" width="11" height="11" rx="2" strokeWidth="1.35" />
      </svg>
    );
  }

  if (ratio < 0.5) {
    return (
      <svg viewBox="0 0 16 16" className="w-[19px] h-[19px] text-on-surface-variant/75 shrink-0 select-none" fill="none" stroke="currentColor">
        <title>{`노션 습관 진행 중 (${checked}/${total})`}</title>
        <rect x="2.5" y="3.5" width="11" height="11" rx="2" strokeWidth="1.35" />
        <path d="M 5.5 9.3 L 7.3 11.1 L 10.5 7.6" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (ratio < 1) {
    return (
      <svg viewBox="0 0 16 16" className="w-[19px] h-[19px] text-on-surface-variant/85 shrink-0 select-none" fill="none" stroke="currentColor">
        <title>{`노션 습관 과반 달성 (${checked}/${total})`}</title>
        <rect x="2.5" y="3.5" width="11" height="11" rx="2" strokeWidth="1.35" />
        <path d="M 4.6 9.3 L 7.2 11.8 L 11.7 6.5" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 100% (ratio >= 1) - 상자를 살짝 넘어서는 체크
  return (
    <svg viewBox="0 0 16 16" className="w-[19px] h-[19px] text-on-surface-variant/95 shrink-0 select-none" fill="none" stroke="currentColor">
      <title>{`노션 습관 완료 (${checked}/${total})`}</title>
      <rect x="2.5" y="3.5" width="11" height="11" rx="2" strokeWidth="1.35" className="opacity-80" />
      <path d="M 4.0 9.5 L 7.2 12.5 L 15.2 3.2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
  habitSummary,
  isOffline = false,
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
      <div className="flex justify-between items-end mb-3 px-margin-mobile shrink-0">
        <h2 className="text-base font-bold text-on-surface flex items-center leading-none tracking-tight">
          {titleText}
          {isLoading && <span className="material-symbols-outlined animate-spin text-sm text-outline ml-2">refresh</span>}
        </h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={onPrevMonth} 
            disabled={isOffline}
            title={isOffline ? "오프라인 모드에서는 달력을 이동할 수 없습니다." : "이전 달"}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isOffline ? "text-outline/30 cursor-not-allowed" : "text-outline hover:bg-surface-variant"}`}
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button 
            onClick={onNextMonth} 
            disabled={isOffline}
            title={isOffline ? "오프라인 모드에서는 달력을 이동할 수 없습니다." : "다음 달"}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isOffline ? "text-outline/30 cursor-not-allowed" : "text-outline hover:bg-surface-variant"}`}
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col border-t border-b border-outline-variant bg-surface transition-opacity duration-300 min-h-0">
        <div className={`flex-1 overflow-y-auto [container-type:size] ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          <div className="h-[28px] grid grid-cols-7 border-b border-outline-variant bg-surface-container-low shrink-0 sticky top-0 z-30 items-center">
            <div className="text-right pr-1.5 font-label-caps text-[11px] tracking-wide text-error">일</div>
            <div className="text-right pr-1.5 font-label-caps text-[11px] tracking-wide text-on-surface-variant">월</div>
            <div className="text-right pr-1.5 font-label-caps text-[11px] tracking-wide text-on-surface-variant">화</div>
            <div className="text-right pr-1.5 font-label-caps text-[11px] tracking-wide text-on-surface-variant">수</div>
            <div className="text-right pr-1.5 font-label-caps text-[11px] tracking-wide text-on-surface-variant">목</div>
            <div className="text-right pr-1.5 font-label-caps text-[11px] tracking-wide text-on-surface-variant">금</div>
            <div className="text-right pr-1.5 font-label-caps text-[11px] tracking-wide text-on-surface-variant">토</div>
          </div>
          <div className="flex flex-col">
            <div className="grid grid-cols-7 auto-rows-[calc((100cqh-28px)/5)]">
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
                  const displayItems: Array<{ id: string; text: string; isOther: boolean; firstColor: string }> = [];

                  const otherEvents: typeof dayEvents = [];

                  dayEvents.forEach(e => {
                    const text = e.summary || "";
                    const searchStr = (text + " " + (e.description || "")).toLowerCase();

                    let firstColor = "pastel-other";
                    let hasKeyword = false;

                    if (searchStr.includes("점심")) { hasKeyword = true; firstColor = "pastel-lunch"; }
                    else if (searchStr.includes("저녁")) { hasKeyword = true; firstColor = "pastel-dinner"; }
                    else if (searchStr.includes("휴가")) { hasKeyword = true; firstColor = "pastel-vacation"; }

                    if (hasKeyword) {
                      displayItems.push({ id: e.id, text, isOther: false, firstColor });
                    } else {
                      otherEvents.push(e);
                    }
                  });

                  if (otherEvents.length > 0) {
                    const stars = ".".repeat(otherEvents.length);
                    displayItems.push({ id: "other-group", text: stars, isOther: true, firstColor: "transparent" });
                  }

                  // Check boundaries for Month 1 vs Month 2
                  const isM1 = isSameMonth(day, month1Start);
                  const isNextDayM2 = idx + 1 < days.length && isSameMonth(days[idx + 1], nextMonth);
                  const isNextWeekM2 = idx + 7 < days.length && isSameMonth(days[idx + 7], nextMonth);

                  const isRightEdge = (idx + 1) % 7 === 0;

                  const thickRight = isM1 && isNextDayM2 && !isRightEdge;
                  const thickBottom = isM1 && isNextWeekM2;

                  const borderR = thickRight ? 'border-r-2 border-r-outline z-10' : (!isRightEdge ? 'border-r border-outline-variant' : '');
                  const borderB = thickBottom ? 'border-b-2 border-b-outline z-10' : 'border-b border-outline-variant';

                  const borderClasses = `${borderR} ${borderB}`;

                  if (!isCurrentMonth) {
                    return (
                      <div key={idx} className={`${borderClasses} flex flex-col justify-start pt-1 pr-1 pl-1 pb-1 text-outline-variant opacity-30 overflow-hidden`}>
                        <div className="w-full flex items-center justify-end h-5">
                          <div className="w-5 h-5 flex items-center justify-center">
                            <span className={`font-time-display text-[12px] leading-none ${isWeekend ? 'font-bold' : ''}`}>{format(day, displayDayFormat)}</span>
                          </div>
                        </div>
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

                  const todayBorderR = thickRight ? 'border-r-2' : (!isRightEdge ? 'border-r' : '');
                  const todayBorderB = thickBottom ? 'border-b-2' : 'border-b';
                  const borderStyle = isTodayDay ? `${todayBorderR} ${todayBorderB} border-primary z-20` : borderClasses;

                  const dateKey = format(day, "yyyy-MM-dd");
                  const habitStat = habitSummary?.[dateKey];

                  return (
                    <div
                      key={idx}
                      onClick={() => onDateSelect(day)}
                      className={`flex flex-col justify-start pt-1 pr-1 pl-1 pb-1 cursor-pointer relative overflow-hidden ${borderStyle} ${cellBgClass} ${isSelected ? (isCategoryHighlighted ? 'ring-2 ring-inset ring-on-surface/20' : 'bg-secondary-container/30') : ''} ${isPast && !isTodayDay ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="w-full flex items-center justify-end gap-1 h-5">
                        {habitStat && habitStat.total > 0 && (
                          <HabitProgressIcon checked={habitStat.checked} total={habitStat.total} />
                        )}
                        <div className={`w-5 h-5 flex items-center justify-center rounded-sm shrink-0 ${isTodayDay ? 'bg-primary' : 'bg-transparent'}`}>
                          <span className={`font-time-display leading-none ${isTodayDay ? 'text-[11px] text-on-primary' : `text-[12px] ${isRedDay ? 'text-error' : (isPast ? 'text-outline' : 'text-on-surface')}`} ${isWeekend ? 'font-bold' : ''} ${isPast && !isTodayDay ? 'line-through' : ''}`}>
                            {format(day, displayDayFormat)}
                          </span>
                        </div>
                      </div>

                      {isHoliday && (
                        <span className={`self-end text-[9px] ${isTodayDay ? 'text-primary' : 'text-error'} mt-0.5 truncate max-w-full text-right ${isPast && !isTodayDay ? 'line-through' : ''}`}>
                          {dayHolidays[0].summary}
                        </span>
                      )}

                      <div className="mt-auto w-full px-0 flex flex-col justify-end gap-0.5 flex-1 min-h-0 overflow-hidden">
                        {displayItems.slice(0, 3).map((item, i) => {
                          let content;
                          if (item.isOther) {
                            content = (
                              <span className="text-on-surface font-bold px-1">
                                {item.text}
                              </span>
                            );
                          } else {
                            const keywords = ["점심", "저녁", "휴가"];
                            const regex = new RegExp(`(${keywords.join("|")})`, "g");
                            const parts = item.text.split(regex);

                            content = parts.map((part, index) => {
                              if (part === "점심") return <span key={index} className="bg-pastel-lunch text-pastel-lunch-on px-0.5 rounded-sm">{part}</span>;
                              if (part === "저녁") return <span key={index} className="bg-pastel-dinner text-pastel-dinner-on px-0.5 rounded-sm">{part}</span>;
                              if (part === "휴가") return <span key={index} className="bg-pastel-vacation text-pastel-vacation-on px-0.5 rounded-sm">{part}</span>;
                              return <span key={index}>{part}</span>;
                            });
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
                              const style = getCategoryStyle(item.firstColor);
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
