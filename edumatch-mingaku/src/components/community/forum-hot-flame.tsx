import { cn } from "@/lib/utils";

/** イラスト風の炎エフェクト（ホットな話題用） */
export function ForumHotFlame({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const px = size === "sm" ? 22 : size === "lg" ? 36 : 28;

  return (
    <span
      className={cn("forum-hot-flame pointer-events-none inline-flex shrink-0", className)}
      aria-hidden
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="forum-hot-flame-svg"
      >
        <path
          d="M16 28c-5 0-8-4-8-9 0-3 1.5-5.5 3-7.5C13 10 14 7 16 4c2 3 3 6 5 7.5 1.5 2 3 4.5 3 7.5 0 5-3 9-8 9z"
          fill="url(#flameOuter)"
        />
        <path
          d="M16 25c-3.2 0-5.2-2.6-5.2-6.2 0-2 1-3.6 2-5 1-1.2 1.8-2.8 3.2-4.8 1 1.8 1.6 3.2 2.6 4.2 1 1.4 2 2.8 2 5.6 0 3.6-2 6.2-4.6 6.2z"
          fill="url(#flameInner)"
        />
        <ellipse cx="14" cy="20" rx="1.2" ry="2" fill="rgba(255,255,255,0.55)" />
        <defs>
          <linearGradient id="flameOuter" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF9A3C" />
            <stop offset="0.55" stopColor="#FF5C1A" />
            <stop offset="1" stopColor="#E63B00" />
          </linearGradient>
          <linearGradient id="flameInner" x1="16" y1="9" x2="16" y2="25" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE566" />
            <stop offset="0.5" stopColor="#FFB347" />
            <stop offset="1" stopColor="#FF6B2B" />
          </linearGradient>
        </defs>
      </svg>
      <style>{`
        .forum-hot-flame-svg {
          filter: drop-shadow(0 0 4px rgba(255, 120, 40, 0.55));
          animation: forumFlameFlicker 2.2s ease-in-out infinite;
        }
        @keyframes forumFlameFlicker {
          0%, 100% { transform: scale(1) rotate(-2deg); opacity: 0.95; }
          40% { transform: scale(1.08) rotate(2deg); opacity: 1; }
          70% { transform: scale(0.96) rotate(-1deg); opacity: 0.9; }
        }
      `}</style>
    </span>
  );
}
