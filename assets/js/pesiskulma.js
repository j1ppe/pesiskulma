(() => {
  const canvas = document.getElementById("fieldCanvas");
  const netDistanceInput = document.getElementById("netDistance");
  const fieldOptions = document.querySelectorAll(".field-option");

  if (!canvas || !netDistanceInput) {
    return;
  }

  const ctx = canvas.getContext("2d");

  const fieldProfileMen = {
    id: "Miehet",
    homePlate: {
      radius: 0.3,
      centerToHomeLine: 1.3,
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
  };

  const fieldProfileWomen = {
    id: "Naiset",
    homePlate: {
      radius: 0.3,
      centerToHomeLine: 1.3,
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
  };

  let fieldProfile = fieldProfileWomen;
  let ballPosition = null;
  let SCALE = 5;
  let ORIGIN = { x: 0, y: 0 };

  function resizeCanvas() {
    const fieldWidth = 60;
    const topMargin = 1.5; // meters of breathing room above back boundary
    const fieldHeight =
      fieldProfile.homePlate.centerToHomeLine +
      fieldProfile.backBoundary.distanceFromHomeLine +
      topMargin;

    const viewportWidth = Math.max(
      window.innerWidth || document.documentElement.clientWidth || 0,
      320,
    );
    const viewportHeight = Math.max(
      window.innerHeight || document.documentElement.clientHeight || 0,
      480,
    );

    const selectorHeight =
      document.querySelector(".field-selector-container")?.offsetHeight || 0;
    const netInputHeight =
      document.querySelector(".net-distance-container")?.offsetHeight || 0;
    const footerHeight = document.querySelector("footer")?.offsetHeight || 0;

    const chromeSpacing = 22;
    const availableHeight =
      viewportHeight -
      (selectorHeight + netInputHeight + footerHeight + chromeSpacing);

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
      y: canvas.height - paddingY,
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

  function formatDistance(distanceM) {
    const distanceCm = Math.round(distanceM * 100);
    return distanceCm > 99 ? distanceM.toFixed(2) + " m" : distanceCm + " cm";
  }

  function drawField() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sectorOriginY = fieldProfile.battingSector.originOffsetY;
    const leftDir = direction(fieldProfile.battingSector.leftAngleDeg);
    const rightDir = direction(fieldProfile.battingSector.rightAngleDeg);
    const homeLeft = intersectionWithHomeLine(leftDir, sectorOriginY);
    const homeRight = intersectionWithHomeLine(rightDir, sectorOriginY);
    const diagonalY =
      homeLeft.y + fieldProfile.diagonalLines.lengthFromHomeLine;

    const diagonalLeftEnd = {
      x:
        homeLeft.x +
        (fieldProfile.diagonalLines.lengthFromHomeLine * leftDir.x) / leftDir.y,
      y: diagonalY,
    };

    const diagonalRightEnd = {
      x:
        homeRight.x +
        (fieldProfile.diagonalLines.lengthFromHomeLine * rightDir.x) /
          rightDir.y,
      y: diagonalY,
    };

    const backY =
      fieldProfile.homePlate.centerToHomeLine +
      fieldProfile.backBoundary.distanceFromHomeLine;

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
    drawLine(homeLeft, diagonalLeftEnd);
    drawLine(homeRight, diagonalRightEnd);

    const leftVerticalEnd = { x: diagonalLeftEnd.x, y: backY };
    const rightVerticalEnd = { x: diagonalRightEnd.x, y: backY };

    drawLine(diagonalLeftEnd, leftVerticalEnd);
    drawLine(diagonalRightEnd, rightVerticalEnd);
    drawLine(leftVerticalEnd, rightVerticalEnd);

    const firstBaseCenter = {
      x:
        homeLeft.x +
        leftDir.x * fieldProfile.firstBaseCanvasOffset.distanceFromHomeLine,
      y:
        homeLeft.y +
        leftDir.y * fieldProfile.firstBaseCanvasOffset.distanceFromHomeLine,
    };
    const firstBaseCanvas = toCanvas(firstBaseCenter);

    const secondBaseCenter = {
      x: diagonalRightEnd.x,
      y:
        diagonalRightEnd.y +
        fieldProfile.secondBaseCanvasOffset.distanceFromRightAngle,
    };
    const secondBaseCanvas = toCanvas(secondBaseCenter);

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

    const thirdBaseCenter = {
      x: diagonalLeftEnd.x,
      y:
        diagonalLeftEnd.y +
        fieldProfile.thirdBaseCanvasOffset.distanceFromLeftAngle,
    };
    const thirdBaseCanvas = toCanvas(thirdBaseCenter);

    ctx.beginPath();
    ctx.arc(
      thirdBaseCanvas.x,
      thirdBaseCanvas.y,
      fieldProfile.baseRadius * SCALE,
      -Math.PI / 2,
      Math.PI / 2,
    );
    ctx.fill();

    drawLine(secondBaseCenter, thirdBaseCenter);
    drawLine(firstBaseCenter, secondBaseCenter);

    const netDistanceCm = parseFloat(netDistanceInput.value);
    if (!Number.isNaN(netDistanceCm) && netDistanceCm > 0) {
      const netDistanceM = netDistanceCm / 100;
      const netY = 0.3 + netDistanceM;
      let netLeftX;
      let netRightX;

      if (netY <= homeLeft.y) {
        const tLeft = (netY - sectorOriginY) / leftDir.y;
        const tRight = (netY - sectorOriginY) / rightDir.y;
        netLeftX = leftDir.x * tLeft;
        netRightX = rightDir.x * tRight;
      } else if (netY <= diagonalLeftEnd.y) {
        const tLeft = (netY - homeLeft.y) / leftDir.y;
        const tRight = (netY - homeRight.y) / rightDir.y;
        netLeftX = homeLeft.x + leftDir.x * tLeft;
        netRightX = homeRight.x + rightDir.x * tRight;
      } else {
        netLeftX = diagonalLeftEnd.x;
        netRightX = diagonalRightEnd.x;
      }

      const netExtension = 6;
      const netLeft = { x: netLeftX - netExtension, y: netY };
      const netRight = { x: netRightX + netExtension, y: netY };
      const netLeftCanvas = toCanvas(netLeft);
      const netRightCanvas = toCanvas(netRight);

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

    if (ballPosition) {
      const homePlateCenter = toCanvas({ x: 0, y: 0 });
      const ballCenter = toCanvas({ x: ballPosition.x, y: ballPosition.y });

      ctx.save();
      ctx.strokeStyle = "#16e1ff";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.moveTo(homePlateCenter.x, homePlateCenter.y);
      ctx.lineTo(ballCenter.x, ballCenter.y);
      ctx.stroke();

      const verticalPoint = toCanvas({ x: 0, y: ballPosition.y });
      ctx.beginPath();
      ctx.moveTo(homePlateCenter.x, homePlateCenter.y);
      ctx.lineTo(verticalPoint.x, verticalPoint.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(verticalPoint.x, verticalPoint.y);
      ctx.lineTo(ballCenter.x, ballCenter.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.restore();

      const netDistanceCmActive = parseFloat(netDistanceInput.value);
      if (!Number.isNaN(netDistanceCmActive) && netDistanceCmActive > 0) {
        const netDistanceM = netDistanceCmActive / 100;
        const netY = 0.3 + netDistanceM;

        if (netY <= ballPosition.y && netY > 0) {
          const directLineX = (netY / ballPosition.y) * ballPosition.x;
          const verticalLineX = 0;
          const distanceM = Math.abs(directLineX - verticalLineX);
          const midX = (directLineX + verticalLineX) / 2;
          const labelPos = toCanvas({ x: midX, y: netY });

          ctx.fillStyle = "#16e1ff";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(formatDistance(distanceM), labelPos.x, labelPos.y - 5);
        }
      }

      const ballSideDistanceM = Math.abs(ballPosition.x);
      const ballLabelPos = toCanvas({
        x: ballPosition.x / 2,
        y: ballPosition.y,
      });

      const plateDistanceM = Math.sqrt(
        ballPosition.x * ballPosition.x + ballPosition.y * ballPosition.y,
      );
      const plateLabelPos = toCanvas({
        x: ballPosition.x / 2,
        y: ballPosition.y / 2,
      });

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
        fieldProfile.homePlate.centerToHomeLine +
        fieldProfile.backBoundary.distanceFromHomeLine;
      const isNearBackBoundary = ballPosition.y >= backBoundaryY * 0.8;

      ctx.textBaseline = isNearBackBoundary ? "top" : "bottom";
      ctx.fillText(
        formatDistance(ballSideDistanceM),
        ballLabelPos.x,
        isNearBackBoundary ? ballLabelPos.y + 5 : ballLabelPos.y - 5,
      );

      drawBall(ballPosition.x, ballPosition.y);
    }
  }

  function drawBall(x, y) {
    const pos = toCanvas({ x, y });
    const radius = 0.6 * SCALE;

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
  }

  function drawLine(a, b) {
    const start = toCanvas(a);
    const end = toCanvas(b);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  netDistanceInput.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/[^0-9.]/g, "");
    drawField();
  });

  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("touchend", handleCanvasClick);

  function handleCanvasClick(event) {
    event.preventDefault();

    if (
      document.activeElement &&
      typeof document.activeElement.blur === "function"
    ) {
      document.activeElement.blur();
    }

    const rect = canvas.getBoundingClientRect();
    let clientX;
    let clientY;

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
    const fieldX = (canvasX - ORIGIN.x) / SCALE;
    const fieldY = -(canvasY - ORIGIN.y) / SCALE;

    ballPosition = { x: fieldX, y: fieldY };
    drawField();
  }

  fieldOptions.forEach((button) => {
    button.addEventListener("click", (event) => {
      fieldOptions.forEach((btn) => btn.classList.remove("active"));
      event.currentTarget.classList.add("active");
      fieldProfile =
        event.currentTarget.dataset.field === "men"
          ? fieldProfileMen
          : fieldProfileWomen;
      resizeCanvas();
    });
  });

  drawField();
})();
