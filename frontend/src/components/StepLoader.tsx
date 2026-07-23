"use client";

import { Compass, Globe2, Map, MapPin, Route, Locate } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = [
  { Icon: Compass, text: "Getting your bearings..." },
  { Icon: Map, text: "Mapping your world..." },
  { Icon: MapPin, text: "Plotting your adventures..." },
  { Icon: Route, text: "Tracing your routes..." },
  { Icon: Locate, text: "Finding your places..." },
  { Icon: Globe2, text: "Almost there..." },
];

interface StepLoaderProps {
  variant?: "dark" | "light";
  className?: string;
}

export function StepLoader({ variant = "dark", className = "" }: StepLoaderProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2200);
    return () => clearInterval(id);
  }, []);

  const { Icon, text } = STEPS[step];
  const isDark = variant === "dark";

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative">
        <Icon
          key={step}
          size={32}
          strokeWidth={1.5}
          className={`animate-fade-in ${isDark ? "text-white/80" : "text-[#0f1d32]/60"}`}
        />
      </div>
      <p
        key={`t-${step}`}
        className={`animate-fade-in text-sm font-medium ${isDark ? "text-white/50" : "text-gray-400"}`}
      >
        {text}
      </p>
    </div>
  );
}
