import type { GameObject, EnemyType } from "./types";
import { TECH_TYPES } from "./constants";

export function spawnObjects(
  logicalWidth: number,
  groundY: number,
  speed: number,
  currentLevel: number,
  bossActive: boolean,
  _normalizedDelta: number,
  distance: number,
  prevDistance: number
): GameObject[] {
  if (Math.floor(distance / 300) <= Math.floor(prevDistance / 300)) return [];

  const x = logicalWidth + 100;
  const newObjects: GameObject[] = [];

  if (bossActive) {
    if (Math.random() < 0.5) {
      newObjects.push({
        x: x + 150,
        y: 80 + Math.random() * (groundY - 160),
        width: 25,
        height: 25,
        vx: -speed,
        vy: 0,
        type: "collectible",
        color: "#FFD700",
        techType: "coin",
      });
    }
    return newObjects;
  }

  const roll = Math.random();
  const enemyChance = currentLevel <= 2 ? 0 : currentLevel <= 4 ? 0.08 : 0.15;

  if (roll < enemyChance) {
    newObjects.push(createEnemy(x, groundY, speed));
  } else if (roll < enemyChance + 0.45) {
    newObjects.push(createObstacle(x, groundY, speed));
  }

  if (Math.random() < 0.7) {
    const isTicket = Math.random() < 0.15;
    newObjects.push({
      x: x + 200,
      y: 80 + Math.random() * (groundY - 160),
      width: 25,
      height: 25,
      vx: -speed,
      vy: 0,
      type: "collectible",
      color: isTicket ? "#888" : "#FFD700",
      techType: isTicket ? "ticket" : "coin",
    });
  }

  if (Math.random() < 0.07) {
    newObjects.push(createPowerup(x, groundY, speed));
  }

  return newObjects;
}

function createEnemy(x: number, _groundY: number, speed: number): GameObject {
  const rand = Math.random();
  let enemyType: EnemyType;
  let width: number;
  let height: number;
  let y: number;
  let vx: number;

  if (rand < 0.3) {
    enemyType = "zombie";
    y = 480;
    width = 40;
    height = 60;
    vx = -speed * 0.5;
  } else if (rand < 0.6) {
    enemyType = "micromanager";
    y = 100 + Math.random() * 300;
    vx = -speed * 1.2;
    width = 50;
    height = 50;
  } else if (rand < 0.8) {
    enemyType = "phishing_angler";
    y = 100 + Math.random() * 300;
    width = 30;
    height = 30;
    vx = -speed;
  } else {
    enemyType = "shadow_it";
    y = 480;
    width = 40;
    height = 50;
    vx = -speed * 0.5;
  }

  return { x, y, width, height, vx, vy: 0, type: "enemy", color: "#000", enemyType };
}

function createObstacle(x: number, groundY: number, speed: number): GameObject {
  const rand = Math.random();
  let techType: string;
  let color: string;

  if (rand < 0.05) {
    techType = "glitch";
    color = "#FF00FF";
  } else if (rand < 0.1) {
    techType = "ransomware";
    color = "#800080";
  } else {
    techType = TECH_TYPES[Math.floor(Math.random() * TECH_TYPES.length)];
    color = "#E31837";
  }

  const size = Math.random() < 0.5 ? 15 + Math.random() * 10 : 25 + Math.random() * 15;

  return {
    x,
    y: 80 + Math.random() * (groundY - 160),
    width: size,
    height: size,
    vx: -speed,
    vy: 0,
    type: "obstacle",
    color,
    techType,
  };
}

function createPowerup(x: number, groundY: number, speed: number): GameObject {
  const rand = Math.random();
  let powerUpType: string;
  let color: string;

  if (rand < 0.3) {
    powerUpType = "shield";
    color = "#00BFFF";
  } else if (rand < 0.6) {
    powerUpType = "coffee";
    color = "#6F4E37";
  } else if (rand < 0.8) {
    powerUpType = "admin-password";
    color = "#00FF00";
  } else {
    powerUpType = "score-multiplier";
    color = "#FFD700";
  }

  return {
    x: x + 250,
    y: 80 + Math.random() * (groundY - 160),
    width: 30,
    height: 30,
    vx: -speed,
    vy: 0,
    type: "powerup",
    color,
    powerUpType,
  };
}

export function spawnShadowItProjectile(
  objects: readonly GameObject[],
  speed: number
): GameObject[] {
  const projectiles: GameObject[] = [];
  for (const obj of objects) {
    if (obj.type === "enemy" && obj.enemyType === "shadow_it") {
      if (Math.random() < 0.008) {
        projectiles.push({
          x: obj.x,
          y: obj.y + 10,
          width: 20,
          height: 10,
          vx: -speed * 2,
          vy: 0,
          type: "projectile",
          color: "#F00",
          projectileType: "packet",
        });
      }
    }
  }
  return projectiles;
}
