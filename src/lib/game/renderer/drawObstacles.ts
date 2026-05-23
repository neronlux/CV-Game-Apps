import type { GameObject } from "../types";

type ObstacleRenderer = (ctx: CanvasRenderingContext2D, obj: GameObject) => void;

const renderGlitch: ObstacleRenderer = (ctx, obj) => {
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;
  const shift = (Math.random() - 0.5) * 4;
  ctx.translate(shift, 0);
  ctx.shadowColor = "#0F0";
  ctx.shadowBlur = 5;
  ctx.fillStyle = "#FF00FF";
  ctx.font = "bold 20px Courier New";
  ctx.fillText("ERROR", centerX, centerY);
  ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
  ctx.fillRect(obj.x, obj.y + Math.random() * obj.height, obj.width, 5);
};

const renderRansomware: ObstacleRenderer = (ctx, obj) => {
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;
  ctx.fillStyle = "#800000";
  ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.arc(centerX, centerY - 5, 8, Math.PI, 0);
  ctx.lineTo(centerX + 8, centerY + 5);
  ctx.lineTo(centerX - 8, centerY + 5);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(centerX, centerY - 5, 4, Math.PI, 0);
  ctx.fill();
};

const renderCloud: ObstacleRenderer = (ctx, obj) => {
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;
  ctx.fillStyle = "#E8E8E8";
  ctx.beginPath();
  ctx.arc(centerX - 8, centerY, 6, 0, Math.PI * 2);
  ctx.arc(centerX + 8, centerY, 6, 0, Math.PI * 2);
  ctx.arc(centerX, centerY - 4, 8, 0, Math.PI * 2);
  ctx.fill();
};

const renderServer: ObstacleRenderer = (ctx, obj) => {
  ctx.fillStyle = "#2C3E50";
  ctx.fillRect(obj.x + 2, obj.y + 2, obj.width - 4, obj.height - 4);
  ctx.fillStyle = "#00FF00";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(obj.x + 4, obj.y + 4 + i * 6, 3, 2);
  }
};

const renderComputer: ObstacleRenderer = (ctx, obj) => {
  const centerX = obj.x + obj.width / 2;
  ctx.fillStyle = "#34495E";
  ctx.fillRect(obj.x + 2, obj.y + 2, obj.width - 4, obj.height - 6);
  ctx.fillStyle = "#3498DB";
  ctx.fillRect(obj.x + 4, obj.y + 4, obj.width - 8, obj.height - 10);
  ctx.fillStyle = "#34495E";
  ctx.fillRect(centerX - 2, obj.y + obj.height - 4, 4, 4);
};

const renderPrinter: ObstacleRenderer = (ctx, obj) => {
  ctx.fillStyle = "#BDC3C7";
  ctx.fillRect(obj.x + 2, obj.y + 4, obj.width - 4, obj.height - 6);
  ctx.fillStyle = "#34495E";
  ctx.fillRect(obj.x + 4, obj.y + 2, obj.width - 8, 4);
};

const renderKeyboard: ObstacleRenderer = (ctx, obj) => {
  ctx.fillStyle = "#2C3E50";
  ctx.fillRect(obj.x + 1, obj.y + 8, obj.width - 2, obj.height - 10);
  ctx.fillStyle = "#ECF0F1";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillRect(obj.x + 3 + i * 5, obj.y + 10 + j * 4, 3, 2);
    }
  }
};

const renderMouse: ObstacleRenderer = (ctx, obj) => {
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;
  ctx.fillStyle = "#34495E";
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2C3E50";
  ctx.fillRect(centerX - 1, obj.y + 4, 2, 8);
};

const renderTextIcon = (text: string, color: string): ObstacleRenderer => {
  return (ctx, obj) => {
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    ctx.fillStyle = color;
    ctx.font = "bold 14px Arial";
    ctx.fillText(text, centerX, centerY);
  };
};

const renderSmallText = (text: string, color: string, font: string): ObstacleRenderer => {
  return (ctx, obj) => {
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(text, centerX, centerY);
  };
};

const renderDatabase: ObstacleRenderer = (ctx, obj) => {
  ctx.fillStyle = "#3498DB";
  ctx.fillRect(obj.x + 2, obj.y + 2, obj.width - 4, 8);
  ctx.fillRect(obj.x + 2, obj.y + 12, obj.width - 4, 8);
  ctx.fillRect(obj.x + 2, obj.y + 22, obj.width - 4, 8);
};

const renderCpu: ObstacleRenderer = (ctx, obj) => {
  ctx.fillStyle = "#34495E";
  ctx.fillRect(obj.x + 2, obj.y + 2, obj.width - 4, obj.height - 4);
  ctx.fillStyle = "#F1C40F";
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      ctx.fillRect(obj.x + 4 + i * 4, obj.y + 4 + j * 4, 2, 2);
    }
  }
};

const renderRam: ObstacleRenderer = (ctx, obj) => {
  ctx.fillStyle = "#27AE60";
  ctx.fillRect(obj.x + 2, obj.y + 6, obj.width - 4, obj.height - 12);
  ctx.fillStyle = "#2ECC71";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(obj.x + 4 + i * 4, obj.y + 2, 2, 4);
  }
};

const renderSsd: ObstacleRenderer = (ctx, obj) => {
  ctx.fillStyle = "#95A5A6";
  ctx.fillRect(obj.x + 2, obj.y + 4, obj.width - 4, obj.height - 8);
  ctx.fillStyle = "#34495E";
  ctx.fillRect(obj.x + 4, obj.y + 6, obj.width - 8, 3);
};

const renderCable: ObstacleRenderer = (ctx, obj) => {
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;
  ctx.fillStyle = "#2C3E50";
  ctx.beginPath();
  ctx.moveTo(obj.x, centerY);
  ctx.quadraticCurveTo(centerX, obj.y + 2, obj.x + obj.width, centerY);
  ctx.lineWidth = 3;
  ctx.stroke();
};

const renderRouter: ObstacleRenderer = (ctx, obj) => {
  ctx.fillStyle = "#34495E";
  ctx.fillRect(obj.x + 2, obj.y + 4, obj.width - 4, obj.height - 8);
  ctx.fillStyle = "#E74C3C";
  ctx.fillRect(obj.x + 4, obj.y + 2, 3, 3);
  ctx.fillStyle = "#27AE60";
  ctx.fillRect(obj.x + 8, obj.y + 2, 3, 3);
};

const obstacleRenderers: Record<string, ObstacleRenderer> = {
  glitch: renderGlitch,
  ransomware: renderRansomware,
  cloud: renderCloud,
  server: renderServer,
  computer: renderComputer,
  printer: renderPrinter,
  keyboard: renderKeyboard,
  mouse: renderMouse,
  ai: renderTextIcon("AI", "#9B59B6"),
  java: renderTextIcon("\u2615", "#F39C12"),
  code: renderSmallText("</>", "#27AE60", "bold 12px monospace"),
  bug: renderTextIcon("\uD83D\uDC1B", "#E74C3C"),
  database: renderDatabase,
  network: renderTextIcon("\uD83C\uDF10", "#9B59B6"),
  security: renderTextIcon("\uD83D\uDD12", "#F39C12"),
  api: renderSmallText("API", "#1ABC9C", "bold 12px Arial"),
  git: renderTextIcon("\u26A1", "#E67E22"),
  docker: renderTextIcon("\uD83D\uDC33", "#2980B9"),
  kubernetes: renderSmallText("K8s", "#8E44AD", "bold 10px Arial"),
  wifi: renderTextIcon("\uD83D\uDCF6", "#16A085"),
  cpu: renderCpu,
  ram: renderRam,
  ssd: renderSsd,
  cable: renderCable,
  router: renderRouter,
  firewall: renderTextIcon("\uD83D\uDD25", "#E74C3C"),
  virus: renderTextIcon("\uD83E\uDEA0", "#8E44AD"),
};

export function drawObstacle(ctx: CanvasRenderingContext2D, obj: GameObject): void {
  const techType = obj.techType || "";
  const renderer = obstacleRenderers[techType];
  if (renderer) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (techType === "glitch") {
      const shift = (Math.random() - 0.5) * 4;
      ctx.translate(shift, 0);
      ctx.shadowColor = "#0F0";
      ctx.shadowBlur = 5;
    }
    renderer(ctx, obj);
    ctx.restore();
  } else {
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  }
}
