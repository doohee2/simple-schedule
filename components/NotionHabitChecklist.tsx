"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { HabitSummaryMap } from "@/hooks/useCalendar";

export type HabitPropertyValue = boolean | string | number | null | undefined;

export interface HabitProperty {
  id: string;
  name: string;
  type: 'checkbox' | 'status' | 'select' | 'rich_text' | 'number' | 'title' | 'other';
  value: HabitPropertyValue;
  options?: { id: string; name: string; color?: string }[];
}

interface NotionHabitChecklistProps {
  selectedDate: Date | null;
  onBack?: () => void;
}

export default function NotionHabitChecklist({ selectedDate }: NotionHabitChecklistProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [configured, setConfigured] = useState<boolean>(true);
  const [found, setFound] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [pageId, setPageId] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [properties, setProperties] = useState<HabitProperty[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  const fetchHabits = async (forceRefresh = false) => {
    setLoading(true);
    setErrorMsg(null);
    setSaveSuccess(false);
    setHasChanges(false);

    if (!forceRefresh) {
      const cachedQueries = queryClient.getQueriesData<HabitSummaryMap>({ queryKey: ["notion-habits-summary"] });
      for (const [key, summaryData] of cachedQueries) {
        if (!summaryData) continue;
        const start = key[1] as string;
        const end = key[2] as string;
        if (typeof start === "string" && typeof end === "string" && dateStr >= start && dateStr <= end) {
          const daySummary = summaryData[dateStr];
          if (daySummary?.data) {
            setConfigured(daySummary.data.configured ?? true);
            setFound(daySummary.data.found ?? true);
            setMessage("");
            setPageId(daySummary.data.pageId || null);
            setPageUrl(daySummary.data.url || null);
            setProperties((daySummary.data.properties as HabitProperty[]) || []);
            setLoading(false);
            return;
          } else {
            setConfigured(true);
            setFound(false);
            setMessage(`해당 날짜(${dateStr})의 노션 습관 체크리스트 레코드가 없습니다. 노션 데이터베이스에 '${dateStr}' 날짜 레코드를 생성해 주세요.`);
            setPageId(null);
            setPageUrl(null);
            setProperties([]);
            setLoading(false);
            return;
          }
        }
      }
    }

    try {
      const res = await fetch(`/api/notion/habits?date=${encodeURIComponent(dateStr)}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "노션 정보를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      setConfigured(data.configured ?? true);
      setFound(data.found ?? false);
      setMessage(data.message || "");
      setPageId(data.pageId || null);
      setPageUrl(data.url || null);
      setProperties(data.properties || []);

      if (forceRefresh) {
        queryClient.invalidateQueries({ queryKey: ["notion-habits-summary"] });
      }
    } catch (err) {
      console.error("Failed to fetch habits:", err);
      setErrorMsg("네트워크 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHabits(false);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  const handleValueChange = (index: number, newValue: HabitPropertyValue) => {
    setProperties((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], value: newValue };
      return copy;
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!pageId) return;

    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/notion/habits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageId,
          updates: properties,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSaveSuccess(true);
        setHasChanges(false);
        queryClient.invalidateQueries({ queryKey: ["notion-habits-summary"] });
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMsg(data.error || data.details || "저장 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("Failed to save habits:", err);
      setErrorMsg("저장 중 네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-primary animate-pulse">
        <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
        <span className="text-sm font-medium text-on-surface-variant">노션 습관 체크리스트 불러오는 중...</span>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-8 w-full text-center my-2 gap-2">
        <span className="material-symbols-outlined text-4xl text-outline-variant opacity-60">settings_ethernet</span>
        <div className="flex flex-col gap-1 w-full px-2">
          <h4 className="font-bold text-on-surface text-sm">노션 연동이 설정되지 않았습니다</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed break-keep w-full">
            상단 헤더의 노션 아이콘을 눌러 액세스 토큰과 데이터베이스 ID를 등록해주세요.
          </p>
        </div>
      </div>
    );
  }

  if (!found) {
    return (
      <div className="flex flex-col items-center justify-center py-8 w-full text-center my-2 gap-3">
        <span className="material-symbols-outlined text-4xl text-outline-variant opacity-60">event_busy</span>
        <div className="flex flex-col gap-1 w-full px-2">
          <h4 className="font-bold text-on-surface text-sm">체크리스트가 없습니다</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed break-keep w-full">
            {`${dateStr} 날짜의 노션 레코드가 없습니다. 노션 데이터베이스에서 레코드를 생성해주세요.`}
          </p>
        </div>
        <button
          onClick={() => fetchHabits(true)}
          className="mt-1 px-4 py-2 bg-surface-variant text-on-surface-variant rounded-xl text-xs font-bold hover:opacity-80 transition-opacity flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          다시 확인
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Action Header & Notice */}
      <div className="flex items-center justify-between bg-surface-container-low p-3.5 border border-outline-variant">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">task_alt</span>
          <span className="text-sm font-bold text-on-surface">오늘의 습관 & 체크리스트</span>
        </div>
        {pageUrl && (
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
          >
            <span>노션에서 열기</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        )}
      </div>

      {errorMsg && (
        <div className="bg-error-container/40 text-error p-3 text-xs font-medium flex items-center gap-2 border border-error/20">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-[#c6f6d5] dark:bg-[#137333]/30 text-[#137333] dark:text-[#c6f6d5] p-3 text-xs font-bold flex items-center gap-2 transition-all">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>변경사항이 노션에 성공적으로 저장되었습니다!</span>
        </div>
      )}

      {/* Properties List */}
      <div className="flex flex-col gap-2.5">
        {properties.map((prop, idx) => {
          if (prop.type === "checkbox") {
            const isChecked = Boolean(prop.value);
            return (
              <div
                key={prop.id}
                onClick={() => handleValueChange(idx, !isChecked)}
                className={`flex items-center justify-between p-4 border transition-all cursor-pointer select-none ${
                  isChecked
                    ? "bg-primary/10 border-primary/40 text-on-surface"
                    : "bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <span className={`text-sm font-semibold ${isChecked ? "line-through text-on-surface/70" : ""}`}>
                  {prop.name}
                </span>
                <div
                  className={`w-6 h-6 flex items-center justify-center transition-colors ${
                    isChecked ? "bg-primary text-on-primary" : "border-2 border-outline bg-transparent"
                  }`}
                >
                  {isChecked && <span className="material-symbols-outlined text-[18px] font-bold">check</span>}
                </div>
              </div>
            );
          }

          if (prop.type === "status" || prop.type === "select") {
            return (
              <div key={prop.id} className="flex flex-col gap-1.5 p-3.5 bg-surface-container-lowest border border-outline-variant">
                <label className="text-xs font-bold text-on-surface-variant flex items-center justify-between">
                  <span>{prop.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-outline px-1.5 py-0.5 bg-surface-variant rounded">
                    {prop.type}
                  </span>
                </label>
                <select
                  value={String(prop.value || "")}
                  onChange={(e) => handleValueChange(idx, e.target.value)}
                  className="w-full h-10 px-3 bg-surface border border-outline-variant text-sm font-medium text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="">선택 없음</option>
                  {(prop.options || []).map((opt) => (
                    <option key={opt.id} value={opt.name}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (prop.type === "rich_text" || prop.type === "title" || prop.type === "number") {
            return (
              <div key={prop.id} className="flex flex-col gap-1.5 p-3.5 bg-surface-container-lowest border border-outline-variant">
                <label className="text-xs font-bold text-on-surface-variant flex items-center justify-between">
                  <span>{prop.name}</span>
                  <span className="text-[10px] text-outline px-1.5 py-0.5 bg-surface-variant rounded">
                    {prop.type === "rich_text" ? "코멘트 / 메모" : prop.type === "number" ? "숫자" : "제목"}
                  </span>
                </label>
                <input
                  type={prop.type === "number" ? "number" : "text"}
                  value={String(prop.value ?? "")}
                  onChange={(e) => handleValueChange(idx, e.target.value)}
                  placeholder={`${prop.name} 입력...`}
                  className="w-full h-10 px-3 bg-surface border border-outline-variant text-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary transition-all"
                />
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Save Button */}
      <div className="mt-2 pt-2 border-t border-outline-variant flex items-center gap-3">
        <button
          onClick={() => fetchHabits(true)}
          disabled={loading || saving}
          className="h-12 px-4 bg-surface-variant text-on-surface-variant font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
          title="새로고침"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex-1 h-12 bg-primary text-on-primary font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
              노션에 저장 중...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">save</span>
              {hasChanges ? "변경사항 노션에 저장" : "저장됨 (변경사항 없음)"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
