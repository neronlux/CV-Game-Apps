/**
 * @fileoverview Zustand store for game state management
 * @module src/lib/stores/useGameState
 * @author Nathan Luxford
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

/**
 * Possible game phases in the game lifecycle
 */
export type GamePhase = "ready" | "playing" | "ended" | "victory" | "level-transition";

/**
 * Achievement structure for tracking unlocked achievements
 */
interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

/**
 * Game state interface including all tracked game data and actions
 */
interface GameState {
  gamePhase: GamePhase;
  score: number;
  lives: number;
  sanity: number;
  currentLevel: number;
  achievements: Achievement[];
  levelTransitionStartTime: number | null;

  // Combo system
  combo: number;
  comboMultiplier: number;
  lastComboTime: number;
  maxCombo: number;

  // Boss system
  bossActive: boolean;
  bossHP: number;
  bossMaxHP: number;
  bossDefeated: boolean;

  // Actions
  startGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  addScore: (points: number) => void;
  loseLife: () => void;
  loseSanity: (amount: number) => void;
  recoverSanity: (amount: number) => void;
  nextLevel: () => void;
  startLevelTransition: () => void;
  continuePlaying: () => void;
  unlockAchievement: (achievementId: string) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  spawnBoss: (hp: number) => void;
  damageBoss: (amount: number) => void;
  defeatBoss: () => void;
}

export const useGameState = create<GameState>()(
  subscribeWithSelector((set) => ({
    gamePhase: "ready",
    score: 0,
    lives: 5,
    sanity: 100,
    currentLevel: 1,
    achievements: [],
    levelTransitionStartTime: null,

    // Combo system
    combo: 0,
    comboMultiplier: 1,
    lastComboTime: 0,
    maxCombo: 0,

    // Boss system
    bossActive: false,
    bossHP: 0,
    bossMaxHP: 0,
    bossDefeated: false,

    startGame: () => {
      set({ gamePhase: "playing", sanity: 100 });
    },

    endGame: () => {
      set({ gamePhase: "ended" });
    },

    resetGame: () => {
      set({
        gamePhase: "ready",
        score: 0,
        lives: 5,
        sanity: 100,
        currentLevel: 1,
        achievements: [],
        levelTransitionStartTime: null,
        combo: 0,
        comboMultiplier: 1,
        lastComboTime: 0,
        maxCombo: 0,
        bossActive: false,
        bossHP: 0,
        bossMaxHP: 0,
        bossDefeated: false,
      });
    },

    addScore: (points) => {
      set((state) => ({ score: state.score + points }));
    },

    loseLife: () => {
      set((state) => {
        const newLives = state.lives - 1;
        if (newLives <= 0) {
          return { lives: 0, gamePhase: "ended" };
        }
        return { lives: newLives };
      });
    },

    loseSanity: (amount) => {
      set((state) => {
        const newSanity = Math.max(0, state.sanity - amount);
        if (newSanity <= 0) {
          return { sanity: 0, gamePhase: "ended" };
        }
        return { sanity: newSanity };
      });
    },

    recoverSanity: (amount) => {
      set((state) => ({ sanity: Math.min(100, state.sanity + amount) }));
    },

    nextLevel: () => {
      set((state) => ({
        currentLevel: state.currentLevel + 1,
      }));
    },

    startLevelTransition: () => {
      set({
        gamePhase: "level-transition",
        levelTransitionStartTime: Date.now(),
      });
    },

    continuePlaying: () => {
      set({
        gamePhase: "playing",
        levelTransitionStartTime: null,
      });
    },

    unlockAchievement: (achievementId) => {
      set((state) => ({
        achievements: state.achievements.map((achievement) =>
          achievement.id === achievementId ? { ...achievement, unlocked: true } : achievement
        ),
      }));
    },

    incrementCombo: () => {
      const now = Date.now();
      const COMBO_TIMEOUT = 2000;

      set((state) => {
        const newCombo = now - state.lastComboTime < COMBO_TIMEOUT ? state.combo + 1 : 1;
        const newMultiplier = newCombo <= 2 ? 1 : newCombo <= 5 ? 2 : newCombo <= 10 ? 3 : 5;

        return {
          combo: newCombo,
          comboMultiplier: newMultiplier,
          lastComboTime: now,
          maxCombo: Math.max(state.maxCombo, newCombo),
        };
      });
    },

    resetCombo: () => {
      set({ combo: 0, comboMultiplier: 1 });
    },

    spawnBoss: (hp) => {
      set({
        bossActive: true,
        bossHP: hp,
        bossMaxHP: hp,
        bossDefeated: false,
      });
    },

    damageBoss: (amount) => {
      set((state) => {
        const newHP = state.bossHP - amount;
        if (newHP <= 0) {
          return { bossHP: 0 };
        }
        return { bossHP: newHP };
      });
    },

    defeatBoss: () => {
      set({ bossDefeated: true });
    },
  }))
);
