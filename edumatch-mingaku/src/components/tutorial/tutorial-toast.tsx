"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type TutorialToastProps = {
  message: string;
  duration?: number;
};

export function TutorialToast({ message, duration = 3000 }: TutorialToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100]">
      <div
        className={cn(
          "rounded-lg bg-orange-500 text-white px-5 py-3 shadow-lg",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2",
          "motion-safe:duration-200 motion-reduce:animate-none",
          "max-w-xs text-sm"
        )}
      >
        {message}
      </div>
    </div>
  );
}
