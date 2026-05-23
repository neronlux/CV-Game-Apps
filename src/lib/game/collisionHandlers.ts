import type { Player, GameStateRef, StatusEffectType, ParticleType } from "./types";

export interface CollisionContext {
  player: Player;
  gameState: GameStateRef;
  addScore: (points: number) => void;
  loseSanity: (amount: number) => void;
  addStatusEffect: (type: StatusEffectType, duration: number) => void;
  hasStatusEffect: (type: StatusEffectType) => boolean;
  playSuccess: () => void;
  playExplosion: () => void;
  playCombo: (level: number) => void;
  playHit: () => void;
  spawnParticles: (x: number, y: number, type: ParticleType, count: number, color?: string) => void;
  spawnFloatingText: (x: number, y: number, text: string, color?: string) => void;
  triggerImpact: (style: "light" | "medium" | "heavy") => void;
  triggerNotification: (style: "success" | "warning" | "error") => void;
}

function handleCollectible(obj: import("./types").GameObject, ctx: CollisionContext): void {
  if (obj.collected || ctx.hasStatusEffect("encrypted")) return;
  obj.collected = true;

  const now = Date.now();
  const state = ctx.gameState;

  if (now - state.lastComboTime < 2000) {
    state.combo += 1;
  } else {
    state.combo = 1;
  }
  state.lastComboTime = now;
  state.comboMultiplier = state.combo <= 2 ? 1 : state.combo <= 5 ? 2 : state.combo <= 10 ? 3 : 5;
  state.maxCombo = Math.max(state.maxCombo, state.combo);

  if ([3, 5, 10, 15, 20].includes(state.combo)) {
    ctx.playCombo(state.combo);
  }

  const points = 100 * state.scoreMultiplier * state.comboMultiplier;
  ctx.addScore(points);
  ctx.playSuccess();
  ctx.triggerImpact("light");
  ctx.spawnParticles(obj.x + obj.width / 2, obj.y + obj.height / 2, "sparkle", 4, "#FFD700");
  ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 20, `+${points}`, "#FFD700");

  if (state.combo >= 3) {
    ctx.spawnFloatingText(
      ctx.player.x + 30,
      ctx.player.y - 40,
      `COMBO x${state.combo}!`,
      "#FF6B35"
    );
    if (state.combo % 5 === 0) {
      ctx.spawnParticles(ctx.player.x + 30, ctx.player.y - 30, "fire", 3, "#FF6B35");
    }
  }

  if (obj.techType === "ticket") {
    ctx.addStatusEffect("ticket_bloat", 10000);
    ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 40, "Bloated!", "#888");
  }
}

function handlePowerup(obj: import("./types").GameObject, ctx: CollisionContext): void {
  if (obj.collected || ctx.hasStatusEffect("encrypted")) return;
  obj.collected = true;
  ctx.playSuccess();

  const state = ctx.gameState;
  if (obj.powerUpType === "shield") {
    state.shieldActive = true;
    state.shieldTime = 10000;
    ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 20, "Shield!", "#00BFFF");
    ctx.spawnParticles(ctx.player.x + 30, ctx.player.y + 30, "shield", 15, "#00BFFF");
  } else if (obj.powerUpType === "score-multiplier") {
    state.scoreMultiplier = 2;
    state.multiplierTime = 10000;
    ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 20, "2x Score!", "#FFD700");
  } else if (obj.powerUpType === "coffee") {
    ctx.addStatusEffect("caffeinated", 8000);
    ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 20, "Caffeinated!", "#6F4E37");
  } else if (obj.powerUpType === "admin-password") {
    ctx.addStatusEffect("root_access", 5000);
    ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 20, "ROOT ACCESS!", "#00FF00");
    ctx.spawnParticles(ctx.player.x + 30, ctx.player.y + 30, "sparkle", 10, "#00FF00");
  }
}

function handleProjectile(obj: import("./types").GameObject, ctx: CollisionContext): void {
  if (obj.projectileType === "player_attack") {
    obj.x = -1000;
    return;
  }

  if (obj.projectileType !== "boss_attack" && obj.projectileType !== "packet") return;

  if (Date.now() < ctx.gameState.invulnerableUntil) {
    obj.x = -1000;
    return;
  }

  const state = ctx.gameState;
  const isProtected = state.shieldActive || ctx.hasStatusEffect("root_access");
  if (isProtected) {
    if (!ctx.hasStatusEffect("root_access")) state.shieldActive = false;
    ctx.playExplosion();
    ctx.spawnParticles(ctx.player.x + 30, ctx.player.y + 30, "debris", 4, "#00BFFF");
    state.shake = 3;
    obj.x = -1000;
    return;
  }

  const dmg = obj.projectileType === "packet" ? 5 : 10;
  ctx.playExplosion();
  ctx.triggerImpact("heavy");
  state.hitFreeze = true;
  state.hitFreezeTime = 80;
  state.invulnerableUntil = Date.now() + 1500;
  ctx.loseSanity(dmg);
  ctx.spawnParticles(ctx.player.x + 30, ctx.player.y + 30, "debris", 6, "#E31837");
  state.shake = obj.projectileType === "packet" ? 4 : 8;
  obj.x = -1000;
}

function handleObstacle(obj: import("./types").GameObject, ctx: CollisionContext): void {
  const state = ctx.gameState;

  if (Date.now() < state.invulnerableUntil) {
    obj.x = -1000;
    return;
  }

  const isProtected = state.shieldActive || ctx.hasStatusEffect("root_access");
  if (isProtected) {
    if (!ctx.hasStatusEffect("root_access")) state.shieldActive = false;
    ctx.playExplosion();
    ctx.spawnParticles(ctx.player.x + 30, ctx.player.y + 30, "debris", 6, "#00BFFF");
    state.shake = 4;
    obj.x = -1000;
    return;
  }

  ctx.playExplosion();
  ctx.triggerImpact("heavy");
  state.combo = 0;
  state.comboMultiplier = 1;
  state.hitFreeze = true;
  state.hitFreezeTime = 120;
  state.invulnerableUntil = Date.now() + 1500;

  if (obj.techType === "glitch") {
    ctx.addStatusEffect("lag", 4000);
    ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 20, "LAG!", "#FF0000");
    ctx.loseSanity(8);
  } else if (obj.techType === "ransomware") {
    ctx.addStatusEffect("encrypted", 6000);
    ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 20, "Encrypted!", "#800080");
    ctx.loseSanity(10);
  } else {
    ctx.loseSanity(15);
  }

  ctx.spawnParticles(ctx.player.x + 30, ctx.player.y + 30, "debris", 10, "#E31837");
  state.shake = 8;

  if (!obj.techType || (obj.techType !== "glitch" && obj.techType !== "ransomware")) {
    ctx.player.x = 150;
    ctx.player.y = 300;
    ctx.player.vy = 0;
    ctx.player.jetpackActive = false;
    ctx.player.isFlying = false;
    ctx.player.jetpackPower = 0;
    state.objects = state.objects.filter((o) => o.x > ctx.player.x + 200);
  } else {
    obj.x = -1000;
  }
}

function handleEnemy(obj: import("./types").GameObject, ctx: CollisionContext): void {
  const state = ctx.gameState;

  if (Date.now() < state.invulnerableUntil) {
    obj.x = -1000;
    return;
  }

  if (obj.enemyType === "zombie") {
    if (Date.now() - state.lastZombieDrainTime > 500) {
      state.lastZombieDrainTime = Date.now();
      ctx.playHit();
      ctx.loseSanity(2);
      ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 40, "-Sanity", "#0F0");
    }
  } else if (obj.enemyType === "micromanager") {
    ctx.addStatusEffect("pressure", 2000);
  } else if (obj.enemyType === "phishing_angler") {
    ctx.playExplosion();
    state.combo = 0;
    state.comboMultiplier = 1;
    state.hitFreeze = true;
    state.hitFreezeTime = 100;
    ctx.loseSanity(10);
    ctx.addScore(-200);
    state.invulnerableUntil = Date.now() + 1500;
    ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 20, "PHISHING!", "#FF0000");
    ctx.spawnParticles(ctx.player.x + 30, ctx.player.y + 30, "debris", 8, "#000");
    obj.x = -1000;
  }
}

type CollisionHandler = (obj: import("./types").GameObject, ctx: CollisionContext) => void;

const collisionHandlers: Record<string, CollisionHandler> = {
  collectible: handleCollectible,
  powerup: handlePowerup,
  projectile: handleProjectile,
  obstacle: handleObstacle,
  enemy: handleEnemy,
};

export function handleCollision(obj: import("./types").GameObject, ctx: CollisionContext): void {
  const handler = collisionHandlers[obj.type];
  if (handler) {
    handler(obj, ctx);
  }
}
