/**
 * Geometry calculation module
 * Pure functions for field geometry calculations
 */

/**
 * Point in 2D space
 * @typedef {Object} Point
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * Line segment
 * @typedef {Object} LineSegment
 * @property {Point} start - Start point
 * @property {Point} end - End point
 * @property {number} [length] - Line length
 */

/**
 * Calculate distance between two points
 * @param {Point} a - First point
 * @param {Point} b - Second point
 * @returns {number} Distance in meters
 */
export const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Calculate unit vector from one point to another
 * @param {Point} from - Start point
 * @param {Point} to - End point
 * @returns {Point} Unit vector
 */
export const unitVector = (from, to) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: dx / length, y: dy / length };
};

/**
 * Create trimmed line segment between two points
 * @param {Point} fromCenter - Start center point
 * @param {Point} toCenter - End center point
 * @param {number} fromTrim - Distance to trim from start
 * @param {number} toTrim - Distance to trim from end
 * @returns {LineSegment} Trimmed line segment with length
 */
export const trimmedSegment = (fromCenter, toCenter, fromTrim, toTrim) => {
  const dir = unitVector(fromCenter, toCenter);
  const start = {
    x: fromCenter.x + dir.x * fromTrim,
    y: fromCenter.y + dir.y * fromTrim,
  };
  const end = {
    x: toCenter.x - dir.x * toTrim,
    y: toCenter.y - dir.y * toTrim,
  };
  return {
    start,
    end,
    length: distanceBetween(start, end),
  };
};

/**
 * Convert angle in degrees to direction vector
 * @param {number} angleDeg - Angle in degrees
 * @returns {Point} Direction vector
 */
export const direction = (angleDeg) => {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.sin(rad),
    y: Math.cos(rad),
  };
};

/**
 * Calculate intersection point of direction vector with home line
 * @param {Point} dir - Direction vector
 * @param {number} sectorOriginY - Sector origin Y coordinate
 * @param {number} homeLineY - Home line Y coordinate
 * @returns {Point} Intersection point
 */
export const intersectionWithHomeLine = (dir, sectorOriginY, homeLineY) => {
  const t = (homeLineY - sectorOriginY) / dir.y;
  return {
    x: dir.x * t,
    y: homeLineY,
  };
};

/**
 * Find nearest point on line segment to given point
 * @param {Point} point - Point to project
 * @param {Point} lineStart - Line start point
 * @param {Point} lineEnd - Line end point
 * @returns {Point} Nearest point on line
 */
export const nearestPointOnLine = (point, lineStart, lineEnd) => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) return lineStart;

  let t =
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  return {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  };
};

/**
 * Calculate perpendicular distance from point to line segment
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} x1 - Line start X
 * @param {number} y1 - Line start Y
 * @param {number} x2 - Line end X
 * @param {number} y2 - Line end Y
 * @returns {number} Distance in pixels
 */
export const pointToLineDistance = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;

  return Math.hypot(px - nearestX, py - nearestY);
};

/**
 * Check if point is inside rectangle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} x - Rectangle center X
 * @param {number} y - Rectangle center Y
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @returns {boolean} True if point is inside
 */
export const isPointInRect = (px, py, x, y, width, height) => {
  return (
    px >= x - width / 2 &&
    px <= x + width / 2 &&
    py >= y - height / 2 &&
    py <= y + height / 2
  );
};

/**
 * Format distance in meters with proper precision
 * @param {number} value - Distance in meters
 * @returns {string} Formatted string
 */
export const formatMeters = (value) => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded} m` : `${rounded.toFixed(2)} m`;
};

/**
 * Calculate complete field geometry from profile
 * @param {FieldProfile} fieldProfile - Field configuration
 * @param {EditablePoints} editablePoints - User-modified points
 * @returns {Object} Complete geometry with all lines, points, and measurements
 */
export const calculateGeometry = (fieldProfile, editablePoints, scale = 1) => {
  const sectorOriginY = fieldProfile.battingSector.originOffsetY;
  const leftDir = direction(fieldProfile.battingSector.leftAngleDeg);
  const rightDir = direction(fieldProfile.battingSector.rightAngleDeg);
  const homeLineY = fieldProfile.homePlate.centerToHomeLine;

  const homeLeft = intersectionWithHomeLine(leftDir, sectorOriginY, homeLineY);
  const homeRight = intersectionWithHomeLine(
    rightDir,
    sectorOriginY,
    homeLineY,
  );

  // Calculate front arc angles for canvas rendering
  const rightCanvasAngle = Math.atan2(-rightDir.y, rightDir.x);
  const leftCanvasAngle = Math.atan2(-leftDir.y, leftDir.x);

  const homeLineSegment = {
    start: {
      x: -(fieldProfile.homePlate.lineHalfWidth || 6),
      y: homeLineY,
    },
    end: {
      x: fieldProfile.homePlate.lineHalfWidth || 6,
      y: homeLineY,
    },
  };

  const diagonalLength = fieldProfile.diagonalLines.lengthFromHomeLine;
  const diagonalY = homeLeft.y + diagonalLength;

  const diagonalLeftEnd = {
    x: homeLeft.x + (diagonalLength * leftDir.x) / leftDir.y,
    y: diagonalY,
  };

  const diagonalRightEnd = {
    x: homeRight.x + (diagonalLength * rightDir.x) / rightDir.y,
    y: diagonalY,
  };

  const backY = homeLineY + fieldProfile.backBoundary.distanceFromHomeLine;

  const leftVerticalEnd = { x: diagonalLeftEnd.x, y: backY };
  const rightVerticalEnd = { x: diagonalRightEnd.x, y: backY };

  const firstBaseCenter = {
    x:
      homeLeft.x +
      leftDir.x * fieldProfile.firstBaseCanvasOffset.distanceFromHomeLine,
    y:
      homeLeft.y +
      leftDir.y * fieldProfile.firstBaseCanvasOffset.distanceFromHomeLine,
  };

  const secondBaseCenter = {
    x: diagonalRightEnd.x,
    y:
      diagonalRightEnd.y +
      fieldProfile.secondBaseCanvasOffset.distanceFromRightAngle,
  };

  const thirdBaseCenter = {
    x: diagonalLeftEnd.x,
    y:
      diagonalLeftEnd.y +
      fieldProfile.thirdBaseCanvasOffset.distanceFromLeftAngle,
  };

  const baseLineLength = fieldProfile.baseLineLength || 5.0;
  const baseRadius = fieldProfile.baseRadius;

  // Pixel correction from original code (1/SCALE where SCALE=5)
  const lineHalfWidth = 0.2;
  const secondBaseLineY = secondBaseCenter.y - baseRadius + lineHalfWidth;
  const thirdBaseLineY = thirdBaseCenter.y - baseRadius + lineHalfWidth;

  // Base lines (these need SCALE for proper rendering - handled in rendering module)
  const secondBaseLine = {
    start: { x: secondBaseCenter.x, y: secondBaseLineY },
    end: {
      x: secondBaseCenter.x + baseLineLength,
      y: secondBaseLineY,
    },
  };

  const thirdBaseLine = {
    start: { x: thirdBaseCenter.x, y: thirdBaseLineY },
    end: {
      x: thirdBaseCenter.x - baseLineLength,
      y: thirdBaseLineY,
    },
  };

  // ORIGINAL home path lines (always fixed, white)
  const originalHomePathFirstLine = {
    start: { x: diagonalLeftEnd.x, y: thirdBaseLineY },
    end: {
      x: diagonalLeftEnd.x,
      y: thirdBaseLineY - (fieldProfile.homePathFirstLine || 16),
    },
  };

  const originalHomePathSecondLine = {
    start: originalHomePathFirstLine.end,
    end: {
      x: -(fieldProfile.homePathEndOffset || 6),
      y: homeLineY,
    },
  };

  // Initialize editable points if not set
  const initializedEditablePoints = {
    homePathStart: editablePoints.homePathStart || {
      ...originalHomePathFirstLine.start,
    },
    homePathMid: editablePoints.homePathMid || {
      ...originalHomePathFirstLine.end,
    },
    homePathEnd: editablePoints.homePathEnd || {
      ...originalHomePathSecondLine.end,
    },
  };

  // EDITABLE home path lines for measurements
  const homePathFirstLine = {
    start: { ...initializedEditablePoints.homePathStart },
    end: { ...initializedEditablePoints.homePathMid },
  };

  const homePathSecondLine = {
    start: { ...initializedEditablePoints.homePathMid },
    end: { ...initializedEditablePoints.homePathEnd },
  };

  // Extended line for first-to-second base intersection
  const firstToSecondDir = unitVector(firstBaseCenter, secondBaseCenter);
  const homePathDir = unitVector(
    originalHomePathSecondLine.start,
    originalHomePathSecondLine.end,
  );

  const dx = originalHomePathSecondLine.start.x - firstBaseCenter.x;
  const dy = originalHomePathSecondLine.start.y - firstBaseCenter.y;
  const cross =
    firstToSecondDir.x * homePathDir.y - firstToSecondDir.y * homePathDir.x;
  const t1 = (dx * homePathDir.y - dy * homePathDir.x) / cross;

  const intersectionWithHomePath = {
    x: firstBaseCenter.x + t1 * firstToSecondDir.x,
    y: firstBaseCenter.y + t1 * firstToSecondDir.y,
  };

  const firstToSecondExtension = {
    start: intersectionWithHomePath,
    end: firstBaseCenter,
  };

  const firstInterval = fieldProfile.firstBaseCanvasOffset.distanceFromHomeLine;
  const firstToSecond = trimmedSegment(
    firstBaseCenter,
    secondBaseCenter,
    baseRadius,
    baseRadius,
  );
  const secondToThird = trimmedSegment(
    secondBaseCenter,
    thirdBaseCenter,
    baseRadius,
    baseRadius,
  );

  // Create snap targets
  const snapTargets = [
    { type: "line", line: thirdBaseLine },
    { type: "point", point: thirdBaseCenter },
    { type: "arc", center: thirdBaseCenter, radius: baseRadius },
    { type: "line", line: homeLineSegment },
    { type: "line", line: { start: homeLeft, end: diagonalLeftEnd } },
    { type: "point", point: { x: 0, y: 0 } },
    { type: "line", line: originalHomePathFirstLine },
    { type: "line", line: originalHomePathSecondLine },
  ];

  // Calculate measurements
  const measurements = {
    first: firstInterval,
    second: firstToSecond.length,
    third: secondToThird.length,
    back: fieldProfile.backBoundary.distanceFromHomeLine,
    diagonal:
      distanceBetween(homePathFirstLine.start, homePathFirstLine.end) +
      distanceBetween(homePathSecondLine.start, homePathSecondLine.end),
    width: fieldProfile.backBoundary.width,
  };

  return {
    homeLineSegment,
    homeLeft,
    homeRight,
    diagonalLeftEnd,
    diagonalRightEnd,
    leftVerticalEnd,
    rightVerticalEnd,
    frontArc: {
      startAngle: rightCanvasAngle,
      endAngle: leftCanvasAngle,
    },
    firstBaseCenter,
    secondBaseCenter,
    thirdBaseCenter,
    secondBaseLine,
    thirdBaseLine,
    originalHomePathFirstLine,
    originalHomePathSecondLine,
    homePathFirstLine,
    homePathSecondLine,
    firstToSecondExtension,
    firstToSecond,
    secondToThird,
    basePathSegments: {
      firstToSecond,
      secondToThird,
    },
    snapTargets,
    measurements,
    initializedEditablePoints,
  };
};
