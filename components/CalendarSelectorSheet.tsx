"use client";

import { useCalendarList, CalendarListEntry } from "@/hooks/useCalendar";

interface CalendarSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCalendars: string[];
  onToggleCalendar: (calendarId: string) => void;
}

export default function CalendarSelectorSheet({ isOpen, onClose, selectedCalendars, onToggleCalendar }: CalendarSelectorSheetProps) {
  const { data: calendars, isLoading } = useCalendarList();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-on-background/20 dark:bg-background/40 backdrop-overlay z-30 transition-opacity duration-300" onClick={onClose}></div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-50 bottom-sheet-enter bottom-sheet-enter-active">
        <div className="bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.2)] border-t border-outline-variant p-lg flex flex-col max-w-[768px] mx-auto w-full max-h-[60vh] overflow-y-auto">
          <div className="w-12 h-1.5 bg-outline-variant mx-auto mb-6 cursor-pointer" onClick={onClose}></div>
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              표시할 캘린더 선택
            </h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-outline hover:bg-surface-variant rounded-full">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 pb-8">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
              </div>
            ) : !calendars ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <span className="material-symbols-outlined text-error mb-2 text-[32px]">error</span>
                <p className="text-body-sm text-on-surface">캘린더 목록을 가져올 수 없습니다.</p>
                <p className="text-label-sm text-on-surface-variant mt-1">권한이 부족할 수 있습니다. 다시 로그인해주세요.</p>
              </div>
            ) : (
              calendars.filter(cal => !cal.primary).map((cal: CalendarListEntry) => {
                const isSelected = selectedCalendars.includes(cal.id);
                return (
                  <label 
                    key={cal.id} 
                    className="flex items-center gap-3 p-3 border border-outline-variant bg-surface-container-lowest cursor-pointer hover:bg-surface-container-low transition-colors"
                  >
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleCalendar(cal.id)}
                      className="w-5 h-5 accent-primary rounded-none border-outline-variant text-primary focus:ring-primary"
                    />
                    <div className="flex flex-col flex-1 truncate">
                      <span className="font-body-md text-on-surface truncate">{cal.summary}</span>
                      {cal.description && (
                        <span className="text-[11px] text-on-surface-variant truncate">{cal.description}</span>
                      )}
                    </div>
                  </label>
                );
              })
            )}
            {!isLoading && calendars?.filter(cal => !cal.primary).length === 0 && (
              <p className="text-body-sm text-on-surface-variant text-center py-4">표시할 추가 캘린더가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
