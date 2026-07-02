export const WINDOW_WIDTH = 360;
export const VIEWPORT_MARGIN = 8;
export const NORMAL_MIN_HEIGHT = 280;

export interface ViewportSize {
  width: number;
  height: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowPosition {
  left: number;
  top: number;
}

export interface WindowGeometry extends WindowPosition {
  width: typeof WINDOW_WIDTH;
  userSelectedHeight?: number;
}

export interface HeightConstraints {
  minimum: number;
  maximum: number;
}

export interface ReconciledHeight extends HeightConstraints {
  userSelectedHeight?: number;
}

export function calculateDragPosition(
  start: WindowPosition,
  delta: WindowPosition,
  size: WindowSize,
  viewport: ViewportSize,
  margin = VIEWPORT_MARGIN
): WindowPosition {
  return clampWindowPosition({
    left: start.left + delta.left,
    top: start.top + delta.top
  }, size, viewport, margin);
}

export function clampWindowPosition(
  position: WindowPosition,
  size: WindowSize,
  viewport: ViewportSize,
  margin = VIEWPORT_MARGIN
): WindowPosition {
  const maximumLeft = Math.max(margin, viewport.width - margin - size.width);
  const maximumTop = Math.max(margin, viewport.height - margin - size.height);
  return {
    left: clamp(position.left, margin, maximumLeft),
    top: clamp(position.top, margin, maximumTop)
  };
}

export function staggeredDefaultPosition(
  viewport: ViewportSize,
  size: WindowSize,
  openIndex: number,
  margin = VIEWPORT_MARGIN
): WindowPosition {
  const stagger = Math.max(0, openIndex) * 24;
  return clampWindowPosition({
    left: viewport.width - 18 - size.width - stagger,
    top: viewport.height - 72 - size.height - stagger
  }, size, viewport, margin);
}

export function heightConstraints(
  naturalHeight: number,
  viewportHeight: number,
  margin = VIEWPORT_MARGIN
): HeightConstraints {
  const availableHeight = Math.max(0, viewportHeight - margin * 2);
  const maximum = Math.min(Math.max(0, naturalHeight), availableHeight);
  return {
    minimum: Math.min(NORMAL_MIN_HEIGHT, availableHeight, maximum),
    maximum
  };
}

export function clampResizedHeight(
  requestedHeight: number,
  naturalHeight: number,
  viewportHeight: number,
  margin = VIEWPORT_MARGIN
): number {
  const bounds = heightConstraints(naturalHeight, viewportHeight, margin);
  return clamp(requestedHeight, bounds.minimum, bounds.maximum);
}

export function reconcileUserHeight(
  userSelectedHeight: number | undefined,
  naturalHeight: number,
  viewportHeight: number,
  margin = VIEWPORT_MARGIN
): ReconciledHeight {
  const bounds = heightConstraints(naturalHeight, viewportHeight, margin);
  if (userSelectedHeight === undefined) return bounds;
  return {
    ...bounds,
    userSelectedHeight: clamp(userSelectedHeight, bounds.minimum, bounds.maximum)
  };
}

export function contentNeedsScrolling(
  renderedHeight: number,
  naturalHeight: number
): boolean {
  return renderedHeight < naturalHeight;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
