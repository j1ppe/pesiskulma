/**
 * PesisKulma main application module
 * Field visualization with net distance calculator
 */

import { calculateGeometry } from "./modules/geometry.js";
import { calculateCanvasDimensions, toCanvas } from "./modules/rendering.js";
import { fieldProfileMen, fieldProfileWomen, store } from "./modules/state.js";

(() => {
  // DOM elements
  const canvas = document.getElementById("fieldCanvas");
  const netDistanceInput = document.getElementById("netDistance");
  const fieldButtons = document.querySelectorAll("[data-field]");

  if (!canvas || !netDistanceInput) return;

  const ctx = canvas.getContext("2d");

  // Canvas dimensions (updated on resize)
  let canvasDimensions = {
    width: 0,
    height: 0,
    scale: 1,
    origin: { x: 0, y: 0 },
  };

  // Ball position (set by clicking on field)
  let ballPosition = null;

  /**
   * Format distance for display
   */
  const formatDistance = (distanceM) => {
    const distanceCm = Math.round(distanceM * 100);
    return distanceCm > 99 ? distanceM.toFixed(2) + " m" : distanceCm + " cm";
  };

  /**
   * Draw the field on canvas
   */
  const drawField = () => {
    const state = store.getState();
    if (!state.fieldProfile) return;

    const geometry = calculateGeometry(
      state.fieldProfile,
      state.editablePoints,
      canvasDimensions.scale,
    );

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { origin, scale } = canvasDimensions;

    // Helper to draw line
    const drawFieldLine = (
      lineSegment,
      strokeStyle = "#ffffff",
      lineWidth = 2,
    ) => {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      const a = toCanvas(lineSegment.start, origin, scale);
      const b = toCanvas(lineSegment.end, origin, scale);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };

    ctx.save();

    // Draw field boundary lines
    drawFieldLine({ start: geometry.homeLeft, end: geometry.homeRight });
    drawFieldLine({ start: geometry.homeLeft, end: geometry.diagonalLeftEnd });
    drawFieldLine({
      start: geometry.homeRight,
      end: geometry.diagonalRightEnd,
    });
    drawFieldLine({
      start: geometry.diagonalLeftEnd,
      end: geometry.leftVerticalEnd,
    });
    drawFieldLine({
      start: geometry.diagonalRightEnd,
      end: geometry.rightVerticalEnd,
    });
    drawFieldLine({
      start: geometry.leftVerticalEnd,
      end: geometry.rightVerticalEnd,
    });

    // Home line
    drawFieldLine(geometry.homeLineSegment);

    // Home plate circle (filled)
    const homePlateCanvas = toCanvas({ x: 0, y: 0 }, origin, scale);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(
      homePlateCanvas.x,
      homePlateCanvas.y,
      state.fieldProfile.homePlate.radius * scale,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Base arcs (filled)
    ctx.fillStyle = "#ffffff";

    const firstBaseCanvas = toCanvas(geometry.firstBaseCenter, origin, scale);
    const secondBaseCanvas = toCanvas(geometry.secondBaseCenter, origin, scale);
    const thirdBaseCanvas = toCanvas(geometry.thirdBaseCenter, origin, scale);

    // First base - quarter circle
    const leftDir = {
      x: Math.sin(
        (state.fieldProfile.battingSector.leftAngleDeg * Math.PI) / 180,
      ),
      y: Math.cos(
        (state.fieldProfile.battingSector.leftAngleDeg * Math.PI) / 180,
      ),
    };
    const angleToSecond = Math.atan2(
      secondBaseCanvas.y - firstBaseCanvas.y,
      secondBaseCanvas.x - firstBaseCanvas.x,
    );
    const leftLineAngle = Math.atan2(-leftDir.y, leftDir.x);

    ctx.beginPath();
    ctx.moveTo(firstBaseCanvas.x, firstBaseCanvas.y);
    ctx.arc(
      firstBaseCanvas.x,
      firstBaseCanvas.y,
      state.fieldProfile.baseRadius * scale,
      leftLineAngle,
      angleToSecond,
    );
    ctx.lineTo(firstBaseCanvas.x, firstBaseCanvas.y);
    ctx.fill();

    // Second base - half circle
    ctx.beginPath();
    ctx.arc(
      secondBaseCanvas.x,
      secondBaseCanvas.y,
      state.fieldProfile.baseRadius * scale,
      Math.PI / 2,
      Math.PI * 1.5,
    );
    ctx.fill();

    // Third base - half circle
    ctx.beginPath();
    ctx.arc(
      thirdBaseCanvas.x,
      thirdBaseCanvas.y,
      state.fieldProfile.baseRadius * scale,
      -Math.PI / 2,
      Math.PI / 2,
    );
    ctx.fill();

    // Base lines
    const lineHalfWidth = 1 / scale;
    const secondBaseLineY =
      geometry.secondBaseCenter.y -
      state.fieldProfile.baseRadius +
      lineHalfWidth;
    const thirdBaseLineY =
      geometry.thirdBaseCenter.y -
      state.fieldProfile.baseRadius +
      lineHalfWidth;

    drawFieldLine({
      start: { x: geometry.secondBaseCenter.x, y: secondBaseLineY },
      end: {
        x: geometry.secondBaseCenter.x + state.fieldProfile.baseLineLength,
        y: secondBaseLineY,
      },
    });

    drawFieldLine({
      start: { x: geometry.thirdBaseCenter.x, y: thirdBaseLineY },
      end: {
        x: geometry.thirdBaseCenter.x - state.fieldProfile.baseLineLength,
        y: thirdBaseLineY,
      },
    });

    // First-to-second extension
    drawFieldLine(geometry.firstToSecondExtension);

    // Base paths
    drawFieldLine(geometry.firstToSecond);
    drawFieldLine(geometry.secondToThird);

    // Home path (original - fixed)
    drawFieldLine(geometry.originalHomePathFirstLine);
    drawFieldLine(geometry.originalHomePathSecondLine);

    // Front arc
    const frontArcCenter = toCanvas({ x: 0, y: 0 }, origin, scale);
    const arcRadius =
      (state.fieldProfile.frontArc.outerRadius +
        state.fieldProfile.frontArc.innerRadius) /
      2;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      frontArcCenter.x,
      frontArcCenter.y,
      arcRadius * scale,
      geometry.frontArc.startAngle,
      geometry.frontArc.endAngle,
      true,
    );
    ctx.stroke();

    // Home arcs - half circles
    const homeLineCenter = toCanvas(
      { x: 0, y: state.fieldProfile.homePlate.centerToHomeLine },
      origin,
      scale,
    );
    [
      state.fieldProfile.homeArcs.innerRadius,
      state.fieldProfile.homeArcs.outerRadius,
    ].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(homeLineCenter.x, homeLineCenter.y, radius * scale, 0, Math.PI);
      ctx.stroke();
    });

    // Draw net distance line if provided
    const netDistanceCm = parseFloat(netDistanceInput.value);
    if (!isNaN(netDistanceCm) && netDistanceCm > 0) {
      const netDistanceM = netDistanceCm / 100;
      const netY = 0.3 + netDistanceM;

      // Calculate net endpoints based on field geometry
      const sectorOriginY = state.fieldProfile.battingSector.originOffsetY;
      const leftAngleDeg = state.fieldProfile.battingSector.leftAngleDeg;
      const rightAngleDeg = state.fieldProfile.battingSector.rightAngleDeg;
      const leftDir = {
        x: Math.sin((leftAngleDeg * Math.PI) / 180),
        y: Math.cos((leftAngleDeg * Math.PI) / 180),
      };
      const rightDir = {
        x: Math.sin((rightAngleDeg * Math.PI) / 180),
        y: Math.cos((rightAngleDeg * Math.PI) / 180),
      };

      let netLeftX, netRightX;
      if (netY <= geometry.homeLeft.y) {
        const tLeft = (netY - sectorOriginY) / leftDir.y;
        const tRight = (netY - sectorOriginY) / rightDir.y;
        netLeftX = leftDir.x * tLeft;
        netRightX = rightDir.x * tRight;
      } else if (netY <= geometry.diagonalLeftEnd.y) {
        const tLeft = (netY - geometry.homeLeft.y) / leftDir.y;
        const tRight = (netY - geometry.homeRight.y) / rightDir.y;
        netLeftX = geometry.homeLeft.x + leftDir.x * tLeft;
        netRightX = geometry.homeRight.x + rightDir.x * tRight;
      } else {
        netLeftX = geometry.diagonalLeftEnd.x;
        netRightX = geometry.diagonalRightEnd.x;
      }

      const netExtension = 6;
      const netLeft = { x: netLeftX - netExtension, y: netY };
      const netRight = { x: netRightX + netExtension, y: netY };
      const netLeftCanvas = toCanvas(netLeft, origin, scale);
      const netRightCanvas = toCanvas(netRight, origin, scale);

      // Draw green net pattern
      ctx.save();
      const patternCanvas = document.createElement("canvas");
      const patternCtx = patternCanvas.getContext("2d");
      patternCanvas.width = 4;
      patternCanvas.height = 4;

      patternCtx.strokeStyle = "#00aa00";
      patternCtx.lineWidth = 1;

      patternCtx.beginPath();
      patternCtx.moveTo(0, 0);
      patternCtx.lineTo(4, 4);
      patternCtx.moveTo(4, 0);
      patternCtx.lineTo(0, 4);
      patternCtx.stroke();

      const pattern = ctx.createPattern(patternCanvas, "repeat");
      ctx.fillStyle = pattern;
      ctx.fillRect(
        netLeftCanvas.x,
        netLeftCanvas.y - 1,
        netRightCanvas.x - netLeftCanvas.x,
        2,
      );

      ctx.restore();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
    }

    // Draw ball and angle lines if ball position exists
    if (ballPosition) {
      const homePlateCenter = toCanvas({ x: 0, y: 0 }, origin, scale);
      const ballCenter = toCanvas(
        { x: ballPosition.x, y: ballPosition.y },
        origin,
        scale,
      );

      ctx.save();
      ctx.strokeStyle = "#16e1ff";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Direct line from home plate to ball
      ctx.beginPath();
      ctx.moveTo(homePlateCenter.x, homePlateCenter.y);
      ctx.lineTo(ballCenter.x, ballCenter.y);
      ctx.stroke();

      // Vertical line from home plate
      const verticalPoint = toCanvas(
        { x: 0, y: ballPosition.y },
        origin,
        scale,
      );
      ctx.beginPath();
      ctx.moveTo(homePlateCenter.x, homePlateCenter.y);
      ctx.lineTo(verticalPoint.x, verticalPoint.y);
      ctx.stroke();

      // Horizontal line from vertical point to ball
      ctx.beginPath();
      ctx.moveTo(verticalPoint.x, verticalPoint.y);
      ctx.lineTo(ballCenter.x, ballCenter.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.restore();

      // Distance to net (if net is defined and ball is beyond it)
      const netDistanceCmActive = parseFloat(netDistanceInput.value);
      if (!isNaN(netDistanceCmActive) && netDistanceCmActive > 0) {
        const netDistanceM = netDistanceCmActive / 100;
        const netY = 0.3 + netDistanceM;

        if (netY <= ballPosition.y && netY > 0) {
          const directLineX = (netY / ballPosition.y) * ballPosition.x;
          const verticalLineX = 0;
          const distanceM = Math.abs(directLineX - verticalLineX);
          const midX = (directLineX + verticalLineX) / 2;
          const labelPos = toCanvas({ x: midX, y: netY }, origin, scale);

          ctx.fillStyle = "#16e1ff";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(formatDistance(distanceM), labelPos.x, labelPos.y - 5);
        }
      }

      // Distance labels
      const ballSideDistanceM = Math.abs(ballPosition.x);
      const ballLabelPos = toCanvas(
        { x: ballPosition.x / 2, y: ballPosition.y },
        origin,
        scale,
      );

      const plateDistanceM = Math.sqrt(
        ballPosition.x * ballPosition.x + ballPosition.y * ballPosition.y,
      );
      const plateLabelPos = toCanvas(
        { x: ballPosition.x / 2, y: ballPosition.y / 2 },
        origin,
        scale,
      );

      ctx.fillStyle = "#16e1ff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        formatDistance(plateDistanceM),
        plateLabelPos.x,
        plateLabelPos.y - 5,
      );

      const backBoundaryY =
        state.fieldProfile.homePlate.centerToHomeLine +
        state.fieldProfile.backBoundary.distanceFromHomeLine;
      const isNearBackBoundary = ballPosition.y >= backBoundaryY * 0.8;

      ctx.textBaseline = isNearBackBoundary ? "top" : "bottom";
      ctx.fillText(
        formatDistance(ballSideDistanceM),
        ballLabelPos.x,
        isNearBackBoundary ? ballLabelPos.y + 5 : ballLabelPos.y - 5,
      );

      // Draw ball
      drawBall(ballPosition.x, ballPosition.y, origin, scale);
    }

    ctx.restore();
  };

  /**
   * Draw ball at position
   */
  const drawBall = (x, y, origin, scale) => {
    const pos = toCanvas({ x, y }, origin, scale);
    const radius = 0.6 * scale;

    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = "#90EE90";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#6B8E6B";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(
      pos.x - radius * 0.3,
      pos.y - radius * 0.3,
      radius * 0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.shadowColor = "transparent";
  };

  /**
   * Resize canvas and redraw
   */
  const resizeCanvas = () => {
    const state = store.getState();

    const viewportWidth = Math.max(
      window.innerWidth || document.documentElement.clientWidth || 0,
      320,
    );
    const viewportHeight = Math.max(
      window.innerHeight || document.documentElement.clientHeight || 0,
      480,
    );

    const controlDockHeight =
      document.querySelector(".control-dock")?.offsetHeight || 0;
    const footerHeight = document.querySelector("footer")?.offsetHeight || 0;

    canvasDimensions = calculateCanvasDimensions(
      state.fieldProfile,
      viewportWidth,
      viewportHeight,
      controlDockHeight,
      0,
      footerHeight,
    );

    canvas.width = canvasDimensions.width;
    canvas.height = canvasDimensions.height;

    drawField();
  };

  // Event listeners
  window.addEventListener("resize", resizeCanvas);

  // Field profile buttons
  fieldButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      fieldButtons.forEach((btn) => btn.classList.remove("active"));
      event.currentTarget.classList.add("active");

      const profile =
        event.currentTarget.dataset.field === "men"
          ? fieldProfileMen
          : fieldProfileWomen;

      store.setFieldProfile(profile);
      resizeCanvas();
    });
  });

  // Net distance input
  netDistanceInput.addEventListener("input", () => {
    drawField();
  });

  // Canvas click handler
  const handleCanvasClick = (event) => {
    event.preventDefault();

    // Blur active element
    if (
      document.activeElement &&
      typeof document.activeElement.blur === "function"
    ) {
      document.activeElement.blur();
    }

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.type === "touchend") {
      const touch = event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    const fieldX =
      (canvasX - canvasDimensions.origin.x) / canvasDimensions.scale;
    const fieldY =
      -(canvasY - canvasDimensions.origin.y) / canvasDimensions.scale;

    ballPosition = { x: fieldX, y: fieldY };
    drawField();
  };

  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("touchend", handleCanvasClick);

  // Initialize with women's field
  store.setFieldProfile(fieldProfileWomen);
  resizeCanvas();
})();
