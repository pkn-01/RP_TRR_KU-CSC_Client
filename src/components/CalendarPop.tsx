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
} from "lucide-react";

interface CalendarPopProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
}

export default function CalendarPop({
  selectedDate,
  onChange,
}: CalendarPopProps) {
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

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setViewMode("days"); // Reset view on close
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateClick = (day: Date) => {
    onChange(day);
    setIsOpen(false);
  };

  const currentYear = getYear(currentDate);
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 6 + i); // Show 12 years around current
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
        className="p-1 hover:bg-brown-50 rounded-full text-gray-500 hover:text-[#5D2E1E] transition-colors"
        disabled={viewMode !== "days"}
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex gap-1 items-center">
        <button
          onClick={() => setViewMode(viewMode === "months" ? "days" : "months")}
          className="flex items-center gap-1 font-bold text-[#5D2E1E] hover:bg-brown-50 px-2 py-1 rounded-md transition-colors text-sm"
        >
          {format(currentDate, "MMMM", { locale: th })}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${viewMode === "months" ? "rotate-180" : ""}`}
          />
        </button>
        <button
          onClick={() => setViewMode(viewMode === "years" ? "days" : "years")}
          className="flex items-center gap-1 font-bold text-[#5D2E1E] hover:bg-brown-50 px-2 py-1 rounded-md transition-colors text-sm"
        >
          {currentYear + 543}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${viewMode === "years" ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <button
        onClick={handleNextMonth}
        className="p-1 hover:bg-brown-50 rounded-full text-gray-500 hover:text-[#5D2E1E] transition-colors"
        disabled={viewMode !== "days"}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );

  const renderDays = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start, end });

    // Calculate empty slots for start of month
    const startDay = start.getDay();
    const emptySlots = Array.from({ length: startDay });

    return (
      <>
        <div className="grid grid-cols-7 mb-2">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day, idx) => (
            <div
              key={day}
              className={`text-xs font-semibold text-center ${idx === 0 || idx === 6 ? "text-red-400" : "text-gray-400"}`}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {emptySlots.map((_, i) => (
            <div key={`empty-${i}`} />
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
                  h-9 w-9 rounded-full flex items-center justify-center text-sm transition-all
                  ${
                    isSelected
                      ? "bg-[#5D2E1E] text-white shadow-md scale-105 font-medium"
                      : isTodayDate
                        ? "bg-amber-100 text-[#5D2E1E] font-bold border border-amber-200"
                        : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const renderMonths = () => (
    <div className="grid grid-cols-3 gap-2">
      {months.map((month, idx) => (
        <button
          key={month}
          onClick={() => {
            setCurrentDate(setMonth(currentDate, idx));
            setViewMode("days");
          }}
          className={`
            p-2 rounded-lg text-sm transition-colors
            ${
              getMonth(currentDate) === idx
                ? "bg-[#5D2E1E] text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-100"
            }
          `}
        >
          {month}
        </button>
      ))}
    </div>
  );

  const renderYears = () => (
    <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto custom-scrollbar">
      {years.map((year) => (
        <button
          key={year}
          onClick={() => {
            setCurrentDate(setYear(currentDate, year));
            setViewMode("days");
          }}
          className={`
            p-2 rounded-lg text-sm transition-colors
            ${
              getYear(currentDate) === year
                ? "bg-[#5D2E1E] text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-100"
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
          ${isOpen ? "border-[#5D2E1E] ring-1 ring-[#5D2E1E]/20" : "border-gray-200 hover:border-[#5D2E1E]"}
        `}
      >
        <CalendarIcon
          size={18}
          className={`transition-colors ${isOpen ? "text-[#5D2E1E]" : "text-gray-400 group-hover:text-[#5D2E1E]"}`}
        />
        <span
          className={`text-sm font-medium transition-colors ${isOpen ? "text-[#5D2E1E]" : "text-gray-700 group-hover:text-[#5D2E1E]"}`}
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
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#5D2E1E]" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-[320px] z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          {renderHeader()}

          <div className="min-h-[240px]">
            {viewMode === "days" && renderDays()}
            {viewMode === "months" && renderMonths()}
            {viewMode === "years" && renderYears()}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-center">
            <button
              onClick={() => {
                const today = new Date();
                onChange(today);
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-[#5D2E1E] hover:underline"
            >
              วันนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
