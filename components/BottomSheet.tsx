"use client";

import { useState, useEffect } from "react";
import { format, parseISO, isSameDay, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { useAddCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent, CalendarEvent, CalendarListEntry } from "@/hooks/useCalendar";

interface BottomSheetProps {
  selectedDate: Date | null;
  isOpen: boolean;
  onClose: () => void;
  events?: CalendarEvent[];
  selectedCategory?: string;
  calendars?: CalendarListEntry[];
}

export default function BottomSheet({ selectedDate, isOpen, onClose, events = [], selectedCategory = "", calendars = [] }: BottomSheetProps) {
  const [mode, setMode] = useState<"view" | "add" | "edit">("add");
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

  const addEventMutation = useAddCalendarEvent();
  const updateEventMutation = useUpdateCalendarEvent();
  const deleteEventMutation = useDeleteCalendarEvent();

  // Reset mode and form when sheet opens
  useEffect(() => {
    if (isOpen) {
      setMode(selectedCategory === "전체 조회" ? "view" : "add");
      setSummary("");
      setDescription("");
      setStartTime("12:00");
      setEndTime("13:30");
      setIsAllDay(true);
      setEditingEventId(null);
      setIsRecurring(false);
      setIsMultiDay(false);
      setIsReadOnly(false);
      setEditingCalendarId("primary");
      setEventDate(selectedDate || new Date());
    }
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
    if (calInfo && (calInfo.accessRole === "reader" || calInfo.accessRole === "freeBusyReader")) {
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

  if (!isOpen || !selectedDate) return null;

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

  // Sort events: all-day events first (alphabetical), then timed events (chronological)
  const sortedEvents = [...dayEvents].sort((a, b) => {
    const isAllDayA = !!a.start.date && !a.start.dateTime;
    const isAllDayB = !!b.start.date && !b.start.dateTime;

    if (isAllDayA && !isAllDayB) return -1;
    if (!isAllDayA && isAllDayB) return 1;

    if (isAllDayA && isAllDayB) {
      return a.summary.localeCompare(b.summary);
    }

    // Both are timed events
    const timeA = new Date(a.start.dateTime as string).getTime();
    const timeB = new Date(b.start.dateTime as string).getTime();
    return timeA - timeB;
  });

  return (
    <>
      <div className="fixed inset-0 bg-on-background/20 dark:bg-background/40 backdrop-overlay z-30 transition-opacity duration-300" onClick={onClose}></div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-50 bottom-sheet-enter bottom-sheet-enter-active">
        <div className="bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.2)] border-t border-outline-variant p-lg flex flex-col max-w-[768px] mx-auto w-full max-h-[80vh] overflow-y-auto">
          {/* Grabber Handle */}
          <div className="w-12 h-1.5 bg-outline-variant mx-auto mb-6 cursor-pointer" onClick={onClose}></div>
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {(mode === "add" || mode === "edit") && (
                <button onClick={() => setMode("view")} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
              )}
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
                {format(selectedDate, "M월 d일", { locale: ko })} 일정 {mode === "add" ? "추가" : mode === "edit" ? "수정" : ""}
              </h3>
            </div>
            
            {mode === "view" ? (
              <button 
                onClick={() => setMode("add")}
                className="w-10 h-10 bg-primary text-on-primary flex items-center justify-center hover:opacity-80 transition-opacity active:scale-95"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            ) : (
              <div className="flex gap-2">
                {mode === "edit" && (
                  <button 
                    onClick={handleDelete}
                    disabled={deleteEventMutation.isPending || isReadOnly || isMultiDay}
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
                  disabled={addEventMutation.isPending || updateEventMutation.isPending || !summary.trim() || isReadOnly || isMultiDay}
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
          </div>
          
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
            {mode === "view" 
              ? sortedEvents.length > 0 ? "등록된 일정 목록입니다." : "이 날짜에 등록된 일정이 없습니다."
              : mode === "edit" ? "일정의 내용을 수정하거나 삭제하세요" : "새로운 일정을 추가하세요"}
          </p>

          {mode === "view" ? (
            <div className="flex flex-col gap-sm pb-8">
              {sortedEvents.map(event => {
                const isAllDay = !!event.start.date && !event.start.dateTime;
                const timeStr = isAllDay 
                  ? "종일" 
                  : format(parseISO(event.start.dateTime as string), "a h:mm", { locale: ko });

                return (
                  <div key={event.id} onClick={() => handleEventClick(event)} className={`flex items-center justify-between p-4 border border-outline-variant bg-surface-container-lowest ${!event.isHoliday ? 'cursor-pointer hover:bg-surface-container-low transition-colors' : ''}`}>
                    <div className="flex flex-col">
                      <span className={`font-body-md font-semibold ${event.isHoliday ? 'text-error' : 'text-on-surface'}`}>{event.summary}</span>
                    </div>
                    <div className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container-low px-2 py-1">
                      {timeStr}
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
            <div className="flex flex-col gap-md pb-8">
              {isRecurring && (
                <div className="bg-error-container text-on-error-container p-3 flex items-center gap-2 text-sm border border-error/20">
                  <span className="material-symbols-outlined">event_repeat</span>
                  <span>반복 일정은 날짜/시간을 수정할 수 없습니다. 제목과 메모만 수정 가능합니다.</span>
                </div>
              )}
              {isMultiDay && !isRecurring && (
                <div className="bg-error-container text-on-error-container p-3 flex items-center gap-2 text-sm border border-error/20">
                  <span className="material-symbols-outlined">date_range</span>
                  <span>기간이 지정된(다일) 일정은 앱 내에서 직접 수정할 수 없습니다. 내용 확인만 가능합니다.</span>
                </div>
              )}
              {isReadOnly && (
                <div className="bg-surface-variant text-on-surface p-3 flex items-center gap-2 text-sm border border-outline/20">
                  <span className="material-symbols-outlined">lock</span>
                  <span>이 캘린더는 읽기 전용이므로 일정을 수정하거나 삭제할 수 없습니다.</span>
                </div>
              )}

              <div className="relative group">
                <label className="sr-only">약속 대상 및 내용</label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline-variant">person_add</span>
                </div>
                <input
                  value={summary}
                  disabled={isReadOnly || isMultiDay}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-surface dark:bg-[#25262B] border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none disabled:opacity-50"
                  placeholder="약속 대상 및 내용 입력 (예: 점심 약속)"
                  type="text"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex-1 p-3 flex items-center gap-2 border border-outline-variant relative overflow-hidden transition-colors rounded-none ${
                  (isRecurring || isReadOnly || isMultiDay)
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
                    className={`w-full font-body-md text-body-md tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 p-0 ${
                      (isRecurring || isReadOnly || isMultiDay) ? "text-outline cursor-not-allowed" : "text-on-surface"
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
                <div className={`p-4 flex flex-col items-start gap-2 border border-outline-variant relative overflow-hidden transition-colors rounded-none ${
                  (isAllDay || isRecurring || isReadOnly || isMultiDay)
                    ? "bg-surface-container-low opacity-50 cursor-not-allowed" 
                    : "bg-surface dark:bg-[#25262B] group hover:border-primary cursor-pointer focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
                }`}>
                  <label className="text-[10px] font-label-caps text-label-caps text-outline">시작 시간</label>
                  <input 
                    type="time" 
                    value={startTime}
                    disabled={isAllDay || isRecurring || isReadOnly || isMultiDay}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`font-time-display text-time-display mt-1 tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full ${
                      (isAllDay || isRecurring || isReadOnly || isMultiDay) ? "text-outline cursor-not-allowed" : "text-primary"
                    }`}
                  />
                </div>
                <div className={`p-4 flex flex-col items-start gap-2 border border-outline-variant relative overflow-hidden transition-colors rounded-none ${
                  (isAllDay || isRecurring || isReadOnly || isMultiDay)
                    ? "bg-surface-container-low opacity-50 cursor-not-allowed" 
                    : "bg-surface dark:bg-[#25262B] group hover:border-primary cursor-pointer focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
                }`}>
                  <label className="text-[10px] font-label-caps text-label-caps text-outline">예상 종료</label>
                  <input 
                    type="time" 
                    value={endTime}
                    disabled={isAllDay || isRecurring || isReadOnly || isMultiDay}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`font-time-display text-time-display mt-1 tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full ${
                      (isAllDay || isRecurring || isReadOnly || isMultiDay) ? "text-outline cursor-not-allowed" : "text-on-surface-variant"
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-label-caps text-label-caps text-outline px-1">메모</label>
                <div className="relative group">
                  <textarea
                    value={description}
                    disabled={isReadOnly || isMultiDay}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[100px] p-4 bg-surface dark:bg-[#25262B] border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none rounded-none disabled:opacity-50"
                    placeholder="일정에 대한 메모를 입력하세요"
                  ></textarea>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
