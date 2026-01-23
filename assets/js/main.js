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
} from "./modules/interactions.js";
import {
  calculateCanvasDimensions,
  drawDimensionLine,
  drawEditHandles,
  drawLine,
  drawSnapIndicator,
  toCanvas,
} from "./modules/rendering.js";
import { fieldProfileMen, fieldProfileWomen, store } from "./modules/state.js";

(() => {
  // DOM elements
  const canvas = document.getElementById("fullFieldCanvas");
  const fieldButtons = document.querySelectorAll("[data-fullfield]");
  const measurementToggle = document.getElementById("measurementToggle");
  const editModeToggle = document.getElementById("editModeToggle");
  const tooltip = document.getElementById("measurementTooltip");
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
    console.log("drawField state:", state);
    console.log("fieldProfile:", state.fieldProfile);
    if (!state.fieldProfile) {
      console.error("fieldProfile is undefined!");
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
  };

  // Event listeners
  window.addEventListener("resize", resizeCanvas);

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

  // Measurement toggle
  if (measurementToggle) {
    measurementToggle.addEventListener("click", () => {
      store.toggleMeasurements();
      const state = store.getState();
      measurementToggle.textContent = state.showMeasurementsOnField
        ? "Piilota mitat kentältä"
        : "Näytä mitat kentällä";
      drawField();
    });
  }

  // Edit mode toggle
  if (editModeToggle) {
    editModeToggle.addEventListener("click", () => {
      store.toggleEditMode();
      const state = store.getState();

      // Automatically enable measurements when entering edit mode
      if (state.editMode && !state.showMeasurementsOnField) {
        store.toggleMeasurements();
      }

      editModeToggle.textContent = state.editMode
        ? "Sulje muokkaustila"
        : "Muokkaa mittauksia";

      editModeToggle.classList.toggle("active", state.editMode);
      drawField();
    });

    // Double-click to reset
    editModeToggle.addEventListener("dblclick", () => {
      if (confirm("Palautetaanko mittaukset alkuperäisiin arvoihin?")) {
        store.resetEditablePoints();
        drawField();
      }
    });
  }

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

  canvas.addEventListener("mousemove", hoverHandler);
  canvas.addEventListener("mousedown", mouseDownHandler);
  canvas.addEventListener("mousemove", mouseMoveHandler);
  canvas.addEventListener("mouseup", mouseUpHandler);
  canvas.addEventListener("mouseleave", mouseUpHandler);

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
