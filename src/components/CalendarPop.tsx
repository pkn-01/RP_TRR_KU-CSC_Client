// ===== คอมโพเนนต์เลือกวันที่ | Calendar Popup Component =====
"use client";

import { useState, useRef, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  setMonth,
  setYear,
  getYear,
  getMonth,
} from "date-fns";
import { th } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
} from "lucide-react";

interface CalendarPopProps {
  selectedDate: Date | null;
  onChange?: (date: Date) => void;
  onDateSelect?: (date: Date) => void;
  align?: "left" | "right";
}

export default function CalendarPop({
  selectedDate,
  onChange,
  onDateSelect,
  align = "left",
}: CalendarPopProps) {
  const handleChange = (date: Date) => {
    onChange?.(date);
    onDateSelect?.(date);
  };
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state with props only when opening
  useEffect(() => {
    if (isOpen && selectedDate) {
      setCurrentDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  // Handle click outside to close (Desktop only logic)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Only close if we are not in mobile modal view
        // Or if the target is actually outside the container
        // Small screens use fixed centering, clicking outside container doesn't work the same
        if (window.innerWidth >= 768) {
          setIsOpen(false);
          setViewMode("days");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateClick = (day: Date) => {
    handleChange(day);
    setIsOpen(false);
  };

  const currentYear = getYear(currentDate);
  const years = Array.from({ length: 24 }, (_, i) => currentYear - 11 + i); // Increased year range
  const months = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  /* --- Render helper functions --- */

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4 px-1">
      <button
        onClick={handlePrevMonth}
        className="p-2 hover:bg-orange-50 rounded-full text-gray-400 hover:text-[#5D2E1E] transition-all"
        disabled={viewMode !== "days"}
      >
        <ChevronLeft size={22} />
      </button>

      <div className="flex gap-1 items-center">
        <button
          onClick={() => setViewMode(viewMode === "months" ? "days" : "months")}
          className="flex items-center gap-1 font-bold text-[#5D2E1E] hover:bg-orange-50 px-3 py-1.5 rounded-xl transition-all text-sm sm:text-base"
        >
          {format(currentDate, "MMMM", { locale: th })}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${viewMode === "months" ? "rotate-180" : ""}`}
          />
        </button>
        <button
          onClick={() => setViewMode(viewMode === "years" ? "days" : "years")}
          className="flex items-center gap-1 font-bold text-[#5D2E1E] hover:bg-orange-50 px-3 py-1.5 rounded-xl transition-all text-sm sm:text-base"
        >
          {currentYear + 543}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${viewMode === "years" ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <button
        onClick={handleNextMonth}
        className="p-2 hover:bg-orange-50 rounded-full text-gray-400 hover:text-[#5D2E1E] transition-all"
        disabled={viewMode !== "days"}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );

  const renderDays = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start, end });

    const startDay = start.getDay();
    const emptySlots = Array.from({ length: startDay });

    return (
      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="grid grid-cols-7 mb-2">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day, idx) => (
            <div
              key={day}
              className={`text-xs font-bold text-center h-8 flex items-center justify-center ${idx === 0 || idx === 6 ? "text-rose-500" : "text-gray-400"}`}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {emptySlots.map((_, i) => (
            <div key={`empty-${i}`} className="h-10 w-10 sm:h-11 sm:w-11" />
          ))}
          {daysInMonth.map((day) => {
            const isSelected = selectedDate
              ? isSameDay(day, selectedDate)
              : false;
            const isTodayDate = isToday(day);

            return (
              <button
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                className={`
                  h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center text-sm transition-all
                  ${
                    isSelected
                      ? "bg-[#5D2E1E] text-white shadow-lg scale-105 font-bold"
                      : isTodayDate
                        ? "bg-amber-100 text-[#5D2E1E] font-black border border-amber-200"
                        : "text-gray-700 hover:bg-orange-50 hover:scale-105"
                  }
                `}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonths = () => (
    <div className="grid grid-cols-3 gap-2 animate-in zoom-in-95 duration-200">
      {months.map((month, idx) => (
        <button
          key={month}
          onClick={() => {
            setCurrentDate(setMonth(currentDate, idx));
            setViewMode("days");
          }}
          className={`
            p-3 rounded-2xl text-sm transition-all font-medium
            ${
              getMonth(currentDate) === idx
                ? "bg-[#5D2E1E] text-white shadow-md"
                : "text-gray-700 hover:bg-orange-50"
            }
          `}
        >
          {month}
        </button>
      ))}
    </div>
  );

  const renderYears = () => (
    <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 p-1">
      {years.map((year) => (
        <button
          key={year}
          onClick={() => {
            setCurrentDate(setYear(currentDate, year));
            setViewMode("days");
          }}
          className={`
            p-3 rounded-2xl text-sm transition-all font-medium
            ${
              getYear(currentDate) === year
                ? "bg-[#5D2E1E] text-white shadow-md"
                : "text-gray-700 hover:bg-orange-50"
            }
          `}
        >
          {year + 543}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 bg-white border rounded-full px-4 py-2 
          transition-all shadow-sm hover:shadow-md active:scale-95 group
          ${isOpen ? "border-[#5D2E1E] ring-4 ring-[#5D2E1E]/5" : "border-gray-200 hover:border-[#5D2E1E]"}
        `}
      >
        <CalendarIcon
          size={18}
          className={`transition-colors ${isOpen ? "text-[#5D2E1E]" : "text-gray-400 group-hover:text-[#5D2E1E]"}`}
        />
        <span
          className={`text-sm font-semibold transition-colors ${isOpen ? "text-[#5D2E1E]" : "text-gray-700 group-hover:text-[#5D2E1E]"}`}
        >
          {selectedDate
            ? format(selectedDate, "d MMMM yyyy", { locale: th }).replace(
                String(selectedDate.getFullYear()),
                String(selectedDate.getFullYear() + 543),
              )
            : "เลือกวันที่"}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#5D2E1E]" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={`
            fixed md:absolute 
            inset-x-4 top-1/2 -translate-y-1/2 md:translate-y-0
            md:inset-auto md:top-full md:mt-2 
            ${align === "right" ? "md:right-0 md:left-auto" : "md:left-0 md:right-auto"}
            bg-white rounded-[2rem] sm:rounded-3xl 
            shadow-2xl border border-gray-100 p-4 sm:p-6
            w-auto max-w-[360px] mx-auto md:mx-0 sm:w-[350px] 
            z-[70] md:z-50 
            animate-in fade-in zoom-in-95 duration-200 
            ${align === "right" ? "md:origin-top-right" : "md:origin-top-left"} origin-center
          `}
          >
            <div className="flex md:hidden items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-400 ml-2">
                เลือกวันที่
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {renderHeader()}

            <div className="min-h-[260px] flex flex-col justify-center">
              {viewMode === "days" && renderDays()}
              {viewMode === "months" && renderMonths()}
              {viewMode === "years" && renderYears()}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between px-2">
              <button
                onClick={() => {
                  const today = new Date();
                  handleChange(today);
                  setIsOpen(false);
                }}
                className="text-sm font-bold text-[#5D2E1E] hover:underline bg-orange-50 px-4 py-1.5 rounded-full transition-all"
              >
                วันนี้
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hidden md:block text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                ปิด
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
