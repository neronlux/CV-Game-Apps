import { create } from "zustand";
import { VOLUME_MULTIPLIERS } from "../game/constants";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  explosionSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  comboSound: HTMLAudioElement | null;
  bossSound: HTMLAudioElement | null;
  bossDefeatSound: HTMLAudioElement | null;
  isMuted: boolean;
  isInitialized: boolean;
  volume: number;

  toggleMute: () => void;
  setVolume: (volume: number) => void;
  playHit: () => void;
  playExplosion: () => void;
  playSuccess: () => void;
  playCombo: (comboLevel: number) => void;
  playBoss: () => void;
  playBossDefeat: () => void;
  playBackgroundMusic: () => void;
  pauseBackgroundMusic: () => void;
  initializeAudio: () => void;
}

function applyVolumeMultiplier(
  audio: HTMLAudioElement | null,
  volume: number,
  key: keyof typeof VOLUME_MULTIPLIERS
) {
  if (audio) audio.volume = volume * VOLUME_MULTIPLIERS[key];
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  explosionSound: null,
  successSound: null,
  comboSound: null,
  bossSound: null,
  bossDefeatSound: null,
  isMuted: false,
  isInitialized: false,
  volume: 0.5,

  initializeAudio: () => {
    const { isInitialized, volume } = get();
    if (isInitialized) return;

    const backgroundMusic = new Audio("/sounds/background-music.mp3");
    backgroundMusic.loop = true;
    backgroundMusic.preload = "auto";
    applyVolumeMultiplier(backgroundMusic, volume, "background");

    const hitSound = new Audio("/sounds/hit.mp3");
    hitSound.preload = "auto";
    applyVolumeMultiplier(hitSound, volume, "hit");

    const explosionSound = new Audio("/sounds/explosion.mp3");
    explosionSound.preload = "auto";
    applyVolumeMultiplier(explosionSound, volume, "explosion");

    const successSound = new Audio("/sounds/success.mp3");
    successSound.preload = "auto";
    applyVolumeMultiplier(successSound, volume, "success");

    const comboSound = new Audio("/sounds/combo.mp3");
    comboSound.preload = "auto";
    applyVolumeMultiplier(comboSound, volume, "combo");

    const bossSound = new Audio("/sounds/explosion.mp3");
    bossSound.preload = "auto";
    applyVolumeMultiplier(bossSound, volume, "boss");

    const bossDefeatSound = new Audio("/sounds/success.mp3");
    bossDefeatSound.preload = "auto";
    applyVolumeMultiplier(bossDefeatSound, volume, "bossDefeat");

    set({
      backgroundMusic,
      hitSound,
      explosionSound,
      successSound,
      comboSound,
      bossSound,
      bossDefeatSound,
      isInitialized: true,
    });
  },

  toggleMute: () => {
    const { isMuted, backgroundMusic } = get();
    const newMutedState = !isMuted;
    set({ isMuted: newMutedState });
    if (backgroundMusic) {
      if (newMutedState) {
        backgroundMusic.pause();
      } else {
        backgroundMusic.play().catch((error) => {
          console.warn("Background music play prevented:", error);
        });
      }
    }
  },

  setVolume: (newVolume: number) => {
    const volume = Math.max(0, Math.min(1, newVolume));
    set({ volume });
    const state = get();
    applyVolumeMultiplier(state.backgroundMusic, volume, "background");
    applyVolumeMultiplier(state.hitSound, volume, "hit");
    applyVolumeMultiplier(state.explosionSound, volume, "explosion");
    applyVolumeMultiplier(state.successSound, volume, "success");
    applyVolumeMultiplier(state.comboSound, volume, "combo");
    applyVolumeMultiplier(state.bossSound, volume, "boss");
    applyVolumeMultiplier(state.bossDefeatSound, volume, "bossDefeat");
  },

  playBackgroundMusic: () => {
    const { backgroundMusic, isMuted } = get();
    if (backgroundMusic && !isMuted) {
      backgroundMusic.play().catch((error) => {
        console.warn("Background music play prevented:", error);
      });
    }
  },

  pauseBackgroundMusic: () => {
    const { backgroundMusic } = get();
    if (backgroundMusic) backgroundMusic.pause();
  },

  playHit: () => {
    const { hitSound, isMuted, volume } = get();
    if (hitSound && !isMuted) {
      const clone = hitSound.cloneNode() as HTMLAudioElement;
      applyVolumeMultiplier(clone, volume, "hit");
      clone.play().catch((error) => {
        console.warn("Hit sound play prevented:", error);
      });
    }
  },

  playExplosion: () => {
    const { explosionSound, isMuted, volume } = get();
    if (explosionSound && !isMuted) {
      const clone = explosionSound.cloneNode() as HTMLAudioElement;
      applyVolumeMultiplier(clone, volume, "explosion");
      clone.play().catch((error) => {
        console.warn("Explosion sound play prevented:", error);
      });
    }
  },

  playSuccess: () => {
    const { successSound, isMuted, volume } = get();
    if (successSound && !isMuted) {
      successSound.currentTime = 0;
      applyVolumeMultiplier(successSound, volume, "success");
      successSound.play().catch((error) => {
        console.warn("Success sound play prevented:", error);
      });
    }
  },

  playCombo: (comboLevel: number) => {
    const { comboSound, isMuted, volume } = get();
    if (comboSound && !isMuted) {
      const pitchShift = 1 + (comboLevel - 1) * 0.1;
      comboSound.currentTime = 0;
      comboSound.volume = Math.min(volume * VOLUME_MULTIPLIERS.combo, volume * 0.9);
      comboSound.playbackRate = Math.min(pitchShift, 2);
      comboSound.play().catch((error) => {
        console.warn("Combo sound play prevented:", error);
      });
    }
  },

  playBoss: () => {
    const { bossSound, isMuted, volume } = get();
    if (bossSound && !isMuted) {
      bossSound.currentTime = 0;
      applyVolumeMultiplier(bossSound, volume, "boss");
      bossSound.play().catch((error) => {
        console.warn("Boss sound play prevented:", error);
      });
    }
  },

  playBossDefeat: () => {
    const { bossDefeatSound, isMuted, volume } = get();
    if (bossDefeatSound && !isMuted) {
      bossDefeatSound.currentTime = 0;
      applyVolumeMultiplier(bossDefeatSound, volume, "bossDefeat");
      bossDefeatSound.play().catch((error) => {
        console.warn("Boss defeat sound play prevented:", error);
      });
    }
  },
}));
