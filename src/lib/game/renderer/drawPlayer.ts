import type { Player, Particle, FloatingText, GameStateRef } from "../types";

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  gameState: GameStateRef
): void {
  const tilt = Math.max(Math.min(player.vy * 0.05, 0.4), -0.2);

  ctx.save();

  const hasCaffeinated = gameState.activeStatusEffects.some((e) => e.type === "caffeinated");
  const hasPressure = gameState.activeStatusEffects.some((e) => e.type === "pressure");
  if (hasCaffeinated || hasPressure) {
    const jitterAmount = hasCaffeinated ? 3 : 1.5;
    ctx.translate((Math.random() - 0.5) * jitterAmount, (Math.random() - 0.5) * jitterAmount);
  }

  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.rotate(tilt);
  ctx.translate(-(player.x + player.width / 2), -(player.y + player.height / 2));

  if (gameState.shieldActive) {
    ctx.beginPath();
    ctx.arc(player.x + 30, player.y + 30, 45, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 191, 255, ${0.3 + Math.sin(Date.now() * 0.01) * 0.1})`;
    ctx.fill();
    ctx.strokeStyle = "#00BFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (player.jetpackActive) {
    const powerRatio = player.jetpackPower / player.maxJetpackPower;
    const flameSize = 8 + powerRatio * 10;
    const flameLength = 15 + powerRatio * 20;

    ctx.fillStyle = "#FF6B35";
    ctx.beginPath();
    ctx.ellipse(player.x - 10, player.y + 35, flameSize, flameLength, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.ellipse(player.x - 8, player.y + 32, flameSize * 0.5, flameLength * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.arc(player.x - 5, player.y + 28, 2, 0, Math.PI * 2);
    ctx.fill();

    if (powerRatio > 0.5) {
      ctx.beginPath();
      ctx.arc(player.x - 12, player.y + 25, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (powerRatio > 0.8) {
      ctx.beginPath();
      ctx.arc(player.x - 3, player.y + 30, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "#34495E";
  ctx.fillRect(player.x - 8, player.y + 15, 12, 25);
  ctx.fillStyle = "#2C3E50";
  ctx.fillRect(player.x - 6, player.y + 17, 8, 3);
  ctx.fillRect(player.x - 6, player.y + 22, 8, 3);

  ctx.fillStyle = "#2C3E50";
  ctx.fillRect(player.x + 8, player.y + 20, 35, 30);
  ctx.fillStyle = "#1A252F";
  ctx.fillRect(player.x + 15, player.y + 25, 20, 20);

  ctx.fillStyle = "#2C3E50";
  ctx.fillRect(player.x + 5, player.y + 25, 12, 20);
  ctx.fillRect(player.x + 43, player.y + 25, 15, 12);

  ctx.fillStyle = "#D4A574";
  ctx.beginPath();
  ctx.arc(player.x + 11, player.y + 40, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(player.x + 58, player.y + 31, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2C3E50";
  ctx.fillRect(player.x + 15, player.y + 50, 10, 15);
  ctx.fillRect(player.x + 28, player.y + 50, 10, 15);

  ctx.fillStyle = "#000";
  ctx.fillRect(player.x + 13, player.y + 62, 14, 6);
  ctx.fillRect(player.x + 26, player.y + 62, 14, 6);

  ctx.fillStyle = "#D4A574";
  ctx.beginPath();
  ctx.arc(player.x + 30, player.y + 12, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2C1810";
  ctx.beginPath();
  ctx.ellipse(player.x + 30, player.y - 2, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(player.x + 15, player.y + 2);
  ctx.lineTo(player.x + 12, player.y - 5);
  ctx.lineTo(player.x + 20, player.y);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(player.x + 40, player.y + 2);
  ctx.lineTo(player.x + 48, player.y - 5);
  ctx.lineTo(player.x + 45, player.y);
  ctx.fill();

  ctx.fillStyle = "#2C1810";
  ctx.fillRect(player.x + 22, player.y + 8, 8, 3);
  ctx.fillRect(player.x + 30, player.y + 8, 8, 3);

  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.ellipse(player.x + 25, player.y + 13, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(player.x + 35, player.y + 13, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(player.x + 25, player.y + 13, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(player.x + 35, player.y + 13, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(player.x + 26, player.y + 12, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(player.x + 36, player.y + 12, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#C49464";
  ctx.beginPath();
  ctx.ellipse(player.x + 30, player.y + 16, 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x + 30, player.y + 18, 10, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.fillStyle = "#FFF";
  ctx.fillRect(player.x + 25, player.y + 20, 10, 3);

  ctx.restore();
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  particles.forEach((p) => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    if (p.type === "sparkle") {
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    } else if (p.type === "debris") {
      ctx.rect(p.x, p.y, p.size, p.size);
    } else {
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    }
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;
}

export function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void {
  texts.forEach((t) => {
    ctx.globalAlpha = t.opacity;
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeText(t.text, t.x, t.y);
  });
  ctx.globalAlpha = 1.0;
}
