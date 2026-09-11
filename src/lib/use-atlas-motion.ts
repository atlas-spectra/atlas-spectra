import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { AtlasView } from "./atlas-view";

/** Short, user-initiated travel only. Direct manipulation always cancels it. */
export function useAtlasMotion(view: AtlasView, setView: Dispatch<SetStateAction<AtlasView>>) {
  const current = useRef(view);
  current.current = view;
  const frame = useRef<number | null>(null);
  const [moving, setMoving] = useState(false);
  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setMoving(false);
  }, []);
  const travel = useCallback((target: AtlasView) => {
    cancel();
    if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target; setView(target); return;
    }
    const from = current.current, started = performance.now();
    setMoving(true);
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - started) / 320));
      const eased = progress * progress * (3 - 2 * progress);
      const next = progress === 1 ? target : {
        center: from.center + (target.center - from.center) * eased,
        span: from.span + (target.span - from.span) * eased,
      };
      current.current = next;
      setView(next);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else { frame.current = null; setMoving(false); }
    };
    frame.current = requestAnimationFrame(tick);
  }, [cancel, setView]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChange = () => { if (media.matches) cancel(); };
    const visibilityChange = () => { if (document.hidden) cancel(); };
    media.addEventListener("change", motionChange);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      media.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, [cancel]);
  return { moving, cancel, travel };
}
