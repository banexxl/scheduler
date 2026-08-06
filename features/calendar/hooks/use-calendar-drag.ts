/**
 * Calendar drag-and-drop hook — Milestone 6.10.
 *
 * Handles appointment block dragging within the calendar grid.
 * Computes new time/resource from drop position and returns a
 * proposed reschedule action.
 *
 * This hook does NOT commit the change. The caller must:
 * 1. Show a confirmation dialog with the proposed new time.
 * 2. Call the reschedule action.
 * 3. Revert UI on failure.
 *
 * Drag semantics:
 * - Vertical drag changes start time (snapped to interval grid).
 * - Horizontal drag changes resource (day view) or date (week view).
 * - Duration is NOT user-changeable via drag.
 */

import { useState, useCallback, useRef } from "react";
import type { CalendarConfig } from "@/lib/scheduling/calendar-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DragState = {
  appointmentId: string;
  /** Original pixel top */
  originalTop: number;
  /** Current drag offset (px from original) */
  offsetY: number;
  /** Target resource ID (if cross-resource drag) */
  targetResourceId: string | null;
  /** Is currently dragging */
  isDragging: boolean;
};

export type DropResult = {
  appointmentId: string;
  /** New local start time "HH:mm" */
  newLocalStartTime: string;
  /** New local date "YYYY-MM-DD" */
  newLocalDate: string;
  /** Target resource ID (may be same as current) */
  newResourceId: string;
};

type UseDragOptions = {
  config: CalendarConfig;
  snapIntervalMinutes?: number;
  localDate: string;
  enabled: boolean;
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCalendarDrag(options: UseDragOptions) {
  const { config, snapIntervalMinutes = 15, localDate, enabled } = options;
  const [dragState, setDragState] = useState<DragState | null>(null);
  const startY = useRef(0);
  const startTop = useRef(0);

  const handleDragStart = useCallback(
    (appointmentId: string, currentTop: number, event: React.MouseEvent | React.TouchEvent) => {
      if (!enabled) return;

      const clientY = "touches" in event ? event.touches[0]!.clientY : event.clientY;
      startY.current = clientY;
      startTop.current = currentTop;

      setDragState({
        appointmentId,
        originalTop: currentTop,
        offsetY: 0,
        targetResourceId: null,
        isDragging: true,
      });
    },
    [enabled]
  );

  const handleDragMove = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!dragState?.isDragging) return;

      const clientY = "touches" in event ? event.touches[0]!.clientY : event.clientY;
      const offsetY = clientY - startY.current;

      setDragState((prev) =>
        prev ? { ...prev, offsetY } : null
      );
    },
    [dragState?.isDragging]
  );

  const handleDragEnd = useCallback((): DropResult | null => {
    if (!dragState?.isDragging) return null;

    const { appointmentId, offsetY, targetResourceId } = dragState;

    // Convert pixel offset to minutes (snapped)
    const rawMinutes = offsetY / config.pixelsPerMinute;
    const snappedMinutes = Math.round(rawMinutes / snapIntervalMinutes) * snapIntervalMinutes;

    // Calculate new start time
    const newTopPx = startTop.current + snappedMinutes * config.pixelsPerMinute;
    const totalMinutesFromCalendarStart = newTopPx / config.pixelsPerMinute;
    const absoluteMinutes = config.startHour * 60 + totalMinutesFromCalendarStart;

    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = Math.round(absoluteMinutes % 60);

    // Validate time range
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      setDragState(null);
      return null;
    }

    const newLocalStartTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    setDragState(null);

    return {
      appointmentId,
      newLocalStartTime,
      newLocalDate: localDate,
      newResourceId: targetResourceId ?? "",
    };
  }, [dragState, config, snapIntervalMinutes, localDate]);

  const handleDragCancel = useCallback(() => {
    setDragState(null);
  }, []);

  const setTargetResource = useCallback((resourceId: string) => {
    setDragState((prev) =>
      prev ? { ...prev, targetResourceId: resourceId } : null
    );
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    setTargetResource,
  };
}
