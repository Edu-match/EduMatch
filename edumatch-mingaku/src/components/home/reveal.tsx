"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type RevealVariant = "fade-up" | "fade-in" | "fade-left" | "fade-right" | "scale-up" | "blur-in";

/**
 * スクロールリビール。ビューポートに入ったら .is-visible を付与して
 * globals.css のトランジションを発火させる（setState不使用でチラつきなし）。
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "fade-up",
}: {
  children: React.ReactNode;
  className?: string;
  /** 発火の遅延(ms)。カードのスタッガーに使う */
  delay?: number;
  /** アニメーションバリアント */
  variant?: RevealVariant;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            io.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const revealClass = variant === "fade-up" ? "reveal" : `reveal--${variant}`;

  return (
    <div
      ref={ref}
      className={cn(revealClass, className)}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
