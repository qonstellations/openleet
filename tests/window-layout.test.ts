import { describe, expect, it } from "vitest";
import {
  WINDOW_WIDTH,
  calculateDragPosition,
  clampResizedHeight,
  clampWindowPosition,
  contentNeedsScrolling,
  heightConstraints,
  reconcileUserHeight,
  staggeredDefaultPosition
} from "../src/content/window-layout";

describe("tool window layout", () => {
  const viewport = { width: 1_200, height: 800 };
  const size = { width: WINDOW_WIDTH, height: 500 };

  it("applies drag deltas and clamps the complete window to an 8px margin", () => {
    expect(calculateDragPosition(
      { left: 200, top: 100 },
      { left: 50, top: 25 },
      size,
      viewport
    )).toEqual({ left: 250, top: 125 });
    expect(clampWindowPosition(
      { left: -100, top: 700 },
      size,
      viewport
    )).toEqual({ left: 8, top: 292 });
  });

  it("uses a fixed 360px width and staggers later windows up and left", () => {
    expect(WINDOW_WIDTH).toBe(360);
    const first = staggeredDefaultPosition(viewport, size, 0);
    const second = staggeredDefaultPosition(viewport, size, 1);
    expect(second).toEqual({
      left: first.left - 24,
      top: first.top - 24
    });
  });

  it("clamps resizing between 280px and natural content height", () => {
    expect(clampResizedHeight(100, 620, viewport.height)).toBe(280);
    expect(clampResizedHeight(700, 620, viewport.height)).toBe(620);
    expect(clampResizedHeight(450, 620, viewport.height)).toBe(450);
  });

  it("uses available height as the responsive minimum on short viewports", () => {
    expect(heightConstraints(500, 240)).toEqual({
      minimum: 224,
      maximum: 224
    });
  });

  it("preserves compressed height as content grows and clamps it as content shrinks", () => {
    expect(reconcileUserHeight(320, 700, viewport.height)).toMatchObject({
      userSelectedHeight: 320,
      maximum: 700
    });
    expect(reconcileUserHeight(320, 300, viewport.height)).toMatchObject({
      userSelectedHeight: 300,
      maximum: 300
    });
    expect(contentNeedsScrolling(320, 700)).toBe(true);
    expect(contentNeedsScrolling(300, 300)).toBe(false);
  });
});
