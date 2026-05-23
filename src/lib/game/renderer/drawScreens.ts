import type { GameStateRef } from "../types";
import { gameData } from "../../../data/gameData";
import { getScaleFactor, MIN_TRANSITION_TIME } from "../constants";
import { getEndScreenButtonLayout } from "../collision";

export function drawWelcomeScreen(
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number,
  isMobile: boolean
): void {
  const { scaleFactor } = getScaleFactor(isMobile, logicalWidth, logicalHeight);
  const baseFontSize = isMobile ? Math.max(11, 13 * scaleFactor) : 13;
  const titleFontSize = isMobile ? Math.max(20, 28 * scaleFactor) : 30;
  const lineGap = isMobile ? Math.max(16, 20 * scaleFactor) : 22;

  const boxWidth = isMobile ? Math.min(420 * scaleFactor, logicalWidth - 30) : 420;
  const contentLines = isMobile ? 7 : 8;
  const boxHeight =
    titleFontSize +
    50 +
    contentLines * lineGap +
    (isMobile ? Math.max(30, 35 * scaleFactor) : 35) +
    40;
  const boxX = (logicalWidth - boxWidth) / 2;
  const boxY = (logicalHeight - boxHeight) / 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.92)";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 15);
  ctx.fill();
  ctx.strokeStyle = "#00539C";
  ctx.lineWidth = isMobile ? 2 : 3;
  ctx.stroke();

  ctx.textAlign = "center";
  let curY = boxY + titleFontSize + 15;

  ctx.fillStyle = "#FFF";
  ctx.font = `bold ${titleFontSize}px Arial`;
  ctx.fillText("Nathan's Career Game", logicalWidth / 2, curY);
  curY += lineGap * 0.8;

  ctx.font = `${baseFontSize}px Arial`;
  ctx.fillStyle = "#94A3B8";
  ctx.fillText("A 2D jetpack adventure through 15+ years in tech", logicalWidth / 2, curY);
  curY += lineGap;

  ctx.font = `bold ${Math.round(baseFontSize * 1.2)}px Arial`;
  ctx.fillStyle = "#FFD700";
  ctx.fillText(
    isMobile
      ? "Jetpack through your career!"
      : "\uD83D\uDE80 Jetpack through your professional career!",
    logicalWidth / 2,
    curY
  );
  curY += lineGap * 1.1;

  ctx.font = `${baseFontSize}px Arial`;
  ctx.fillStyle = "#FFF";
  ctx.fillText(
    isMobile ? "Hold touch to fly up" : "Hold mouse or Space to fly up",
    logicalWidth / 2,
    curY
  );
  curY += lineGap;
  ctx.fillText("Release to fall down", logicalWidth / 2, curY);
  curY += lineGap;
  ctx.fillText(
    isMobile ? "Double tap bosses to attack" : "Press X to attack bosses",
    logicalWidth / 2,
    curY
  );
  curY += lineGap;

  if (!isMobile) {
    ctx.fillText("Press P or Esc to pause", logicalWidth / 2, curY);
    curY += lineGap;
  }

  const buttonWidth = isMobile ? Math.max(130, 170 * scaleFactor) : 180;
  const buttonHeight = isMobile ? Math.max(30, 36 * scaleFactor) : 38;
  const buttonX = (logicalWidth - buttonWidth) / 2;
  const buttonY = curY + 4;

  const pulseAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
  ctx.fillStyle = `rgba(0, 83, 156, ${pulseAlpha})`;
  ctx.beginPath();
  ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 6);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.font = `bold ${Math.round(baseFontSize * 1.3)}px Arial`;
  ctx.fillText(
    isMobile ? "TAP TO START" : "CLICK TO START",
    logicalWidth / 2,
    buttonY + buttonHeight * 0.65
  );

  ctx.fillStyle = "#64748B";
  ctx.font = `${Math.max(9, baseFontSize - 3)}px Arial`;
  ctx.fillText("nathanluxford.com  \u2022  luxford.link", logicalWidth / 2, boxY + boxHeight - 10);
  ctx.textAlign = "left";
}

export function drawLevelTransition(
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number,
  currentLevel: number,
  levelTransitionStartTime: number | null,
  isMobile: boolean
): void {
  const currentCompany = gameData.levels[currentLevel - 1]?.company || "Unknown";
  const { effectiveScale } = getScaleFactor(isMobile, logicalWidth, logicalHeight);
  const timeElapsed = levelTransitionStartTime ? Date.now() - levelTransitionStartTime : 0;
  const canContinue = timeElapsed >= MIN_TRANSITION_TIME;
  const timeRemaining = Math.max(0, MIN_TRANSITION_TIME - timeElapsed);

  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  const boxWidth = Math.min(400 * effectiveScale, logicalWidth * 0.9);
  const boxHeight = Math.min(220 * effectiveScale, logicalHeight * 0.4);
  const boxX = (logicalWidth - boxWidth) / 2;
  const boxY = (logicalHeight - boxHeight) / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  ctx.strokeStyle = "#4CAF50";
  ctx.lineWidth = isMobile ? Math.max(2, 3 * effectiveScale) : 3;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = "#2E7D32";
  const titleFontSize = Math.max(16, 24 * effectiveScale);
  ctx.font = `bold ${titleFontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText("New Career Stage!", logicalWidth / 2, boxY + (isMobile ? 35 : 50));

  ctx.fillStyle = "#1976D2";
  const companyFontSize = Math.max(14, 20 * effectiveScale);
  ctx.font = `bold ${companyFontSize}px Arial`;
  ctx.fillText(currentCompany, logicalWidth / 2, boxY + (isMobile ? 60 : 85));

  ctx.fillStyle = "#666";
  const levelFontSize = Math.max(12, 16 * effectiveScale);
  ctx.font = `${levelFontSize}px Arial`;
  ctx.fillText(
    `Level ${currentLevel} of ${gameData.levels.length}`,
    logicalWidth / 2,
    boxY + (isMobile ? 80 : 110)
  );

  const buttonWidth = Math.max(160, Math.min(200 * effectiveScale, logicalWidth * 0.7));
  const buttonHeight = Math.max(36, 40 * effectiveScale);
  const buttonX = (logicalWidth - buttonWidth) / 2;
  const buttonY = boxY + boxHeight - buttonHeight - (isMobile ? 15 : 25);

  if (canContinue) {
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = "#FFF";
    const btnFontSize = Math.max(12, 16 * effectiveScale);
    ctx.font = `bold ${btnFontSize}px Arial`;
    ctx.fillText(
      "Click to Continue",
      logicalWidth / 2,
      buttonY + buttonHeight / 2 + btnFontSize / 3
    );
  } else {
    ctx.fillStyle = "#FFA726";
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = "#FFF";
    const btnFontSize = Math.max(12, 16 * effectiveScale);
    ctx.font = `bold ${btnFontSize}px Arial`;
    const countdown = Math.ceil(timeRemaining / 1000);
    ctx.fillText(
      `Continue in ${countdown}s`,
      logicalWidth / 2,
      buttonY + buttonHeight / 2 + btnFontSize / 3
    );
  }
}

export function drawVictoryOverlay(
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number,
  gameState: GameStateRef,
  isMobile: boolean
): void {
  const { effectiveScale } = getScaleFactor(isMobile, logicalWidth, logicalHeight);
  const timeRemaining = gameState.level7StartTime
    ? Math.max(0, 10 - Math.floor((Date.now() - gameState.level7StartTime) / 1000))
    : 10;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  const boxWidth = Math.min(500 * effectiveScale, logicalWidth * 0.9);
  const boxHeight = Math.min(150 * effectiveScale, logicalHeight * 0.3);
  const boxX = (logicalWidth - boxWidth) / 2;
  const boxY = (logicalHeight - boxHeight) / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = isMobile ? Math.max(2, 4 * effectiveScale) : 4;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = "#2E7D32";
  const titleFontSize = Math.max(18, 28 * effectiveScale);
  ctx.font = `bold ${titleFontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(
    "\uD83C\uDF89 CAREER JOURNEY COMPLETE! \uD83C\uDF89",
    logicalWidth / 2,
    boxY + (isMobile ? 35 : 50)
  );

  ctx.fillStyle = "#1976D2";
  const subtitleFontSize = Math.max(14, 18 * effectiveScale);
  ctx.font = `bold ${subtitleFontSize}px Arial`;
  ctx.fillText("You've reached Tesco!", logicalWidth / 2, boxY + (isMobile ? 60 : 80));

  if (timeRemaining > 0) {
    ctx.fillStyle = "#666";
    const countdownFontSize = Math.max(12, 16 * effectiveScale);
    ctx.font = `${countdownFontSize}px Arial`;
    ctx.fillText(
      `Completing in ${timeRemaining} seconds...`,
      logicalWidth / 2,
      boxY + (isMobile ? 85 : 110)
    );
  }
}

export function drawEndGameScreen(
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number,
  gameState: GameStateRef,
  highScore: number,
  isMobile: boolean
): void {
  const { effectiveScale } = getScaleFactor(isMobile, logicalWidth, logicalHeight);

  const overlayGradient = ctx.createLinearGradient(0, 0, logicalWidth, logicalHeight);
  overlayGradient.addColorStop(0, "rgba(2, 6, 23, 0.96)");
  overlayGradient.addColorStop(0.5, "rgba(15, 23, 42, 0.94)");
  overlayGradient.addColorStop(1, "rgba(30, 64, 175, 0.9)");
  ctx.fillStyle = overlayGradient;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  for (let i = 0; i < 28; i++) {
    const sparkX = (i * 97) % logicalWidth;
    const sparkY = (i * 53) % logicalHeight;
    const pulse = 0.35 + Math.sin(Date.now() * 0.002 + i) * 0.25;
    ctx.fillStyle = i % 3 === 0 ? `rgba(250, 204, 21, ${pulse})` : `rgba(147, 197, 253, ${pulse})`;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 2 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }

  const boxWidth = Math.min(680 * effectiveScale, logicalWidth * 0.92);
  const boxHeight = Math.min(380 * effectiveScale, logicalHeight * 0.78);
  const boxX = (logicalWidth - boxWidth) / 2;
  const boxY = (logicalHeight - boxHeight) / 2;

  const panelGradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
  panelGradient.addColorStop(0, "rgba(255, 255, 255, 0.98)");
  panelGradient.addColorStop(1, "rgba(219, 234, 254, 0.96)");
  ctx.shadowColor = "rgba(250, 204, 21, 0.5)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = panelGradient;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 24 * effectiveScale);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#FACC15";
  ctx.lineWidth = isMobile ? Math.max(2, 4 * effectiveScale) : 4;
  ctx.stroke();
  const accentGradient = ctx.createLinearGradient(boxX + 24, boxY, boxX + boxWidth - 24, boxY);
  accentGradient.addColorStop(0, "#38BDF8");
  accentGradient.addColorStop(0.5, "#FACC15");
  accentGradient.addColorStop(1, "#22C55E");
  ctx.fillStyle = accentGradient;
  ctx.beginPath();
  ctx.roundRect(boxX + 28, boxY + 18, boxWidth - 56, 6, 999);
  ctx.fill();

  ctx.fillStyle = "#0F172A";
  const titleFontSize = Math.max(22, 34 * effectiveScale);
  ctx.font = `bold ${titleFontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText("Career Journey Complete", logicalWidth / 2, boxY + (isMobile ? 50 : 68));

  ctx.fillStyle = "#2563EB";
  const subtitleFontSize = Math.max(14, 19 * effectiveScale);
  ctx.font = `bold ${subtitleFontSize}px Arial`;
  ctx.fillText(
    "You reached Developer Experience leadership at enterprise scale",
    logicalWidth / 2,
    boxY + (isMobile ? 75 : 98)
  );

  ctx.fillStyle = "#475569";
  ctx.font = `${Math.max(11, 14 * effectiveScale)}px Arial`;
  ctx.fillText(
    "Cloud platforms, FinOps, internal developer portals, AI enablement, and engineering joy unlocked.",
    logicalWidth / 2,
    boxY + (isMobile ? 98 : 122)
  );

  const bestScore = Math.max(highScore, Math.floor(gameState.score));
  const stats = [
    { label: "Final Score", value: `${Math.floor(gameState.score)}` },
    { label: "Best Score", value: `${bestScore}` },
    { label: "Max Combo", value: `${gameState.maxCombo}` },
  ];
  const statGap = 10 * effectiveScale;
  const statWidth = (boxWidth - 64 * effectiveScale - statGap * 2) / 3;
  const statHeight = isMobile ? 58 : 74;
  const statY = boxY + (isMobile ? 120 : 150);
  const statStartX = boxX + 32 * effectiveScale;

  stats.forEach((stat, index) => {
    const statX = statStartX + index * (statWidth + statGap);
    ctx.fillStyle =
      index === 0
        ? "rgba(37, 99, 235, 0.1)"
        : index === 1
          ? "rgba(250, 204, 21, 0.14)"
          : "rgba(34, 197, 94, 0.12)";
    ctx.beginPath();
    ctx.roundRect(statX, statY, statWidth, statHeight, 14);
    ctx.fill();
    ctx.strokeStyle = index === 0 ? "#93C5FD" : index === 1 ? "#FDE68A" : "#86EFAC";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#0F172A";
    ctx.font = `bold ${Math.max(16, 24 * effectiveScale)}px Arial`;
    ctx.fillText(stat.value, statX + statWidth / 2, statY + (isMobile ? 25 : 32));
    ctx.fillStyle = "#64748B";
    ctx.font = `bold ${Math.max(9, 11 * effectiveScale)}px Arial`;
    ctx.fillText(stat.label.toUpperCase(), statX + statWidth / 2, statY + (isMobile ? 45 : 56));
  });

  ctx.fillStyle = "#15803D";
  const achievementFontSize = Math.max(12, 16 * effectiveScale);
  ctx.font = `bold ${achievementFontSize}px Arial`;
  ctx.fillText(
    "Mission complete: you turned career obstacles into developer flow.",
    logicalWidth / 2,
    boxY + (isMobile ? 205 : 258)
  );

  ctx.fillStyle = "#64748B";
  ctx.font = `${Math.max(10, 13 * effectiveScale)}px Arial`;
  ctx.fillText(
    "View the full CV or replay to chase a new best score.",
    logicalWidth / 2,
    boxY + (isMobile ? 226 : 282)
  );

  const layout = getEndScreenButtonLayout(logicalWidth, logicalHeight, isMobile, effectiveScale);

  const viewGradient = ctx.createLinearGradient(
    layout.button1X,
    layout.buttonY,
    layout.button1X,
    layout.buttonY + layout.buttonHeight
  );
  viewGradient.addColorStop(0, "#22C55E");
  viewGradient.addColorStop(1, "#15803D");
  ctx.fillStyle = viewGradient;
  ctx.beginPath();
  ctx.roundRect(layout.button1X, layout.buttonY, layout.buttonWidth, layout.buttonHeight, 999);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  const buttonFontSize = Math.max(12, 15 * effectiveScale);
  ctx.font = `bold ${buttonFontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(
    "Visit Site",
    layout.button1X + layout.buttonWidth / 2,
    layout.buttonY + layout.buttonHeight / 2 + buttonFontSize / 3
  );

  const replayGradient = ctx.createLinearGradient(
    layout.button2X,
    layout.buttonY,
    layout.button2X,
    layout.buttonY + layout.buttonHeight
  );
  replayGradient.addColorStop(0, "#3B82F6");
  replayGradient.addColorStop(1, "#1D4ED8");
  ctx.fillStyle = replayGradient;
  ctx.beginPath();
  ctx.roundRect(layout.button2X, layout.buttonY, layout.buttonWidth, layout.buttonHeight, 999);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.fillText(
    "Play Again",
    layout.button2X + layout.buttonWidth / 2,
    layout.buttonY + layout.buttonHeight / 2 + buttonFontSize / 3
  );

  ctx.fillStyle = "#64748B";
  ctx.font = `${Math.max(10, 11 * effectiveScale)}px Arial`;
  ctx.fillText(
    "Nathan's Career Game  \u2022  luxford.link",
    logicalWidth / 2,
    boxY + boxHeight - 14
  );
}

export function drawPauseOverlay(
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number,
  isMobile: boolean
): void {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);
  ctx.fillStyle = "#FFF";
  ctx.font = `bold ${isMobile ? 28 : 40}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText("Paused", logicalWidth / 2, logicalHeight / 2 - 12);
  ctx.font = `${isMobile ? 14 : 18}px Arial`;
  ctx.fillText("Press P or Esc to resume", logicalWidth / 2, logicalHeight / 2 + 24);
}

export function drawBoss(
  ctx: CanvasRenderingContext2D,
  gameState: GameStateRef,
  logicalWidth: number,
  isMobile: boolean
): void {
  if (!gameState.bossActive || !gameState.boss) return;
  const boss = gameState.boss;

  ctx.save();
  ctx.shadowColor = boss.color;
  ctx.shadowBlur = 30;
  ctx.fillStyle = boss.color;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, 45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(boss.x - 10, boss.y - 5, 8, 0, Math.PI * 2);
  ctx.arc(boss.x + 10, boss.y - 5, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.fillRect(boss.x - 20, boss.y - 20, 15, 5);
  ctx.fillRect(boss.x + 5, boss.y - 20, 15, 5);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(boss.x - 15, boss.y + 15);
  ctx.lineTo(boss.x + 15, boss.y + 15);
  ctx.stroke();
  ctx.restore();

  const healthBarWidth = 200;
  const healthBarHeight = 20;
  const healthBarX = (logicalWidth - healthBarWidth) / 2;
  const healthBarY = 100;

  ctx.fillStyle = "#333";
  ctx.fillRect(healthBarX - 5, healthBarY - 5, healthBarWidth + 10, healthBarHeight + 10);
  const healthPercent = gameState.bossHP / gameState.bossMaxHP;
  const healthColor = healthPercent > 0.5 ? "#0F0" : healthPercent > 0.25 ? "#FF0" : "#F00";
  ctx.fillStyle = healthColor;
  ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 2;
  ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

  ctx.fillStyle = "#FFF";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(boss.name, logicalWidth / 2, healthBarY - 10);
  ctx.font = "14px Arial";
  ctx.fillStyle = "#AAA";
  ctx.fillText(
    isMobile ? "Double tap to attack!" : "Press X or Space to attack!",
    logicalWidth / 2,
    healthBarY + 40
  );
}
