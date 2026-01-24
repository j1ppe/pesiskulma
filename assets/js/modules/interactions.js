/**
 * Interactions module for mouse/touch event handling
 * Handles user interactions with the canvas
 */

import {
  distanceBetween,
  isPointInRect,
  nearestPointOnLine,
  pointToLineDistance,
} from "./geometry.js";
import { fromCanvas } from "./rendering.js";
import { SNAP_THRESHOLD } from "./state.js";

/**
 * Find nearest snap target within threshold
 * @param {Point} point - Point in field coordinates
 * @param {Array} snapTargets - Available snap targets
 * @param {number} threshold - Snap threshold in meters
 * @returns {Point|null} Snap point or null
 */
export const findNearestSnap = (
  point,
  snapTargets,
  threshold = SNAP_THRESHOLD,
) => {
  let minDistance = threshold;
  let nearestPoint = null;

  for (const target of snapTargets) {
    let snapPoint = null;
    let distance = Infinity;
    // Use larger threshold for lines (2 meters) for easier snapping along horizontal/vertical lines
    const effectiveThreshold = target.type === "line" ? 2.0 : threshold;

    if (target.type === "point") {
      snapPoint = target.point;
      distance = distanceBetween(point, snapPoint);
    } else if (target.type === "line") {
      snapPoint = nearestPointOnLine(point, target.line.start, target.line.end);
      distance = distanceBetween(point, snapPoint);
    } else if (target.type === "arc") {
      const dx = point.x - target.center.x;
      const dy = point.y - target.center.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        snapPoint = {
          x: target.center.x + (dx / dist) * target.radius,
          y: target.center.y + (dy / dist) * target.radius,
        };
        distance = Math.abs(dist - target.radius);
      }
    }

    if (snapPoint && distance < effectiveThreshold && distance < minDistance) {
      minDistance = distance;
      nearestPoint = snapPoint;
    }
  }

  return nearestPoint;
};

/**
 * Get canvas mouse position
 * @param {MouseEvent} event - Mouse event
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Point} Mouse position in canvas coordinates
 */
export const getCanvasMousePosition = (event, canvas) => {
  const rect = canvas.getBoundingClientRect();

  // Calculate position in CSS pixels
  const cssX = event.clientX - rect.left;
  const cssY = event.clientY - rect.top;

  // Scale to canvas internal coordinates (CSS size might differ from canvas size)
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: cssX * scaleX,
    y: cssY * scaleY,
  };
};

/**
 * Check if mouse is over any edit handle
 * @param {Point} fieldPos - Mouse position in field coordinates
 * @param {EditablePoints} editablePoints - Editable points
 * @param {number} handleRadius - Handle radius in meters
 * @returns {string|null} Handle name or null
 */
export const getHandleUnderMouse = (
  fieldPos,
  editablePoints,
  handleRadius = 0.5,
) => {
  for (const [key, point] of Object.entries(editablePoints)) {
    const dist = distanceBetween(fieldPos, point);
    if (dist < handleRadius) {
      return key;
    }
  }
  return null;
};

/**
 * Find hovered measurement area
 * @param {Point} canvasPos - Mouse position in canvas coordinates
 * @param {Array} measurementHitAreas - Hit areas to check
 * @param {number} hitThreshold - Distance threshold in pixels
 * @returns {Object|null} Hovered area or null
 */
export const findHoveredMeasurement = (
  canvasPos,
  measurementHitAreas,
  hitThreshold = 10,
) => {
  for (const area of measurementHitAreas) {
    // Check if hovering over the line
    const distToLine = pointToLineDistance(
      canvasPos.x,
      canvasPos.y,
      area.startX,
      area.startY,
      area.endX,
      area.endY,
    );

    // Check if hovering over the label box
    const overLabel = isPointInRect(
      canvasPos.x,
      canvasPos.y,
      area.labelX,
      area.labelY,
      area.labelWidth,
      area.labelHeight,
    );

    if (distToLine < hitThreshold || overLabel) {
      return area;
    }
  }
  return null;
};

/**
 * Create canvas hover handler
 * @param {Object} deps - Dependencies
 * @param {HTMLCanvasElement} deps.canvas - Canvas element
 * @param {HTMLElement} deps.tooltip - Tooltip element
 * @param {Function} deps.getState - Get current state
 * @param {Point} deps.origin - Canvas origin
 * @param {number} deps.scale - Scale factor
 * @returns {Function} Event handler
 */
export const createHoverHandler = ({
  canvas,
  tooltip,
  getState,
  getOrigin,
  getScale,
}) => {
  return (event) => {
    const state = getState();
    const origin = getOrigin();
    const scale = getScale();
    const canvasPos = getCanvasMousePosition(event, canvas);
    const fieldPos = fromCanvas(canvasPos, origin, scale);

    // In edit mode, check for handle hover
    if (
      state.editMode &&
      state.showMeasurementsOnField &&
      !state.draggingHandle
    ) {
      const handleUnder = getHandleUnderMouse(
        fieldPos,
        state.editablePoints,
        0.5,
      );

      if (handleUnder) {
        canvas.style.cursor = "grab";
        tooltip.style.display = "none";
        return;
      }
      canvas.style.cursor = "default";
    }

    // Hide tooltips while dragging
    if (state.draggingHandle) {
      tooltip.style.display = "none";
      return;
    }

    // Normal tooltip behavior
    if (
      !state.showMeasurementsOnField ||
      !state.measurementHitAreas ||
      state.measurementHitAreas.length === 0
    ) {
      tooltip.style.display = "none";
      return;
    }

    const hoveredArea = findHoveredMeasurement(
      canvasPos,
      state.measurementHitAreas,
    );

    if (hoveredArea) {
      tooltip.innerHTML = `
        <div class="tooltip-title">${hoveredArea.title}</div>
        <div class="tooltip-value">${hoveredArea.tooltipData.value}</div>
        <div class="tooltip-description">${hoveredArea.tooltipData.description}</div>
      `;
      tooltip.style.display = "block";

      // Position tooltip, ensuring it stays on screen
      let tooltipX = event.clientX + 15;
      let tooltipY = event.clientY + 15;

      // Wait for next frame to get accurate tooltip dimensions
      requestAnimationFrame(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Check if tooltip goes off right edge
        if (tooltipX + tooltipRect.width > viewportWidth - 10) {
          // Position to the left of cursor instead
          tooltipX = event.clientX - tooltipRect.width - 15;
        }

        // Check if tooltip goes off bottom edge
        if (tooltipY + tooltipRect.height > viewportHeight - 10) {
          tooltipY = event.clientY - tooltipRect.height - 15;
        }

        // Ensure tooltip doesn't go off left edge
        if (tooltipX < 10) {
          tooltipX = 10;
        }

        // Ensure tooltip doesn't go off top edge
        if (tooltipY < 10) {
          tooltipY = 10;
        }

        tooltip.style.left = `${tooltipX}px`;
        tooltip.style.top = `${tooltipY}px`;
      });

      canvas.style.cursor = "pointer";
    } else {
      tooltip.style.display = "none";
      canvas.style.cursor = "default";
    }
  };
};

/**
 * Create mouse down handler for edit mode
 * @param {Object} deps - Dependencies
 * @param {HTMLCanvasElement} deps.canvas - Canvas element
 * @param {Function} deps.getState - Get current state
 * @param {Function} deps.setState - Set state
 * @param {Point} deps.origin - Canvas origin
 * @param {number} deps.scale - Scale factor
 * @returns {Function} Event handler
 */
export const createMouseDownHandler = ({
  canvas,
  getState,
  setState,
  getOrigin,
  getScale,
}) => {
  return (event) => {
    const state = getState();
    if (!state.editMode) return;

    const origin = getOrigin();
    const scale = getScale();
    const canvasPos = getCanvasMousePosition(event, canvas);
    const fieldPos = fromCanvas(canvasPos, origin, scale);

    const handleUnder = getHandleUnderMouse(
      fieldPos,
      state.editablePoints,
      0.5,
    );

    if (handleUnder) {
      setState({ draggingHandle: handleUnder });
      canvas.style.cursor = "grabbing";
    }
  };
};

/**
 * Create mouse move handler for dragging
 * @param {Object} deps - Dependencies
 * @param {HTMLCanvasElement} deps.canvas - Canvas element
 * @param {Function} deps.getState - Get current state
 * @param {Function} deps.updateEditablePoint - Update editable point
 * @param {Function} deps.setActiveSnapPoint - Set active snap point
 * @param {Point} deps.origin - Canvas origin
 * @param {number} deps.scale - Scale factor
 * @returns {Function} Event handler
 */
export const createMouseMoveHandler = ({
  canvas,
  getState,
  updateEditablePoint,
  setActiveSnapPoint,
  getOrigin,
  getScale,
}) => {
  return (event) => {
    const state = getState();
    if (!state.draggingHandle) return;

    const origin = getOrigin();
    const scale = getScale();
    const canvasPos = getCanvasMousePosition(event, canvas);
    let fieldPos = fromCanvas(canvasPos, origin, scale);

    // Try to snap to nearest target
    const snapPoint = findNearestSnap(fieldPos, state.snapTargets);
    if (snapPoint) {
      fieldPos = snapPoint;
      setActiveSnapPoint(snapPoint);
    } else {
      setActiveSnapPoint(null);
    }

    updateEditablePoint(state.draggingHandle, fieldPos);
  };
};

/**
 * Create mouse up handler for edit mode
 * @param {Object} deps - Dependencies
 * @param {HTMLCanvasElement} deps.canvas - Canvas element
 * @param {Function} deps.setState - Set state
 * @returns {Function} Event handler
 */
export const createMouseUpHandler = ({ canvas, setState }) => {
  return () => {
    setState({ draggingHandle: null, activeSnapPoint: null });
    canvas.style.cursor = "default";
  };
};
