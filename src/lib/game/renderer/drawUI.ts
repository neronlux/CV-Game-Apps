import type { GameStateRef } from "../types";
import { gameData } from "../../../data/gameData";
import { getScaleFactor } from "../constants";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number,
  backgroundOffset: number
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, logicalHeight);
  gradient.addColorStop(0, "#87CEEB");
  gradient.addColorStop(1, "#FFE4B5");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  const cloudOffset = backgroundOffset * 0.2;
  for (let i = 0; i < 8; i++) {
    const baseX = i * 180;
    const x = baseX - (cloudOffset % (logicalWidth + 200));
    const y = 50 + (i % 3) * 40;
    if (x > -100 && x < logicalWidth + 100) {
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.arc(x + 25, y, 35, 0, Math.PI * 2);
      ctx.arc(x + 50, y, 25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const buildingOffset = backgroundOffset * 0.4;
  const buildingSpacing = 120;
  const numBackgroundBuildings = Math.ceil(logicalWidth / buildingSpacing) + 4;

  ctx.fillStyle = "#2C3E50";
  for (let i = 0; i < numBackgroundBuildings; i++) {
    const baseX = i * buildingSpacing;
    const x = baseX - ((buildingOffset * 0.6) % (logicalWidth + 200));
    const height = 80 + Math.sin(i * 0.5) * 40;
    if (x > -150 && x < logicalWidth + 150) {
      ctx.fillRect(x, logicalHeight - height - 50, 70, height);
    }
  }

  const foregroundSpacing = 150;
  const numForegroundBuildings = Math.ceil(logicalWidth / foregroundSpacing) + 4;

  ctx.fillStyle = "#34495E";
  for (let i = 0; i < numForegroundBuildings; i++) {
    const baseX = i * foregroundSpacing;
    const x = baseX - (buildingOffset % (logicalWidth + 200));
    const height = 100 + Math.sin(i) * 50;
    if (x > -180 && x < logicalWidth + 180) {
      ctx.fillRect(x, logicalHeight - height - 50, 80, height);
      ctx.fillStyle = "#F39C12";
      for (let w = 0; w < 3; w++) {
        for (let h = 0; h < Math.floor(height / 20); h++) {
          if ((i * 7 + w * 3 + h) % 5 < 3) {
            ctx.fillRect(x + 10 + w * 20, logicalHeight - height - 30 + h * 20, 8, 8);
          }
        }
      }
      ctx.fillStyle = "#34495E";
    }
  }
}

export function drawUI(
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number,
  gameState: GameStateRef,
  currentLevel: number,
  gamePhase: string,
  isMobile: boolean,
  isPortrait: boolean
): void {
  const currentLevelData = gameData.levels[currentLevel - 1];
  const { scaleFactor } = getScaleFactor(isMobile, logicalWidth, logicalHeight);

  ctx.font = `bold ${isMobile ? 20 : 24}px Arial`;
  ctx.fillStyle = "#FFF";
  ctx.textAlign = "left";
  ctx.shadowColor = "black";
  ctx.shadowBlur = 4;
  ctx.fillText(`Score: ${Math.floor(gameState.score)}`, 20, 40);
  if (gameState.scoreMultiplier > 1) {
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`x${gameState.scoreMultiplier}`, 180, 40);
    ctx.fillStyle = "#FFF";
  }

  const heartSize = isMobile ? 20 : 25;
  for (let i = 0; i < gameState.lives; i++) {
    ctx.fillText("\u2764\uFE0F", 20 + i * (heartSize + 5), 70);
  }

  const { combo, comboMultiplier } = gameState;
  if (combo >= 2) {
    const comboPulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
    const comboColor = comboMultiplier >= 3 ? "#FF6B35" : comboMultiplier >= 2 ? "#FFD700" : "#FFF";
    ctx.font = `bold ${(isMobile ? 18 : 22) * comboPulse}px Arial`;
    ctx.fillStyle = comboColor;
    ctx.fillText(`\uD83D\uDD25 COMBO x${combo}!`, 20, 55);
    if (comboMultiplier > 1) {
      ctx.font = `bold ${isMobile ? 14 : 16}px Arial`;
      ctx.fillStyle = "#00FF00";
      ctx.fillText(`(${comboMultiplier}x points)`, 20 + (isMobile ? 100 : 130), 55);
    }
  }

  ctx.font = `bold ${isMobile ? 16 : 20}px Arial`;
  ctx.fillStyle = "#FFF";
  ctx.fillText("Sanity:", 20, 100);
  ctx.fillStyle = "#333";
  ctx.fillRect(90, 85, 100, 15);
  const sanityColor = gameState.sanity > 50 ? "#0F0" : gameState.sanity > 25 ? "#FF0" : "#F00";
  ctx.fillStyle = sanityColor;
  ctx.fillRect(90, 85, Math.max(0, gameState.sanity), 15);
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 1;
  ctx.strokeRect(90, 85, 100, 15);

  if (gamePhase === "playing" && currentLevel < gameData.levels.length) {
    const progressX = 20;
    const progressY = 118;
    const progressWidth = isMobile ? 160 : 220;
    const progressHeight = 12;
    const stageProgress = Math.min(gameState.distance / 4500, 1);
    ctx.font = `bold ${isMobile ? 12 : 14}px Arial`;
    ctx.fillStyle = "#FFF";
    ctx.fillText("Next stage", progressX, progressY - 5);
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(progressX + 80, progressY - 15, progressWidth, progressHeight);
    ctx.fillStyle = "#38BDF8";
    ctx.fillRect(progressX + 80, progressY - 15, progressWidth * stageProgress, progressHeight);
    ctx.strokeStyle = "#FFF";
    ctx.strokeRect(progressX + 80, progressY - 15, progressWidth, progressHeight);
  }

  const effects = gameState.activeStatusEffects;
  effects.forEach((effect, index) => {
    const y = 155 + index * 30;
    let icon = "";
    let color = "#FFF";
    switch (effect.type) {
      case "caffeinated":
        icon = "\u2615";
        color = "#6F4E37";
        break;
      case "lag":
        icon = "\uD83D\uDC22";
        color = "#F00";
        break;
      case "ticket_bloat":
        icon = "\uD83D\uDCCB";
        color = "#888";
        break;
      case "encrypted":
        icon = "\uD83D\uDD12";
        color = "#800080";
        break;
      case "root_access":
        icon = "\u26A1";
        color = "#0F0";
        break;
      case "pressure":
        icon = "\uD83D\uDC41\uFE0F";
        color = "#E74C3C";
        break;
    }
    ctx.font = "20px Arial";
    ctx.fillStyle = color;
    ctx.fillText(icon, 20, y);
    const timeLeft = Math.max(0, effect.duration - (Date.now() - effect.startTime));
    const ratio = timeLeft / effect.duration;
    ctx.fillStyle = "#333";
    ctx.fillRect(50, y - 10, 50, 8);
    ctx.fillStyle = color;
    ctx.fillRect(50, y - 10, 50 * ratio, 8);
  });

  if (gameState.shieldActive) {
    ctx.fillStyle = "#00BFFF";
    ctx.fillText("\uD83D\uDEE1\uFE0F Active", 20, 155 + effects.length * 30);
  }

  ctx.shadowBlur = 0;

  if (currentLevelData && gamePhase === "ready") {
    const stageWidth = isPortrait
      ? logicalWidth - 20
      : isMobile
        ? Math.min(400 * scaleFactor, logicalWidth - 40)
        : 400;
    const stageHeight = isMobile ? Math.max(60, 80 * scaleFactor) : 80;
    const stageX = (logicalWidth - stageWidth) / 2;
    const stageY = isPortrait ? 20 : logicalHeight - stageHeight - (isMobile ? 10 : 20);

    const hudGradient = ctx.createLinearGradient(stageX, stageY, stageX, stageY + stageHeight);
    hudGradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
    hudGradient.addColorStop(1, "rgba(20, 20, 20, 0.9)");
    ctx.fillStyle = hudGradient;
    ctx.beginPath();
    ctx.roundRect(stageX, stageY, stageWidth, stageHeight, 10);
    ctx.fill();
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = isMobile ? 2 : 3;
    ctx.stroke();

    ctx.fillStyle = "#FFD700";
    ctx.font = `bold ${isMobile ? Math.max(16, 20 * scaleFactor) : 20}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Current Career Stage", logicalWidth / 2, stageY + (isMobile ? 20 : 25));
    ctx.fillStyle = "#FFF";
    ctx.font = `bold ${isMobile ? Math.max(14, 16 * scaleFactor) : 16}px Arial`;
    ctx.fillText(currentLevelData.company, logicalWidth / 2, stageY + (isMobile ? 35 : 45));
    ctx.font = `${isMobile ? Math.max(12, 14 * scaleFactor) : 14}px Arial`;
    ctx.fillText(currentLevelData.title, logicalWidth / 2, stageY + (isMobile ? 50 : 65));
    ctx.textAlign = "left";
  }
}
