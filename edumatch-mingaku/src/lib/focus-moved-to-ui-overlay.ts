/**
 * contenteditable の blur 直後に、フォーカスがタブ切替や Radix のオーバーレイへ移ったかどうか。
 * その場合は段落の Markdown 自動変換を走らせない（誤変換・本文の増殖を防ぐ）。
 */
export function isFocusMovedToTabOrOverlay(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(
    el.closest('[data-slot="tabs-trigger"]') ||
      el.closest('[data-slot="tabs-list"]') ||
      el.closest("[data-radix-dropdown-menu-content]") ||
      el.closest("[data-radix-select-content]") ||
      el.closest("[data-radix-popover-content]") ||
      el.closest("[data-radix-dialog-content]") ||
      el.closest("[data-radix-alert-dialog-content]")
  );
}
