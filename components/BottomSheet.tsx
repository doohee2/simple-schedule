"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO, isSameDay, addDays, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
// @ts-ignore
import { Lunar } from "lunar-javascript";
import { useAddCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent, CalendarEvent, CalendarListEntry } from "@/hooks/useCalendar";
import NotionHabitChecklist from "./NotionHabitChecklist";

interface BottomSheetProps {
  selectedDate: Date | null;
  isOpen: boolean;
  onClose: () => void;
  events?: CalendarEvent[];
  selectedCategory?: string;
  calendars?: CalendarListEntry[];
  isOffline?: boolean;
}

export default function BottomSheet({ selectedDate, isOpen, onClose, events = [], selectedCategory = "", calendars = [], isOffline = false }: BottomSheetProps) {
  const [mode, setMode] = useState<"view" | "add" | "edit" | "habit">("add");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:30");
  const [isAllDay, setIsAllDay] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [editingCalendarId, setEditingCalendarId] = useState("primary");
  const [habitPageUrl, setHabitPageUrl] = useState<string | null>(null);

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
  }, [isOpen, selectedDate]);

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


  const addEventMutation = useAddCalendarEvent();
  const updateEventMutation = useUpdateCalendarEvent();
  const deleteEventMutation = useDeleteCalendarEvent();

  // Reset mode and form when sheet opens
  useEffect(() => {
    if (isOpen && selectedDate) {
      const isEventOnDayLocal = (e: CalendarEvent, targetDay: Date) => {
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

      let initialMode: "view" | "add" | "edit" | "habit" = "add";

      if (selectedCategory === "전체 조회" || selectedCategory === "관심") {
        initialMode = "view";
        if (selectedCategory === "전체 조회" && selectedDate && isSameDay(selectedDate, new Date())) {
          if (typeof window !== "undefined" && localStorage.getItem("notion_prioritize_today") === "true") {
            initialMode = "habit";
          }
        }
      } else if (selectedCategory) {
        const dayEvents = events.filter(e => isEventOnDayLocal(e, selectedDate));
        const hasMatchingEvent = dayEvents.some(e => {
          if (e.isHoliday) return false;
          const searchStr = (e.summary + " " + (e.description || "")).toLowerCase();
          return searchStr.includes(selectedCategory.toLowerCase());
        });
        if (hasMatchingEvent) {
          initialMode = "view";
        }
      }

      if (isOffline && initialMode === "add") {
        initialMode = "view";
      }

      setMode(initialMode);

      if (initialMode === "add" && ["점심", "저녁", "휴가", "메모"].includes(selectedCategory)) {
        setSummary(selectedCategory + " ");
      } else {
        setSummary("");
      }

      setDescription("");
      setStartTime("12:00");
      setEndTime("13:30");
      setIsAllDay(true);
      setEditingEventId(null);
      setIsRecurring(false);
      setIsMultiDay(false);
      setIsReadOnly(false);
      setEditingCalendarId("primary");
      setEventDate(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedCategory, selectedDate]);

  const handleSave = () => {
    if (!eventDate || !summary.trim()) return;

    const eventPayload: any = {
      summary,
      description,
      calendarId: editingCalendarId,
    };

    if (!isRecurring) {
      if (isAllDay) {
        const startLocalString = format(eventDate, "yyyy-MM-dd");
        const endLocalString = format(addDays(eventDate, 1), "yyyy-MM-dd");
        eventPayload.start = { date: startLocalString, dateTime: null };
        eventPayload.end = { date: endLocalString, dateTime: null };
      } else {
        const startDateString = format(eventDate, "yyyy-MM-dd");
        const startDateTimeStr = `${startDateString}T${startTime}:00`;
        const endDateTimeStr = `${startDateString}T${endTime}:00`;

        const startDateTime = new Date(startDateTimeStr);
        const endDateTime = new Date(endDateTimeStr);

        eventPayload.start = { dateTime: startDateTime.toISOString(), date: null };
        eventPayload.end = { dateTime: endDateTime.toISOString(), date: null };
      }
    }

    if (mode === "edit" && editingEventId) {
      updateEventMutation.mutate({ eventId: editingEventId, event: eventPayload }, {
        onSuccess: () => {
          setMode("view");
        }
      });
    } else {
      addEventMutation.mutate(eventPayload, {
        onSuccess: () => {
          setSummary("");
          setDescription("");
          setStartTime("12:00");
          setEndTime("13:30");
          setIsAllDay(true);
          onClose();
        }
      });
    }
  };

  const handleDelete = () => {
    if (editingEventId && window.confirm("정말 이 일정을 삭제하시겠습니까?")) {
      deleteEventMutation.mutate(editingEventId, {
        onSuccess: () => {
          setMode("view");
        }
      });
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    // Cannot edit holidays
    if (event.isHoliday) return;

    setMode("edit");
    setEditingEventId(event.id);
    setSummary(event.summary || "");
    setDescription(event.description || "");

    // Check if the calendar is read-only
    const calId = event.calendarId || "primary";
    setEditingCalendarId(calId);

    const calInfo = calendars.find(c => c.id === calId);
    if (isOffline || (calInfo && (calInfo.accessRole === "reader" || calInfo.accessRole === "freeBusyReader"))) {
      setIsReadOnly(true);
    } else {
      setIsReadOnly(false);
    }

    // @ts-ignore
    setIsRecurring(!!event.recurrence || !!event.recurringEventId);

    let multiDay = false;
    if (event.start.date && event.end?.date) {
      const start = parseISO(event.start.date);
      const end = parseISO(event.end.date);
      if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) multiDay = true;
    } else if (event.start.dateTime && event.end?.dateTime) {
      const start = parseISO(event.start.dateTime);
      const end = parseISO(event.end.dateTime);
      if (startOfDay(start).getTime() !== startOfDay(new Date(end.getTime() - 1)).getTime()) {
        multiDay = true;
      }
    }
    setIsMultiDay(multiDay);

    if (event.start.dateTime) {
      setIsAllDay(false);
      const parsedDate = parseISO(event.start.dateTime);
      setEventDate(parsedDate);
      setStartTime(format(parsedDate, "HH:mm"));
      setEndTime(event.end.dateTime ? format(parseISO(event.end.dateTime), "HH:mm") : format(parsedDate, "HH:mm"));
    } else {
      setIsAllDay(true);
      if (event.start.date) {
        setEventDate(parseISO(event.start.date));
      } else if (selectedDate) {
        setEventDate(selectedDate);
      }
      setStartTime("12:00");
      setEndTime("13:30");
    }
  };

  if (!selectedDate) {
    return (
      <div className="hidden md:flex md:w-[360px] lg:w-[400px] shrink-0 border-l border-outline-variant bg-surface items-center justify-center p-8 text-outline-variant">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="material-symbols-outlined text-[48px] opacity-50">event_note</span>
          <p className="font-medium text-lg text-on-surface">날짜를 선택하세요</p>
          <p className="text-sm opacity-80">달력에서 날짜를 클릭하면<br />일정을 조회하고 추가할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  // Helper to check if event spans the selected date
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

  // Compute events for the selected date
  const dayEvents = events.filter(e => isEventOnDay(e, selectedDate));

  // Sort events: all-day events first (by category priority: 점심 -> 저녁 -> 휴가 -> 기타, then 가나다순), then timed events (chronological, then 가나다순)
  const getEventPriority = (e: CalendarEvent) => {
    const textToSearch = ((e.summary || "") + " " + (e.description || "")).toLowerCase();
    if (textToSearch.includes("점심")) return 1;
    if (textToSearch.includes("저녁")) return 2;
    if (textToSearch.includes("휴가")) return 3;
    return 4; // 기타
  };

  const sortedEvents = [...dayEvents].sort((a, b) => {
    const isAllDayA = !!a.start.date && !a.start.dateTime;
    const isAllDayB = !!b.start.date && !b.start.dateTime;

    if (isAllDayA && !isAllDayB) return -1;
    if (!isAllDayA && isAllDayB) return 1;

    if (isAllDayA && isAllDayB) {
      const prioA = getEventPriority(a);
      const prioB = getEventPriority(b);
      if (prioA !== prioB) return prioA - prioB;
      return (a.summary || "").localeCompare(b.summary || "", "ko");
    }

    // Both are timed events: chronological order by start time
    const timeA = new Date(a.start.dateTime as string).getTime();
    const timeB = new Date(b.start.dateTime as string).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.summary || "").localeCompare(b.summary || "", "ko");
  });

  return (
    <>
      {/* Backdrop removed so calendar is interactive */}

      <div className={`
        ${isOpen ? 'fixed bottom-0 bottom-sheet-enter bottom-sheet-enter-active' : 'hidden'} left-1/2 -translate-x-1/2 w-full z-50 
        md:flex md:static md:translate-x-0 md:w-[360px] lg:w-[400px] md:h-auto md:z-10 md:shrink-0 pointer-events-none
      `}>
        <div 
          ref={sheetRef}
          className={`bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.2)] md:shadow-none border-t md:border-t-0 md:border-l border-outline-variant flex flex-col max-w-[768px] mx-auto w-full max-h-[85vh] md:max-h-none md:h-full pointer-events-auto overflow-hidden`}
          style={isMobile ? {
            transform: isDragging 
              ? `translateY(${translateY}px)` 
              : (isMinimized ? `translateY(calc(100% - 90px))` : `translateY(${translateY}px)`),
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
          } : {}}
        >
          {/* Fixed Header Section */}
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
              <div className="flex items-center gap-2">
                {(mode === "add" || mode === "edit" || mode === "habit") && (
                  <button onClick={() => setMode("view")} className="text-on-surface-variant hover:text-on-surface" title="뒤로가기">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                )}
                <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface flex items-baseline gap-2">
                  <div className="flex items-center">
                    <span>{format(selectedDate, "M월 d일", { locale: ko })} {mode === "habit" ? "체크리스트" : `일정 ${mode === "add" ? "추가" : mode === "edit" ? "수정" : ""}`}</span>
                    {mode === "habit" && (
                      <button
                        onClick={() => window.dispatchEvent(new Event("open-quotes-modal"))}
                        className="flex items-center justify-center w-7 h-7 text-outline hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors ml-1 -mt-0.5"
                        title="오늘의 명언 보기"
                      >
                        <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                      </button>
                    )}
                  </div>
                  {selectedDate && mode !== "habit" && (
                    <span className="text-sm font-normal text-outline-variant tracking-tight">
                      (음력 {Lunar.fromDate(selectedDate).getMonth()}.{Lunar.fromDate(selectedDate).getDay()})
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {mode === "view" ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMode("habit")}
                      title="노션 습관 체크리스트"
                      className="w-10 h-10 bg-surface-variant text-primary border border-outline-variant/60 flex items-center justify-center hover:opacity-80 transition-opacity active:scale-95"
                    >
                    <span className="material-symbols-outlined text-[22px]">check_box</span>
                  </button>
                  {!isOffline && (
                    <button
                      onClick={() => setMode("add")}
                      title="일정 추가"
                      className="w-10 h-10 bg-primary text-on-primary flex items-center justify-center hover:opacity-80 transition-opacity active:scale-95"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  )}
                </div>
              ) : mode === "habit" ? (
                habitPageUrl && (
                  <a
                    href={habitPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-2.5 bg-surface-variant text-primary rounded-md text-xs font-bold flex items-center gap-1 hover:opacity-85 active:scale-95 transition-all border border-outline-variant/60"
                    title="노션 원본 페이지 바로가기"
                  >
                    <span>노션</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                )
              ) : (
                <div className="flex gap-2">
                  {mode === "edit" && (
                    <button
                      onClick={handleDelete}
                      disabled={deleteEventMutation.isPending || isReadOnly}
                      className="w-10 h-10 bg-error text-on-error flex items-center justify-center hover:opacity-80 transition-opacity active:scale-95 disabled:opacity-50"
                    >
                      {deleteEventMutation.isPending ? (
                        <span className="material-symbols-outlined animate-spin">refresh</span>
                      ) : (
                        <span className="material-symbols-outlined">delete</span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={addEventMutation.isPending || updateEventMutation.isPending || !summary.trim() || isReadOnly}
                    className="w-10 h-10 bg-primary text-on-primary flex items-center justify-center hover:opacity-80 transition-opacity active:scale-95 disabled:opacity-50"
                  >
                    {(addEventMutation.isPending || updateEventMutation.isPending) ? (
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined">check</span>
                    )}
                  </button>
                </div>
              )}
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-outline hover:bg-surface-variant rounded-full transition-colors md:hidden">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>
        </div>

          <div 
            className={`px-lg pb-lg flex flex-col flex-1 min-h-0 pt-2 ${isMinimized || isDragging ? 'overflow-hidden' : 'overflow-y-auto'}`}
          >
            {isOffline && mode === "view" && (
              <div className="bg-error/10 text-error p-2.5 mb-3 flex items-center gap-2 text-xs font-semibold border border-error/20 rounded-lg">
                <span className="material-symbols-outlined text-[18px]">cloud_off</span>
                <span>오프라인 모드입니다. 로컬에 캐시된 일정 조회만 가능합니다.</span>
              </div>
            )}

          {mode !== "habit" && (
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">
              {mode === "view"
                ? sortedEvents.length > 0 ? "등록된 일정 목록입니다." : "이 날짜에 등록된 일정이 없습니다."
                : mode === "edit" ? "일정의 내용을 수정하거나 삭제하세요" : "새로운 일정을 추가하세요"}
            </p>
          )}

          {mode === "habit" ? (
            <NotionHabitChecklist selectedDate={selectedDate} onBack={() => setMode("view")} isOffline={isOffline} onPageUrlChange={setHabitPageUrl} />
          ) : mode === "view" ? (
            <div className="flex flex-col gap-1 pb-4">
              {sortedEvents.map(event => {
                const isAllDay = !!event.start.date && !event.start.dateTime;
                const startTimeStr = isAllDay
                  ? "종일"
                  : format(parseISO(event.start.dateTime as string), "a h:mm", { locale: ko });
                const endTimeStr = !isAllDay && event.end?.dateTime
                  ? format(parseISO(event.end.dateTime as string), "a h:mm", { locale: ko })
                  : "";

                let calendarName = "";
                if (event.isHoliday) {
                  calendarName = "대한민국 휴일";
                } else if (event.calendarId && calendars) {
                  const cal = calendars.find(c => c.id === event.calendarId);
                  if (cal) calendarName = cal.summary;
                }

                return (
                  <div key={event.id} onClick={() => handleEventClick(event)} className={`flex items-center justify-between p-4 border border-outline-variant bg-surface-container-lowest ${!event.isHoliday ? 'cursor-pointer hover:bg-surface-container-low transition-colors' : ''}`}>
                    <div className="flex flex-col">
                      <span className={`font-body-md font-semibold ${event.isHoliday ? 'text-error' : 'text-on-surface'}`}>{event.summary}</span>
                      {calendarName && (
                        <span className="text-xs text-on-surface-variant opacity-70 mt-0.5 tracking-tight">{calendarName}</span>
                      )}
                    </div>
                    <div className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container-low px-2 py-1 text-right shrink-0">
                      {isAllDay ? startTimeStr : (
                        <div className="flex flex-col items-end leading-tight">
                          <span>{startTimeStr}</span>
                          <span className="text-outline-variant">~ {endTimeStr}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {sortedEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-outline-variant">
                  <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">event_busy</span>
                  <span className="font-body-sm">일정이 없습니다</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1 pb-4">
              {isRecurring && (
                <div className="bg-error-container text-on-error-container p-3 flex items-center gap-2 text-sm border border-error/20">
                  <span className="material-symbols-outlined">event_repeat</span>
                  <span>반복 일정은 날짜/시간을 수정할 수 없습니다. 제목과 메모만 수정 가능합니다.</span>
                </div>
              )}
              {isMultiDay && !isRecurring && (
                <div className="bg-error-container text-on-error-container p-3 flex items-center gap-2 text-sm border border-error/20">
                  <span className="material-symbols-outlined">date_range</span>
                  <span>기간 지정(다일) 일정은 날짜/시간을 수정할 수 없습니다. 제목과 메모만 수정 가능합니다.</span>
                </div>
              )}
              {isReadOnly && (
                <div className="bg-surface-variant text-on-surface p-3 flex items-center gap-2 text-sm border border-outline/20">
                  <span className="material-symbols-outlined">lock</span>
                  <span>{isOffline ? "오프라인 상태에서는 일정을 수정하거나 삭제할 수 없습니다 (조회 전용)." : "이 캘린더는 읽기 전용이므로 일정을 수정하거나 삭제할 수 없습니다."}</span>
                </div>
              )}

              <div className="relative group">
                <label className="sr-only">약속 대상 및 내용</label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline-variant">person_add</span>
                </div>
                <input
                  value={summary}
                  disabled={isReadOnly}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full h-14 pl-12 pr-16 bg-surface dark:bg-[#25262B] border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none disabled:opacity-50"
                  placeholder="약속 대상 및 내용 (예: 점심 가족)"
                  type="text"
                />
                <div className="absolute inset-y-0 right-1 flex items-center">
                  <select
                    disabled={isReadOnly}
                    className="h-10 px-2 bg-surface-variant/50 border border-transparent rounded text-sm text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                    onChange={(e) => {
                      const prefix = e.target.value;
                      if (!prefix) return;
                      const prefixes = ["점심", "저녁", "휴가", "메모"];
                      let newSummary = summary.trim();
                      const firstWord = newSummary.split(" ")[0];
                      if (prefixes.includes(firstWord)) {
                        newSummary = newSummary.substring(firstWord.length).trim();
                      }
                      setSummary(newSummary ? `${prefix} ${newSummary}` : `${prefix} `);
                      e.target.value = ""; // Reset select after applying
                    }}
                  >
                    <option value="">...</option>
                    <option value="점심">점심</option>
                    <option value="저녁">저녁</option>
                    <option value="휴가">휴가</option>
                    <option value="메모">메모</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex-1 p-3 flex items-center gap-2 border border-outline-variant relative overflow-hidden transition-colors rounded-none ${(isRecurring || isReadOnly || isMultiDay)
                  ? "bg-surface-container-low opacity-50 cursor-not-allowed"
                  : "bg-surface dark:bg-[#25262B] group hover:border-primary cursor-pointer focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
                  }`}>
                  <span className="material-symbols-outlined text-outline-variant">calendar_today</span>
                  <input
                    type="date"
                    value={format(eventDate, "yyyy-MM-dd")}
                    disabled={isRecurring || isReadOnly || isMultiDay}
                    onChange={(e) => {
                      if (e.target.value) {
                        setEventDate(new Date(e.target.value + 'T00:00:00'));
                      }
                    }}
                    className={`w-full font-body-md text-body-md tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 p-0 ${(isRecurring || isReadOnly || isMultiDay) ? "text-outline cursor-not-allowed" : "text-on-surface"
                      }`}
                  />
                </div>
              </div>

              <div className="flex items-center px-1">
                <label className={`flex items-center gap-2 cursor-pointer font-body-sm text-body-sm text-on-surface select-none ${(isRecurring || isReadOnly || isMultiDay) ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    disabled={isRecurring || isReadOnly || isMultiDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded-none border-outline-variant text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <span>종일 일정으로 등록</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-sm">
                <div className={`px-4 py-2 flex flex-col items-start gap-1 border border-outline-variant relative overflow-hidden transition-colors rounded-none ${(isAllDay || isRecurring || isReadOnly || isMultiDay)
                  ? "bg-surface-container-low opacity-50 cursor-not-allowed"
                  : "bg-surface dark:bg-[#25262B] group hover:border-primary cursor-pointer focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
                  }`}>
                  <label className="text-[10px] font-label-caps text-label-caps text-outline">시작 시간</label>
                  <input
                    type="time"
                    value={startTime}
                    disabled={isAllDay || isRecurring || isReadOnly || isMultiDay}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`font-time-display text-time-display mt-1 tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full ${(isAllDay || isRecurring || isReadOnly || isMultiDay) ? "text-outline cursor-not-allowed" : "text-primary"
                      }`}
                  />
                </div>
                <div className={`px-4 py-2 flex flex-col items-start gap-1 border border-outline-variant relative overflow-hidden transition-colors rounded-none ${(isAllDay || isRecurring || isReadOnly || isMultiDay)
                  ? "bg-surface-container-low opacity-50 cursor-not-allowed"
                  : "bg-surface dark:bg-[#25262B] group hover:border-primary cursor-pointer focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
                  }`}>
                  <label className="text-[10px] font-label-caps text-label-caps text-outline">예상 종료</label>
                  <input
                    type="time"
                    value={endTime}
                    disabled={isAllDay || isRecurring || isReadOnly || isMultiDay}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`font-time-display text-time-display mt-1 tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full ${(isAllDay || isRecurring || isReadOnly || isMultiDay) ? "text-outline cursor-not-allowed" : "text-on-surface-variant"
                      }`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <label className="text-xs font-label-caps text-label-caps text-outline px-1">메모</label>
                <div className="relative group">
                  <textarea
                    value={description}
                    disabled={isReadOnly}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[200px] p-4 bg-surface dark:bg-[#25262B] border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none rounded-none disabled:opacity-50"
                    placeholder="일정에 대한 메모를 입력하세요"
                  ></textarea>
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll spacer to offset translateY in flex containers safely */}
          {isMobile && translateY > 0 && !isMinimized && (
            <div style={{ height: `${translateY}px`, flexShrink: 0 }} />
          )}
        </div>
        </div>
      </div>
    </>
  );
}
