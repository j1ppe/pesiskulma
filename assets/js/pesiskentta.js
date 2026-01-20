(() => {
  const canvas = document.getElementById("fullFieldCanvas");
  const fieldButtons = document.querySelectorAll("[data-fullfield]");
  const measurementToggle = document.getElementById("measurementToggle");
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
  let showMeasurementsOnField = false;
  const tooltip = document.getElementById("measurementTooltip");
  let measurementHitAreas = [];

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
    homePathFirstLine: 15.5,
    homePathEndOffset: 6.0,
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
      distanceFromRightAngle: 7.339,
    },
    thirdBaseCanvasOffset: {
      distanceFromLeftAngle: 7.339,
    },
    baseRadius: 2.5,
    baseLineLength: 7.0,
    homePathFirstLine: 16.0,
    homePathEndOffset: 6.0,
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
    const homePathFirstLine = {
      start: { x: diagonalLeftEnd.x, y: thirdBaseLineY },
      end: {
        x: diagonalLeftEnd.x,
        y: thirdBaseLineY - (fieldProfile.homePathFirstLine || 16),
      },
    };
    const homePathSecondLine = {
      start: homePathFirstLine.end,
      end: {
        x: -(fieldProfile.homePathEndOffset || 6),
        y: fieldProfile.homePlate.centerToHomeLine,
      },
    };

    // Extended line continuing first-to-second base line to home path diagonal (homePathSecondLine)
    const firstToSecondDir = unitVector(firstBaseCenter, secondBaseCenter);
    // homePathSecondLine goes from homePathFirstLine.end to (-6, centerToHomeLine)
    // We need to find intersection of first-to-second line with homePathSecondLine
    const homePathDir = unitVector(
      homePathSecondLine.start,
      homePathSecondLine.end,
    );
    // Line intersection: firstBaseCenter + t1 * firstToSecondDir = homePathSecondLine.start + t2 * homePathDir
    // Solve for t1:
    const dx = homePathSecondLine.start.x - firstBaseCenter.x;
    const dy = homePathSecondLine.start.y - firstBaseCenter.y;
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
      diagonal:
        distanceBetween(homePathFirstLine.start, homePathFirstLine.end) +
        distanceBetween(homePathSecondLine.start, homePathSecondLine.end),
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
      homePathFirstLine,
      homePathSecondLine,
      firstToSecondExtension,
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
    measurementHitAreas = []; // Reset hit areas
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
      homePathFirstLine,
      homePathSecondLine,
      firstToSecondExtension,
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
    drawLine(homePathFirstLine.start, homePathFirstLine.end);
    drawLine(homePathSecondLine.start, homePathSecondLine.end);
    drawLine(firstToSecondExtension.start, firstToSecondExtension.end);

    drawLine(secondBaseCenter, thirdBaseCenter);
    drawLine(firstBaseCenter, secondBaseCenter);

    if (showMeasurementsOnField) {
      // Pesävälit - piirretään suoraan viivan päälle
      drawDimensionLine(
        homeLeft,
        firstBaseCenter,
        measurements.first,
        "Ykkösväli",
        0,
        "on-line",
        15,
        {
          value: formatMeters(measurements.first),
          description: "Etäisyys kotipesäviivasta ensimmäiseen pesään",
        },
      );
      drawDimensionLine(
        basePathSegments.firstToSecond.start,
        basePathSegments.firstToSecond.end,
        measurements.second,
        "Kakkosväli",
        0,
        "on-line",
        0,
        {
          value: formatMeters(measurements.second),
          description: "Etäisyys ensimmäisestä pesästä toiseen pesään",
        },
      );
      drawDimensionLine(
        basePathSegments.secondToThird.start,
        basePathSegments.secondToThird.end,
        measurements.third,
        "Kolmosväli",
        0,
        "on-line",
        0,
        {
          value: formatMeters(measurements.third),
          description: "Etäisyys toisesta pesästä kolmanteen pesään",
        },
      );

      // Kentän pituus (kotipesäviivasta takarajaan)
      const homeLineY = fieldProfile.homePlate.centerToHomeLine;
      const backLineY =
        homeLineY + fieldProfile.backBoundary.distanceFromHomeLine;
      drawDimensionLine(
        { x: fieldProfile.backBoundary.width / 2 + 3, y: homeLineY },
        { x: fieldProfile.backBoundary.width / 2 + 3, y: backLineY },
        measurements.back,
        "Kentän pituus",
        0,
        "vertical",
        0,
        {
          value: formatMeters(measurements.back),
          description: "Kentän pituus kotipesäviivasta takarajaan",
        },
      );

      // Kentän leveys takarajalla
      const halfWidth = fieldProfile.backBoundary.width / 2;
      drawDimensionLine(
        { x: -halfWidth, y: backLineY - 3 },
        { x: halfWidth, y: backLineY - 3 },
        measurements.width,
        "Kentän leveys",
        0,
        "horizontal",
        0,
        {
          value: formatMeters(measurements.width),
          description: "Kentän leveys takarajalla",
        },
      );

      // Etukaari - syöttölautasen etuosasta etukaaren ulkokehälle
      const plateRadius = fieldProfile.homePlate.radius;
      const frontArcRadius = fieldProfile.frontArc.outerRadius;
      const frontArcDistance = frontArcRadius - plateRadius;
      const frontArcPoints = {
        start: { x: 0, y: plateRadius },
        end: { x: 0, y: frontArcRadius },
      };
      drawDimensionLine(
        frontArcPoints.start,
        frontArcPoints.end,
        frontArcDistance,
        "Etukaari",
        0,
        "vertical",
        0,
        {
          value: formatMeters(frontArcDistance),
          description:
            "Etäisyys syöttölautasen etureunasta etukaaren ulkolaitaan",
        },
      );

      // Kotipolku - piirretään molemmat osuudet erikseen
      const homePathFirstLength = distanceBetween(
        homePathFirstLine.start,
        homePathFirstLine.end,
      );
      const homePathSecondLength = distanceBetween(
        homePathSecondLine.start,
        homePathSecondLine.end,
      );
      const homePathTotal = homePathFirstLength + homePathSecondLength;

      drawDimensionLine(
        homePathFirstLine.start,
        homePathFirstLine.end,
        homePathFirstLength,
        "Kotipolku",
        0,
        "on-line",
        -15,
        {
          value: formatMeters(homePathTotal),
          description: `Lipulle ${formatMeters(homePathFirstLength)}<br>Kotipesään ${formatMeters(homePathSecondLength)}`,
        },
      );

      drawDimensionLine(
        homePathSecondLine.start,
        homePathSecondLine.end,
        homePathSecondLength,
        "Kotipolku",
        0,
        "on-line",
        -15,
        {
          value: formatMeters(homePathTotal),
          description: `Lipulle ${formatMeters(homePathFirstLength)}<br>Kotipesään ${formatMeters(homePathSecondLength)}`,
        },
      );
    }

    updateDimensions(measurements);
  }

  function drawDimensionLine(
    pointA,
    pointB,
    distance,
    label,
    offset,
    side,
    labelOffsetPx = 0,
    tooltipData = null,
  ) {
    // Laske suuntavektori ja kohtisuora vektori
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return;

    const unitX = dx / length;
    const unitY = dy / length;

    // Kohtisuora vektori (90 astetta vastapäivään)
    let perpX = -unitY;
    let perpY = unitX;

    // Offset-suunta
    if (side === "left") {
      // pidetään sellaisenaan
    } else if (side === "right") {
      perpX = -perpX;
      perpY = -perpY;
    } else if (side === "vertical" || side === "horizontal") {
      perpX = 0;
      perpY = 0;
    }

    // Offset-pisteet
    const offsetA = {
      x: pointA.x + perpX * offset,
      y: pointA.y + perpY * offset,
    };
    const offsetB = {
      x: pointB.x + perpX * offset,
      y: pointB.y + perpY * offset,
    };

    const canvasA = toCanvas(offsetA);
    const canvasB = toCanvas(offsetB);
    const midX = (canvasA.x + canvasB.x) / 2;
    const midY = (canvasA.y + canvasB.y) / 2;

    // Laske canvas-koordinaattien suuntavektori mittaviivoille
    const canvasDx = canvasB.x - canvasA.x;
    const canvasDy = canvasB.y - canvasA.y;
    const canvasLength = Math.sqrt(canvasDx * canvasDx + canvasDy * canvasDy);
    const canvasUnitX = canvasLength > 0 ? canvasDx / canvasLength : 0;
    const canvasUnitY = canvasLength > 0 ? canvasDy / canvasLength : 0;

    ctx.save();

    // Piirretään mittaviiva
    ctx.strokeStyle = "#16e1ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(canvasA.x, canvasA.y);
    ctx.lineTo(canvasB.x, canvasB.y);
    ctx.stroke();

    // Päätemerkit - kohtisuorassa mittaviivaan nähden
    const tickSize = 5;
    // Kohtisuora vektori canvas-mittaviivaan
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

    // Tekstilabel - vain mitta ilman nimeä
    const text = formatMeters(distance);
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const metrics = ctx.measureText(text);
    const padding = 4;
    const boxWidth = metrics.width + padding * 2;
    const boxHeight = 18;

    // Siirrä label sivulle pystysuorilla viivoilla tai käyttämällä labelOffsetPx
    const autoOffsetX = side === "vertical" ? 25 : 0;
    const labelX = midX + autoOffsetX + labelOffsetPx;
    const labelY = midY;

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(
      labelX - boxWidth / 2,
      labelY - boxHeight / 2,
      boxWidth,
      boxHeight,
    );

    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, labelX, labelY);

    // Store hit area if tooltip data is provided
    if (tooltipData) {
      measurementHitAreas.push({
        startX: canvasA.x,
        startY: canvasA.y,
        endX: canvasB.x,
        endY: canvasB.y,
        labelX: labelX,
        labelY: labelY,
        labelWidth: boxWidth,
        labelHeight: boxHeight,
        title: label,
        tooltipData: tooltipData,
      });
    }

    ctx.restore();
  }

  function drawMeasurementLabel(pointA, pointB, distance) {
    const midX = (pointA.x + pointB.x) / 2;
    const midY = (pointA.y + pointB.y) / 2;
    const mid = toCanvas({ x: midX, y: midY });

    const text = formatMeters(distance);
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const metrics = ctx.measureText(text);
    const padding = 6;
    const boxWidth = metrics.width + padding * 2;
    const boxHeight = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(
      mid.x - boxWidth / 2,
      mid.y - boxHeight / 2,
      boxWidth,
      boxHeight,
    );

    ctx.fillStyle = "#16e1ff";
    ctx.fillText(text, mid.x, mid.y);
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

  if (measurementToggle) {
    measurementToggle.addEventListener("click", () => {
      showMeasurementsOnField = !showMeasurementsOnField;
      measurementToggle.textContent = showMeasurementsOnField
        ? "Piilota mitat kentältä"
        : "Näytä mitat kentällä";
      drawField();
    });
  }

  // Canvas mouse interaction for tooltips
  function getCanvasMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function isPointInRect(px, py, x, y, width, height) {
    return (
      px >= x - width / 2 &&
      px <= x + width / 2 &&
      py >= y - height / 2 &&
      py <= y + height / 2
    );
  }

  function handleCanvasHover(event) {
    if (!showMeasurementsOnField || measurementHitAreas.length === 0) {
      tooltip.style.display = "none";
      return;
    }

    const pos = getCanvasMousePosition(event);
    const hitThreshold = 10; // pixels

    let hoveredArea = null;

    for (const area of measurementHitAreas) {
      // Check if hovering over the line
      const distToLine = pointToLineDistance(
        pos.x,
        pos.y,
        area.startX,
        area.startY,
        area.endX,
        area.endY,
      );

      // Check if hovering over the label box
      const overLabel = isPointInRect(
        pos.x,
        pos.y,
        area.labelX,
        area.labelY,
        area.labelWidth,
        area.labelHeight,
      );

      if (distToLine < hitThreshold || overLabel) {
        hoveredArea = area;
        break;
      }
    }

    if (hoveredArea) {
      tooltip.innerHTML = `
        <div class="tooltip-title">${hoveredArea.title}</div>
        <div class="tooltip-value">${hoveredArea.tooltipData.value}</div>
        <div class="tooltip-description">${hoveredArea.tooltipData.description}</div>
      `;
      tooltip.style.display = "block";
      tooltip.style.left = event.clientX + 15 + "px";
      tooltip.style.top = event.clientY + 15 + "px";
      canvas.style.cursor = "pointer";
    } else {
      tooltip.style.display = "none";
      canvas.style.cursor = "default";
    }
  }

  canvas.addEventListener("mousemove", handleCanvasHover);
  canvas.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
    canvas.style.cursor = "default";
  });

  drawField();
})();
