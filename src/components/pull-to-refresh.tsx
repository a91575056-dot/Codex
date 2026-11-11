"use client";

import { useEffect, useState } from "react";
import { ArrowDown, RefreshCw } from "lucide-react";

/** A deliberate pull at the top reloads server data, including in standalone iOS. */
export function PullToRefresh({ disabled }: { disabled: boolean }) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (disabled || refreshing) return;
    let start: { x: number; y: number } | null = null;
    let pulled = 0;
    const reset = () => {
      start = null;
      pulled = 0;
      setDistance(0);
    };
    const begin = (event: TouchEvent) => {
      reset();
      if (
        window.innerWidth > 640 ||
        window.scrollY > 0 ||
        event.touches.length !== 1
      )
        return;
      const target = event.target as HTMLElement;
      if (
        !target.closest("main, .topbar, .mobile-bar") ||
        target.closest(
          "input, textarea, select, button, a, form, [contenteditable], [data-no-swipe]",
        )
      )
        return;
      // A nested scroll area must keep its own scrolling behavior.
      for (
        let element: HTMLElement | null = target;
        element && element !== document.body;
        element = element.parentElement
      ) {
        const style = getComputedStyle(element);
        if (
          /(auto|scroll)/.test(style.overflowY) &&
          element.scrollHeight > element.clientHeight
        )
          return;
      }
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY };
    };
    const move = (event: TouchEvent) => {
      if (!start) return;
      if (event.touches.length !== 1 || window.scrollY > 0) {
        reset();
        return;
      }
      const touch = event.touches[0];
      const dy = touch.clientY - start.y;
      const dx = Math.abs(touch.clientX - start.x);
      if (dx > 25 && dx > Math.abs(dy)) {
        reset();
        return;
      }
      if (dy <= 0) {
        reset();
        return;
      }
      if (dy < 12 || dy < dx * 2) return;
      if (!event.cancelable) {
        reset();
        return;
      }
      event.preventDefault();
      pulled = Math.min(110, dy * 0.5);
      setDistance(pulled);
    };
    const end = () => {
      const ready = pulled >= 70;
      reset();
      if (!ready) return;
      setRefreshing(true);
      window.location.reload();
    };
    document.addEventListener("touchstart", begin, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", reset);
    return () => {
      document.removeEventListener("touchstart", begin);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", reset);
    };
  }, [disabled, refreshing]);
  return (
    <div
      className={`pull-refresh ${distance > 0 || refreshing ? "visible" : ""}`}
      role="status"
      aria-live="polite"
    >
      {refreshing ? <RefreshCw size={18} /> : <ArrowDown size={18} />}
      <span>
        {refreshing
          ? "Se reîncarcă…"
          : distance >= 70
            ? "Eliberează pentru reîmprospătare"
            : "Trage în jos pentru reîmprospătare"}
      </span>
    </div>
  );
}
