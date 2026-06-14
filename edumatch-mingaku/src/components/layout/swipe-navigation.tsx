"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * 画面端からの横スワイプ（フリック）で履歴を戻る/進む。
 * - 左端から右へ → 戻る / 右端から左へ → 進む
 * - 端(EDGE px)始点に限定するため、カルーセル等の横スクロールとは競合しない
 * - トップマップ（/interop・/idobata の最上位、special.* の "/"）はパン操作があるため無効
 * - Pointer Events でタッチ・マウス・ペン全対応（PCのドラッグも可）
 */
const EDGE = 32; // 端の有効幅(px)
const THRESHOLD = 72; // ナビ発火に必要な横移動量(px)
const MAX_OFF_AXIS = 0.6; // |dy| < |dx| * MAX_OFF_AXIS のときだけ横スワイプ扱い

export function SwipeNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // トップマップ（独自のパン/ズームを持つ）は除外
    const isTopMap =
      pathname === "/interop" ||
      pathname === "/idobata" ||
      (typeof window !== "undefined" &&
        window.location.hostname.startsWith("special.") &&
        pathname === "/");
    if (isTopMap) return;

    let active = false;
    let fromLeft = false;
    let startX = 0;
    let startY = 0;

    const onDown = (e: PointerEvent) => {
      const w = window.innerWidth;
      if (e.clientX <= EDGE) {
        active = true;
        fromLeft = true;
      } else if (e.clientX >= w - EDGE) {
        active = true;
        fromLeft = false;
      } else {
        active = false;
        return;
      }
      startX = e.clientX;
      startY = e.clientY;
    };

    const onUp = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) * MAX_OFF_AXIS) return; // 縦寄りは無視
      if (fromLeft && dx > THRESHOLD) {
        router.back();
      } else if (!fromLeft && dx < -THRESHOLD) {
        router.forward();
      }
    };

    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", () => { active = false; });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [pathname, router]);

  return null;
}
