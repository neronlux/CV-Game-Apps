export const HIGH_SCORE_KEY = "careerGameHighScore";

export const GROUND_OFFSET = 50;

export const TECH_TYPES = [
  "cloud",
  "server",
  "computer",
  "printer",
  "keyboard",
  "mouse",
  "ai",
  "java",
  "code",
  "bug",
  "database",
  "network",
  "security",
  "api",
  "git",
  "docker",
  "kubernetes",
  "wifi",
  "cpu",
  "ram",
  "ssd",
  "cable",
  "router",
  "firewall",
  "virus",
] as const;

export const LEVEL_COMPLETION_DISTANCE = 4500;
export const BOSS_SPAWN_DISTANCE = 3800;
export const PLAYER_ATTACK_COOLDOWN = 300;
export const INVULNERABILITY_DURATION = 1500;
export const COMBO_TIMEOUT = 2000;
export const LAG_DELAY = 500;
export const LEVEL7_DURATION = 10000;
export const MIN_TRANSITION_TIME = 1000;
export const PARTICLE_BUDGET_DESKTOP = 100;
export const PARTICLE_BUDGET_MOBILE = 50;
export const BOSS_ATTACK_INTERVAL = 350;
export const ZOMBIE_DRAIN_COOLDOWN = 500;

export const VOLUME_MULTIPLIERS = {
  background: 0.6,
  hit: 0.6,
  explosion: 0.8,
  success: 0.6,
  combo: 0.7,
  boss: 0.8,
  bossDefeat: 0.9,
} as const;

export function getScaleFactor(
  isMobile: boolean,
  logicalWidth: number,
  logicalHeight: number
): { scaleFactor: number; minScale: number; effectiveScale: number } {
  const scaleFactor = isMobile ? Math.min(logicalWidth / 800, logicalHeight / 600) : 1;
  const minScale = isMobile ? 0.7 : 1;
  const effectiveScale = Math.max(scaleFactor, minScale);
  return { scaleFactor, minScale, effectiveScale };
}
