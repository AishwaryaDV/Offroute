"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    if (open) {
      const d = selected ?? today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl bg-[#f5f6f8] px-4 py-3 text-sm outline-none ring-1 ring-gray-200 focus:ring-[#0f1d32]"
      >
        <span className={displayValue ? "text-[#0f1d32]" : "text-gray-400"}>
          {displayValue || "Select date"}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(""); } }}
            className="rounded-full p-0.5 text-gray-400 active:text-gray-600"
          >
            <X size={14} />
          </span>
        ) : null}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-white px-6 pb-10 pt-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-full p-2 text-[#0f1d32] active:bg-gray-100"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-base font-semibold text-[#0f1d32]">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                disabled={!canGoNext}
                className="rounded-full p-2 text-[#0f1d32] active:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {DAYS.map((d, i) => (
                <span key={i} className="pb-2 text-xs font-semibold text-gray-400">
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
                    className={`flex aspect-square items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isSelected(day)
                        ? "bg-[#0f1d32] text-white"
                        : isToday(day)
                          ? "bg-[#0f1d32]/10 text-[#0f1d32]"
                          : "text-[#0f1d32] active:bg-gray-100"
                    } ${isDisabled(day) ? "opacity-30" : ""}`}
                  >
                    {day}
                  </button>
                ),
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="flex-1 rounded-full py-3 text-sm font-semibold text-gray-500 ring-1 ring-gray-200 active:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()));
                  setOpen(false);
                }}
                className="flex-1 rounded-full bg-[#0f1d32] py-3 text-sm font-semibold text-white active:bg-[#162a46]"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
