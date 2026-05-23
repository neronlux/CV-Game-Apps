import React, { useRef, useEffect, useCallback, useState } from "react";
import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";
import { useIsMobile } from "../hooks/use-is-mobile";
import { gameData } from "../data/gameData";
import { triggerImpact, triggerNotification, getPref, setPref } from "../lib/capacitor";
import type { Player, GameStateRef, StatusEffectType, Particle } from "../lib/game/types";
import {
  HIGH_SCORE_KEY,
  GROUND_OFFSET,
  TECH_TYPES,
  LEVEL_COMPLETION_DISTANCE,
  BOSS_SPAWN_DISTANCE,
  PLAYER_ATTACK_COOLDOWN,
  LAG_DELAY,
  LEVEL7_DURATION,
  MIN_TRANSITION_TIME,
  PARTICLE_BUDGET_DESKTOP,
  PARTICLE_BUDGET_MOBILE,
  BOSS_ATTACK_INTERVAL,
  getScaleFactor,
} from "../lib/game/constants";
import { checkCollision, getEndScreenButtonLayout } from "../lib/game/collision";
import { handleCollision, type CollisionContext } from "../lib/game/collisionHandlers";
import { drawPlayer, drawParticles, drawFloatingTexts } from "../lib/game/renderer/drawPlayer";
import { drawObstacle } from "../lib/game/renderer/drawObstacles";
import { drawEnemy } from "../lib/game/renderer/drawEnemies";
import { drawBackground, drawUI } from "../lib/game/renderer/drawUI";
import {
  drawLevelTransition,
  drawVictoryOverlay,
  drawEndGameScreen,
  drawPauseOverlay,
  drawBoss,
} from "../lib/game/renderer/drawScreens";
import { spawnObjects, spawnShadowItProjectile } from "../lib/game/spawner";

interface GameCanvasProps {
  onRegisterPause?: (pauseFn: () => void) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onRegisterPause }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTouchTimeRef = useRef(0);
  const resizeFrameRef = useRef<number>();
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (onRegisterPause) onRegisterPause(() => setIsPaused(true));
  }, [onRegisterPause]);

  useEffect(() => {
    getPref(HIGH_SCORE_KEY).then((stored) => {
      if (stored) {
        const parsed = Number.parseInt(stored, 10) || 0;
        setHighScore((prev) => Math.max(prev, parsed));
      }
    });
  }, []);

  const {
    currentLevel,
    gamePhase,
    score,
    lives,
    sanity,
    maxCombo,
    startGame,
    endGame,
    resetGame,
    addScore,
    loseSanity,
    nextLevel,
    startLevelTransition,
    continuePlaying,
    levelTransitionStartTime,
  } = useGameState();
  const {
    playHit,
    playExplosion,
    playSuccess,
    playCombo,
    playBoss,
    playBossDefeat,
    initializeAudio,
    playBackgroundMusic,
    pauseBackgroundMusic,
  } = useAudio();
  const isMobile = useIsMobile();

  const groundYRef = useRef(530);
  const [isPortrait, setIsPortrait] = React.useState(false);

  useEffect(() => {
    const updateOrientation = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setIsPortrait(canvas.clientWidth / canvas.clientHeight < 1);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      if (window.visualViewport)
        window.visualViewport.removeEventListener("resize", updateOrientation);
    };
  }, []);

  const playerRef = useRef<Player>({
    x: 150,
    y: 300,
    width: 60,
    height: 60,
    vy: 0,
    isFlying: false,
    jetpackActive: false,
    jetpackPower: 0,
    maxJetpackPower: 100,
  });

  const gameStateRef = useRef<GameStateRef>({
    speed: 2.5,
    distance: 0,
    objects: [],
    backgroundOffset: 0,
    mouseDown: false,
    mouseDownTime: 0,
    level7StartTime: null,
    lastFrameTime: 0,
    particles: [],
    floatingTexts: [],
    shake: 0,
    shieldActive: false,
    shieldTime: 0,
    scoreMultiplier: 1,
    multiplierTime: 0,
    score: 0,
    lives: 3,
    sanity: 100,
    activeStatusEffects: [],
    inputQueue: [],
    combo: 0,
    comboMultiplier: 1,
    lastComboTime: 0,
    maxCombo: 0,
    bossActive: false,
    bossHP: 3,
    bossMaxHP: 3,
    bossDefeated: false,
    bossAppeared: false,
    boss: null,
    hitFreeze: false,
    hitFreezeTime: 0,
    invulnerableUntil: 0,
    lastZombieDrainTime: 0,
    lastAttackTime: null,
  });

  useEffect(() => {
    gameStateRef.current.score = score;
    gameStateRef.current.lives = lives;
    gameStateRef.current.sanity = sanity;
  }, [score, lives, sanity]);

  useEffect(() => {
    if (gameStateRef.current.maxCombo > maxCombo) {
      useGameState.setState({ maxCombo: gameStateRef.current.maxCombo });
    }
  }, [gamePhase, maxCombo]);

  useEffect(() => {
    if (gamePhase !== "ended") return;
    pauseBackgroundMusic();
    const finalScore = Math.floor(gameStateRef.current.score);
    setHighScore((prev) => {
      if (finalScore > prev) {
        setPref(HIGH_SCORE_KEY, String(finalScore));
        return finalScore;
      }
      return prev;
    });
  }, [gamePhase, pauseBackgroundMusic]);

  useEffect(() => {
    if (gamePhase !== "playing") setIsPaused(false);
  }, [gamePhase]);

  const resizeCanvas = useCallback(
    (canvas: HTMLCanvasElement) => {
      let width = window.innerWidth;
      let height = window.innerHeight;
      if (window.visualViewport) {
        width = window.visualViewport.width;
        height = window.visualViewport.height;
      }
      if (width === 0 || height === 0) {
        width = document.documentElement.clientWidth;
        height = document.documentElement.clientHeight;
      }
      width = Math.max(width, 320);
      height = Math.max(height, 240);
      const maxDpr = isMobile ? 2 : 2.5;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
      }
      gameStateRef.current.lastFrameTime = 0;
      document.documentElement.style.setProperty("--vh", `${height * 0.01}px`);
      groundYRef.current = height - GROUND_OFFSET;
    },
    [isMobile]
  );

  const addStatusEffect = (type: StatusEffectType, duration: number) => {
    const existing = gameStateRef.current.activeStatusEffects.find((e) => e.type === type);
    if (existing) {
      existing.startTime = Date.now();
      existing.duration = duration;
    } else {
      gameStateRef.current.activeStatusEffects.push({ type, startTime: Date.now(), duration });
    }
  };

  const hasStatusEffect = (type: StatusEffectType) =>
    gameStateRef.current.activeStatusEffects.some((e) => e.type === type);

  const spawnParticles = (
    x: number,
    y: number,
    type: Particle["type"],
    count: number,
    color?: string
  ) => {
    const budget = isMobile ? PARTICLE_BUDGET_MOBILE : PARTICLE_BUDGET_DESKTOP;
    if (gameStateRef.current.particles.length >= budget) return;
    const adjustedCount = Math.min(
      Math.ceil(count * (isMobile ? 0.55 : 1)),
      budget - gameStateRef.current.particles.length
    );
    for (let i = 0; i < adjustedCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      gameStateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed + (type === "fire" ? -2 : 0),
        vy: Math.sin(angle) * speed + (type === "fire" ? 1 : 0),
        life: 1.0,
        maxLife: 1.0,
        color: color || "#FFF",
        size: Math.random() * 3 + 2,
        type,
        alpha: 1,
      });
    }
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string = "#FFF") => {
    gameStateRef.current.floatingTexts.push({
      id: Date.now() + Math.random(),
      x,
      y,
      text,
      life: 1.0,
      maxLife: 1.0,
      color,
      vy: -1,
      size: 20,
      opacity: 1,
    });
  };

  const getCollisionContext = useCallback(
    (): CollisionContext => ({
      player: playerRef.current,
      gameState: gameStateRef.current,
      addScore,
      loseSanity,
      addStatusEffect,
      hasStatusEffect,
      playSuccess,
      playExplosion,
      playCombo,
      playHit,
      spawnParticles,
      spawnFloatingText,
      triggerImpact,
      triggerNotification,
    }),
    [addScore, loseSanity, playSuccess, playExplosion, playCombo, playHit]
  );

  const initializeLevel = useCallback(() => {
    const currentLevelData = gameData.levels[currentLevel - 1];
    if (!currentLevelData) return;
    const gs = gameStateRef.current;
    gs.objects = [];
    gs.distance = 0;
    gs.backgroundOffset = 0;
    gs.particles = [];
    gs.floatingTexts = [];
    gs.shake = 0;
    gs.shieldActive = false;
    gs.scoreMultiplier = 1;
    gs.bossActive = false;
    gs.bossAppeared = false;
    gs.bossDefeated = false;
    gs.boss = null;
    gs.invulnerableUntil = 0;

    gs.objects.push({
      x: 200,
      y: 150,
      width: 80,
      height: 50,
      vx: -gs.speed,
      vy: 0,
      type: "company-logo",
      color: currentLevelData.backgroundColor,
      company: currentLevelData.company,
    });

    for (let i = 0; i < 15; i++) {
      const x = 500 + i * 350 + Math.random() * 150;
      if (Math.random() < 0.55) {
        const randomTechType = TECH_TYPES[Math.floor(Math.random() * TECH_TYPES.length)];
        const size = Math.random() < 0.5 ? 15 + Math.random() * 10 : 25 + Math.random() * 15;
        gs.objects.push({
          x,
          y: 150 + Math.random() * 300,
          width: size,
          height: size,
          vx: -gs.speed,
          vy: 0,
          type: "obstacle",
          color: "#E31837",
          techType: randomTechType,
        });
      }
      if (Math.random() < 0.6) {
        gs.objects.push({
          x: x + 150,
          y: 150 + Math.random() * 250,
          width: 25,
          height: 25,
          vx: -gs.speed,
          vy: 0,
          type: "collectible",
          color: "#FFD700",
        });
      }
    }

    const groundY = groundYRef.current;
    for (let i = 0; i < 50; i++) {
      gs.objects.push({
        x: i * 100,
        y: groundY,
        width: 100,
        height: GROUND_OFFSET,
        vx: -gs.speed,
        vy: 0,
        type: "ground",
        color: "#2C3E50",
      });
    }
  }, [currentLevel]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (isPaused) return;
      if (gamePhase === "ready") {
        startGame();
        initializeAudio();
        playBackgroundMusic();
        return;
      }
      if (gamePhase === "level-transition") {
        const timeElapsed = levelTransitionStartTime ? Date.now() - levelTransitionStartTime : 0;
        if (timeElapsed >= MIN_TRANSITION_TIME) {
          continuePlaying();
          initializeLevel();
        }
        return;
      }
      if (gamePhase === "ended") {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const logicalWidth = canvas.clientWidth;
        const logicalHeight = canvas.clientHeight;
        const { effectiveScale } = getScaleFactor(isMobile, logicalWidth, logicalHeight);
        const layout = getEndScreenButtonLayout(
          logicalWidth,
          logicalHeight,
          isMobile,
          effectiveScale
        );
        if (
          x >= layout.button1X &&
          x <= layout.button1X + layout.buttonWidth &&
          y >= layout.buttonY &&
          y <= layout.buttonY + layout.buttonHeight
        ) {
          window.open("https://luxford.link", "_blank", "noopener,noreferrer");
        }
        if (
          x >= layout.button2X &&
          x <= layout.button2X + layout.buttonWidth &&
          y >= layout.buttonY &&
          y <= layout.buttonY + layout.buttonHeight
        ) {
          resetGame();
        }
        return;
      }
      if (gamePhase !== "playing") return;
      if (hasStatusEffect("lag")) {
        gameStateRef.current.inputQueue.push({ time: Date.now(), type: "down" });
      } else {
        gameStateRef.current.mouseDown = true;
        gameStateRef.current.mouseDownTime = 0;
        playerRef.current.jetpackActive = true;
        playerRef.current.isFlying = true;
      }
    },
    [
      gamePhase,
      isPaused,
      startGame,
      continuePlaying,
      initializeLevel,
      levelTransitionStartTime,
      isMobile,
      resetGame,
      initializeAudio,
      playBackgroundMusic,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (hasStatusEffect("lag")) {
      gameStateRef.current.inputQueue.push({ time: Date.now(), type: "up" });
    } else {
      gameStateRef.current.mouseDown = false;
      gameStateRef.current.mouseDownTime = 0;
      playerRef.current.jetpackActive = false;
      playerRef.current.isFlying = false;
      playerRef.current.jetpackPower = 0;
    }
  }, []);

  const handleAttack = useCallback(() => {
    if (isPaused || gamePhase !== "playing" || !gameStateRef.current.bossActive) return;
    if (
      gameStateRef.current.lastAttackTime &&
      Date.now() - gameStateRef.current.lastAttackTime < PLAYER_ATTACK_COOLDOWN
    )
      return;
    gameStateRef.current.lastAttackTime = Date.now();
    const player = playerRef.current;
    gameStateRef.current.objects.push({
      x: player.x + player.width,
      y: player.y + player.height / 2,
      width: 30,
      height: 10,
      vx: 10,
      vy: 0,
      type: "projectile",
      color: "#00FF00",
      projectileType: "player_attack",
    });
    spawnParticles(player.x + player.width, player.y + player.height / 2, "sparkle", 3, "#00FF00");
  }, [gamePhase, isPaused]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isPaused) return;
      if (gamePhase === "level-transition") {
        const timeElapsed = levelTransitionStartTime ? Date.now() - levelTransitionStartTime : 0;
        if (timeElapsed >= MIN_TRANSITION_TIME) {
          continuePlaying();
          initializeLevel();
        }
        return;
      }
      const now = Date.now();
      if (gameStateRef.current.bossActive && now - lastTouchTimeRef.current < 300) {
        handleAttack();
        lastTouchTimeRef.current = 0;
        return;
      }
      lastTouchTimeRef.current = now;
      const touch = e.touches[0];
      if (touch) {
        handleMouseDown({
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation(),
        } as MouseEvent);
      }
    },
    [
      handleAttack,
      handleMouseDown,
      gamePhase,
      isPaused,
      continuePlaying,
      initializeLevel,
      levelTransitionStartTime,
    ]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleMouseUp();
    },
    [handleMouseUp]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const drawObjects = (ctx: CanvasRenderingContext2D) => {
    gameStateRef.current.objects.forEach((obj) => {
      ctx.fillStyle = obj.color;
      if (obj.type === "company-logo") {
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(obj.company || "", obj.x + obj.width / 2, obj.y + obj.height / 2 + 4);
      } else if (obj.type === "collectible" && !obj.collected) {
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const radius = obj.width / 2;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Date.now() * 0.005);
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFA500";
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        if (Math.random() > 0.95) {
          ctx.fillStyle = "#FFF";
          ctx.beginPath();
          ctx.arc(radius * 0.5, -radius * 0.5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (obj.techType === "ticket") {
          ctx.fillStyle = "#FFF";
          ctx.fillRect(centerX - 12, centerY - 10, 24, 20);
          ctx.fillStyle = "#0052CC";
          ctx.fillRect(centerX - 12, centerY - 10, 24, 5);
          ctx.fillStyle = "#000";
          ctx.fillRect(centerX - 8, centerY, 16, 2);
          ctx.fillRect(centerX - 8, centerY + 4, 12, 2);
        } else {
          ctx.fillText("XP", centerX, centerY);
        }
      } else if (obj.type === "powerup") {
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        ctx.save();
        ctx.translate(centerX, centerY);
        const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
        ctx.scale(pulse, pulse);
        let color = "#FFD700";
        let icon = "2x";
        if (obj.powerUpType === "shield") {
          color = "#00BFFF";
          icon = "\uD83D\uDEE1\uFE0F";
        } else if (obj.powerUpType === "coffee") {
          color = "#6F4E37";
          icon = "\u2615";
        } else if (obj.powerUpType === "admin-password") {
          color = "#00FF00";
          icon = "\uD83D\uDD11";
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, obj.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(icon, 0, 0);
        ctx.restore();
      } else if (obj.type === "obstacle") {
        drawObstacle(ctx, obj);
      } else if (obj.type === "enemy") {
        drawEnemy(ctx, obj, playerRef.current);
      } else if (obj.type === "projectile") {
        ctx.fillStyle = "#F00";
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        ctx.strokeStyle = "#FFF";
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        ctx.fillStyle = "#FFF";
        ctx.font = "8px Monospace";
        ctx.fillText("IP CONFLICT", obj.x + 2, obj.y + 8);
      } else if (obj.type === "ground") {
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      }
    });
  };

  const gameLoop = useCallback(
    (currentTime?: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const logicalWidth = canvas.clientWidth;
      const logicalHeight = canvas.clientHeight;

      if (!gameStateRef.current.lastFrameTime) {
        gameStateRef.current.lastFrameTime = currentTime || performance.now();
      }
      const frameTime = currentTime || performance.now();
      const rawDeltaTime = frameTime - gameStateRef.current.lastFrameTime;
      const deltaTime = Math.min(Math.max(rawDeltaTime, 0), 33.34);
      gameStateRef.current.lastFrameTime = frameTime;
      const normalizedDelta = deltaTime / 16.67;

      ctx.save();
      if (gameStateRef.current.shake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * gameStateRef.current.shake,
          (Math.random() - 0.5) * gameStateRef.current.shake
        );
        gameStateRef.current.shake *= 0.9;
        if (gameStateRef.current.shake < 0.5) gameStateRef.current.shake = 0;
      }

      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = isMobile ? "medium" : "high";

      if (isPaused && gamePhase === "playing") {
        drawBackground(ctx, logicalWidth, logicalHeight, gameStateRef.current.backgroundOffset);
        drawObjects(ctx);
        drawParticles(ctx, gameStateRef.current.particles);
        drawPlayer(ctx, playerRef.current, gameStateRef.current);
        drawFloatingTexts(ctx, gameStateRef.current.floatingTexts);
        drawUI(
          ctx,
          logicalWidth,
          logicalHeight,
          gameStateRef.current,
          currentLevel,
          gamePhase,
          isMobile,
          isPortrait
        );
        drawPauseOverlay(ctx, logicalWidth, logicalHeight, isMobile);
        ctx.restore();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (gamePhase === "playing" || gamePhase === "level-transition" || gamePhase === "victory") {
        const gameState = gameStateRef.current;
        const player = playerRef.current;

        if (gameState.hitFreeze) {
          gameState.hitFreezeTime -= deltaTime;
          if (gameState.hitFreezeTime <= 0) gameState.hitFreeze = false;
          drawBackground(ctx, logicalWidth, logicalHeight, gameState.backgroundOffset);
          drawObjects(ctx);
          if (gameState.bossActive && gameState.boss) {
            const boss = gameState.boss;
            ctx.save();
            ctx.shadowColor = boss.color;
            ctx.shadowBlur = 30;
            ctx.fillStyle = boss.color;
            ctx.beginPath();
            ctx.arc(boss.x, boss.y, 45, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          drawParticles(ctx, gameState.particles);
          drawPlayer(ctx, player, gameState);
          drawFloatingTexts(ctx, gameState.floatingTexts);
          drawUI(
            ctx,
            logicalWidth,
            logicalHeight,
            gameState,
            currentLevel,
            gamePhase,
            isMobile,
            isPortrait
          );
          if (gamePhase === "level-transition")
            drawLevelTransition(
              ctx,
              logicalWidth,
              logicalHeight,
              currentLevel,
              levelTransitionStartTime,
              isMobile
            );
          ctx.restore();
          gameLoopRef.current = requestAnimationFrame(gameLoop);
          return;
        }

        const now = Date.now();
        gameState.activeStatusEffects = gameState.activeStatusEffects.filter(
          (e) => now - e.startTime < e.duration
        );

        if (hasStatusEffect("lag")) {
          while (
            gameState.inputQueue.length > 0 &&
            now - gameState.inputQueue[0].time >= LAG_DELAY
          ) {
            const input = gameState.inputQueue.shift();
            if (input) {
              if (input.type === "down") {
                gameState.mouseDown = true;
                gameState.mouseDownTime = 0;
                player.jetpackActive = true;
                player.isFlying = true;
              } else {
                gameState.mouseDown = false;
                gameState.mouseDownTime = 0;
                player.jetpackActive = false;
                player.isFlying = false;
                player.jetpackPower = 0;
              }
            }
          }
        } else if (gameState.inputQueue.length > 0) {
          gameState.inputQueue = [];
        }

        if (gameState.scoreMultiplier > 1) {
          gameState.multiplierTime -= normalizedDelta * 16.67;
          if (gameState.multiplierTime <= 0) gameState.scoreMultiplier = 1;
        }
        if (gameState.shieldActive) {
          gameState.shieldTime -= normalizedDelta * 16.67;
          if (gameState.shieldTime <= 0) gameState.shieldActive = false;
        }

        const gravity = (hasStatusEffect("ticket_bloat") ? 0.5 : 0.35) * normalizedDelta;
        if (gameState.mouseDown) {
          gameState.mouseDownTime += normalizedDelta;
          player.jetpackPower = Math.min(
            player.jetpackPower + 1.5 * normalizedDelta,
            player.maxJetpackPower
          );
        } else {
          gameState.mouseDownTime = 0;
          player.jetpackPower = Math.max(player.jetpackPower - 4 * normalizedDelta, 0);
        }

        let thrustMultiplier = player.jetpackPower / player.maxJetpackPower;
        if (hasStatusEffect("ticket_bloat")) thrustMultiplier *= 0.6;
        const maxJetpackForce = 0.45 * normalizedDelta;
        const currentJetpackForce = thrustMultiplier * maxJetpackForce;

        if (player.jetpackActive) {
          player.vy -= currentJetpackForce;
          player.vy = Math.max(player.vy, hasStatusEffect("pressure") ? -3 : -5);
        } else {
          player.vy += gravity;
          player.vy = Math.min(player.vy, 5);
        }

        player.y += player.vy * normalizedDelta;
        const groundY = groundYRef.current;
        if (player.y + player.height > groundY) {
          player.y = groundY - player.height;
          player.vy = Math.min(player.vy, 0);
        }
        if (player.y < 20) {
          player.y = 20;
          player.vy = Math.max(player.vy, 0);
        }

        const baseSpeed = 2.5;
        const speedIncrease = Math.min(gameState.distance / 15000, 1.0);
        gameState.speed = baseSpeed + speedIncrease;
        if (hasStatusEffect("caffeinated")) gameState.speed *= 1.5;

        if (!gameState.bossActive) {
          gameState.distance += gameState.speed * normalizedDelta;
          gameState.backgroundOffset += gameState.speed * normalizedDelta;
        }

        gameState.particles.forEach((p) => {
          p.x += p.vx * normalizedDelta;
          p.y += p.vy * normalizedDelta;
          p.life -= 0.02 * normalizedDelta;
          p.alpha = Math.max(0, p.life / p.maxLife);
        });
        gameState.particles = gameState.particles.filter((p) => p.life > 0);

        gameState.floatingTexts.forEach((t) => {
          t.y += t.vy * normalizedDelta;
          t.life -= 0.015 * normalizedDelta;
          t.opacity = Math.max(0, t.life / t.maxLife);
        });
        gameState.floatingTexts = gameState.floatingTexts.filter((t) => t.life > 0);

        const collisionCtx = getCollisionContext();
        gameState.objects.forEach((obj) => {
          obj.x += obj.vx * normalizedDelta;

          if (obj.projectileType === "player_attack" && gameState.bossActive && gameState.boss) {
            const boss = gameState.boss;
            const bossHitbox = { x: boss.x - 45, y: boss.y - 45, width: 90, height: 90 };
            if (checkCollision(obj, bossHitbox)) {
              gameState.bossHP -= 1;
              playSuccess();
              spawnParticles(obj.x, obj.y, "sparkle", 12, "#00FF00");
              spawnFloatingText(boss.x, boss.y - 50, "-1 HP!", "#00FF00");
              obj.x = -1000;
              gameState.shake = 5;
            }
          }

          if (checkCollision(player, obj)) {
            handleCollision(obj, collisionCtx);
          }
        });

        gameState.objects.forEach((obj) => {
          const canNearMiss =
            obj.type === "obstacle" || obj.type === "enemy" || obj.projectileType === "boss_attack";
          const passedPlayer = obj.x + obj.width < player.x && obj.x + obj.width > player.x - 45;
          const verticalDistance = Math.abs(
            obj.y + obj.height / 2 - (player.y + player.height / 2)
          );
          if (
            canNearMiss &&
            !obj.nearMissed &&
            passedPlayer &&
            verticalDistance < player.height * 0.9
          ) {
            obj.nearMissed = true;
            addScore(25);
            spawnFloatingText(player.x, player.y - 32, "Near miss +25", "#38BDF8");
            spawnParticles(
              player.x + player.width / 2,
              player.y + player.height / 2,
              "sparkle",
              4,
              "#38BDF8"
            );
          }
        });

        gameState.objects = gameState.objects.filter(
          (obj) =>
            obj.x > -100 &&
            !((obj.type === "collectible" || obj.type === "powerup") && obj.collected)
        );

        const prevDistance = gameState.distance - gameState.speed * normalizedDelta;
        const newObjects = spawnObjects(
          logicalWidth,
          groundYRef.current,
          gameState.speed,
          currentLevel,
          gameState.bossActive,
          normalizedDelta,
          gameState.distance,
          prevDistance
        );
        gameState.objects.push(...newObjects);

        const shadowProjectiles = spawnShadowItProjectile(gameState.objects, gameState.speed);
        gameState.objects.push(...shadowProjectiles);

        if (currentLevel >= 7 && gamePhase === "playing") {
          if (gameState.level7StartTime === null) {
            gameState.level7StartTime = Date.now();
          } else if (Date.now() - gameState.level7StartTime > LEVEL7_DURATION) {
            endGame();
          }
        }

        if (
          gameState.distance > BOSS_SPAWN_DISTANCE &&
          !gameState.bossActive &&
          !gameState.bossAppeared &&
          gamePhase === "playing"
        ) {
          const bossData = gameData.bosses[currentLevel - 1];
          if (bossData) {
            gameState.bossActive = true;
            gameState.bossAppeared = true;
            gameState.bossHP = bossData.hp;
            gameState.bossMaxHP = bossData.hp;
            playBoss();
            gameState.boss = {
              name: bossData.name,
              color: bossData.color,
              pattern: bossData.pattern,
              x: logicalWidth + 100,
              y: logicalHeight * 0.35,
              vx: -0.8,
              vy: 0,
              attackTimer: 0,
            };
            spawnFloatingText(
              logicalWidth / 2,
              logicalHeight / 2,
              `WARNING: ${bossData.name}!`,
              "#FF0000"
            );
            gameState.shake = 8;
          }
        }

        if (gameState.bossActive && gameState.boss) {
          const boss = gameState.boss;
          boss.x += boss.vx * normalizedDelta;
          boss.attackTimer += normalizedDelta;
          if (boss.pattern === "grow_shrink") {
            boss.vy = Math.sin(Date.now() * 0.003) * 2;
            boss.y += boss.vy * normalizedDelta;
          } else if (boss.pattern === "erratic") {
            if (Math.random() < 0.02) boss.vy = (Math.random() - 0.5) * 5;
            boss.y += boss.vy * normalizedDelta;
            if (boss.y < logicalHeight * 0.1) boss.y = logicalHeight * 0.1;
            if (boss.y > groundYRef.current - 80) boss.y = groundYRef.current - 80;
          }
          if (boss.attackTimer > BOSS_ATTACK_INTERVAL) {
            boss.attackTimer = 0;
            gameState.objects.push({
              x: boss.x,
              y: boss.y + 30,
              width: 25,
              height: 15,
              vx: -4.5,
              vy: 0,
              type: "projectile",
              color: boss.color,
              projectileType: "boss_attack",
            });
          }
          const bossHitbox = { x: boss.x - 40, y: boss.y - 40, width: 80, height: 80 };
          if (checkCollision(player, bossHitbox) && Date.now() >= gameState.invulnerableUntil) {
            if (!gameState.shieldActive && !hasStatusEffect("root_access")) {
              playExplosion();
              loseSanity(15);
              gameState.combo = 0;
              gameState.comboMultiplier = 1;
              gameState.hitFreeze = true;
              gameState.hitFreezeTime = 120;
              gameState.invulnerableUntil = Date.now() + 1500;
              spawnParticles(player.x + 30, player.y + 30, "debris", 10, "#E31837");
              gameState.shake = 12;
            }
          }
          if (gameState.bossHP <= 0) {
            gameState.bossActive = false;
            gameState.bossDefeated = true;
            gameState.boss = null;
            triggerNotification("success");
            playBossDefeat();
            addScore(500);
            useGameState.getState().recoverSanity(50);
            spawnFloatingText(
              logicalWidth / 2,
              logicalHeight / 2 - 50,
              "BOSS DEFEATED! +500",
              "#00FF00"
            );
            spawnParticles(logicalWidth / 2, logicalHeight / 2, "fire", 20, "#FFD700");
            gameState.shake = 12;
          }
        }

        if (
          gameState.distance > LEVEL_COMPLETION_DISTANCE &&
          currentLevel < gameData.levels.length &&
          gamePhase === "playing"
        ) {
          nextLevel();
          if (currentLevel + 1 < 7) {
            startLevelTransition();
          } else if (currentLevel + 1 === 7) {
            gameState.level7StartTime = null;
          }
          gameState.distance = 0;
        }
      }

      drawBackground(ctx, logicalWidth, logicalHeight, gameStateRef.current.backgroundOffset);
      drawObjects(ctx);
      drawBoss(ctx, gameStateRef.current, logicalWidth, isMobile);
      drawParticles(ctx, gameStateRef.current.particles);
      drawPlayer(ctx, playerRef.current, gameStateRef.current);
      drawFloatingTexts(ctx, gameStateRef.current.floatingTexts);
      drawUI(
        ctx,
        logicalWidth,
        logicalHeight,
        gameStateRef.current,
        currentLevel,
        gamePhase,
        isMobile,
        isPortrait
      );

      if (gamePhase === "level-transition")
        drawLevelTransition(
          ctx,
          logicalWidth,
          logicalHeight,
          currentLevel,
          levelTransitionStartTime,
          isMobile
        );
      if (currentLevel >= 7 && gameStateRef.current.level7StartTime !== null)
        drawVictoryOverlay(ctx, logicalWidth, logicalHeight, gameStateRef.current, isMobile);
      if (gamePhase === "ended")
        drawEndGameScreen(
          ctx,
          logicalWidth,
          logicalHeight,
          gameStateRef.current,
          highScore,
          isMobile
        );

      ctx.restore();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    },
    [
      gamePhase,
      isPaused,
      currentLevel,
      addScore,
      loseSanity,
      playHit,
      playExplosion,
      playSuccess,
      playCombo,
      playBoss,
      playBossDefeat,
      nextLevel,
      startLevelTransition,
      endGame,
      resetGame,
      initializeLevel,
      highScore,
      isMobile,
      isPortrait,
      levelTransitionStartTime,
      getCollisionContext,
    ]
  );

  useEffect(() => {
    initializeLevel();
  }, [currentLevel, initializeLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeCanvas(canvas);
    const preventDefault = (e: Event) => e.preventDefault();
    const focusCanvas = () => canvas.focus({ preventScroll: true });
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousedown", focusCanvas);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchstart", focusCanvas, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("contextmenu", preventDefault);
    canvas.addEventListener("gesturestart", preventDefault);
    canvas.addEventListener("gesturechange", preventDefault);
    canvas.addEventListener("gestureend", preventDefault);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === "KeyP" || e.code === "Escape") && gamePhase === "playing") {
        e.preventDefault();
        handleMouseUp();
        setIsPaused((paused) => !paused);
        return;
      }
      if (isPaused) return;
      if (e.code === "Enter" && gamePhase === "ready") {
        e.preventDefault();
        startGame();
        initializeAudio();
        playBackgroundMusic();
        return;
      }
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gamePhase === "ready") {
          startGame();
          initializeAudio();
          playBackgroundMusic();
        }
        if (gamePhase === "playing") {
          if (gameStateRef.current.bossActive && e.code === "Space") handleAttack();
          gameStateRef.current.mouseDown = true;
          playerRef.current.jetpackActive = true;
          playerRef.current.isFlying = true;
        }
      }
      if ((e.code === "KeyX" || e.code === "KeyJ") && gamePhase === "playing") {
        e.preventDefault();
        handleAttack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleMouseUp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousedown", focusCanvas);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchstart", focusCanvas);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("contextmenu", preventDefault);
      canvas.removeEventListener("gesturestart", preventDefault);
      canvas.removeEventListener("gesturechange", preventDefault);
      canvas.removeEventListener("gestureend", preventDefault);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    gamePhase,
    isPaused,
    startGame,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleAttack,
    gameLoop,
    resizeCanvas,
    initializeAudio,
    playBackgroundMusic,
  ]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = requestAnimationFrame(() => resizeCanvas(canvas));
    };
    window.addEventListener("resize", handleResize);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", handleResize);
    return () => {
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
      window.removeEventListener("resize", handleResize);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", handleResize);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      gameStateRef.current.lastFrameTime = 0;
      handleMouseUp();
      if (document.hidden && gamePhase === "playing" && !isPaused) {
        setIsPaused(true);
        pauseBackgroundMusic();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleMouseUp, gamePhase, isPaused, pauseBackgroundMusic]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 cursor-pointer bg-blue-200"
      role="application"
      aria-label="Interactive career game. Press Enter to start, hold Space or Arrow Up to fly, press X to attack bosses, and press P or Escape to pause."
      tabIndex={0}
      style={{
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    />
  );
};

export default GameCanvas;
