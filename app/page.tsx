import Header from "@/components/Header";
import CalendarContainer from "@/components/CalendarContainer";

export default function Home() {
  return (
    <main className="w-full h-full max-w-[768px] mx-auto flex flex-col relative pb-32">
      <Header />
      <CalendarContainer />
    </main>
  );
}
