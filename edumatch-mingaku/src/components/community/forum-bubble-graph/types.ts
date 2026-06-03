import type { ReactNode } from "react";

export type GraphPoint = {
  id: string;
  x: number;
  y: number;
};

export type DragOffset = {
  x: number;
  y: number;
};

export type BubbleConnection = {
  from: string;
  to: string;
  /** タグ共有数など（線の太さに使用） */
  weight?: number;
};

export type ZoomDetailLevel = "overview" | "compact" | "standard" | "detail";

export type BubbleGraphNode = {
  id: string;
  label: string;
  sublabel?: string;
  diameter: number;
  backgroundColor: string;
  href?: string;
  onActivate?: () => void;
  /** コミュニティ等のメインバブル */
  isPrimary?: boolean;
  icon?: ReactNode;
};
