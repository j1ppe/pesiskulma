/**
 * Rendering module for canvas drawing
 * All canvas drawing operations in pure functions
 */

import { formatMeters } from "./geometry.js";

/**
 * Coordinate transformation: field coordinates to canvas coordinates
 * @param {Point} point - Point in field coordinates
 * @param {Point} origin - Canvas origin
 * @param {number} scale - Pixels per meter
 * @returns {Point} Point in canvas coordinates
 */
export const toCanvas = (point, origin, scale) => ({
  x: origin.x + point.x * scale,
  y: origin.y - point.y * scale,
});

/**
 * Coordinate transformation: canvas coordinates to field coordinates
 * @param {Point} canvasPoint - Point in canvas coordinates
 * @param {Point} origin - Canvas origin
 * @param {number} scale - Pixels per meter
 * @returns {Point} Point in field coordinates
 */
export const fromCanvas = (canvasPoint, origin, scale) => ({
  x: (canvasPoint.x - origin.x) / scale,
  y: (origin.y - canvasPoint.y) / scale,
});

/**
 * Coordinate transformation: canvas coordinates to field coordinates with zoom/pan
 * @param {Point} canvasPoint - Point in canvas coordinates (screen pixels)
 * @param {Point} origin - Canvas origin
 * @param {number} scale - Pixels per meter
 * @param {number} zoomLevel - Zoom level (1.0 = 100%)
 * @param {number} panX - Pan offset X in pixels
 * @param {number} panY - Pan offset Y in pixels
 * @returns {Point} Point in field coordinates
 */
export const fromCanvasWithZoom = (
  canvasPoint,
  origin,
  scale,
  zoomLevel,
  panX,
  panY,
) => {
  // Reverse the transformation applied in rendering:
  // 1. Remove pan offset
  // 2. Reverse zoom
  // 3. Convert to field coordinates
  const transformedX = (canvasPoint.x - panX) / zoomLevel;
  const transformedY = (canvasPoint.y - panY) / zoomLevel;

  return {
    x: (transformedX - origin.x) / scale,
    y: (origin.y - transformedY) / scale,
  };
};

/**
 * Draw a simple line on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Point} a - Start point (canvas coordinates)
 * @param {Point} b - End point (canvas coordinates)
 */
export const drawLine = (ctx, a, b) => {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};

/**
 * Draw measurement dimension line with label
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} params - Parameters
 * @param {Point} params.pointA - Start point (field coordinates)
 * @param {Point} params.pointB - End point (field coordinates)
 * @param {number} params.distance - Distance to display
 * @param {string} params.label - Label text
 * @param {number} params.offset - Offset distance in meters
 * @param {string} params.side - Side direction ('left'|'right'|'top'|'bottom'|'vertical'|'horizontal')
 * @param {number} params.labelOffsetPx - Additional label offset in pixels
 * @param {Object|null} params.tooltipData - Tooltip data
 * @param {string} params.color - Line color
 * @param {string} params.textColor - Text color
 * @param {string} params.backgroundColor - Background color
 * @param {Point} params.origin - Canvas origin
 * @param {number} params.scale - Scale factor
 * @param {Array} params.measurementHitAreas - Array to store hit areas
 * @returns {void}
 */
export const drawDimensionLine = (
  ctx,
  {
    pointA,
    pointB,
    distance,
    label,
    offset,
    side,
    labelOffsetPx = 0,
    tooltipData = null,
    color = "#16e1ff",
    textColor = "#ffffff",
    backgroundColor = "rgba(0, 0, 0, 0.6)",
    origin,
    scale,
    measurementHitAreas,
  },
) => {
  const dx = pointB.x - pointA.x;
  const dy = pointB.y - pointA.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) return;

  const unitX = dx / length;
  const unitY = dy / length;

  let perpX = -unitY;
  let perpY = unitX;

  // Offset direction
  if (side === "left") {
    // keep as is
  } else if (side === "right") {
    perpX = -perpX;
    perpY = -perpY;
  } else if (side === "top") {
    perpX = 0;
    perpY = -1;
  } else if (side === "bottom") {
    perpX = 0;
    perpY = 1;
  } else if (side === "vertical" || side === "horizontal") {
    perpX = 0;
    perpY = 0;
  }

  const offsetA = {
    x: pointA.x + perpX * offset,
    y: pointA.y + perpY * offset,
  };
  const offsetB = {
    x: pointB.x + perpX * offset,
    y: pointB.y + perpY * offset,
  };

  const canvasA = toCanvas(offsetA, origin, scale);
  const canvasB = toCanvas(offsetB, origin, scale);
  const midX = (canvasA.x + canvasB.x) / 2;
  const midY = (canvasA.y + canvasB.y) / 2;

  const canvasDx = canvasB.x - canvasA.x;
  const canvasDy = canvasB.y - canvasA.y;
  const canvasLength = Math.hypot(canvasDx, canvasDy);
  const canvasUnitX = canvasLength > 0 ? canvasDx / canvasLength : 0;
  const canvasUnitY = canvasLength > 0 ? canvasDy / canvasLength : 0;

  ctx.save();

  // Draw measurement line
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(canvasA.x, canvasA.y);
  ctx.lineTo(canvasB.x, canvasB.y);
  ctx.stroke();

  // End markers - perpendicular to measurement line
  const tickSize = 5;
  const tickX = -canvasUnitY;
  const tickY = canvasUnitX;

  ctx.beginPath();
  ctx.moveTo(canvasA.x - tickX * tickSize, canvasA.y - tickY * tickSize);
  ctx.lineTo(canvasA.x + tickX * tickSize, canvasA.y + tickY * tickSize);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(canvasB.x - tickX * tickSize, canvasB.y - tickY * tickSize);
  ctx.lineTo(canvasB.x + tickX * tickSize, canvasB.y + tickY * tickSize);
  ctx.stroke();

  // Text label
  const text = formatMeters(distance);
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(text);
  const padding = 6;
  const boxWidth = metrics.width + padding * 2;
  const boxHeight = 24;

  const autoOffsetX = side === "vertical" ? 25 : 0;
  const labelX = midX + autoOffsetX + labelOffsetPx;
  const labelY = midY;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(
    labelX - boxWidth / 2,
    labelY - boxHeight / 2,
    boxWidth,
    boxHeight,
  );

  ctx.fillStyle = textColor;
  ctx.fillText(text, labelX, labelY);

  // Store hit area if tooltip data is provided
  if (tooltipData && measurementHitAreas) {
    measurementHitAreas.push({
      startX: canvasA.x,
      startY: canvasA.y,
      endX: canvasB.x,
      endY: canvasB.y,
      labelX,
      labelY,
      labelWidth: boxWidth,
      labelHeight: boxHeight,
      title: label,
      tooltipData,
    });
  }

  ctx.restore();
};

/**
 * Draw edit handles for interactive points
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} params
 * @param {EditablePoints} params.editablePoints - Points to draw handles for
 * @param {string|null} params.draggingHandle - Currently dragging handle name
 * @param {Point} params.origin - Canvas origin
 * @param {number} params.scale - Scale factor
 */
export const drawEditHandles = (
  ctx,
  { editablePoints, draggingHandle, origin, scale },
) => {
  const handleRadius = 0.5; // meters in field coordinates

  const handles = [
    { point: editablePoints.homePathStart, name: "homePathStart" },
    { point: editablePoints.homePathMid, name: "homePathMid" },
    { point: editablePoints.homePathEnd, name: "homePathEnd" },
  ];

  handles.forEach(({ point, name }) => {
    const canvasPoint = toCanvas(point, origin, scale);
    const isActive = draggingHandle === name;

    ctx.save();

    // Draw outer circle (glow effect when active)
    if (isActive) {
      ctx.fillStyle = "rgba(76, 217, 100, 0.3)";
      ctx.beginPath();
      ctx.arc(
        canvasPoint.x,
        canvasPoint.y,
        handleRadius * 1.5 * scale,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Draw main handle circle
    ctx.fillStyle = isActive ? "#4cd964" : "#ff6b6b";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, handleRadius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  });
};

/**
 * Draw snap indicator
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point} snapPoint - Snap point in field coordinates
 * @param {Point} origin - Canvas origin
 * @param {number} scale - Scale factor
 */
export const drawSnapIndicator = (ctx, snapPoint, origin, scale) => {
  const canvasPoint = toCanvas(snapPoint, origin, scale);

  ctx.save();
  ctx.strokeStyle = "#4cd964";
  ctx.fillStyle = "rgba(76, 217, 100, 0.2)";
  ctx.lineWidth = 2;

  // Draw circle
  ctx.beginPath();
  ctx.arc(canvasPoint.x, canvasPoint.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw crosshairs
  ctx.beginPath();
  ctx.moveTo(canvasPoint.x - 12, canvasPoint.y);
  ctx.lineTo(canvasPoint.x + 12, canvasPoint.y);
  ctx.moveTo(canvasPoint.x, canvasPoint.y - 12);
  ctx.lineTo(canvasPoint.x, canvasPoint.y + 12);
  ctx.stroke();

  ctx.restore();
};

/**
 * Calculate canvas dimensions and origin
 * @param {Object} fieldProfile - Field profile
 * @param {number} viewportWidth - Viewport width
 * @param {number} viewportHeight - Viewport height
 * @param {number} selectorHeight - Selector height
 * @param {number} legendHeight - Legend height
 * @param {number} footerHeight - Footer height
 * @returns {Object} Canvas dimensions and origin
 */
export const calculateCanvasDimensions = (
  fieldProfile,
  viewportWidth,
  viewportHeight,
  selectorHeight,
  legendHeight,
  footerHeight,
) => {
  // Responsive canvas dimensions - larger on desktop, compact on mobile
  const isMobile = viewportWidth <= 768;
  const CANVAS_WIDTH = isMobile ? 550 : 800;
  const CANVAS_HEIGHT = isMobile ? 1000 : 1300;

  // Calculate field dimensions from profile
  // Women's field is narrower than men's field
  const fieldWidth = fieldProfile.backBoundary.width + 18; // back width + extra for sides
  const topMargin = 1.5;
  const bottomMargin = 8;

  // Calculate actual field height for this specific field profile
  // This allows women's field to scale larger and use canvas space better
  const fieldHeight =
    fieldProfile.homePlate.centerToHomeLine +
    fieldProfile.backBoundary.distanceFromHomeLine +
    topMargin +
    bottomMargin;

  // Smaller padding on mobile for maximum field size
  const paddingX = isMobile ? 2 : 8;
  const paddingY = isMobile ? 2 : 8;

  const scale = Math.min(
    (CANVAS_WIDTH - paddingX * 2) / fieldWidth,
    (CANVAS_HEIGHT - paddingY * 2) / fieldHeight,
  );

  const origin = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - paddingY - bottomMargin * scale,
  };

  return {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    scale,
    origin,
  };
};

/**
 * Draw measurement label with tooltip support
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} params - Parameters
 * @param {string} params.text - Text to display
 * @param {number} params.x - X position (canvas coordinates)
 * @param {number} params.y - Y position (canvas coordinates)
 * @param {string} params.textAlign - Text alignment ('left'|'center'|'right')
 * @param {string} params.textBaseline - Text baseline ('top'|'bottom'|'middle')
 * @param {string} params.color - Text color
 * @param {string} params.font - Font style
 * @param {string} params.backgroundColor - Background color
 * @param {number} params.padding - Background padding
 * @param {Object|null} params.tooltipData - Tooltip data {title, value, description}
 * @param {Array} params.measurementHitAreas - Array to store hit areas
 * @returns {void}
 */
export const drawMeasurementLabel = (
  ctx,
  {
    text,
    x,
    y,
    textAlign = "center",
    textBaseline = "bottom",
    color = "#16e1ff",
    font = "bold 14px sans-serif",
    backgroundColor = "rgba(0, 0, 0, 0.6)",
    padding = 4,
    tooltipData = null,
    measurementHitAreas = [],
  },
) => {
  ctx.save();

  ctx.font = font;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;

  // Measure text
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const ascent = metrics.actualBoundingBoxAscent || 14;
  const descent = metrics.actualBoundingBoxDescent || 4;
  const textHeight = ascent + descent;

  // Calculate background box position based on alignment and baseline
  let boxX = x;
  if (textAlign === "center") {
    boxX = x - textWidth / 2;
  } else if (textAlign === "right") {
    boxX = x - textWidth;
  }

  // For textBaseline, we need to account for where the text actually renders
  let boxY = y;
  if (textBaseline === "bottom") {
    // Text baseline is at y, text extends upward by ascent and downward by descent
    boxY = y - ascent;
  } else if (textBaseline === "middle") {
    boxY = y - textHeight / 2;
  } else if (textBaseline === "top") {
    // Text top is at y, text extends downward
    boxY = y;
  }

  // Draw background
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(
      boxX - padding,
      boxY - padding,
      textWidth + padding * 2,
      textHeight + padding * 2,
    );
  }

  // Draw text
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  // Store hit area if tooltip is provided
  if (tooltipData && measurementHitAreas) {
    measurementHitAreas.push({
      x: boxX - padding,
      y: boxY - padding,
      width: textWidth + padding * 2,
      height: textHeight + padding * 2,
      data: tooltipData,
    });
  }

  ctx.restore();
};
