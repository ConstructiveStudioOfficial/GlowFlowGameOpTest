"use strict";
// Uses Matter.js (https://brm.io/matter-js/)
if (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
) {
  if (window.innerWidth > 768) {
    window.location.href = window.location.href;
  }
  if (
    window.navigator.standalone === false ||
    window.matchMedia("(display-mode: browser)").matches
  ) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
  }
}
const Engine = Matter.Engine,
  Render = Matter.Render,
  Runner = Matter.Runner,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  Events = Matter.Events,
  Composite = Matter.Composite,
  engine = Matter.Engine.create();
const pauseButton = document.getElementById("pause-button"),
  gameWrapper = document.getElementById("game-wrapper"),
  gameContainer = document.getElementById("game-container"),
  gameOverDisplay = document.getElementById("game-over"),
  restartButton = document.getElementById("restart-button"),
  pauseOverlay = document.createElement("div"),
  gameWidth = gameWrapper.clientWidth,
  gameHeight = gameWrapper.clientHeight;
const render = Matter.Render.create({
  element: gameContainer,
  engine: engine,
  options: {
    width: gameWidth,
    height: gameHeight,
    background: "transparent",
    antialias: false,
    wireframes: false,
    showSleeping: true,
    enabled: false,
  },
});
engine.gravity.y = 0.7;
const leftWall = Bodies.rectangle(-150, gameHeight / 2, 300, gameHeight, {
    isStatic: true,
    render: { visible: false },
  }),
  rightWall = Bodies.rectangle(
    gameWidth + 150,
    gameHeight / 2,
    300,
    gameHeight,
    {
      isStatic: true,
      render: { visible: false },
    }
  ),
  gameOverLine = Bodies.rectangle(
    gameWidth / 2,
    gameHeight * 0.2,
    gameWidth,
    2,
    {
      isStatic: true,
      isSensor: true,
      render: { visible: false },
    }
  ),
  ground = Bodies.rectangle(gameWidth / 2, gameHeight + 150, gameWidth, 300, {
    isStatic: true,
    render: { visible: false },
  });
const allColors = [
    "magenta",
    "lime",
    "cyan",
    "orange",
    "red",
    "green",
    "blue",
    "yellow",
    "purple",
    "white",
  ],
  shapes = [
    "circle",
    "square",
    "rectangle",
    "triangle",
    "pentagon",
    "hexagon",
    "trapezoid",
    "rhombus",
    "oval",
  ],
  colorUnlockThresholds = [20, 40, 80, 160, 320, 640],
  pieces = [];
World.add(engine.world, [ground, leftWall, rightWall, gameOverLine]);
let isProcessingCollision = false,
  isCheckingLines = false,
  hasNewRecordInThisGame = false,
  isPaused = false,
  gameActive = true,
  canSpawnNewPiece = true,
  pieceIntervalId = null,
  checkLinesIntervalId = null,
  autoSaveIntervalId = null,
  currentPiece = null,
  runner = null,
  touchStartX = 0,
  touchStartY = 0,
  fallenPiecesCount = 0,
  displayedScore = 0,
  shapesCollected = 0,
  score = 0,
  scoreAnimationFrame,
  pieceInterval,
  autoSaveInterval,
  checkLinesInterval,
  colors = [],
  unlockedColors = 4,
  gameStartTime = Date.now(),
  bestScore = parseInt(localStorage.getItem("bestScore")) || 0;
pauseOverlay.id = "pause-overlay";
pauseOverlay.textContent = "PAUSED";
gameContainer.appendChild(pauseOverlay);
function pieceStyle(color) {
  return {
    fillStyle: color,
    sleepThreshold: 10,
  };
}
function createPiece() {
  if (!gameActive || !canSpawnNewPiece || isCheckingLines) return;
  canSpawnNewPiece = false;
  const x = gameWidth / 2;
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  let piece;
  const baseArea = 1500;
  if (shape === "circle") {
    const radius = Math.sqrt(baseArea / Math.PI);
    piece = Bodies.circle(x, 50, radius, {
      render: pieceStyle(color),
    });
  } else if (shape === "square") {
    const side = Math.sqrt(baseArea);
    piece = Bodies.rectangle(x, 50, side, side, {
      render: pieceStyle(color),
    });
  } else if (shape === "rectangle") {
    const width = Math.sqrt(baseArea) * 2;
    const height = baseArea / width;
    piece = Bodies.rectangle(x, 50, width, height, {
      render: pieceStyle(color),
    });
  } else if (shape === "triangle") {
    const side = Math.sqrt((4 * baseArea * 0.8) / Math.sqrt(3));
    piece = Bodies.polygon(x, 50, 3, side / (2 * Math.sin(Math.PI / 3)), {
      render: pieceStyle(color),
    });
  } else if (shape === "pentagon") {
    const side = Math.sqrt((4 * baseArea * Math.tan(Math.PI / 5)) / 5);
    piece = Bodies.polygon(x, 50, 5, side / (2 * Math.sin(Math.PI / 5)), {
      render: pieceStyle(color),
    });
  } else if (shape === "hexagon") {
    const side = Math.sqrt((2 * baseArea) / (3 * Math.sqrt(3)));
    piece = Bodies.polygon(x, 50, 6, side, {
      render: pieceStyle(color),
    });
  } else if (shape === "trapezoid") {
    const width = Math.sqrt(baseArea * 1.5);
    const height = (baseArea / width) * 1.2;
    const vertices = [
      { x: -width / 2, y: -height / 2 },
      { x: width / 2, y: -height / 2 },
      { x: width / 3, y: height / 2 },
      { x: -width / 3, y: height / 2 },
    ];
    piece = Bodies.fromVertices(x, 50, [vertices], {
      render: pieceStyle(color),
    });
  } else if (shape === "rhombus") {
    const width = Math.sqrt(baseArea * 3.5);
    const height = (baseArea / width) * 2;
    const vertices = [
      { x: 0, y: -height / 2 },
      { x: width / 2, y: 0 },
      { x: 0, y: height / 2 },
      { x: -width / 2, y: 0 },
    ];
    piece = Bodies.fromVertices(x, 50, [vertices], {
      render: pieceStyle(color),
    });
  } else if (shape === "oval") {
    const width = Math.sqrt(baseArea * 3);
    const height = (baseArea / width) * 1.2;
    const vertices = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      vertices.push({
        x: (width / 2) * Math.cos(angle),
        y: (height / 2) * Math.sin(angle),
      });
    }
    piece = Bodies.fromVertices(x, 50, [vertices], {
      render: pieceStyle(color),
    });
  }
  piece.color = color;
  piece.shapeType = shape;
  World.add(engine.world, piece);
  pieces.push(piece);
  currentPiece = piece;
}
function checkLines() {
  if (!gameActive || isCheckingLines) return;
  isCheckingLines = true;
  const colorGroups = {};
  const piecesToCheck = pieces.filter((piece) => piece !== currentPiece);
  piecesToCheck.forEach((piece) => {
    if (!colorGroups[piece.color]) {
      colorGroups[piece.color] = [];
    }
    colorGroups[piece.color].push(piece);
  });
  for (const color in colorGroups) {
    const piecesOfColor = colorGroups[color];
    const clusters = [];
    const processedPieces = new Set();
    for (let i = 0; i < piecesOfColor.length; i++) {
      const piece = piecesOfColor[i];
      if (processedPieces.has(piece)) continue;
      const cluster = [];
      const queue = [piece];
      processedPieces.add(piece);
      while (queue.length > 0) {
        const currentPiece = queue.shift();
        cluster.push(currentPiece);
        for (let j = 0; j < piecesOfColor.length; j++) {
          const neighborPiece = piecesOfColor[j];
          if (
            !processedPieces.has(neighborPiece) &&
            arePiecesConnected(currentPiece, neighborPiece)
          ) {
            processedPieces.add(neighborPiece);
            queue.push(neighborPiece);
          }
        }
      }
      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      if (cluster.length >= 5) {
        let playerPieceInCluster = false;
        if (currentPiece) {
          playerPieceInCluster = cluster.includes(currentPiece);
        }
        if (!playerPieceInCluster) {
          const centerX =
            cluster.reduce((sum, piece) => sum + piece.position.x, 0) /
            cluster.length;
          const centerY =
            cluster.reduce((sum, piece) => sum + piece.position.y, 0) /
            cluster.length;
          cluster.forEach((piece) => {
            World.remove(engine.world, piece);
            const index = pieces.indexOf(piece);
            if (index > -1) pieces.splice(index, 1);
          });
          const clusterScore = Math.floor(400 + Math.random() * 200);
          addScore(clusterScore, color, centerX, centerY);
          createExplosion(centerX, centerY, color);
        }
      }
    }
  }
  isCheckingLines = false;
  checkGameOver();
}
function arePiecesConnected(pieceA, pieceB) {
  const boundsA = pieceA.bounds;
  const boundsB = pieceB.bounds;
  const dx = pieceA.position.x - pieceB.position.x;
  const dy = pieceA.position.y - pieceB.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const sizeA = Math.max(
    boundsA.max.x - boundsA.min.x,
    boundsA.max.y - boundsA.min.y
  );
  const sizeB = Math.max(
    boundsB.max.x - boundsB.min.x,
    boundsB.max.y - boundsB.min.y
  );
  const connectionThreshold = 5;
  return distance < (sizeA + sizeB) / 2 + connectionThreshold;
}
function checkColorUnlocks() {
  for (let i = 0; i < colorUnlockThresholds.length; i++) {
    if (
      fallenPiecesCount >= colorUnlockThresholds[i] &&
      unlockedColors < i + 5
    ) {
      if (unlockedColors !== i + 5) {
        unlockedColors = i + 5;
        colors = allColors.slice(0, unlockedColors);
        const progressElement = document.getElementById("colors-progress");
        if (progressElement) {
          progressElement.textContent = `COLORS: ${unlockedColors}`;
        }
        const centerX = gameWidth / 2;
        const centerY = gameHeight * 0.3;
        const unlockedColor = allColors[unlockedColors - 1];
        createScorePopup(
          centerX,
          centerY,
          `New color unlocked!`,
          unlockedColor
        );
        createExplosion(centerX, centerY, unlockedColor);
      }
      break;
    }
  }
}
function checkGameOver() {
  if (!gameActive) return;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (piece === currentPiece) continue;
    if (piece.position.y < gameHeight * 0.3) {
      gameActive = false;
      gameOverDisplay.style.display = "block";
      restartButton.style.display = "block";
      clearInterval(pieceInterval);
      clearInterval(checkLinesInterval);
      clearInterval(autoSaveInterval);
      break;
    }
  }
}
function animateScore() {
  if (Math.abs(displayedScore - score) < 1) {
    displayedScore = score;
    cancelAnimationFrame(scoreAnimationFrame);
  } else {
    displayedScore += (score - displayedScore) * 0.1;
    scoreAnimationFrame = requestAnimationFrame(animateScore);
  }
  document.getElementById("score").textContent = `SCORE: ${Math.floor(
    displayedScore
  )}`;
  if (score > bestScore) {
    const oldBest = bestScore;
    bestScore = score;
    localStorage.setItem("bestScore", bestScore.toString());
    document.getElementById("best-score").textContent = `BEST: ${bestScore}`;
    if (!hasNewRecordInThisGame && oldBest > 0) {
      hasNewRecordInThisGame = true;
      const centerX = gameWidth / 2;
      const centerY = gameHeight * 0.3;
      createBestScorePopup(bestScore, centerX, centerY);
      createExplosion(centerX, centerY, "#ff00ff");
    }
  }
  checkColorUnlocks();
}
function createExplosion(x, y, color) {
  const explosion = document.createElement("div");
  explosion.className = "explosion";
  explosion.style.left = `${x - 50}px`;
  explosion.style.top = `${y - 50}px`;
  explosion.style.boxShadow = `0 0 30px ${color}`;
  gameContainer.appendChild(explosion);
  setTimeout(() => {
    explosion.remove();
  }, 1000);
}
function createScorePopup(x, y, points, color) {
  const popup = document.createElement("div");
  popup.className = "score-popup";
  popup.textContent = `+${points}`;
  popup.style.color = color;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  gameContainer.appendChild(popup);
  setTimeout(() => {
    popup.remove();
  }, 1000);
}
function createBestScorePopup(points, x, y) {
  const popup = document.createElement("div");
  popup.className = "best-score-popup";
  popup.textContent = `NEW BEST: ${points}`;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  gameContainer.appendChild(popup);
  setTimeout(() => {
    popup.remove();
  }, 1000);
}
function addScore(points, color, x, y) {
  if (points <= 0) return;
  score += points;
  shapesCollected++;
  if (score % 10 === 0) {
  }
  createScorePopup(x, y, points, color);
  animateScore();
}
Events.on(engine, "collisionStart", (event) => {
  if (!gameActive || isCheckingLines || isProcessingCollision) return;
  isProcessingCollision = true;
  const pairs = event.pairs;
  let currentPieceCollided = false;
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const isCurrentPieceA = pair.bodyA === currentPiece;
    const isCurrentPieceB = pair.bodyB === currentPiece;
    if ((isCurrentPieceA || isCurrentPieceB) && currentPiece) {
      const otherBody = isCurrentPieceA ? pair.bodyB : pair.bodyA;
      if (
        otherBody === ground ||
        (pieces.includes(otherBody) && otherBody !== currentPiece)
      ) {
        currentPieceCollided = true;
        break;
      }
    }
  }
  if (currentPieceCollided && currentPiece) {
    fallenPiecesCount++;
    checkColorUnlocks();
    const collisionScore = Math.floor(1 + Math.random() * 5);
    addScore(
      collisionScore,
      currentPiece.color,
      currentPiece.position.x,
      currentPiece.position.y
    );
    if (currentPiece) {
      currentPiece.isControlled = false;
      currentPiece = null;
    }
    canSpawnNewPiece = true;
    isProcessingCollision = false;
  } else {
    isProcessingCollision = false;
  }
});
window.addEventListener("beforeunload", () => {
  if (gameActive) {
    const playTimeSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    if (playTimeSeconds >= 10) {
      const totalGames =
        parseInt(localStorage.getItem("totalGames") || "0") + 1;
      localStorage.setItem("totalGames", totalGames.toString());
    }
  }
});
colors = allColors.slice(0, unlockedColors);
bestScore = parseInt(localStorage.getItem("bestScore")) || 0;
document.getElementById("best-score").textContent = `BEST: ${bestScore}`;
runner = Runner.create();
render.options.hasShadows = true;
window.addEventListener("pagehide", () => {
  if (gameActive) {
  }
});
restartButton.addEventListener("click", () => {
  if (runner) Runner.stop(runner);
  Matter.Runner.stop(runner);
  runner = Runner.create();
  gameOverDisplay.style.display = "none";
  restartButton.style.display = "none";
  fallenPiecesCount = 0;
  gameStartTime = Date.now();
  shapesCollected = 0;
  isPaused = false;
  pauseOverlay.style.display = "none";
  Composite.clear(engine.world, false);
  pieces.length = 0;
  hasNewRecordInThisGame = false;
  bestScore = parseInt(localStorage.getItem("bestScore")) || 0;
  document.getElementById("best-score").textContent = `BEST: ${bestScore}`;
  World.add(engine.world, [ground, leftWall, rightWall, gameOverLine]);
  score = 0;
  displayedScore = 0;
  unlockedColors = 4;
  gameActive = true;
  currentPiece = null;
  canSpawnNewPiece = true;
  colors = allColors.slice(0, unlockedColors);
  pieceInterval = setInterval(() => {
    if (canSpawnNewPiece) {
      createPiece();
    }
  }, 100);
  checkLinesInterval = setInterval(checkLines, 100);
  autoSaveInterval = setInterval(() => {
    if (gameActive) {
    }
  }, 100);
  Runner.run(runner, engine);
});
window.addEventListener("resize", () => {
  render.options.width = gameWrapper.clientWidth;
  render.options.height = gameWrapper.clientHeight;
  Render.setPixelRatio(render, window.devicePixelRatio);
});
window.addEventListener("beforeunload", () => {
  if (gameActive) {
    const totalGames = parseInt(localStorage.getItem("totalGames") || "0") + 1;
    localStorage.setItem("totalGames", totalGames.toString());
  }
});
gameContainer.addEventListener(
  "touchmove",
  (e) => {
    if (!gameActive || !currentPiece) return;
    if (Math.abs(e.touches[0].clientX - touchStartX) > 10) {
      e.preventDefault();
    }
  },
  { passive: false }
);
pieceInterval = setInterval(() => {
  if (canSpawnNewPiece) {
    createPiece();
  }
}, 100);
checkLinesInterval = setInterval(checkLines, 100);
pauseButton.addEventListener("click", () => {
  isPaused = !isPaused;
  if (!gameActive) return;
  const pauseIcon = document.querySelector("#pause-icon");
  if (isPaused) {
    pauseIcon.innerHTML = '<path d="M14 10 L33 24 L14 40 Z" fill="#ffffff"/>';
  } else {
    pauseIcon.innerHTML =
      ' <rect x="14" y="10" width="7" height="30" fill="#ffffff" /><rect x="26" y="10" width="7" height="30" fill="#ffffff" />';
  }
  if (isPaused) {
    if (runner) Runner.stop(runner);
    pauseOverlay.style.display = "flex";
    if (pieceIntervalId) clearInterval(pieceIntervalId);
    if (checkLinesIntervalId) clearInterval(checkLinesIntervalId);
    if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
    pieceIntervalId = null;
    checkLinesIntervalId = null;
    autoSaveIntervalId = null;
  } else {
    if (!runner) runner = Runner.create();
    Runner.run(runner, engine);
    pauseOverlay.style.display = "none";
    pieceIntervalId = setInterval(() => {
      if (canSpawnNewPiece) createPiece();
    }, 100);
    checkLinesInterval = setInterval(checkLines, 100);
  }
});
document.addEventListener("keydown", (e) => {
  if (!gameActive || !currentPiece || currentPiece.isSleeping) return;
  if (e.key === "a") {
    Body.setVelocity(currentPiece, {
      x: -10,
      y: currentPiece.velocity.y,
    });
  } else if (e.key === "d") {
    Body.setVelocity(currentPiece, { x: 10, y: currentPiece.velocity.y });
  } else if (e.key === "w") {
    Body.setAngularVelocity(currentPiece, 0.05);
  } else if (e.key === "s") {
    Body.setAngularVelocity(currentPiece, -0.05);
  }
});
gameContainer.addEventListener(
  "touchstart",
  (e) => {
    if (!gameActive || !currentPiece || currentPiece.isSleeping) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
  },
  { passive: false }
);
gameContainer.addEventListener(
  "touchmove",
  (e) => {
    if (!gameActive || !currentPiece || currentPiece.isSleeping) return;
    const touchX = e.touches[0].clientX,
      touchY = e.touches[0].clientY,
      dx = touchX - touchStartX,
      dy = touchY - touchStartY,
      forceFactorX = 0.0003,
      forceFactorY = 0.0003;
    if (Math.abs(dx) > Math.abs(dy)) {
      Matter.Body.applyForce(currentPiece, currentPiece.position, {
        x: dx * forceFactorX,
        y: 0,
      });
    } else {
      Body.setAngularVelocity(
        currentPiece,
        currentPiece.angularVelocity + dy * forceFactorY
      );
    }
    touchStartX = touchX;
    touchStartY = touchY;
    e.preventDefault();
  },
  { passive: false }
);
Runner.run(runner, engine);
Render.run(render);
