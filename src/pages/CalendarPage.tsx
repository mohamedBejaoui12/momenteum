import { useState } from "react";
import { useMonthTasks } from "../hooks/useTasks";
import { localDateISO } from "../lib/dateUtils";
import { CalendarDayModal } from "../components/CalendarDayModal";
import { ChevronLeft, ChevronRight } from "lucide-react";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDayStyle(stats: { total: number; done: number } | undefined, isCurrentMonth: boolean) {
  if (!isCurrentMonth) return { bg: "transparent", text: "text-zinc-300 dark:text-zinc-700", dot: "" };
  if (!stats || stats.total === 0) return { bg: "bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800", text: "text-zinc-600 dark:text-zinc-400", dot: "" };
  const ratio = stats.done / stats.total;
  if (ratio === 1)      return { bg: "bg-zinc-800 dark:bg-zinc-200 border border-zinc-900 dark:border-zinc-100",  text: "text-white dark:text-zinc-900", dot: "bg-white dark:bg-zinc-900" };
  if (ratio > 0.5)      return { bg: "bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600", text: "text-zinc-800 dark:text-zinc-200", dot: "bg-zinc-500 text-zinc-400" };
  if (ratio > 0)        return { bg: "bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700", text: "text-zinc-700 dark:text-zinc-300", dot: "bg-zinc-400 dark:bg-zinc-500" };
  return { bg: "bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50", text: "text-zinc-500 dark:text-zinc-500", dot: "bg-zinc-300 dark:bg-zinc-700" };
}

const fmtISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function CalendarPage() {
  const [displayDate, setDisplayDate] = useState(() => new Date(localDateISO()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const { data: monthTasks } = useMonthTasks(year, month);
  const today = localDateISO();

  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0);
  const startDate  = new Date(monthStart);
  const dow = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;
  startDate.setDate(startDate.getDate() - dow);
  const endDate = new Date(monthEnd);
  const edow = endDate.getDay() === 0 ? 0 : 7 - endDate.getDay();
  endDate.setDate(endDate.getDate() + edow);

  const days: Date[] = [];
  let d = new Date(startDate);
  while (d <= endDate) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }

  return (
    <div className="space-y-6 animate-float-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Calendar</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">Your task completion history</p>
        </div>
        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-xs font-medium">
          {[
            { dot: "bg-zinc-800 dark:bg-zinc-200",   label: "100%" },
            { dot: "bg-zinc-400 dark:bg-zinc-500", label: ">50%" },
            { dot: "bg-zinc-300 dark:bg-zinc-600", label: "1–50%" },
            { dot: "bg-zinc-200 dark:bg-zinc-700",    label: "0%" },
          ].map(({ dot, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Calendar card */}
      <div className="card p-4 md:p-6 shadow-sm border-zinc-200 dark:border-zinc-800">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setDisplayDate(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-base tracking-tight">
            {displayDate.toLocaleString("default", { month: "long", year: "numeric" })}
          </h2>
          <button
            onClick={() => setDisplayDate(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((date, i) => {
            const dateStr = fmtISO(date);
            const isCurrentMonth = date.getMonth() === month;
            const isToday = dateStr === today;
            const stats = monthTasks?.get(dateStr);
            const { bg, text, dot } = getDayStyle(stats, isCurrentMonth);

            return (
              <button
                key={i}
                onClick={() => isCurrentMonth && setSelectedDate(dateStr)}
                disabled={!isCurrentMonth}
                aria-label={isCurrentMonth ? `View ${dateStr}` : undefined}
                className={`
                  relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold
                  transition-all duration-150 ${bg} ${text}
                  ${isCurrentMonth ? "hover:scale-105 hover:shadow-md cursor-pointer" : "cursor-default opacity-40"}
                  ${isToday ? "ring-2 ring-emerald-400 ring-offset-1" : ""}
                `}
              >
                {date.getDate()}
                {dot && <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dot}`} />}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <CalendarDayModal date={selectedDate} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  );
}
