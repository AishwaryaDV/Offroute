"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  max?: string;
}

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function DatePicker({ value, onChange, max }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  const maxDate = max ? new Date(max + "T00:00:00") : null;

  const grid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const canGoNext = !maxDate || new Date(viewYear, viewMonth + 1, 1) <= maxDate;

  const isSelected = (day: number) =>
    selected &&
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth &&
    selected.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  const isDisabled = (day: number) =>
    maxDate ? new Date(viewYear, viewMonth, day) > maxDate : false;

  const displayValue = selected
    ? `${selected.getDate()} ${MONTHS[selected.getMonth()]?.slice(0, 3)} ${selected.getFullYear()}`
    : "";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200 focus:ring-[#0f1d32]"
      >
        <span className={displayValue ? "text-[#0f1d32]" : "text-gray-400"}>
          {displayValue || "Select date"}
        </span>
        {value ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="rounded-full p-0.5 text-gray-400 active:text-gray-600"
          >
            <X size={14} />
          </button>
        ) : null}
      </button>

      {open && (
        <div className="mt-2 rounded-xl bg-[#f5f6f8] p-3 ring-1 ring-gray-200">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-full p-1 text-[#0f1d32] active:bg-gray-200"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-[#0f1d32]">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              disabled={!canGoNext}
              className="rounded-full p-1 text-[#0f1d32] active:bg-gray-200 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS.map((d, i) => (
              <span key={i} className="pb-1 text-xs font-medium text-gray-400">
                {d}
              </span>
            ))}
            {grid.map((day, i) =>
              day === null ? (
                <span key={`e-${i}`} />
              ) : (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled(day)}
                  onClick={() => {
                    onChange(toDateStr(viewYear, viewMonth, day));
                    setOpen(false);
                  }}
                  className={`aspect-square rounded-full text-xs font-medium transition-colors ${
                    isSelected(day)
                      ? "bg-[#0f1d32] text-white"
                      : isToday(day)
                        ? "bg-[#0f1d32]/10 text-[#0f1d32]"
                        : "text-[#0f1d32] active:bg-gray-200"
                  } ${isDisabled(day) ? "opacity-30" : ""}`}
                >
                  {day}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
