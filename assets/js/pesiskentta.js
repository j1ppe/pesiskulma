(() => {
  const canvas = document.getElementById("fullFieldCanvas");
  const fieldButtons = document.querySelectorAll("[data-fullfield]");
  const dimensionTargets = {
    first: document.querySelector("[data-dimension='first']"),
    second: document.querySelector("[data-dimension='second']"),
    third: document.querySelector("[data-dimension='third']"),
    back: document.querySelector("[data-dimension='back']"),
    diagonal: document.querySelector("[data-dimension='diagonal']"),
    width: document.querySelector("[data-dimension='width']"),
  };

  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");

  const fieldProfileMen = {
    id: "Miehet",
    homePlate: {
      radius: 0.3,
      centerToHomeLine: 1.3,
      lineHalfWidth: 7.0,
    },
    battingSector: {
      originOffsetY: -0.569,
      leftAngleDeg: -32.0,
      rightAngleDeg: 32.0,
    },
    diagonalLines: {
      lengthFromHomeLine: 32.0,
    },
    backBoundary: {
      distanceFromHomeLine: 96.0,
      width: 42.0,
    },
    frontArc: {
      innerRadius: 2.5,
      outerRadius: 2.7,
    },
    homeArcs: {
      innerRadius: 5.0,
      outerRadius: 7.0,
    },
    firstBaseCanvasOffset: {
      distanceFromHomeLine: 20.0,
    },
    secondBaseCanvasOffset: {
      distanceFromRightAngle: 6.5,
    },
    thirdBaseCanvasOffset: {
      distanceFromLeftAngle: 6.5,
    },
    baseRadius: 3.0,
    baseLineLength: 7.0,
  };

  const fieldProfileWomen = {
    id: "Naiset",
    homePlate: {
      radius: 0.3,
      centerToHomeLine: 1.3,
      lineHalfWidth: 7.0,
    },
    battingSector: {
      originOffsetY: -0.569,
      leftAngleDeg: -32.0,
      rightAngleDeg: 32.0,
    },
    diagonalLines: {
      lengthFromHomeLine: 27.162,
    },
    backBoundary: {
      distanceFromHomeLine: 82.0,
      width: 36.0,
    },
    frontArc: {
      innerRadius: 2.5,
      outerRadius: 2.7,
    },
    homeArcs: {
      innerRadius: 5.0,
      outerRadius: 7.0,
    },
    firstBaseCanvasOffset: {
      distanceFromHomeLine: 17.5,
    },
    secondBaseCanvasOffset: {
      distanceFromRightAngle: 4.839,
    },
    thirdBaseCanvasOffset: {
      distanceFromLeftAngle: 4.839,
    },
    baseRadius: 2.5,
    baseLineLength: 7.0,
  };

  let fieldProfile = fieldProfileWomen;
  let SCALE = 5;
  let ORIGIN = { x: 0, y: 0 };

  const formatMeters = (value) => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded)
      ? `${rounded} m`
      : `${rounded.toFixed(1)} m`;
  };

  const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const unitVector = (from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      return { x: 0, y: 0 };
    }
    return { x: dx / length, y: dy / length };
  };
  const trimmedSegment = (fromCenter, toCenter, fromTrim, toTrim) => {
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

  function resizeCanvas() {
    const fieldWidth = 60;
    const topMargin = 1.5;
    const bottomMargin = 8;
    const fieldHeight =
      fieldProfile.homePlate.centerToHomeLine +
      fieldProfile.backBoundary.distanceFromHomeLine +
      topMargin +
      bottomMargin;

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

    const chromeSpacing = 32;
    const availableHeight =
      viewportHeight -
      (selectorHeight + legendHeight + footerHeight + chromeSpacing);

    const horizontalGutter = 12;
    const maxCanvasWidth = Math.max(viewportWidth - horizontalGutter * 2, 220);

    const paddingX = Math.max(4, Math.min(10, viewportWidth * 0.008));
    const paddingY = Math.max(2, Math.min(8, viewportHeight * 0.008));

    const widthScale = (maxCanvasWidth - paddingX * 2) / fieldWidth;
    const heightScaleRaw = (availableHeight - paddingY * 2) / fieldHeight;
    const heightScale =
      Number.isFinite(heightScaleRaw) && heightScaleRaw > 0
        ? heightScaleRaw
        : widthScale;

    SCALE = Math.max(0.1, Math.min(widthScale, heightScale));

    const canvasWidth = fieldWidth * SCALE + paddingX * 2;
    const canvasHeight = fieldHeight * SCALE + paddingY * 2;

    canvas.width = Math.max(200, Math.min(canvasWidth, maxCanvasWidth));
    canvas.height =
      canvasHeight > 0 && Number.isFinite(canvasHeight)
        ? canvasHeight
        : fieldHeight * SCALE + paddingY * 2;

    ORIGIN = {
      x: canvas.width / 2,
      y: canvas.height - paddingY - bottomMargin * SCALE,
    };

    drawField();
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function toCanvas(point) {
    return {
      x: ORIGIN.x + point.x * SCALE,
      y: ORIGIN.y - point.y * SCALE,
    };
  }

  function direction(angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: Math.sin(rad),
      y: Math.cos(rad),
    };
  }

  function intersectionWithHomeLine(dir, sectorOriginY) {
    const yHome = fieldProfile.homePlate.centerToHomeLine;
    const t = (yHome - sectorOriginY) / dir.y;
    return {
      x: dir.x * t,
      y: yHome,
    };
  }

  function calculateGeometry() {
    const sectorOriginY = fieldProfile.battingSector.originOffsetY;
    const leftDir = direction(fieldProfile.battingSector.leftAngleDeg);
    const rightDir = direction(fieldProfile.battingSector.rightAngleDeg);
    const homeLeft = intersectionWithHomeLine(leftDir, sectorOriginY);
    const homeRight = intersectionWithHomeLine(rightDir, sectorOriginY);
    const homeLineSegment = {
      start: {
        x: -(fieldProfile.homePlate.lineHalfWidth || 6),
        y: fieldProfile.homePlate.centerToHomeLine,
      },
      end: {
        x: fieldProfile.homePlate.lineHalfWidth || 6,
        y: fieldProfile.homePlate.centerToHomeLine,
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

    const backY =
      fieldProfile.homePlate.centerToHomeLine +
      fieldProfile.backBoundary.distanceFromHomeLine;

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
    const lineHalfWidth = 1 / SCALE;
    const secondBaseLineY = secondBaseCenter.y - baseRadius + lineHalfWidth;
    const secondBaseLine = {
      start: { x: secondBaseCenter.x, y: secondBaseLineY },
      end: { x: secondBaseCenter.x + baseLineLength, y: secondBaseLineY },
    };
    const thirdBaseLineY = thirdBaseCenter.y - baseRadius + lineHalfWidth;
    const thirdBaseLine = {
      start: { x: thirdBaseCenter.x, y: thirdBaseLineY },
      end: { x: thirdBaseCenter.x - baseLineLength, y: thirdBaseLineY },
    };

    const firstInterval =
      fieldProfile.firstBaseCanvasOffset.distanceFromHomeLine;

    const firstToSecond = trimmedSegment(
      firstBaseCenter,
      secondBaseCenter,
      fieldProfile.baseRadius,
      fieldProfile.baseRadius,
    );

    const secondToThird = trimmedSegment(
      secondBaseCenter,
      thirdBaseCenter,
      fieldProfile.baseRadius,
      fieldProfile.baseRadius,
    );

    const measurements = {
      first: firstInterval,
      second: firstToSecond.length,
      third: secondToThird.length,
      back: fieldProfile.backBoundary.distanceFromHomeLine,
      diagonal: fieldProfile.diagonalLines.lengthFromHomeLine,
      width:
        typeof fieldProfile.backBoundary.width === "number"
          ? fieldProfile.backBoundary.width
          : Math.abs(diagonalRightEnd.x - diagonalLeftEnd.x),
    };

    const frontArcSpec = fieldProfile.frontArc || {};
    const rightCanvasAngle = Math.atan2(-rightDir.y, rightDir.x);
    const leftCanvasAngle = Math.atan2(-leftDir.y, leftDir.x);
    const frontArc = {
      innerRadius: frontArcSpec.innerRadius ?? 0,
      outerRadius: frontArcSpec.outerRadius ?? 0,
      startAngle: rightCanvasAngle,
      endAngle: leftCanvasAngle,
    };

    return {
      homeLeft,
      homeRight,
      diagonalLeftEnd,
      diagonalRightEnd,
      leftVerticalEnd,
      rightVerticalEnd,
      firstBaseCenter,
      secondBaseCenter,
      thirdBaseCenter,
      secondBaseLine,
      thirdBaseLine,
      measurements,
      basePathSegments: {
        firstToSecond,
        secondToThird,
      },
      homeLineSegment,
      frontArc,
    };
  }

  function drawField() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const geometry = calculateGeometry();
    const {
      homeLeft,
      homeRight,
      diagonalLeftEnd,
      diagonalRightEnd,
      leftVerticalEnd,
      rightVerticalEnd,
      firstBaseCenter,
      secondBaseCenter,
      thirdBaseCenter,
      secondBaseLine,
      thirdBaseLine,
      measurements,
      basePathSegments,
      homeLineSegment,
      frontArc,
    } = geometry;

    const plate = toCanvas({ x: 0, y: 0 });
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(
      plate.x,
      plate.y,
      fieldProfile.homePlate.radius * SCALE,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    drawLine(homeLeft, homeRight);
    if (homeLineSegment) {
      drawLine(homeLineSegment.start, homeLineSegment.end, "#ffffff", 3.2);
    }

    const homeLineCenter = toCanvas({
      x: 0,
      y: fieldProfile.homePlate.centerToHomeLine,
    });
    const homeArcs = fieldProfile.homeArcs;
    if (homeArcs) {
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        homeLineCenter.x,
        homeLineCenter.y,
        homeArcs.innerRadius * SCALE,
        0,
        Math.PI,
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        homeLineCenter.x,
        homeLineCenter.y,
        homeArcs.outerRadius * SCALE,
        0,
        Math.PI,
      );
      ctx.stroke();
      ctx.restore();
    }

    if (frontArc && frontArc.outerRadius > 0) {
      const arcRadius = (frontArc.outerRadius + frontArc.innerRadius) / 2;
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        plate.x,
        plate.y,
        arcRadius * SCALE,
        frontArc.startAngle,
        frontArc.endAngle,
        true,
      );
      ctx.stroke();
      ctx.restore();
    }
    drawLine(homeLeft, diagonalLeftEnd);
    drawLine(homeRight, diagonalRightEnd);

    drawLine(diagonalLeftEnd, leftVerticalEnd);
    drawLine(diagonalRightEnd, rightVerticalEnd);
    drawLine(leftVerticalEnd, rightVerticalEnd);

    const firstBaseCanvas = toCanvas(firstBaseCenter);
    const secondBaseCanvas = toCanvas(secondBaseCenter);
    const thirdBaseCanvas = toCanvas(thirdBaseCenter);

    const leftDir = direction(fieldProfile.battingSector.leftAngleDeg);
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
      fieldProfile.baseRadius * SCALE,
      leftLineAngle,
      angleToSecond,
    );
    ctx.lineTo(firstBaseCanvas.x, firstBaseCanvas.y);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      secondBaseCanvas.x,
      secondBaseCanvas.y,
      fieldProfile.baseRadius * SCALE,
      Math.PI / 2,
      Math.PI * 1.5,
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      thirdBaseCanvas.x,
      thirdBaseCanvas.y,
      fieldProfile.baseRadius * SCALE,
      -Math.PI / 2,
      Math.PI / 2,
    );
    ctx.fill();

    drawLine(secondBaseLine.start, secondBaseLine.end);
    drawLine(thirdBaseLine.start, thirdBaseLine.end);

    drawLine(secondBaseCenter, thirdBaseCenter);
    drawLine(firstBaseCenter, secondBaseCenter);

    const highlightSegment = (segment) => {
      if (!segment) {
        return;
      }
      const start = toCanvas(segment.start);
      const end = toCanvas(segment.end);
      ctx.save();
      ctx.strokeStyle = "#16e1ff";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    };

    highlightSegment(basePathSegments.firstToSecond);
    highlightSegment(basePathSegments.secondToThird);
    updateDimensions(measurements);
  }

  function drawLine(a, b) {
    const start = toCanvas(a);
    const end = toCanvas(b);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  function updateDimensions(values) {
    if (dimensionTargets.first) {
      dimensionTargets.first.textContent = formatMeters(values.first);
    }
    if (dimensionTargets.second) {
      dimensionTargets.second.textContent = formatMeters(values.second);
    }
    if (dimensionTargets.third) {
      dimensionTargets.third.textContent = formatMeters(values.third);
    }
    if (dimensionTargets.back) {
      dimensionTargets.back.textContent = formatMeters(values.back);
    }
    if (dimensionTargets.diagonal) {
      dimensionTargets.diagonal.textContent = formatMeters(values.diagonal);
    }
    if (dimensionTargets.width) {
      dimensionTargets.width.textContent = formatMeters(values.width);
    }
  }

  fieldButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      fieldButtons.forEach((btn) => btn.classList.remove("active"));
      event.currentTarget.classList.add("active");
      fieldProfile =
        event.currentTarget.dataset.fullfield === "men"
          ? fieldProfileMen
          : fieldProfileWomen;
      resizeCanvas();
    });
  });

  drawField();
})();
