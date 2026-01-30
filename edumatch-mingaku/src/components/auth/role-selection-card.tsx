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
      className={`relative w-full text-left transition-all duration-300 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <Card
        className={`h-full overflow-hidden transition-all duration-300 ${
          isSelected
            ? "border-2 border-primary shadow-lg scale-[1.02]"
            : "border-2 border-transparent hover:border-primary/30 hover:shadow-md"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className={`p-4 rounded-2xl transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h3
                className={`font-bold text-lg mb-2 transition-colors ${
                  isSelected ? "text-primary" : "text-foreground"
                }`}
              >
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          {isSelected && (
            <div className="absolute top-3 right-3">
              <div className="bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}
