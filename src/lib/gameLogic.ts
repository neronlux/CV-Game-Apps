/**
 * @fileoverview Minimal game utilities (difficulty, level names)
 * @module src/lib/gameLogic
 * @author Nathan Luxford
 *
 * NOTE: The original project had a Vector3-based collision system from an
 * abandoned Three.js implementation. The live canvas game uses its own
 * plain-object AABB collision. We keep only the actually-used helpers here
 * to avoid pulling in the entire 'three' dependency.
 */

export function getCareerLevelName(level: number): string {
  const levels = [
    "AssetWare Technology",
    "Rock IT Ltd",
    "Eze Castle Integration",
    "Agilisys",
    "Interoute",
    "Kaplan International",
    "Tesco Technology",
  ];

  return levels[level - 1] || "Unknown Level";
}

export function getLevelDifficulty(level: number): {
  obstacleSpeed: number;
  obstacleFrequency: number;
  collectibleValue: number;
} {
  const baseSpeed = 1;
  const baseFrequency = 0.5;
  const baseValue = 10;

  return {
    obstacleSpeed: baseSpeed + (level - 1) * 0.3,
    obstacleFrequency: baseFrequency + (level - 1) * 0.2,
    collectibleValue: baseValue + (level - 1) * 5,
  };
}

export function calculateScore(level: number, timeElapsed: number): number {
  const baseScore = 100;
  const levelMultiplier = level * 50;
  const timeBonus = Math.max(0, 300 - timeElapsed);
  return baseScore + levelMultiplier + timeBonus;
}
