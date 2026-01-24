/**
 * Main application module
 * Orchestrates all modules and manages the field visualization
 */

import {
  calculateGeometry,
  distanceBetween,
  formatMeters,
} from "./modules/geometry.js";
import {
  createHoverHandler,
  createMouseDownHandler,
  createMouseMoveHandler,
  createMouseUpHandler,
  getCanvasMousePosition,
  getHandleUnderMouse,
} from "./modules/interactions.js";
import {
  calculateCanvasDimensions,
  drawDimensionLine,
  drawEditHandles,
  drawLine,
  drawSnapIndicator,
  fromCanvasWithZoom,
  toCanvas,
} from "./modules/rendering.js";
import { fieldProfileMen, fieldProfileWomen, store } from "./modules/state.js";

(() => {
  // DOM elements
  const canvas = document.getElementById("fullFieldCanvas");
  const fieldButtons = document.querySelectorAll("[data-fullfield]");
  const resetEdits = document.getElementById("resetEdits");
  const zoomIn = document.getElementById("zoomIn");
  const zoomOut = document.getElementById("zoomOut");
  const zoomLevelDisplay = document.getElementById("zoomLevel");
  const tooltip = document.getElementById("measurementTooltip");
  const infoToggle = document.getElementById("infoToggle");
  const infoCopy = document.getElementById("infoCopy");
  const dimensionTargets = {
    first: document.querySelector("[data-dimension='first']"),
    second: document.querySelector("[data-dimension='second']"),
    third: document.querySelector("[data-dimension='third']"),
    back: document.querySelector("[data-dimension='back']"),
    diagonal: document.querySelector("[data-dimension='diagonal']"),
    width: document.querySelector("[data-dimension='width']"),
  };

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Canvas dimensions (updated on resize)
  let canvasDimensions = {
    width: 0,
    height: 0,
    scale: 1,
    origin: { x: 0, y: 0 },
  };

  /**
   * Custom confirm dialog
   * @param {string} message - Message to display
   * @param {string} title - Dialog title (optional)
   * @returns {Promise<boolean>} True if OK clicked, false if cancelled
   */
  const customConfirm = (message, title = "Vahvistus") => {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmModal");
      const titleEl = document.getElementById("confirmTitle");
      const messageEl = document.getElementById("confirmMessage");
      const okBtn = document.getElementById("confirmOk");
      const cancelBtn = document.getElementById("confirmCancel");

      titleEl.textContent = title;
      messageEl.textContent = message;
      modal.classList.add("active");

      const cleanup = () => {
        modal.classList.remove("active");
        okBtn.removeEventListener("click", handleOk);
        cancelBtn.removeEventListener("click", handleCancel);
      };

      const handleOk = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      okBtn.addEventListener("click", handleOk);
      cancelBtn.addEventListener("click", handleCancel);
    });
  };

  /**
   * Custom alert dialog
   * @param {string} message - Message to display
   * @param {string} title - Dialog title (optional)
   * @returns {Promise<void>}
   */
  const customAlert = (message, title = "Ilmoitus") => {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmModal");
      const titleEl = document.getElementById("confirmTitle");
      const messageEl = document.getElementById("confirmMessage");
      const okBtn = document.getElementById("confirmOk");
      const cancelBtn = document.getElementById("confirmCancel");

      titleEl.textContent = title;
      messageEl.textContent = message;
      cancelBtn.style.display = "none"; // Hide cancel button for alerts
      modal.classList.add("active");

      const cleanup = () => {
        modal.classList.remove("active");
        cancelBtn.style.display = ""; // Restore cancel button
        okBtn.removeEventListener("click", handleOk);
      };

      const handleOk = () => {
        cleanup();
        resolve();
      };

      okBtn.addEventListener("click", handleOk);
    });
  };

  /**
   * Update dimension displays
   */
  const updateDimensions = (values) => {
    Object.entries(dimensionTargets).forEach(([key, element]) => {
      if (element && values[key] !== undefined) {
        element.textContent = formatMeters(values[key]);
      }
    });
  };

  /**
   * Main field drawing function
   */
  const drawField = () => {
    const state = store.getState();
    if (!state.fieldProfile) {
      return;
    }
    const geometry = calculateGeometry(
      state.fieldProfile,
      state.editablePoints,
      canvasDimensions.scale,
    );

    // Update state with initialized editable points if they were null
    if (
      state.editablePoints.homePathStart === null ||
      state.editablePoints.homePathMid === null ||
      state.editablePoints.homePathEnd === null
    ) {
      store.setState({
        editablePoints: geometry.initializedEditablePoints,
        snapTargets: geometry.snapTargets,
      });
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { origin, scale } = canvasDimensions;

    // Apply zoom and pan transformation
    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoomLevel, state.zoomLevel);

    // Reset measurement hit areas
    const measurementHitAreas = [];

    // Helper to convert and draw line
    const drawFieldLine = (
      lineSegment,
      strokeStyle = "#ffffff",
      lineWidth = 2,
    ) => {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      const a = toCanvas(lineSegment.start, origin, scale);
      const b = toCanvas(lineSegment.end, origin, scale);
      drawLine(ctx, a, b);
    };

    // Draw field geometry
    ctx.save();

    // Home left to home right (kotipesän sivurajoihin saakka)
    drawFieldLine({ start: geometry.homeLeft, end: geometry.homeRight });

    // Diagonal lines
    drawFieldLine({ start: geometry.homeLeft, end: geometry.diagonalLeftEnd });
    drawFieldLine({
      start: geometry.homeRight,
      end: geometry.diagonalRightEnd,
    });

    // Vertical lines
    drawFieldLine({
      start: geometry.diagonalLeftEnd,
      end: geometry.leftVerticalEnd,
    });
    drawFieldLine({
      start: geometry.diagonalRightEnd,
      end: geometry.rightVerticalEnd,
    });

    // Back boundary
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

    // Base arcs (filled, not full circles)
    ctx.fillStyle = "#ffffff";

    // First base - quarter circle
    const firstBaseCanvas = toCanvas(geometry.firstBaseCenter, origin, scale);
    const secondBaseCanvas = toCanvas(geometry.secondBaseCenter, origin, scale);
    const thirdBaseCanvas = toCanvas(geometry.thirdBaseCenter, origin, scale);

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

    // Adjust base lines for proper rendering (compensate for scale)
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

    // First to second, second to third
    drawFieldLine(geometry.firstToSecond);
    drawFieldLine(geometry.secondToThird);

    // Original home path (always fixed, white)
    drawFieldLine(geometry.originalHomePathFirstLine);
    drawFieldLine(geometry.originalHomePathSecondLine);

    // Front arc - single arc with correct angles
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

    // Home arcs - half circles from 0 to π, centered at home line
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

    ctx.restore();

    // Draw measurements if enabled
    if (state.showMeasurementsOnField) {
      const drawMeasurement = (params) => {
        drawDimensionLine(ctx, {
          ...params,
          origin,
          scale,
          measurementHitAreas,
        });
      };

      // Ykkösväli - piirretään suoraan viivan päälle
      drawMeasurement({
        pointA: geometry.homeLeft,
        pointB: geometry.firstBaseCenter,
        distance: geometry.measurements.first,
        label: "Ykkösväli",
        offset: 0,
        side: "on-line",
        labelOffsetPx: 15,
        tooltipData: {
          value: formatMeters(geometry.measurements.first),
          description: "Etäisyys kotipesäviivasta ensimmäiseen pesään",
        },
      });

      // Kakkosväli - piirretään suoraan viivan päälle
      drawMeasurement({
        pointA: geometry.basePathSegments.firstToSecond.start,
        pointB: geometry.basePathSegments.firstToSecond.end,
        distance: geometry.measurements.second,
        label: "Kakkosväli",
        offset: 0,
        side: "on-line",
        labelOffsetPx: 0,
        tooltipData: {
          value: formatMeters(geometry.measurements.second),
          description: "Etäisyys ensimmäisestä pesästä toiseen pesään",
        },
      });

      // Kolmosväli - piirretään suoraan viivan päälle
      drawMeasurement({
        pointA: geometry.basePathSegments.secondToThird.start,
        pointB: geometry.basePathSegments.secondToThird.end,
        distance: geometry.measurements.third,
        label: "Kolmosväli",
        offset: 0,
        side: "on-line",
        labelOffsetPx: 0,
        tooltipData: {
          value: formatMeters(geometry.measurements.third),
          description: "Etäisyys toisesta pesästä kolmanteen pesään",
        },
      });

      // Kentän pituus (kotipesäviivasta takarajaan)
      const homeLineY = state.fieldProfile.homePlate.centerToHomeLine;
      const backLineY =
        homeLineY + state.fieldProfile.backBoundary.distanceFromHomeLine;
      drawMeasurement({
        pointA: {
          x: state.fieldProfile.backBoundary.width / 2 + 3,
          y: homeLineY,
        },
        pointB: {
          x: state.fieldProfile.backBoundary.width / 2 + 3,
          y: backLineY,
        },
        distance: geometry.measurements.back,
        label: "Kentän pituus",
        offset: 0,
        side: "vertical",
        labelOffsetPx: 0,
        tooltipData: {
          value: formatMeters(geometry.measurements.back),
          description: "Kentän pituus kotipesäviivasta takarajaan",
        },
      });

      // Kentän leveys takarajalla
      const halfWidth = state.fieldProfile.backBoundary.width / 2;
      drawMeasurement({
        pointA: { x: -halfWidth, y: backLineY - 3 },
        pointB: { x: halfWidth, y: backLineY - 3 },
        distance: geometry.measurements.width,
        label: "Kentän leveys",
        offset: 0,
        side: "horizontal",
        labelOffsetPx: 0,
        tooltipData: {
          value: formatMeters(geometry.measurements.width),
          description: "Kentän leveys takarajalla",
        },
      });

      // Etukaari - syöttölautasen etuosasta etukaaren ulkokehälle
      const plateRadius = state.fieldProfile.homePlate.radius;
      const frontArcRadius = state.fieldProfile.frontArc.outerRadius;
      const frontArcDistance = frontArcRadius - plateRadius;
      drawMeasurement({
        pointA: { x: 0, y: plateRadius },
        pointB: { x: 0, y: frontArcRadius },
        distance: frontArcDistance,
        label: "Etukaari",
        offset: 0,
        side: "vertical",
        labelOffsetPx: 0,
        tooltipData: {
          value: formatMeters(frontArcDistance),
          description:
            "Etäisyys syöttölautasen etureunasta etukaaren ulkolaitaan",
        },
      });

      // Kotipolku (editable)
      const firstSegmentLength = distanceBetween(
        geometry.homePathFirstLine.start,
        geometry.homePathFirstLine.end,
      );
      const secondSegmentLength = distanceBetween(
        geometry.homePathSecondLine.start,
        geometry.homePathSecondLine.end,
      );

      // Kotipolku - piirretään molemmat osuudet erikseen
      drawMeasurement({
        pointA: geometry.homePathFirstLine.start,
        pointB: geometry.homePathFirstLine.end,
        distance: firstSegmentLength,
        label: "Kotipolku",
        offset: 0,
        side: "on-line",
        labelOffsetPx: -15,
        tooltipData: {
          value: formatMeters(geometry.measurements.diagonal),
          description: `Lipulle ${formatMeters(firstSegmentLength)}<br>Kotipesään ${formatMeters(secondSegmentLength)}`,
        },
      });

      drawMeasurement({
        pointA: geometry.homePathSecondLine.start,
        pointB: geometry.homePathSecondLine.end,
        distance: secondSegmentLength,
        label: "Kotipolku",
        offset: 0,
        side: "on-line",
        labelOffsetPx: -15,
        tooltipData: {
          value: formatMeters(geometry.measurements.diagonal),
          description: `Lipulle ${formatMeters(firstSegmentLength)}<br>Kotipesään ${formatMeters(secondSegmentLength)}`,
        },
      });

      // Show offset distance if start point has been moved
      if (state.editMode) {
        const offsetDistance = distanceBetween(
          geometry.originalHomePathFirstLine.start,
          geometry.homePathFirstLine.start,
        );

        if (offsetDistance > 0.01) {
          drawMeasurement({
            pointA: geometry.originalHomePathFirstLine.start,
            pointB: geometry.homePathFirstLine.start,
            distance: offsetDistance,
            label: "Siirto",
            offset: 3.0,
            side: "bottom",
            tooltipData: {
              value: formatMeters(offsetDistance),
              description: "Etäisyys alkuperäisestä lähtöpisteestä",
            },
            color: "#ff9500",
            textColor: "#ff9500",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
          });
        }
      }
    }

    // Store hit areas in state
    store.setState({ measurementHitAreas });

    // Update dimension displays
    updateDimensions(geometry.measurements);

    // Draw edit handles if in edit mode
    if (state.editMode && state.showMeasurementsOnField) {
      drawEditHandles(ctx, {
        editablePoints: geometry.initializedEditablePoints,
        draggingHandle: state.draggingHandle,
        origin,
        scale,
      });

      // Draw snap indicator
      if (state.activeSnapPoint) {
        drawSnapIndicator(ctx, state.activeSnapPoint, origin, scale);
      }
    }

    // Restore canvas context (end zoom/pan transformation)
    ctx.restore();
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

    const selectorHeight =
      document.querySelector(".field-selector")?.offsetHeight || 0;
    const legendHeight =
      document.querySelector(".fullfield-legend")?.offsetHeight || 0;
    const footerHeight = document.querySelector("footer")?.offsetHeight || 0;

    canvasDimensions = calculateCanvasDimensions(
      state.fieldProfile,
      viewportWidth,
      viewportHeight,
      selectorHeight,
      legendHeight,
      footerHeight,
    );

    canvas.width = canvasDimensions.width;
    canvas.height = canvasDimensions.height;

    drawField();

    // Update reset button position after canvas resize
    if (resetEdits) {
      updateResetButtonPosition();
    }
    updateZoomControlsPosition();
  };

  // Event listeners
  window.addEventListener("resize", resizeCanvas);

  // Info toggle for mobile
  if (infoToggle && infoCopy) {
    infoToggle.addEventListener("click", () => {
      const isExpanded = infoCopy.classList.toggle("expanded");
      infoToggle.setAttribute("aria-expanded", isExpanded.toString());
    });
  }

  // Field profile buttons
  fieldButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      fieldButtons.forEach((btn) => btn.classList.remove("active"));
      event.currentTarget.classList.add("active");

      const profile =
        event.currentTarget.dataset.fullfield === "men"
          ? fieldProfileMen
          : fieldProfileWomen;

      store.setFieldProfile(profile);
      resizeCanvas();
    });
  });

  // Reset edits button
  if (resetEdits) {
    resetEdits.addEventListener("click", async () => {
      const confirmed = await customConfirm(
        "Palautetaanko mittaukset alkuperäisiin arvoihin?",
      );
      if (confirmed) {
        store.resetEditablePoints();
        drawField();
      }
    });
  }

  // Update reset button visibility based on editablePoints
  const updateResetButtonVisibility = () => {
    if (!resetEdits) return;
    const state = store.getState();

    // If points are null, no edits yet
    if (
      state.editablePoints.homePathStart === null ||
      state.editablePoints.homePathMid === null ||
      state.editablePoints.homePathEnd === null
    ) {
      resetEdits.style.display = "none";
      return;
    }

    // Calculate original geometry (without edits)
    const originalGeometry = calculateGeometry(
      state.fieldProfile,
      { homePathStart: null, homePathMid: null, homePathEnd: null },
      canvasDimensions.scale,
    );

    // Check if any point has been moved from original position
    const hasEdits =
      Math.abs(
        state.editablePoints.homePathStart.x -
          originalGeometry.initializedEditablePoints.homePathStart.x,
      ) > 0.001 ||
      Math.abs(
        state.editablePoints.homePathStart.y -
          originalGeometry.initializedEditablePoints.homePathStart.y,
      ) > 0.001 ||
      Math.abs(
        state.editablePoints.homePathMid.x -
          originalGeometry.initializedEditablePoints.homePathMid.x,
      ) > 0.001 ||
      Math.abs(
        state.editablePoints.homePathMid.y -
          originalGeometry.initializedEditablePoints.homePathMid.y,
      ) > 0.001 ||
      Math.abs(
        state.editablePoints.homePathEnd.x -
          originalGeometry.initializedEditablePoints.homePathEnd.x,
      ) > 0.001 ||
      Math.abs(
        state.editablePoints.homePathEnd.y -
          originalGeometry.initializedEditablePoints.homePathEnd.y,
      ) > 0.001;

    resetEdits.style.display = hasEdits ? "block" : "none";
  };

  // Update reset button position to be on top of the canvas (top-left corner of background)
  const updateResetButtonPosition = () => {
    if (!resetEdits) return;

    // Get canvas and wrapper positions
    const canvasRect = canvas.getBoundingClientRect();
    const wrapper = canvas.parentElement;
    const wrapperRect = wrapper.getBoundingClientRect();

    // Place at canvas top-left with small margin (this is where the background starts)
    const left = canvasRect.left - wrapperRect.left + 10;
    const top = canvasRect.top - wrapperRect.top + 10;

    resetEdits.style.left = `${left}px`;
    resetEdits.style.top = `${top}px`;
  };

  // Update zoom controls position to be on top of the canvas (top-right corner)
  const updateZoomControlsPosition = () => {
    const zoomControls = document.getElementById("zoomControls");
    if (!zoomControls) return;

    // On mobile, use CSS positioning (more reliable)
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) return;

    // Get canvas and wrapper positions
    const canvasRect = canvas.getBoundingClientRect();
    const wrapper = canvas.parentElement;
    const wrapperRect = wrapper.getBoundingClientRect();

    // Place at canvas top-right with small margin
    const right = wrapperRect.right - canvasRect.right + 10;
    const top = canvasRect.top - wrapperRect.top + 10;

    zoomControls.style.right = `${right}px`;
    zoomControls.style.top = `${top}px`;
  };

  // Subscribe to state changes to update reset button
  store.subscribe(() => {
    updateResetButtonVisibility();
    updateResetButtonPosition();
  });

  // Initial update
  updateResetButtonVisibility();
  updateResetButtonPosition();
  updateZoomControlsPosition();

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
      handleZoom(0.25);
    });
  }

  if (zoomOut) {
    zoomOut.addEventListener("click", () => {
      handleZoom(-0.25);
    });
  }

  // Mouse wheel zoom (desktop)
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

  // Update zoom display initially and on state changes
  updateZoomDisplay();
  store.subscribe(updateZoomDisplay);

  // Canvas interactions
  const hoverHandler = createHoverHandler({
    canvas,
    tooltip,
    getState: () => store.getState(),
    getOrigin: () => canvasDimensions.origin,
    getScale: () => canvasDimensions.scale,
  });

  const mouseDownHandler = createMouseDownHandler({
    canvas,
    getState: () => store.getState(),
    setState: (updates) => {
      store.setState(updates);
      drawField();
    },
    getOrigin: () => canvasDimensions.origin,
    getScale: () => canvasDimensions.scale,
  });

  const mouseMoveHandler = createMouseMoveHandler({
    canvas,
    getState: () => store.getState(),
    updateEditablePoint: (pointName, newPoint) => {
      store.updateEditablePoint(pointName, newPoint);
      drawField();
    },
    setActiveSnapPoint: (point) => {
      store.setState({ activeSnapPoint: point });
      drawField();
    },
    getOrigin: () => canvasDimensions.origin,
    getScale: () => canvasDimensions.scale,
  });

  const mouseUpHandler = createMouseUpHandler({
    canvas,
    setState: (updates) => {
      store.setState(updates);
      drawField();
    },
  });

  // Pan and zoom state
  let panStartPos = null;
  let panStartState = null;

  // Handle pan start (when clicking/touching empty area)
  const handlePanStart = (clientX, clientY) => {
    const state = store.getState();
    const canvasPos = getCanvasMousePosition({ clientX, clientY }, canvas);
    const fieldPos = fromCanvasWithZoom(
      canvasPos,
      canvasDimensions.origin,
      canvasDimensions.scale,
      state.zoomLevel,
      state.panX,
      state.panY,
    );

    // Check if clicking on a handle
    const handleUnder = getHandleUnderMouse(
      fieldPos,
      state.editablePoints,
      0.5,
    );

    // Start panning only if not on a handle
    if (!handleUnder && !state.draggingHandle) {
      panStartPos = { x: clientX, y: clientY };
      panStartState = { panX: state.panX, panY: state.panY };
      store.setIsPanning(true);
      canvas.style.cursor = "grabbing";
    }
  };

  // Handle pan move
  const handlePanMove = (clientX, clientY) => {
    const state = store.getState();
    if (state.isPanning && panStartPos && panStartState) {
      const dx = clientX - panStartPos.x;
      const dy = clientY - panStartPos.y;
      store.setPan(panStartState.panX + dx, panStartState.panY + dy);
      drawField();
    }
  };

  // Handle pan end
  const handlePanEnd = () => {
    const state = store.getState();
    if (state.isPanning) {
      store.setIsPanning(false);
      panStartPos = null;
      panStartState = null;
      canvas.style.cursor = "default";
    }
  };

  // Wrap existing  handlers with pan logic
  const originalMouseDownHandler = mouseDownHandler;
  const wrappedMouseDownHandler = (event) => {
    handlePanStart(event.clientX, event.clientY);
    originalMouseDownHandler(event);
  };

  const originalMouseMoveHandler = mouseMoveHandler;
  const wrappedMouseMoveHandler = (event) => {
    handlePanMove(event.clientX, event.clientY);
    originalMouseMoveHandler(event);
  };

  const originalMouseUpHandler = mouseUpHandler;
  const wrappedMouseUpHandler = (event) => {
    handlePanEnd();
    originalMouseUpHandler(event);
  };

  canvas.addEventListener("mousemove", hoverHandler);
  canvas.addEventListener("mousedown", wrappedMouseDownHandler);
  canvas.addEventListener("mousemove", wrappedMouseMoveHandler);
  canvas.addEventListener("mouseup", wrappedMouseUpHandler);
  canvas.addEventListener("mouseleave", wrappedMouseUpHandler);

  // Touch event support for mobile
  let isDragging = false;
  let touchStartPos = null;
  let initialPinchDistance = null;
  let initialPinchZoom = null;

  // Helper to calculate distance between two touches
  const getTouchDistance = (touch1, touch2) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  canvas.addEventListener(
    "touchstart",
    (e) => {
      // Handle pinch-to-zoom with two fingers
      if (e.touches.length === 2) {
        e.preventDefault();
        initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
        initialPinchZoom = store.getState().zoomLevel;
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      touchStartPos = { x: touch.clientX, y: touch.clientY };

      // Create synthetic mouse event
      const mouseEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: touch.clientX,
        clientY: touch.clientY,
      });

      // Check if touching a handle
      const state = store.getState();
      const origin = canvasDimensions.origin;
      const scale = canvasDimensions.scale;
      const canvasPos = getCanvasMousePosition(mouseEvent, canvas);
      const fieldPos = fromCanvasWithZoom(
        canvasPos,
        origin,
        scale,
        state.zoomLevel,
        state.panX,
        state.panY,
      );
      const handleUnder = getHandleUnderMouse(
        fieldPos,
        state.editablePoints,
        0.5,
      );

      if (handleUnder) {
        e.preventDefault(); // Prevent scrolling when touching handle
        isDragging = true;
      }

      wrappedMouseDownHandler(mouseEvent);
      hoverHandler(mouseEvent);
    },
    { passive: false },
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
      // Handle pinch-to-zoom with two fingers
      if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialPinchDistance;
        const newZoom = Math.max(0.5, Math.min(3.0, initialPinchZoom * scale));

        // Calculate center point between fingers
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = canvas.getBoundingClientRect();
        const canvasCenterX = centerX - rect.left;
        const canvasCenterY = centerY - rect.top;

        // Adjust pan to zoom towards center
        const state = store.getState();
        const zoomRatio = newZoom / state.zoomLevel;
        const newPanX =
          canvasCenterX - (canvasCenterX - state.panX) * zoomRatio;
        const newPanY =
          canvasCenterY - (canvasCenterY - state.panY) * zoomRatio;

        store.setZoom(newZoom);
        store.setPan(newPanX, newPanY);
        updateZoomDisplay();
        drawField();
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      // Check if moved significantly (> 5px)
      if (touchStartPos) {
        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          isDragging = true;
        }
      }

      // Only prevent default if actually dragging
      if (isDragging) {
        e.preventDefault();
      }

      const mouseEvent = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: touch.clientX,
        clientY: touch.clientY,
      });

      wrappedMouseMoveHandler(mouseEvent);
      hoverHandler(mouseEvent);
    },
    { passive: false },
  );

  canvas.addEventListener(
    "touchend",
    (e) => {
      // Reset pinch zoom state
      if (e.touches.length < 2) {
        initialPinchDistance = null;
        initialPinchZoom = null;
      }

      const touch = e.changedTouches[0];
      if (!touch) return;

      const wasJustTap = !isDragging;

      const mouseEvent = new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: touch.clientX,
        clientY: touch.clientY,
      });

      wrappedMouseUpHandler(mouseEvent);

      // Show tooltip on tap (not drag)
      if (wasJustTap) {
        hoverHandler(mouseEvent);
      }

      isDragging = false;
      touchStartPos = null;
    },
    { passive: false },
  );

  canvas.addEventListener(
    "touchcancel",
    (e) => {
      const touch = e.changedTouches[0];
      if (touch) {
        const mouseEvent = new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
        wrappedMouseUpHandler(mouseEvent);
      }
      isDragging = false;
      touchStartPos = null;
    },
    { passive: false },
  );

  // Modal elements
  const modal = document.getElementById("offsetModal");
  const offsetInput = document.getElementById("offsetInput");
  const offsetOk = document.getElementById("offsetOk");
  const offsetCancel = document.getElementById("offsetCancel");

  // Click/tap handler for editable handles
  const handleCanvasTap = (e) => {
    const state = store.getState();
    if (!state.editMode) return;

    const origin = canvasDimensions.origin;
    const scale = canvasDimensions.scale;
    const canvasPos = getCanvasMousePosition(e, canvas);
    const fieldPos = fromCanvasWithZoom(
      canvasPos,
      origin,
      scale,
      state.zoomLevel,
      state.panX,
      state.panY,
    );

    // Check if clicked on homePathStart handle
    const handleUnder = getHandleUnderMouse(
      fieldPos,
      state.editablePoints,
      0.5,
    );

    if (handleUnder === "homePathStart") {
      // Calculate geometry to get current positions
      const geometry = calculateGeometry(
        state.fieldProfile,
        state.editablePoints,
        scale,
      );

      // Get current offset distance along third base line
      const currentOffset = distanceBetween(
        geometry.originalHomePathFirstLine.start,
        geometry.homePathFirstLine.start,
      );

      // Show modal
      offsetInput.value = currentOffset.toFixed(2);
      modal.classList.add("active");
      offsetInput.focus();
      offsetInput.select();

      // Cleanup function to remove all listeners
      const cleanup = () => {
        modal.classList.remove("active");
        offsetOk.removeEventListener("click", handleOk);
        offsetCancel.removeEventListener("click", handleCancel);
        offsetInput.removeEventListener("keydown", handleKeyDown);
      };

      // Handle OK button
      const handleOk = () => {
        const newOffset = parseFloat(offsetInput.value);

        if (!isNaN(newOffset) && newOffset >= 0 && newOffset <= 20) {
          // Calculate direction along third base line (from start to end)
          const thirdBaseLine = geometry.thirdBaseLine;
          const dx = thirdBaseLine.end.x - thirdBaseLine.start.x;
          const dy = thirdBaseLine.end.y - thirdBaseLine.start.y;
          const lineLength = Math.sqrt(dx * dx + dy * dy);

          // Normalize direction
          const dirX = lineLength > 0 ? dx / lineLength : 0;
          const dirY = lineLength > 0 ? dy / lineLength : 0;

          // Calculate new position from third base center
          const newPoint = {
            x: thirdBaseLine.start.x + dirX * newOffset,
            y: thirdBaseLine.start.y + dirY * newOffset,
          };

          // Close modal FIRST (before updating canvas)
          cleanup();

          // Wait for browser repaint, then update canvas
          requestAnimationFrame(() => {
            store.updateEditablePoint("homePathStart", newPoint);
            drawField();
          });
        } else {
          customAlert("Virheellinen arvo. Syötä luku väliltä 0-20.", "Virhe");
        }
      };

      // Handle Cancel button
      const handleCancel = () => {
        cleanup();
      };

      // Handle Enter/Escape key
      const handleKeyDown = (event) => {
        if (event.key === "Enter") {
          handleOk();
        } else if (event.key === "Escape") {
          handleCancel();
        }
      };

      offsetOk.addEventListener("click", handleOk);
      offsetCancel.addEventListener("click", handleCancel);
      offsetInput.addEventListener("keydown", handleKeyDown);
    }
  };

  canvas.addEventListener("click", handleCanvasTap);

  // Add touch support for handle tapping on mobile
  let lastTouchEnd = 0;
  canvas.addEventListener("touchend", (e) => {
    const now = Date.now();
    // Prevent double-firing with click event
    if (now - lastTouchEnd < 300) return;
    lastTouchEnd = now;

    const touch = e.changedTouches[0];
    if (!touch) return;

    // Create synthetic mouse event
    const mouseEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: touch.clientX,
      clientY: touch.clientY,
    });

    handleCanvasTap(mouseEvent);
  });

  // Initial render - reset editable points to ensure clean state
  store.setState({
    editablePoints: {
      homePathStart: null,
      homePathMid: null,
      homePathEnd: null,
    },
  });
  resizeCanvas();
})();
