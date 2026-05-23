import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type GamePhase = "ready" | "playing" | "ended" | "victory" | "level-transition";

interface GameState {
  gamePhase: GamePhase;
  score: number;
  lives: number;
  sanity: number;
  currentLevel: number;
  levelTransitionStartTime: number | null;
  maxCombo: number;

  startGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  addScore: (points: number) => void;
  loseSanity: (amount: number) => void;
  recoverSanity: (amount: number) => void;
  nextLevel: () => void;
  startLevelTransition: () => void;
  continuePlaying: () => void;
}

export const useGameState = create<GameState>()(
  subscribeWithSelector((set) => ({
    gamePhase: "ready",
    score: 0,
    lives: 5,
    sanity: 100,
    currentLevel: 1,
    levelTransitionStartTime: null,
    maxCombo: 0,

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
        levelTransitionStartTime: null,
        maxCombo: 0,
      });
    },

    addScore: (points) => {
      set((state) => ({ score: state.score + points }));
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
      set((state) => ({ currentLevel: state.currentLevel + 1 }));
    },

    startLevelTransition: () => {
      set({ gamePhase: "level-transition", levelTransitionStartTime: Date.now() });
    },

    continuePlaying: () => {
      set({ gamePhase: "playing", levelTransitionStartTime: null });
    },
  }))
);
