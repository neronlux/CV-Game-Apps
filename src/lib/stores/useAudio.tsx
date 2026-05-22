/**
 * @fileoverview Zustand store for audio management and playback
 * @module src/lib/stores/useAudio
 * @author Nathan Luxford
 *
 * All audio is now bundled locally in public/sounds/.
 * Original remote tracks were from assets.ntek.app — they have been downloaded
 * and included for offline / Play Store distribution.
 *
 * IMPORTANT LICENSING NOTE:
 * The background music ("Play Me Like That Video Game" by Josef Bel Habib)
 * and explosion sound are currently bundled. These tracks may require
 * commercial redistribution rights (Epidemic Sound / similar). Before
 * publishing to Google Play, verify licensing or replace with CC0 / properly
 * licensed 8-bit game audio.
 */

import { create } from "zustand";

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

  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setExplosionSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setComboSound: (sound: HTMLAudioElement) => void;
  setBossSound: (sound: HTMLAudioElement) => void;
  setBossDefeatSound: (sound: HTMLAudioElement) => void;

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

  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setExplosionSound: (sound) => set({ explosionSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setComboSound: (sound) => set({ comboSound: sound }),
  setBossSound: (sound) => set({ bossSound: sound }),
  setBossDefeatSound: (sound) => set({ bossDefeatSound: sound }),

  initializeAudio: () => {
    const { isInitialized, volume } = get();
    if (isInitialized) return;

    // All paths are now local (bundled in the APK for offline Play Store builds)
    const backgroundMusic = new Audio("/sounds/background-music.mp3");
    backgroundMusic.loop = true;
    backgroundMusic.volume = volume * 0.6;
    backgroundMusic.preload = "auto";

    const hitSound = new Audio("/sounds/hit.mp3");
    hitSound.volume = volume * 0.6;
    hitSound.preload = "auto";

    const explosionSound = new Audio("/sounds/explosion.mp3");
    explosionSound.volume = volume * 0.8;
    explosionSound.preload = "auto";

    const successSound = new Audio("/sounds/success.mp3");
    successSound.volume = volume * 0.6;
    successSound.preload = "auto";

    const comboSound = new Audio("/sounds/combo.mp3");
    comboSound.volume = volume * 0.7;
    comboSound.preload = "auto";

    // Boss sound re-uses the explosion track (same as original behavior)
    const bossSound = new Audio("/sounds/explosion.mp3");
    bossSound.volume = volume * 0.8;
    bossSound.preload = "auto";

    const bossDefeatSound = new Audio("/sounds/success.mp3");
    bossDefeatSound.volume = volume * 0.9;
    bossDefeatSound.preload = "auto";

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

    const {
      backgroundMusic,
      hitSound,
      explosionSound,
      successSound,
      comboSound,
      bossSound,
      bossDefeatSound,
    } = get();

    if (backgroundMusic) backgroundMusic.volume = volume * 0.6;
    if (hitSound) hitSound.volume = volume * 0.6;
    if (explosionSound) explosionSound.volume = volume * 0.8;
    if (successSound) successSound.volume = volume * 0.6;
    if (comboSound) comboSound.volume = volume * 0.7;
    if (bossSound) bossSound.volume = volume * 0.8;
    if (bossDefeatSound) bossDefeatSound.volume = volume * 0.9;
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
    if (backgroundMusic) {
      backgroundMusic.pause();
    }
  },

  playHit: () => {
    const { hitSound, isMuted, volume } = get();
    if (hitSound && !isMuted) {
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = volume * 0.6;
      soundClone.play().catch((error) => {
        console.warn("Hit sound play prevented:", error);
      });
    }
  },

  playExplosion: () => {
    const { explosionSound, isMuted, volume } = get();
    if (explosionSound && !isMuted) {
      const soundClone = explosionSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = volume * 0.8;
      soundClone.play().catch((error) => {
        console.warn("Explosion sound play prevented:", error);
      });
    }
  },

  playSuccess: () => {
    const { successSound, isMuted, volume } = get();
    if (successSound && !isMuted) {
      successSound.currentTime = 0;
      successSound.volume = volume * 0.6;
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
      comboSound.volume = Math.min(volume * 0.7, volume * 0.9);
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
      bossSound.volume = volume * 0.8;
      bossSound.play().catch((error) => {
        console.warn("Boss sound play prevented:", error);
      });
    }
  },

  playBossDefeat: () => {
    const { bossDefeatSound, isMuted, volume } = get();
    if (bossDefeatSound && !isMuted) {
      bossDefeatSound.currentTime = 0;
      bossDefeatSound.volume = volume * 0.9;
      bossDefeatSound.play().catch((error) => {
        console.warn("Boss defeat sound play prevented:", error);
      });
    }
  },
}));
