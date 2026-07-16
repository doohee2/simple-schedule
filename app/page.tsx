import Header from "@/components/Header";
import CalendarContainer from "@/components/CalendarContainer";

export default function Home() {
  return (
    <main className="w-full flex-1 min-h-0 max-w-[1200px] mx-auto flex flex-col relative overflow-y-auto">
      <Header />
      <CalendarContainer />
    </main>
  );
}
