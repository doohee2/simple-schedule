"use client";

import { useEffect, useState } from "react";

interface NotionTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotionTokenModal({ isOpen, onClose }: NotionTokenModalProps) {
  const [token, setToken] = useState<string>("");
  const [databaseId, setDatabaseId] = useState<string>("");
  const [prioritizeToday, setPrioritizeToday] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (typeof window !== "undefined") {
        setPrioritizeToday(localStorage.getItem("notion_prioritize_today") === "true");
      }
      const timer = setTimeout(() => {
        setStatusMsg(null);
        setLoading(true);
        fetch("/api/notion/token")
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              setToken(data.token || "");
              setDatabaseId(data.databaseId || "");
            }
          })
          .catch((err) => {
            console.error("Failed to fetch notion token:", err);
          })
          .finally(() => {
            setLoading(false);
          });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handlePrioritizeChange = (checked: boolean) => {
    setPrioritizeToday(checked);
    if (typeof window !== "undefined") {
      localStorage.setItem("notion_prioritize_today", String(checked));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    if (typeof window !== "undefined") {
      localStorage.setItem("notion_prioritize_today", String(prioritizeToday));
    }

    try {
      const res = await fetch("/api/notion/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          token: token.trim(),
          databaseId: databaseId.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMsg({ text: "노션 연동 정보(토큰/DB ID)가 성공적으로 저장되었습니다!", type: "success" });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMsg({ 
          text: data.error || "저장에 실패했습니다. 환경 변수와 DB 설정을 확인해주세요.", 
          type: "error" 
        });
      }
    } catch {
      setStatusMsg({ text: "네트워크 오류가 발생했습니다.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-on-background/20 dark:bg-background/40 backdrop-overlay z-[60] transition-opacity duration-300" 
        onClick={onClose} 
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[440px] bg-surface border border-outline-variant rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-[70] overflow-hidden bottom-sheet-enter-active">
        <div className="p-6 pb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-primary" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V5.354c0-.606-.233-.933-.888-.887L5.86 5.308c-.467.046-.608.28-.608.98z" />
                <path d="M18.796 5.679L7.357 6.425c-.234.047-.327.234-.327.467v12.271c0 .28.094.513.374.466l11.439-.699c.327-.047.42-.234.42-.514V6.146c0-.28-.14-.513-.467-.467z" opacity=".2" />
                <path d="M14.643 8.337v7.697c0 .42-.14.7-.514.7L12.5 16.828c-.28.046-.373-.093-.373-.373v-5.692L8.719 17.06c-.187.234-.327.327-.607.327l-1.354-.093c-.234-.047-.327-.234-.327-.514V8.943c0-.373.14-.606.514-.606l1.354-.093c.28-.047.373.093.373.373v5.692l3.361-6.158c.234-.373.467-.467.747-.514l1.354-.093c.327 0 .5.14.5.793z" />
              </svg>
              노션(Notion) 연동 설정
            </h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-outline hover:bg-surface-variant rounded-full transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-on-surface-variant text-sm leading-relaxed font-body-sm">
              노션 API의 <strong>프라이빗 통합 액세스 토큰</strong>과 일정을 동기화할 <strong>데이터베이스 ID</strong>를 함께 입력해 주세요.
            </p>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-xs font-bold text-on-surface flex items-center justify-between">
                <span>노션 액세스 토큰 (Access Token)</span>
                {loading && <span className="text-[11px] text-primary flex items-center gap-1"><span className="material-symbols-outlined text-[13px] animate-spin">refresh</span> 조회 중...</span>}
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ntv_... 또는 secret_..."
                disabled={loading || saving}
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant text-on-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono transition-all disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-xs font-bold text-on-surface">
                <span>노션 데이터베이스 ID (Database ID)</span>
              </label>
              <input
                type="text"
                value={databaseId}
                onChange={(e) => setDatabaseId(e.target.value)}
                placeholder="32자리 고유 ID (예: a1b2c3... 또는 URL 내부 ID)"
                disabled={loading || saving}
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant text-on-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono transition-all disabled:opacity-50"
              />
            </div>

            <div 
              className="flex items-center gap-3 mt-2.5 p-3.5 bg-surface-container-low border border-outline-variant rounded-xl cursor-pointer select-none hover:bg-surface-variant/50 transition-colors" 
              onClick={() => handlePrioritizeChange(!prioritizeToday)}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${prioritizeToday ? "bg-primary text-on-primary" : "border-2 border-outline bg-transparent"}`}>
                {prioritizeToday && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-on-surface">오늘 일정 조회 시 노션 우선</span>
                <span className="text-[11px] text-on-surface-variant leading-tight">
                  '전체 조회' 선택 시 캘린더의 오늘 날짜를 클릭하면 노션 체크리스트 화면이 기본으로 뜹니다.
                </span>
              </div>
            </div>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              statusMsg.type === "success" 
                ? "bg-[#c6f6d5] dark:bg-[#137333]/30 text-[#137333] dark:text-[#c6f6d5]" 
                : "bg-error-container/40 text-error"
            }`}>
              <span className="material-symbols-outlined text-[18px]">
                {statusMsg.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-11 bg-surface-variant text-on-surface-variant rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex-1 h-11 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
