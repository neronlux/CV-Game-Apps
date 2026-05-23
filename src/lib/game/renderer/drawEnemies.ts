import type { GameObject, Player } from "../types";

type EnemyRenderer = (ctx: CanvasRenderingContext2D, obj: GameObject, player: Player) => void;

const renderZombie: EnemyRenderer = (ctx, obj) => {
  const centerX = obj.x + obj.width / 2;
  ctx.fillStyle = "#90EE90";
  ctx.beginPath();
  ctx.arc(centerX, obj.y + 10, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#444";
  ctx.fillRect(centerX - 10, obj.y + 22, 20, 25);
  ctx.fillStyle = "#90EE90";
  ctx.fillRect(centerX - 15, obj.y + 25, 10, 6);
  ctx.fillRect(centerX + 5, obj.y + 25, 15, 6);
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(centerX - 4, obj.y + 8, 3, 0, Math.PI * 2);
  ctx.arc(centerX + 4, obj.y + 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.font = "10px Arial";
  ctx.fillText("x", centerX - 6, obj.y + 10);
  ctx.fillText("x", centerX + 2, obj.y + 10);
  if (Math.floor(Date.now() / 1000) % 3 === 0) {
    ctx.fillStyle = "#FFF";
    ctx.fillRect(obj.x + 20, obj.y - 20, 40, 20);
    ctx.fillStyle = "#000";
    ctx.font = "10px Arial";
    ctx.fillText("Fixed?", obj.x + 25, obj.y - 8);
  }
};

const renderMicromanager: EnemyRenderer = (ctx, obj, player) => {
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;
  ctx.shadowColor = "red";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(centerX, centerY - 10, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3498DB";
  ctx.beginPath();
  ctx.arc(centerX, centerY - 10, 12, 0, Math.PI * 2);
  ctx.fill();
  const lookY = Math.max(-8, Math.min(8, (player.y - obj.y) * 0.1));
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(centerX, centerY - 10 + lookY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#2C3E50";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY + 15);
  ctx.lineTo(centerX - 15, centerY + 30);
  ctx.lineTo(centerX + 15, centerY + 30);
  ctx.fill();
  ctx.fillStyle = "#E74C3C";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY + 15);
  ctx.lineTo(centerX - 3, centerY + 28);
  ctx.lineTo(centerX + 3, centerY + 28);
  ctx.fill();
};

const renderShadowIt: EnemyRenderer = (ctx, obj) => {
  const centerX = obj.x + obj.width / 2;
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.moveTo(centerX, obj.y);
  ctx.lineTo(centerX + 15, obj.y + 10);
  ctx.lineTo(centerX + 20, obj.y + 50);
  ctx.lineTo(centerX - 20, obj.y + 50);
  ctx.lineTo(centerX - 15, obj.y + 10);
  ctx.fill();
  ctx.fillStyle = "#0F0";
  ctx.shadowColor = "#0F0";
  ctx.shadowBlur = 10;
  ctx.fillRect(centerX - 8, obj.y + 15, 5, 2);
  ctx.fillRect(centerX + 3, obj.y + 15, 5, 2);
  ctx.shadowBlur = 0;
};

const renderPhishingAngler: EnemyRenderer = (ctx, obj) => {
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;
  const radius = 12.5;
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX, obj.y - 50);
  ctx.stroke();
  if (Math.random() < 0.1) {
    ctx.fillStyle = "#F00";
    ctx.font = "10px Arial";
    ctx.fillText("FAKE", centerX - 10, centerY);
  } else {
    ctx.fillStyle = "#FFA500";
    ctx.font = "bold 8px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("XP", centerX, centerY);
  }
};

const enemyRenderers: Record<string, EnemyRenderer> = {
  zombie: renderZombie,
  micromanager: renderMicromanager,
  shadow_it: renderShadowIt,
  phishing_angler: renderPhishingAngler,
};

export function drawEnemy(ctx: CanvasRenderingContext2D, obj: GameObject, player: Player): void {
  const renderer = obj.enemyType ? enemyRenderers[obj.enemyType] : undefined;
  if (renderer) {
    ctx.save();
    renderer(ctx, obj, player);
    ctx.restore();
  }
}
