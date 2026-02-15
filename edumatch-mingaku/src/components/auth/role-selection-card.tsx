"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Props = {
  type: "viewer" | "provider";
  icon: LucideIcon;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export function RoleSelectionCard({
  type,
  icon: Icon,
  title,
  description,
  isSelected,
  onClick,
  disabled,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-200 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <Card
        className={`h-full overflow-hidden rounded-xl transition-all duration-200 ${
          isSelected
            ? "border-2 border-primary shadow-md bg-primary/5"
            : "border border-input hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
        }`}
      >
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
            <div
              className={`p-3.5 rounded-xl transition-colors duration-200 ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="space-y-1">
              <h3
                className={`font-semibold text-base sm:text-lg transition-colors ${
                  isSelected ? "text-primary" : "text-foreground"
                }`}
              >
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed break-keep">
                {description}
              </p>
            </div>
          </div>
          {isSelected && (
            <div className="absolute top-3 right-3">
              <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}
