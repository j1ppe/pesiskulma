/**
 * PesisKulma main application module
 * Field visualization with net distance calculator
 */

import { calculateGeometry } from "./modules/geometry.js";
import {
  calculateCanvasDimensions,
  drawMeasurementLabel,
  toCanvas,
} from "./modules/rendering.js";
import { fieldProfileMen, fieldProfileWomen, store } from "./modules/state.js";

(() => {
  // DOM elements
  const canvas = document.getElementById("fieldCanvas");
  const netDistanceInput = document.getElementById("netDistance");
  const netDistanceUnit = document.querySelector(".net-distance-unit");
  const fieldButtons = document.querySelectorAll("[data-field]");
  const tooltip = document.getElementById("measurementTooltip");

  // Pitch plate elements
  const pitchPlateControl = document.getElementById("pitchPlateControl");
  const pitchPlateCanvas = document.getElementById("pitchPlateCanvas");
  const pitchPlateCanvasMobile = document.getElementById(
    "pitchPlateCanvasMobile",
  );
  const pitchPlateToggle = document.getElementById("pitchPlateToggle");
  const pitchPlateModal = document.getElementById("pitchPlateModal");
  const pitchPlateModalClose = document.getElementById("pitchPlateModalClose");
  const pitchPlateReset = document.getElementById("pitchPlateReset");
  const pitchPlateResetMobile = document.getElementById(
    "pitchPlateResetMobile",
  );

  // Zoom controls
  const zoomIn = document.getElementById("zoomIn");
  const zoomOut = document.getElementById("zoomOut");
  const zoomReset = document.getElementById("zoomReset");
  const zoomLevelDisplay = document.getElementById("zoomLevel");
  const panModeToggle = document.getElementById("panModeToggle");

  if (!canvas || !netDistanceInput) return;

  const ctx = canvas.getContext("2d");
  const pitchPlateCtx = pitchPlateCanvas?.getContext("2d");
  const pitchPlateCtxMobile = pitchPlateCanvasMobile?.getContext("2d");

  // Canvas dimensions (updated on resize)
  let canvasDimensions = {
    width: 0,
    height: 0,
    scale: 1,
    origin: { x: 0, y: 0 },
  };

  // Ball position (set by clicking on field)
  let ballPosition = null;

  // Pitch plate offset (in meters from center)
  let pitchOffset = { x: 0, y: 0 };

  //Measurement hit areas for tooltip interactions
  let measurementHitAreas = [];

  /**
   * Format distance for display
   */
  const formatDistance = (distanceM) => {
    const distanceCm = Math.round(distanceM * 100);

    if (window.unitSystem.isMetric()) {
      return distanceCm > 99 ? distanceM.toFixed(2) + " m" : distanceCm + " cm";
    } else {
      // Imperial: use feet for distances > 1m, inches for smaller
      if (distanceCm > 100) {
        return window.unitSystem.formatMeters(distanceM);
      } else {
        return window.unitSystem.formatCm(distanceCm);
      }
    }
  };

  /**
   * Draw the field on canvas
   */
  const drawField = () => {
    const state = store.getState();
    if (!state.fieldProfile) return;

    // Clear measurement hit areas
    measurementHitAreas = [];

    const geometry = calculateGeometry(
      state.fieldProfile,
      state.editablePoints,
      canvasDimensions.scale,
    );

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { origin, scale } = canvasDimensions;

    // Apply zoom and pan transformation
    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoomLevel, state.zoomLevel);

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

      patternCtx.strokeStyle = "#00ff00";
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
      // Launch point (home plate center + pitch offset)
      const launchPoint = { x: pitchOffset.x, y: pitchOffset.y };
      const launchPointCanvas = toCanvas(launchPoint, origin, scale);
      const ballCenter = toCanvas(
        { x: ballPosition.x, y: ballPosition.y },
        origin,
        scale,
      );

      ctx.save();
      ctx.strokeStyle = "#16e1ff";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Direct line from launch point to ball
      ctx.beginPath();
      ctx.moveTo(launchPointCanvas.x, launchPointCanvas.y);
      ctx.lineTo(ballCenter.x, ballCenter.y);
      ctx.stroke();

      // Vertical line from launch point
      const verticalPoint = toCanvas(
        { x: launchPoint.x, y: ballPosition.y },
        origin,
        scale,
      );
      ctx.beginPath();
      ctx.moveTo(launchPointCanvas.x, launchPointCanvas.y);
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

        if (netY <= ballPosition.y && netY > launchPoint.y) {
          // Calculate where direct line intersects with net
          const ballRelY = ballPosition.y - launchPoint.y;
          const ballRelX = ballPosition.x - launchPoint.x;
          const netRelY = netY - launchPoint.y;
          const directLineX = launchPoint.x + (netRelY / ballRelY) * ballRelX;
          const verticalLineX = launchPoint.x;
          const distanceM = Math.abs(directLineX - verticalLineX);
          const midX = (directLineX + verticalLineX) / 2;
          const labelPos = toCanvas({ x: midX, y: netY }, origin, scale);

          drawMeasurementLabel(ctx, {
            text: formatDistance(distanceM),
            x: labelPos.x,
            y: labelPos.y - 5,
            textAlign: "center",
            textBaseline: "bottom",
            color: "#16e1ff",
            font: "bold 24px sans-serif",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            padding: 4,
            tooltipData: {
              value: formatDistance(distanceM),
              description: "Etäisyys keskiviivasta osumakohtaan verkossa",
            },
            measurementHitAreas,
          });
        }
      }

      // Distance labels (relative to launch point)
      const ballRelativeX = ballPosition.x - launchPoint.x;
      const ballRelativeY = ballPosition.y - launchPoint.y;

      const ballSideDistanceM = Math.abs(ballRelativeX);
      const ballLabelPos = toCanvas(
        { x: launchPoint.x + ballRelativeX / 2, y: ballPosition.y },
        origin,
        scale,
      );

      const plateDistanceM = Math.sqrt(
        ballRelativeX * ballRelativeX + ballRelativeY * ballRelativeY,
      );
      const plateLabelPos = toCanvas(
        {
          x: launchPoint.x + ballRelativeX / 2,
          y: launchPoint.y + ballRelativeY / 2,
        },
        origin,
        scale,
      );

      drawMeasurementLabel(ctx, {
        text: formatDistance(plateDistanceM),
        x: plateLabelPos.x,
        y: plateLabelPos.y - 5,
        textAlign: "center",
        textBaseline: "bottom",
        color: "#16e1ff",
        font: "bold 24px sans-serif",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        padding: 4,
        tooltipData: {
          value: formatDistance(plateDistanceM),
          description: "Kokonaisetäisyys syöttölautaselta kohteeseen",
        },
        measurementHitAreas,
      });

      const backBoundaryY =
        state.fieldProfile.homePlate.centerToHomeLine +
        state.fieldProfile.backBoundary.distanceFromHomeLine;
      const isNearBackBoundary = ballPosition.y >= backBoundaryY * 0.8;

      drawMeasurementLabel(ctx, {
        text: formatDistance(ballSideDistanceM),
        x: ballLabelPos.x,
        y: isNearBackBoundary ? ballLabelPos.y + 5 : ballLabelPos.y - 5,
        textAlign: "center",
        textBaseline: isNearBackBoundary ? "top" : "bottom",
        color: "#16e1ff",
        font: "bold 24px sans-serif",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        padding: 4,
        tooltipData: {
          value: formatDistance(ballSideDistanceM),
          description: "Etäisyys keskiviivasta sivusuunnassa",
        },
        measurementHitAreas,
      });

      // Draw ball
      drawBall(ballPosition.x, ballPosition.y, origin, scale);
    }

    // Restore canvas context (end zoom/pan transformation)
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
   * Draw pitch plate on given canvas
   */
  const drawPitchPlate = (context, canvasElement) => {
    if (!context || !canvasElement) return;

    const width = canvasElement.width;
    const height = canvasElement.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Plate dimensions (in meters)
    const plateRadius = 0.3; // 30cm radius (60cm diameter)
    const plateThickness = 0.05; // 5cm thickness
    const maxOffset = 0.35; // Allow 35cm offset from center

    // Scale: pixels per meter (zoom in on plate, show less field area)
    const viewMargin = 0.1; // Minimal margin around the plate
    const pixelsPerMeter =
      Math.min(width, height) / (plateRadius * 2 + viewMargin * 2);

    const plateRadiusPx = plateRadius * pixelsPerMeter;

    // Clear canvas
    context.clearRect(0, 0, width, height);

    // Draw plate (white circle with subtle gradient)
    const gradient = context.createRadialGradient(
      centerX - plateRadiusPx * 0.3,
      centerY - plateRadiusPx * 0.3,
      0,
      centerX,
      centerY,
      plateRadiusPx,
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.7, "#f5f5f5");
    gradient.addColorStop(1, "#e8e8e8");

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, plateRadiusPx, 0, Math.PI * 2);
    context.fill();

    // Plate border
    context.strokeStyle = "#cccccc";
    context.lineWidth = 2;
    context.stroke();

    // Center cross
    context.strokeStyle = "#d0d0d0";
    context.lineWidth = 1;
    context.setLineDash([3, 3]);
    context.beginPath();
    context.moveTo(centerX - 10, centerY);
    context.lineTo(centerX + 10, centerY);
    context.moveTo(centerX, centerY - 10);
    context.lineTo(centerX, centerY + 10);
    context.stroke();
    context.setLineDash([]);

    // Calculate ball position
    const ballX = centerX + pitchOffset.x * pixelsPerMeter;
    const ballY = centerY - pitchOffset.y * pixelsPerMeter; // Negative because canvas Y increases downward

    // Draw ball shadow
    context.shadowColor = "rgba(0, 0, 0, 0.3)";
    context.shadowBlur = 8;
    context.shadowOffsetX = 3;
    context.shadowOffsetY = 3;

    // Draw ball (6.8cm diameter = 0.034m radius, to scale with 60cm plate)
    const ballRadius = 0.034 * pixelsPerMeter;
    context.fillStyle = "#90EE90";
    context.beginPath();
    context.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    context.fill();

    context.shadowColor = "transparent";

    // Ball border
    context.strokeStyle = "#6B8E6B";
    context.lineWidth = 2;
    context.stroke();

    // Ball highlight
    context.fillStyle = "rgba(255, 255, 255, 0.4)";
    context.beginPath();
    context.arc(
      ballX - ballRadius * 0.3,
      ballY - ballRadius * 0.3,
      ballRadius * 0.3,
      0,
      Math.PI * 2,
    );
    context.fill();

    // Store canvas info for interaction
    canvasElement.plateInfo = {
      centerX,
      centerY,
      pixelsPerMeter,
      plateRadius,
      maxOffset,
    };
  };

  /**
   * Update pitch offset indicator visibility
   */
  const updatePitchOffsetIndicator = () => {
    const indicator = document.getElementById("pitchOffsetIndicator");
    if (!indicator) return;

    const hasOffset = pitchOffset.x !== 0 || pitchOffset.y !== 0;
    indicator.classList.toggle("active", hasOffset);
  };

  /**
   * Reset pitch offset to center
   */
  const resetPitchOffset = () => {
    pitchOffset = { x: 0, y: 0 };
    drawPitchPlate(pitchPlateCtx, pitchPlateCanvas);
    drawPitchPlate(pitchPlateCtxMobile, pitchPlateCanvasMobile);
    drawField();
    updatePitchOffsetIndicator();
  };

  /**
   * Position pitch plate control below zoom controls on desktop
   */
  const positionPitchPlateControl = () => {
    if (!pitchPlateControl || window.innerWidth <= 1024) return;

    const zoomControls = document.getElementById("zoomControls");
    const panToggle = document.getElementById("panModeToggle");
    if (!zoomControls) return;

    const canvasRect = canvas.getBoundingClientRect();
    const gap = 20;

    // Calculate position: start from canvas top, add zoom height, pan height, and gaps
    // Zoom controls height ~52px, pan toggle ~40px, gaps 25px (zoom-pan) + 20px (pan-pitch)
    const zoomHeight = zoomControls.offsetHeight || 52;
    const panHeight = panToggle ? panToggle.offsetHeight || 40 : 0;

    const topPosition =
      canvasRect.top +
      gap +
      zoomHeight +
      (panToggle ? 25 + panHeight + 20 : 20);

    // Position below zoom and pan controls, aligned to right side of canvas
    pitchPlateControl.style.left = canvasRect.right + gap + "px";
    pitchPlateControl.style.top = topPosition + "px";
    pitchPlateControl.style.right = "auto";
    pitchPlateControl.style.bottom = "auto";
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
    updateZoomControlsPosition();
    positionPitchPlateControl();
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

  // Zoom controls
  const updateZoomDisplay = () => {
    const state = store.getState();
    if (zoomLevelDisplay) {
      zoomLevelDisplay.textContent = `${Math.round(state.zoomLevel * 100)}%`;
    }
    if (zoomOut) {
      zoomOut.disabled = state.zoomLevel <= 0.5;
    }
    if (zoomIn) {
      zoomIn.disabled = state.zoomLevel >= 3.0;
    }
  };

  const handleZoom = (delta, centerX = null, centerY = null) => {
    const state = store.getState();
    const oldZoom = state.zoomLevel;
    const newZoom = Math.max(0.5, Math.min(3.0, oldZoom + delta));

    if (newZoom === oldZoom) return;

    // If center point provided, zoom to that point
    if (centerX !== null && centerY !== null) {
      // Adjust pan so the point under cursor stays in same place
      const zoomRatio = newZoom / oldZoom;
      const newPanX = centerX - (centerX - state.panX) * zoomRatio;
      const newPanY = centerY - (centerY - state.panY) * zoomRatio;
      store.setPan(newPanX, newPanY);
    }

    store.setZoom(newZoom);
    updateZoomDisplay();
    drawField();
  };

  // Zoom button click handlers
  if (zoomIn) {
    zoomIn.addEventListener("click", () => {
      const centerX = canvas.clientWidth / 2;
      const centerY = canvas.clientHeight / 2;
      handleZoom(0.25, centerX, centerY);
    });
  }

  if (zoomOut) {
    zoomOut.addEventListener("click", () => {
      const centerX = canvas.clientWidth / 2;
      const centerY = canvas.clientHeight / 2;
      handleZoom(-0.25, centerX, centerY);
    });
  }

  if (zoomReset) {
    zoomReset.addEventListener("click", () => {
      store.setZoom(1.0);
      store.setPan(0, 0);
      updateZoomDisplay();
      drawField();
    });
  }

  // Pan mode toggle
  if (panModeToggle) {
    panModeToggle.addEventListener("click", () => {
      const state = store.getState();
      const newMode = !state.panMode;
      store.setState({ panMode: newMode });

      // Update button appearance
      panModeToggle.classList.toggle("active", newMode);

      // Update cursor style (hover handler will take over when pan mode is off)
      if (newMode) {
        canvas.style.cursor = "grab";
      } else {
        canvas.style.cursor = "";
      }
    });
  }

  // Mouse wheel zoom
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      handleZoom(delta, centerX, centerY);
    },
    { passive: false },
  );

  // Pan functionality
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panStartOffsetX = 0;
  let panStartOffsetY = 0;

  const handlePanStart = (event) => {
    const state = store.getState();

    // Pan mode: left mouse button OR touch activates panning
    // Without pan mode: only middle button or Ctrl/Meta + click
    const isTouch = event.type.startsWith("touch");
    const shouldPan = state.panMode
      ? isTouch || event.button === 0
      : !isTouch && (event.button === 1 || event.ctrlKey || event.metaKey);

    if (shouldPan) {
      event.preventDefault();
      isPanning = true;

      if (isTouch) {
        const touch = event.touches[0];
        panStartX = touch.clientX;
        panStartY = touch.clientY;
      } else {
        panStartX = event.clientX;
        panStartY = event.clientY;
      }

      panStartOffsetX = state.panX;
      panStartOffsetY = state.panY;

      // Update cursor during pan
      if (state.panMode && !isTouch) {
        canvas.style.cursor = "grabbing";
      }
    }
  };

  const handlePanMove = (event) => {
    if (!isPanning) return;

    // Only prevent default if the event is cancelable
    if (event.cancelable) {
      event.preventDefault();
    }

    let clientX, clientY;
    if (event.type.startsWith("touch")) {
      const touch = event.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const dx = clientX - panStartX;
    const dy = clientY - panStartY;

    store.setPan(panStartOffsetX + dx, panStartOffsetY + dy);
    drawField();
  };

  const handlePanEnd = () => {
    const state = store.getState();
    isPanning = false;

    // Restore cursor
    if (state.panMode) {
      canvas.style.cursor = "grab";
    } else {
      canvas.style.cursor = "";
    }
  };

  canvas.addEventListener("mousedown", handlePanStart);
  canvas.addEventListener("mousemove", handlePanMove);
  canvas.addEventListener("mouseup", handlePanEnd);
  canvas.addEventListener("mouseleave", handlePanEnd);

  // Touch events for mobile panning
  canvas.addEventListener("touchstart", handlePanStart, { passive: false });
  canvas.addEventListener("touchmove", handlePanMove, { passive: false });
  canvas.addEventListener("touchend", handlePanEnd);
  canvas.addEventListener("touchcancel", handlePanEnd);

  // Update zoom display initially and on state changes
  updateZoomDisplay();
  store.subscribe(updateZoomDisplay);

  // Update zoom controls and pitch plate position
  const updateZoomControlsPosition = () => {
    const zoomControls = document.getElementById("zoomControls");
    const panToggle = document.getElementById("panModeToggle");
    if (!zoomControls) return;

    const canvasRect = canvas.getBoundingClientRect();
    const isMobile = window.matchMedia("(max-width: 1024px)").matches;

    if (isMobile) {
      // Mobile: CSS handles positioning (top: 4px, right: 4px)
      // Reset any desktop JS positioning
      zoomControls.style.left = "";
      zoomControls.style.top = "";
      zoomControls.style.right = "";

      // Pan toggle hidden on mobile via CSS
    } else {
      // Desktop: position relative to canvas wrapper
      const wrapper = canvas.parentElement;
      if (!wrapper) return;

      const wrapperRect = wrapper.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const gap = 20;

      // Position to the right of the canvas, relative to wrapper
      const leftPos = canvasRect.right - wrapperRect.left + gap;
      const topPos = canvasRect.top - wrapperRect.top + gap;

      zoomControls.style.left = `${leftPos}px`;
      zoomControls.style.top = `${topPos}px`;

      // Pan toggle on desktop (below zoom controls)
      if (panToggle) {
        const zoomRect = zoomControls.getBoundingClientRect();
        const panTopPos = zoomRect.bottom - wrapperRect.top + 25;
        panToggle.style.left = `${leftPos}px`;
        panToggle.style.top = `${panTopPos}px`;
        panToggle.style.right = "auto";
        panToggle.style.bottom = "auto";
      }
    }
  };

  // Position pitch plate control below zoom controls on desktop
  const handlePitchPlateInteraction = (canvasElement, context) => {
    if (!canvasElement || !context) return;

    let isDragging = false;

    const updateBallPosition = (event) => {
      const rect = canvasElement.getBoundingClientRect();
      let clientX, clientY;

      if (event.type.startsWith("touch")) {
        const touch = event.touches[0] || event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const info = canvasElement.plateInfo;
      if (!info) return;

      // Convert to field coordinates (meters)
      const offsetX = (x - info.centerX) / info.pixelsPerMeter;
      const offsetY = -(y - info.centerY) / info.pixelsPerMeter;

      // Clamp to allowed range
      const maxOffset = info.maxOffset;
      pitchOffset.x = Math.max(-maxOffset, Math.min(maxOffset, offsetX));
      pitchOffset.y = Math.max(-maxOffset, Math.min(maxOffset, offsetY));

      // Redraw
      drawPitchPlate(context, canvasElement);
      drawField();
      updatePitchOffsetIndicator();
    };

    const handleStart = (event) => {
      event.preventDefault();
      isDragging = true;
      updateBallPosition(event);
    };

    const handleMove = (event) => {
      if (!isDragging) return;
      event.preventDefault();
      updateBallPosition(event);
    };

    const handleEnd = (event) => {
      event.preventDefault();
      isDragging = false;
    };

    canvasElement.addEventListener("mousedown", handleStart);
    canvasElement.addEventListener("mousemove", handleMove);
    canvasElement.addEventListener("mouseup", handleEnd);
    canvasElement.addEventListener("mouseleave", handleEnd);

    canvasElement.addEventListener("touchstart", handleStart);
    canvasElement.addEventListener("touchmove", handleMove);
    canvasElement.addEventListener("touchend", handleEnd);
  };

  // Initialize pitch plate interaction
  if (pitchPlateCanvas && pitchPlateCtx) {
    handlePitchPlateInteraction(pitchPlateCanvas, pitchPlateCtx);
  }
  if (pitchPlateCanvasMobile && pitchPlateCtxMobile) {
    handlePitchPlateInteraction(pitchPlateCanvasMobile, pitchPlateCtxMobile);
  }

  // Make pitch plate control draggable (desktop only)
  if (pitchPlateControl) {
    const header = pitchPlateControl.querySelector(".pitch-plate-header");
    if (header) {
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;

      const dragStart = (e) => {
        // Only drag when clicking on header, not buttons
        if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
          return;
        }

        if (e.type === "touchstart") {
          initialX = e.touches[0].clientX - pitchPlateControl.offsetLeft;
          initialY = e.touches[0].clientY - pitchPlateControl.offsetTop;
        } else {
          initialX = e.clientX - pitchPlateControl.offsetLeft;
          initialY = e.clientY - pitchPlateControl.offsetTop;
        }

        isDragging = true;
        pitchPlateControl.style.transition = "none";
      };

      const drag = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        if (e.type === "touchmove") {
          currentX = e.touches[0].clientX - initialX;
          currentY = e.touches[0].clientY - initialY;
        } else {
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
        }

        // Keep within viewport bounds
        const maxX = window.innerWidth - pitchPlateControl.offsetWidth;
        const maxY = window.innerHeight - pitchPlateControl.offsetHeight;

        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        pitchPlateControl.style.left = currentX + "px";
        pitchPlateControl.style.top = currentY + "px";
        pitchPlateControl.style.right = "auto";
        pitchPlateControl.style.bottom = "auto";
      };

      const dragEnd = () => {
        isDragging = false;
      };

      header.addEventListener("mousedown", dragStart);
      document.addEventListener("mousemove", drag);
      document.addEventListener("mouseup", dragEnd);

      header.addEventListener("touchstart", dragStart);
      document.addEventListener("touchmove", drag);
      document.addEventListener("touchend", dragEnd);
    }
  }

  // Pitch plate reset buttons
  if (pitchPlateReset) {
    pitchPlateReset.addEventListener("click", resetPitchOffset);
  }
  if (pitchPlateResetMobile) {
    pitchPlateResetMobile.addEventListener("click", resetPitchOffset);
  }

  // Mobile modal toggle
  if (pitchPlateToggle && pitchPlateModal) {
    pitchPlateToggle.addEventListener("click", () => {
      pitchPlateModal.classList.add("active");
      drawPitchPlate(pitchPlateCtxMobile, pitchPlateCanvasMobile);
    });
  }

  if (pitchPlateModalClose && pitchPlateModal) {
    pitchPlateModalClose.addEventListener("click", () => {
      pitchPlateModal.classList.remove("active");
    });
  }

  // Close modal on backdrop click
  if (pitchPlateModal) {
    pitchPlateModal.addEventListener("click", (event) => {
      if (event.target === pitchPlateModal) {
        pitchPlateModal.classList.remove("active");
      }
    });
  }

  // Ball dragging functionality
  let isDraggingBall = false;
  let wasDragged = false;

  // Helper to convert screen coordinates to field coordinates
  const screenToFieldCoords = (clientX, clientY) => {
    const state = store.getState();
    const rect = canvas.getBoundingClientRect();

    // Account for CSS scaling of canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let canvasX = (clientX - rect.left) * scaleX;
    let canvasY = (clientY - rect.top) * scaleY;

    // Account for zoom and pan
    canvasX = (canvasX - state.panX) / state.zoomLevel;
    canvasY = (canvasY - state.panY) / state.zoomLevel;

    const fieldX =
      (canvasX - canvasDimensions.origin.x) / canvasDimensions.scale;
    const fieldY =
      -(canvasY - canvasDimensions.origin.y) / canvasDimensions.scale;

    return { x: fieldX, y: fieldY };
  };

  // Check if mouse/touch is near the ball
  const isNearBall = (fieldX, fieldY) => {
    if (!ballPosition) return false;
    const dx = fieldX - ballPosition.x;
    const dy = fieldY - ballPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 2.0; // 2 meters radius
  };

  const handleBallDragStart = (event) => {
    const state = store.getState();

    // Skip if pan mode is active or already panning
    if (state.panMode || isPanning) return;

    let clientX, clientY;
    const isTouch = event.type.startsWith("touch");

    if (isTouch) {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      // Only left mouse button
      if (event.button !== 0) return;
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const fieldPos = screenToFieldCoords(clientX, clientY);

    if (isNearBall(fieldPos.x, fieldPos.y)) {
      isDraggingBall = true;
      wasDragged = false;
      if (event.cancelable) {
        event.preventDefault();
      }
      canvas.style.cursor = "grabbing";
    }
  };

  const handleBallDragMove = (event) => {
    if (!isDraggingBall) return;

    wasDragged = true;
    if (event.cancelable) {
      event.preventDefault();
    }

    let clientX, clientY;
    const isTouch = event.type.startsWith("touch");

    if (isTouch) {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const fieldPos = screenToFieldCoords(clientX, clientY);
    ballPosition = fieldPos;
    drawField();
  };

  const handleBallDragEnd = () => {
    if (isDraggingBall) {
      isDraggingBall = false;
      canvas.style.cursor = "";
    }
  };

  // Canvas click handler (only if not dragged)
  const handleCanvasClick = (event) => {
    const state = store.getState();

    // Skip if it's a pan operation, pan mode is active, or was a drag
    if (isPanning || state.panMode || wasDragged) {
      wasDragged = false;
      return;
    }

    // Only prevent default if the event is cancelable
    if (event.cancelable) {
      event.preventDefault();
    }

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

    const fieldPos = screenToFieldCoords(clientX, clientY);
    ballPosition = fieldPos;
    drawField();
  };

  // Custom hover handler with zoom/pan support for tooltip
  const handleTooltipHover = (event) => {
    const state = store.getState();

    if (!tooltip || measurementHitAreas.length === 0) {
      if (tooltip) tooltip.style.display = "none";
      return;
    }

    const canvasPos = getCanvasMousePosition(event, canvas);

    // Transform canvas position to account for zoom and pan
    const transformedPos = {
      x: (canvasPos.x - state.panX) / state.zoomLevel,
      y: (canvasPos.y - state.panY) / state.zoomLevel,
    };

    // Find hovered measurement
    let hoveredArea = null;
    for (const area of measurementHitAreas) {
      if (
        transformedPos.x >= area.x &&
        transformedPos.x <= area.x + area.width &&
        transformedPos.y >= area.y &&
        transformedPos.y <= area.y + area.height
      ) {
        hoveredArea = area;
        break;
      }
    }

    if (hoveredArea) {
      tooltip.innerHTML = `
        <div class="tooltip-value">${hoveredArea.data.value}</div>
        <div class="tooltip-description">${hoveredArea.data.description}</div>
      `;
      tooltip.style.display = "block";

      // Position tooltip near cursor
      let tooltipX = event.clientX + 15;
      let tooltipY = event.clientY + 15;

      requestAnimationFrame(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (tooltipX + tooltipRect.width > viewportWidth - 10) {
          tooltipX = event.clientX - tooltipRect.width - 15;
        }
        if (tooltipY + tooltipRect.height > viewportHeight - 10) {
          tooltipY = event.clientY - tooltipRect.height - 15;
        }

        tooltip.style.left = `${tooltipX}px`;
        tooltip.style.top = `${tooltipY}px`;
      });
    } else {
      tooltip.style.display = "none";
    }
  };

  // Helper to get canvas mouse position
  const getCanvasMousePosition = (event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  // Hover handler to show grab cursor when over ball and handle tooltips
  const handleCanvasHover = (event) => {
    const state = store.getState();

    // Handle tooltips
    handleTooltipHover(event);

    // Don't show grab cursor if pan mode is active or dragging
    if (state.panMode || isDraggingBall || isPanning) return;

    const fieldPos = screenToFieldCoords(event.clientX, event.clientY);

    if (isNearBall(fieldPos.x, fieldPos.y)) {
      canvas.style.cursor = "grab";
    } else {
      canvas.style.cursor = "";
    }
  };

  // Add drag event listeners
  canvas.addEventListener("mousedown", handleBallDragStart);
  canvas.addEventListener("mousemove", handleBallDragMove);
  canvas.addEventListener("mousemove", handleCanvasHover);
  canvas.addEventListener("mouseup", handleBallDragEnd);
  canvas.addEventListener("mouseleave", handleBallDragEnd);

  canvas.addEventListener("touchstart", handleBallDragStart, {
    passive: false,
  });
  canvas.addEventListener("touchmove", handleBallDragMove, { passive: false });
  canvas.addEventListener("touchend", handleBallDragEnd);
  canvas.addEventListener("touchcancel", handleBallDragEnd);

  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("touchend", handleCanvasClick);

  // Listen for unit system changes and redraw
  window.addEventListener("unitChanged", () => {
    console.log("unitChanged event received in pesiskulma-main, redrawing...");
    updateNetDistanceUnit();
    drawField();
  });

  // Listen for language changes and update unit label
  window.addEventListener("languageChanged", () => {
    updateNetDistanceUnit();
  });

  /**
   * Update net distance unit label based on current unit system
   */
  function updateNetDistanceUnit() {
    if (netDistanceUnit && window.unitSystem) {
      const isImperial = window.unitSystem.isImperial();
      const unitKey = isImperial ? "in" : "cm";

      // Try to get translated unit, fall back to unit key
      let unitText = unitKey;
      if (
        window.i18n &&
        window.i18n.translations &&
        window.i18n.translations.common &&
        window.i18n.translations.common.units
      ) {
        unitText = window.i18n.translations.common.units[unitKey] || unitKey;
      }

      netDistanceUnit.textContent = unitText;
    }
  }

  // Initialize with women's field
  store.setFieldProfile(fieldProfileWomen);

  // Draw initial pitch plates
  drawPitchPlate(pitchPlateCtx, pitchPlateCanvas);
  drawPitchPlate(pitchPlateCtxMobile, pitchPlateCanvasMobile);

  // Initialize pitch offset indicator
  updatePitchOffsetIndicator();

  // Initialize net distance unit
  updateNetDistanceUnit();

  resizeCanvas();
})();
