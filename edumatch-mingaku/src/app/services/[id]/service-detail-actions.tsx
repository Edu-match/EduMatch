"use client";

import { AddToRequestListButton } from "@/components/request-list/add-to-request-list-button";

type Props = {
  serviceId: string;
  title: string;
  thumbnailUrl: string | null;
  category: string;
  variant?: "icon" | "button";
  className?: string;
};

export function AddToRequestListServiceButton({
  serviceId,
  title,
  thumbnailUrl,
  category,
  variant = "button",
  className,
}: Props) {
  return (
    <AddToRequestListButton
      item={{
        id: serviceId,
        title,
        thumbnail: thumbnailUrl ?? undefined,
        category,
      }}
      variant={variant}
      size="lg"
      className={className}
    />
  );
}
