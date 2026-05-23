export type StatusEffectType =
  | "caffeinated"
  | "lag"
  | "ticket_bloat"
  | "encrypted"
  | "root_access"
  | "pressure";

export type EnemyType = "zombie" | "micromanager" | "phishing_angler" | "shadow_it";

export type ObjectType =
  | "obstacle"
  | "collectible"
  | "company-logo"
  | "ground"
  | "powerup"
  | "enemy"
  | "projectile";

export type TechType =
  | "cloud"
  | "server"
  | "computer"
  | "printer"
  | "keyboard"
  | "mouse"
  | "ai"
  | "java"
  | "code"
  | "bug"
  | "database"
  | "network"
  | "security"
  | "api"
  | "git"
  | "docker"
  | "kubernetes"
  | "wifi"
  | "cpu"
  | "ram"
  | "ssd"
  | "cable"
  | "router"
  | "firewall"
  | "virus"
  | "glitch"
  | "ransomware";

export type PowerUpType = "shield" | "coffee" | "admin-password" | "score-multiplier";

export type ProjectileType = "player_attack" | "boss_attack" | "packet";

export type ParticleType = "fire" | "smoke" | "sparkle" | "debris" | "shield";

export interface StatusEffect {
  type: StatusEffectType;
  startTime: number;
  duration: number;
}

export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  type: ObjectType;
  color: string;
  company?: string;
  collected?: boolean;
  techType?: string;
  powerUpType?: string;
  enemyType?: EnemyType;
  projectileType?: string;
  nearMissed?: boolean;
}

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: ParticleType;
  alpha: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  vy: number;
  size: number;
  opacity: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isFlying: boolean;
  jetpackActive: boolean;
  jetpackPower: number;
  maxJetpackPower: number;
}

export interface Boss {
  name: string;
  color: string;
  pattern: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  attackTimer: number;
}

export interface GameStateRef {
  speed: number;
  distance: number;
  objects: GameObject[];
  backgroundOffset: number;
  mouseDown: boolean;
  mouseDownTime: number;
  level7StartTime: number | null;
  lastFrameTime: number;
  particles: Particle[];
  floatingTexts: FloatingText[];
  shake: number;
  shieldActive: boolean;
  shieldTime: number;
  scoreMultiplier: number;
  multiplierTime: number;
  score: number;
  lives: number;
  sanity: number;
  activeStatusEffects: StatusEffect[];
  inputQueue: { time: number; type: "down" | "up" }[];
  combo: number;
  comboMultiplier: number;
  lastComboTime: number;
  maxCombo: number;
  bossActive: boolean;
  bossHP: number;
  bossMaxHP: number;
  bossDefeated: boolean;
  bossAppeared: boolean;
  boss: Boss | null;
  hitFreeze: boolean;
  hitFreezeTime: number;
  invulnerableUntil: number;
  lastZombieDrainTime: number;
  lastAttackTime: number | null;
}
