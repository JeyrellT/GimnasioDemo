"use client";

import { useEffect, useRef } from "react";

const EDGE_SPEED = 8; // px per rAF frame
const DRAG_THRESHOLD = 5; // px before we claim the gesture

export function useServicesCarousel() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const bar = barRef.current;
    if (!wrapper) return;

    // ── Progress bar ──────────────────────────────────────────────────────
    let rafProgress = 0;

    const updateBar = () => {
      if (!bar) return;
      const max = Math.max(1, wrapper.scrollWidth - wrapper.clientWidth);
      const progress = wrapper.scrollLeft / max;
      bar.style.background = `linear-gradient(90deg, var(--blue) 0 ${progress * 100}%, rgba(255,255,255,.18) ${progress * 100}% 100%)`;
      bar.style.boxShadow = progress > 0 ? "0 0 8px var(--blue)" : "none";
      rafProgress = 0;
    };

    const onScroll = () => {
      if (rafProgress === 0) rafProgress = requestAnimationFrame(updateBar);
    };

    wrapper.addEventListener("scroll", onScroll, { passive: true });
    // Initial paint
    updateBar();

    // ── Mouse drag (pointer events, skip touch) ───────────────────────────
    let dragArmed = false;
    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    let activePointerId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return;
      dragArmed = true;
      isDragging = false;
      startX = e.clientX;
      startScrollLeft = wrapper.scrollLeft;
      activePointerId = e.pointerId;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragArmed || e.pointerId !== activePointerId) return;
      const delta = e.clientX - startX;
      if (!isDragging) {
        if (Math.abs(delta) < DRAG_THRESHOLD) return;
        // Crossed threshold — claim the gesture
        isDragging = true;
        wrapper.setPointerCapture(e.pointerId);
        wrapper.classList.add("is-dragging");
      }
      wrapper.scrollLeft = startScrollLeft - delta;
      e.preventDefault();
    };

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return;
      const wasDragging = isDragging;
      dragArmed = false;
      isDragging = false;
      activePointerId = null;
      wrapper.classList.remove("is-dragging");
      try {
        wrapper.releasePointerCapture(e.pointerId);
      } catch {
        // already released, safe to ignore
      }
      // Suppress the synthetic click that follows a drag so card links don't fire
      if (wasDragging) {
        const suppressClick = (ev: Event) => {
          ev.stopPropagation();
          ev.preventDefault();
          wrapper.removeEventListener("click", suppressClick, true);
        };
        wrapper.addEventListener("click", suppressClick, { capture: true, once: true });
      }
    };

    wrapper.addEventListener("pointerdown", onPointerDown);
    wrapper.addEventListener("pointermove", onPointerMove);
    wrapper.addEventListener("pointerup", endDrag);
    wrapper.addEventListener("pointercancel", endDrag);

    // ── Edge hover auto-scroll ────────────────────────────────────────────
    // Edges are siblings of the wrapper (inside .services-carousel-frame),
    // so we query from the parent frame element.
    const frame = wrapper.parentElement;
    const leftEdge = frame?.querySelector<HTMLElement>(".services-edge-left") ?? null;
    const rightEdge = frame?.querySelector<HTMLElement>(".services-edge-right") ?? null;

    let edgeDir = 0;
    let edgeRaf = 0;

    const edgeLoop = () => {
      if (edgeDir !== 0) {
        wrapper.scrollLeft += edgeDir * EDGE_SPEED;
        edgeRaf = requestAnimationFrame(edgeLoop);
      } else {
        edgeRaf = 0;
      }
    };

    const onEdgeEnter = (dir: number) => () => {
      edgeDir = dir;
      if (edgeRaf === 0) edgeRaf = requestAnimationFrame(edgeLoop);
    };
    const onEdgeLeave = () => {
      edgeDir = 0;
      if (edgeRaf !== 0) {
        cancelAnimationFrame(edgeRaf);
        edgeRaf = 0;
      }
    };

    const onLeftEnter = onEdgeEnter(-1);
    const onRightEnter = onEdgeEnter(1);
    if (leftEdge) {
      leftEdge.addEventListener("pointerenter", onLeftEnter);
      leftEdge.addEventListener("pointerleave", onEdgeLeave);
    }
    if (rightEdge) {
      rightEdge.addEventListener("pointerenter", onRightEnter);
      rightEdge.addEventListener("pointerleave", onEdgeLeave);
    }

    return () => {
      wrapper.removeEventListener("scroll", onScroll);
      wrapper.removeEventListener("pointerdown", onPointerDown);
      wrapper.removeEventListener("pointermove", onPointerMove);
      wrapper.removeEventListener("pointerup", endDrag);
      wrapper.removeEventListener("pointercancel", endDrag);
      if (rafProgress !== 0) cancelAnimationFrame(rafProgress);
      if (edgeRaf !== 0) cancelAnimationFrame(edgeRaf);
      if (leftEdge) {
        leftEdge.removeEventListener("pointerenter", onLeftEnter);
        leftEdge.removeEventListener("pointerleave", onEdgeLeave);
      }
      if (rightEdge) {
        rightEdge.removeEventListener("pointerenter", onRightEnter);
        rightEdge.removeEventListener("pointerleave", onEdgeLeave);
      }
    };
  }, []);

  return { wrapperRef, barRef };
}
