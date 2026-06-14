"use client";

interface FilterCategoriesProps {
  selected: string;
  onSelect: (category: string) => void;
}

const otherCategories = ["점심", "저녁", "휴가", "기타"];

const categoryStyles: Record<string, { selectedClass: string; unselectedClass: string }> = {
  "전체 조회": {
    selectedClass: "bg-pastel-all text-pastel-all-on border border-dashed border-outline-variant shadow-[0_4px_20px_rgba(0,0,0,0.04)]",
    unselectedClass: "bg-transparent text-on-surface border border-dashed border-outline-variant hover:bg-surface-variant"
  },
  "점심": {
    selectedClass: "bg-pastel-lunch text-pastel-lunch-on border border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.04)]",
    unselectedClass: "bg-transparent text-on-surface border border-outline-variant hover:bg-surface-variant"
  },
  "저녁": {
    selectedClass: "bg-pastel-dinner text-pastel-dinner-on border border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.04)]",
    unselectedClass: "bg-transparent text-on-surface border border-outline-variant hover:bg-surface-variant"
  },
  "휴가": {
    selectedClass: "bg-pastel-vacation text-pastel-vacation-on border border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.04)]",
    unselectedClass: "bg-transparent text-on-surface border border-outline-variant hover:bg-surface-variant"
  },
  "기타": {
    selectedClass: "bg-pastel-other text-pastel-other-on border border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.04)]",
    unselectedClass: "bg-transparent text-on-surface border border-outline-variant hover:bg-surface-variant"
  }
};

export default function FilterCategories({ selected, onSelect }: FilterCategoriesProps) {
  const isAllSelected = selected === "전체 조회";
  const allStyle = categoryStyles["전체 조회"];

  return (
    <section className="overflow-x-auto hide-scrollbar flex-shrink-0 pb-2">
      <div className="flex items-center">
        {/* 전체 조회 버튼 - 점선 윤곽선 적용 및 mr-lg로 간격 분리 */}
        <button
          onClick={() => onSelect("전체 조회")}
          className={`px-4 h-[48px] font-label-caps text-label-caps whitespace-nowrap transition-all active:scale-95 mr-lg rounded-md ${
            isAllSelected ? `${allStyle.selectedClass} font-bold` : allStyle.unselectedClass
          }`}
        >
          전체 조회
        </button>

        {/* 나머지 카테고리 버튼들 */}
        <div className="flex space-x-sm">
          {otherCategories.map((category) => {
            const isSelected = selected === category;
            const style = categoryStyles[category] || categoryStyles["기타"];
            return (
              <button
                key={category}
                onClick={() => onSelect(category)}
                className={`px-4 h-[48px] font-label-caps text-label-caps whitespace-nowrap transition-all active:scale-95 rounded-md ${
                  isSelected ? `${style.selectedClass} font-bold` : style.unselectedClass
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
