"use client";

interface FilterCategoriesProps {
  selected: string;
  onSelect: (category: string) => void;
}

const CATEGORIES = ["전체", "점심", "저녁", "커피", "휴가", "기타"];

export default function FilterCategories({ selected, onSelect }: FilterCategoriesProps) {
  return (
    <section className="overflow-x-auto hide-scrollbar flex-shrink-0 pb-2">
      <div className="flex space-x-sm">
        {CATEGORIES.map((category) => {
          const isSelected = selected === category;
          return (
            <button
              key={category}
              onClick={() => onSelect(category)}
              className={`px-4 h-[48px] font-label-caps text-label-caps whitespace-nowrap transition-all active:scale-95 ${
                isSelected
                  ? "bg-[#C6F6D5] text-on-secondary-fixed border border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
                  : "bg-transparent text-on-surface border border-outline-variant hover:bg-surface-variant"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </section>
  );
}
