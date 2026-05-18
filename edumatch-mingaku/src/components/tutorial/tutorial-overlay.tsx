"use client";

type TutorialOverlayProps = {
  targetRect: DOMRect | null;
};

const HIGHLIGHT_PADDING = 8;

export function TutorialOverlay({ targetRect }: TutorialOverlayProps) {
  if (!targetRect) return null;

  const top = Math.max(targetRect.top - HIGHLIGHT_PADDING, 8);
  const left = Math.max(targetRect.left - HIGHLIGHT_PADDING, 8);
  const width = Math.max(targetRect.width + HIGHLIGHT_PADDING * 2, 32);
  const height = Math.max(targetRect.height + HIGHLIGHT_PADDING * 2, 32);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {/* Dark backdrop with cutout */}
      <div
        className="absolute rounded-[24px] bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.52)] transition-[top,left,width,height] duration-150 motion-reduce:transition-none"
        style={{ top, left, width, height }}
      />
      {/* Highlight ring */}
      <div
        className="absolute rounded-[24px] ring-4 ring-orange-400 ring-offset-2 ring-offset-transparent shadow-[0_0_40px_rgba(251,146,60,0.4)] transition-[top,left,width,height] duration-150 motion-reduce:transition-none motion-safe:animate-pulse"
        style={{ top, left, width, height }}
      />
    </div>
  );
}
