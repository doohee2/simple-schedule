"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { useAddCalendarEvent } from "@/hooks/useCalendar";

interface BottomSheetProps {
  selectedDate: Date | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BottomSheet({ selectedDate, isOpen, onClose }: BottomSheetProps) {
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:30");

  const addEventMutation = useAddCalendarEvent();

  const handleSave = () => {
    if (!selectedDate || !summary.trim()) return;

    // Combine date and time
    const startDateString = format(selectedDate, "yyyy-MM-dd");
    const startDateTimeStr = `${startDateString}T${startTime}:00`;
    const endDateTimeStr = `${startDateString}T${endTime}:00`;

    const startDateTime = new Date(startDateTimeStr);
    const endDateTime = new Date(endDateTimeStr);

    addEventMutation.mutate({
      summary,
      description,
      start: { dateTime: startDateTime.toISOString() },
      end: { dateTime: endDateTime.toISOString() },
    }, {
      onSuccess: () => {
        setSummary("");
        setDescription("");
        setStartTime("12:00");
        setEndTime("13:30");
        onClose();
      }
    });
  };

  if (!isOpen || !selectedDate) return null;

  return (
    <>
      <div className="fixed inset-0 bg-on-background/20 dark:bg-background/40 backdrop-overlay z-30 transition-opacity duration-300" onClick={onClose}></div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-50 bottom-sheet-enter bottom-sheet-enter-active">
        <div className="bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.2)] border-t border-outline-variant p-lg flex flex-col max-w-[768px] mx-auto w-full max-h-[80vh] overflow-y-auto">
          {/* Grabber Handle */}
          <div className="w-12 h-1.5 bg-outline-variant mx-auto mb-6 cursor-pointer" onClick={onClose}></div>
          
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              {format(selectedDate, "M월 d일", { locale: ko })} 일정
            </h3>
            <button 
              onClick={handleSave}
              disabled={addEventMutation.isPending || !summary.trim()}
              className="w-10 h-10 bg-primary text-on-primary flex items-center justify-center hover:opacity-80 transition-opacity active:scale-95 disabled:opacity-50"
            >
              {addEventMutation.isPending ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined">add</span>
              )}
            </button>
          </div>
          
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
            새로운 일정을 추가하세요
          </p>

          {/* Inputs Area */}
          <div className="flex flex-col gap-md">
            {/* Details Input */}
            <div className="relative group">
              <label className="sr-only">약속 대상 및 내용</label>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline-variant">
                  person_add
                </span>
              </div>
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-surface dark:bg-[#25262B] border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all rounded-none"
                placeholder="약속 대상 및 내용 입력 (예: 점심 약속)"
                type="text"
              />
            </div>

            {/* Minimalist Time Picker Bento */}
            <div className="grid grid-cols-2 gap-sm">
              <div className="bg-surface dark:bg-[#25262B] p-4 flex flex-col items-start gap-2 border border-outline-variant relative overflow-hidden group hover:border-primary transition-colors cursor-pointer rounded-none focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <label className="text-[10px] font-label-caps text-label-caps text-outline">
                  시작 시간
                </label>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="font-time-display text-time-display text-primary mt-1 tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
                />
              </div>
              <div className="bg-surface dark:bg-[#25262B] p-4 flex flex-col items-start gap-2 border border-outline-variant relative overflow-hidden group hover:border-primary transition-colors cursor-pointer rounded-none focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <label className="text-[10px] font-label-caps text-label-caps text-outline">
                  예상 종료
                </label>
                <input 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="font-time-display text-time-display text-on-surface-variant mt-1 tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
                />
              </div>
            </div>

            {/* Suggested Places Horizontal Scroll */}
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs font-label-caps text-label-caps text-outline px-1">
                메모
              </label>
              <div className="relative group">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[100px] p-4 bg-surface dark:bg-[#25262B] border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none rounded-none"
                  placeholder="일정에 대한 메모를 입력하세요"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="h-8"></div>
        </div>
      </div>
    </>
  );
}
