"use client";

import { cn } from "@/lib/utils";

export function ToggleSwitch({
  checked,
  onCheckedChange,
  id,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald-500" : "bg-muted-foreground/30",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export function SettingToggleRow({
  checked,
  onCheckedChange,
  icon: Icon,
  title,
  description,
  activeClassName,
  iconClassName,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  activeClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 transition-colors",
        checked ? activeClassName ?? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
      )}
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className={cn("h-4 w-4 shrink-0", iconClassName ?? (checked ? "text-primary" : "text-muted-foreground"))} />
          {title}
        </p>
        <p className="text-xs text-muted-foreground leading-5">{description}</p>
        <p className={cn("text-[11px] font-medium", checked ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
          {checked ? "オン — 有効" : "オフ — 無効"}
        </p>
      </div>
      <ToggleSwitch checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
    </div>
  );
}
