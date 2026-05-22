import React, { useRef, useEffect, useCallback, useState } from "react";
import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";
import { useIsMobile } from "../hooks/use-is-mobile";
import { gameData } from "../data/gameData";
import { triggerImpact, triggerNotification, getPref, setPref } from "../lib/capacitor";

export type StatusEffectType =
  | "caffeinated"
  | "lag"
  | "ticket_bloat"
  | "encrypted"
  | "root_access"
  | "pressure";
export type EnemyType = "zombie" | "micromanager" | "phishing_angler" | "shadow_it";

interface StatusEffect {
  type: StatusEffectType;
  startTime: number;
  duration: number;
}

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  type: "obstacle" | "collectible" | "company-logo" | "ground" | "powerup" | "enemy" | "projectile";
  color: string;
  company?: string;
  collected?: boolean;
  techType?: string;
  powerUpType?: string;
  enemyType?: EnemyType;
  projectileType?: string;
  nearMissed?: boolean;
}

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

const HIGH_SCORE_KEY = "careerGameHighScore";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: "fire" | "smoke" | "sparkle" | "debris" | "shield";
  alpha: number;
}

interface FloatingText {
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

const GameCanvas: React.FC = () => {
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

  // Orientation detection
  const [isPortrait, setIsPortrait] = React.useState(false);

  // Update orientation detection
  useEffect(() => {
    const updateOrientation = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const aspectRatio = canvas.clientWidth / canvas.clientHeight;
      setIsPortrait(aspectRatio < 1);
    };

    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateOrientation);
    }

    return () => {
      window.removeEventListener("resize", updateOrientation);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateOrientation);
      }
    };
  }, []);

  // Game state
  const playerRef = useRef({
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

  // Adjust player position for portrait mode
  useEffect(() => {
    if (isPortrait && canvasRef.current) {
      const canvas = canvasRef.current;
      playerRef.current.x = canvas.clientWidth * 0.2; // Move closer to left edge in portrait
      playerRef.current.y = canvas.clientHeight * 0.4; // Adjust vertical position
    } else {
      playerRef.current.x = 150; // Default position for landscape
      playerRef.current.y = 300;
    }
  }, [isPortrait]);

  const gameStateRef = useRef({
    speed: 2.5, // Gentler start for better learning curve
    distance: 0,
    objects: [] as GameObject[],
    backgroundOffset: 0,
    mouseDown: false,
    mouseDownTime: 0,
    level7StartTime: null as number | null,
    lastFrameTime: 0,
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    shake: 0,
    shieldActive: false,
    shieldTime: 0,
    scoreMultiplier: 1,
    multiplierTime: 0,
    score: 0,
    lives: 3,
    sanity: 100,
    activeStatusEffects: [] as StatusEffect[],
    inputQueue: [] as { time: number; type: "down" | "up" }[],
    // Combo system
    combo: 0,
    comboMultiplier: 1,
    lastComboTime: 0,
    maxCombo: 0,
    // Boss system
    bossActive: false,
    bossHP: 3,
    bossMaxHP: 3,
    bossDefeated: false,
    bossAppeared: false,
    boss: null as {
      name: string;
      color: string;
      pattern: string;
      x: number;
      y: number;
      vx: number;
      vy: number;
      attackTimer: number;
    } | null,
    // Hit freeze
    hitFreeze: false,
    hitFreezeTime: 0,
    // Invulnerability after hit (ms timestamp)
    invulnerableUntil: 0,
    // Zombie sanity drain cooldown
    lastZombieDrainTime: 0,
    // Player attack cooldown
    lastAttackTime: 0 as number | null,
  });

  // Sync state with ref for game loop
  useEffect(() => {
    gameStateRef.current.score = score;
    gameStateRef.current.lives = lives;
    gameStateRef.current.sanity = sanity;
  }, [score, lives, sanity]);

  useEffect(() => {
    if (gamePhase !== "ended") {
      return;
    }

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
    if (gamePhase !== "playing") {
      setIsPaused(false);
    }
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

      // Mobile Safari and Chrome can expose very high DPR values; capping keeps fill-rate stable.
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
    },
    [isMobile]
  );

  // Status Effect Helpers
  const addStatusEffect = (type: StatusEffectType, duration: number) => {
    const existing = gameStateRef.current.activeStatusEffects.find((e) => e.type === type);
    if (existing) {
      existing.startTime = Date.now();
      existing.duration = duration;
    } else {
      gameStateRef.current.activeStatusEffects.push({
        type,
        startTime: Date.now(),
        duration,
      });
    }
  };

  const hasStatusEffect = (type: StatusEffectType) => {
    return gameStateRef.current.activeStatusEffects.some((e) => e.type === type);
  };

  // Spawn particles
  const spawnParticles = (
    x: number,
    y: number,
    type: Particle["type"],
    count: number,
    color?: string
  ) => {
    const particleBudget = isMobile ? 50 : 100;
    if (gameStateRef.current.particles.length >= particleBudget) {
      return;
    }

    const adjustedCount = Math.min(
      Math.ceil(count * (isMobile ? 0.55 : 1)),
      particleBudget - gameStateRef.current.particles.length
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

  // Spawn floating text
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

  // Initialize game objects
  const initializeLevel = useCallback(() => {
    const currentLevelData = gameData.levels[currentLevel - 1];
    if (!currentLevelData) return;

    gameStateRef.current.objects = [];
    gameStateRef.current.distance = 0;
    gameStateRef.current.backgroundOffset = 0;
    gameStateRef.current.particles = [];
    gameStateRef.current.floatingTexts = [];
    gameStateRef.current.shake = 0;
    gameStateRef.current.shieldActive = false;
    gameStateRef.current.scoreMultiplier = 1;
    gameStateRef.current.bossActive = false;
    gameStateRef.current.bossAppeared = false;
    gameStateRef.current.bossDefeated = false;
    gameStateRef.current.boss = null;
    gameStateRef.current.invulnerableUntil = 0;

    // Add company logo at the start
    gameStateRef.current.objects.push({
      x: 200,
      y: 150,
      width: 80,
      height: 50,
      vx: -gameStateRef.current.speed,
      vy: 0,
      type: "company-logo",
      color: currentLevelData.backgroundColor,
      company: currentLevelData.company,
    });

    // Generate obstacles and collectibles with calmer spacing
    for (let i = 0; i < 15; i++) {
      const x = 500 + i * 350 + Math.random() * 150;

      if (Math.random() < 0.55) {
        const techTypes = [
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
        ];
        const randomTechType = techTypes[Math.floor(Math.random() * techTypes.length)];
        const size = Math.random() < 0.5 ? 15 + Math.random() * 10 : 25 + Math.random() * 15;

        gameStateRef.current.objects.push({
          x,
          y: 150 + Math.random() * 300,
          width: size,
          height: size,
          vx: -gameStateRef.current.speed,
          vy: 0,
          type: "obstacle",
          color: "#E31837",
          techType: randomTechType,
        });
      }

      if (Math.random() < 0.6) {
        gameStateRef.current.objects.push({
          x: x + 150,
          y: 150 + Math.random() * 250,
          width: 25,
          height: 25,
          vx: -gameStateRef.current.speed,
          vy: 0,
          type: "collectible",
          color: "#FFD700",
        });
      }
    }

    // Add ground segments
    for (let i = 0; i < 50; i++) {
      gameStateRef.current.objects.push({
        x: i * 100,
        y: 550,
        width: 100,
        height: 50,
        vx: -gameStateRef.current.speed,
        vy: 0,
        type: "ground",
        color: "#2C3E50",
      });
    }
  }, [currentLevel]);

  // Handle mouse events
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
        // Check if minimum transition time has passed
        const MIN_TRANSITION_TIME = 1000; // 1 second minimum
        const timeElapsed = levelTransitionStartTime ? Date.now() - levelTransitionStartTime : 0;
        const canContinue = timeElapsed >= MIN_TRANSITION_TIME;

        if (canContinue) {
          continuePlaying();
          initializeLevel();
        }
        return;
      }
      if (gamePhase === "ended") {
        // Handle end game screen clicks
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        // Use logical coordinates directly since ctx is scaled
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const logicalWidth = canvas.clientWidth;
        const logicalHeight = canvas.clientHeight;

        // Calculate responsive button dimensions (same as drawEndGameScreen)
        const scaleFactor = isMobile ? Math.min(logicalWidth / 800, logicalHeight / 600) : 1;
        const minScale = isMobile ? 0.7 : 1;
        const effectiveScale = Math.max(scaleFactor, minScale);

        const boxHeight = Math.min(380 * effectiveScale, logicalHeight * 0.78);
        const boxY = (logicalHeight - boxHeight) / 2;

        // Button dimensions and positions (responsive)
        const buttonWidth = Math.max(116, Math.min(150 * effectiveScale, logicalWidth * 0.36));
        const buttonHeight = Math.max(46, 42 * effectiveScale);
        const buttonGap = isMobile ? 10 : 14;
        const totalButtonWidth = buttonWidth * 2 + buttonGap;
        const button1X = logicalWidth / 2 - totalButtonWidth / 2;
        const button2X = button1X + buttonWidth + buttonGap;
        const buttonY = boxY + boxHeight - buttonHeight - (isMobile ? 15 : 25);

        // Check if "Visit Site" button was clicked (replaces old "View CV")
        if (
          x >= button1X &&
          x <= button1X + buttonWidth &&
          y >= buttonY &&
          y <= buttonY + buttonHeight
        ) {
          window.open("https://luxford.link", "_blank", "noopener,noreferrer");
        }

        // Check if Play Again button was clicked
        if (
          x >= button2X &&
          x <= button2X + buttonWidth &&
          y >= buttonY &&
          y <= buttonY + buttonHeight
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
        if (playerRef.current.vy >= 0) {
          playerRef.current.vy = -2;
        }
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

  const PLAYER_ATTACK_COOLDOWN = 300; // ms between attacks

  // Handle player attack (spacebar, keyboard shortcut, or double-tap)
  const handleAttack = useCallback(() => {
    if (isPaused || gamePhase !== "playing" || !gameStateRef.current.bossActive) return;
    if (
      gameStateRef.current.lastAttackTime &&
      Date.now() - gameStateRef.current.lastAttackTime < PLAYER_ATTACK_COOLDOWN
    )
      return;

    gameStateRef.current.lastAttackTime = Date.now();
    const player = playerRef.current;

    // Spawn attack projectile
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

    // Visual feedback
    spawnParticles(player.x + player.width, player.y + player.height / 2, "sparkle", 3, "#00FF00");
  }, [gamePhase, isPaused]);

  // Touch events for mobile with enhanced responsiveness
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isPaused) return;

      // Prevent default touch behaviors
      if (e.touches.length > 1) {
        e.preventDefault(); // Prevent pinch zoom
      }

      if (gamePhase === "level-transition") {
        // Check if minimum transition time has passed
        const MIN_TRANSITION_TIME = 1000; // 1 second minimum
        const timeElapsed = levelTransitionStartTime ? Date.now() - levelTransitionStartTime : 0;
        const canContinue = timeElapsed >= MIN_TRANSITION_TIME;

        if (canContinue) {
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

      // Enhanced touch handling for better mobile responsiveness
      const touch = e.touches[0];
      if (touch) {
        const syntheticEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation(),
        } as MouseEvent;
        handleMouseDown(syntheticEvent);
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

  // Collision detection
  const checkCollision = (rect1: RectLike, rect2: RectLike) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  };

  // Draw functions
  const drawPlayer = (ctx: CanvasRenderingContext2D) => {
    const player = playerRef.current;

    // Calculate tilt based on velocity
    const tilt = Math.max(Math.min(player.vy * 0.05, 0.4), -0.2);

    ctx.save();

    // Apply Jitter
    if (hasStatusEffect("caffeinated") || hasStatusEffect("pressure")) {
      const jitterAmount = hasStatusEffect("caffeinated") ? 3 : 1.5;
      ctx.translate((Math.random() - 0.5) * jitterAmount, (Math.random() - 0.5) * jitterAmount);
    }

    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(tilt);
    ctx.translate(-(player.x + player.width / 2), -(player.y + player.height / 2));

    // Shield effect
    if (gameStateRef.current.shieldActive) {
      ctx.beginPath();
      ctx.arc(player.x + 30, player.y + 30, 45, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 191, 255, ${0.3 + Math.sin(Date.now() * 0.01) * 0.1})`;
      ctx.fill();
      ctx.strokeStyle = "#00BFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw jetpack flames (size based on jetpack power)
    if (player.jetpackActive) {
      const powerRatio = player.jetpackPower / player.maxJetpackPower;
      const flameSize = 8 + powerRatio * 10; // Flames grow with power
      const flameLength = 15 + powerRatio * 20;

      // Main flame
      ctx.fillStyle = "#FF6B35";
      ctx.beginPath();
      ctx.ellipse(player.x - 10, player.y + 35, flameSize, flameLength, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner flame
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.ellipse(
        player.x - 8,
        player.y + 32,
        flameSize * 0.5,
        flameLength * 0.7,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Flame sparkles (more when more powerful)
      ctx.fillStyle = "#FFF";
      ctx.beginPath();
      ctx.arc(player.x - 5, player.y + 28, 2, 0, Math.PI * 2);
      ctx.fill();

      if (powerRatio > 0.5) {
        ctx.beginPath();
        ctx.arc(player.x - 12, player.y + 25, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (powerRatio > 0.8) {
        ctx.beginPath();
        ctx.arc(player.x - 3, player.y + 30, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add particles
      if (Math.random() < 0.25) {
        spawnParticles(player.x - 10, player.y + 35 + flameLength, "fire", 1, "#FF4500");
      }
    }

    // Draw jetpack
    ctx.fillStyle = "#34495E";
    ctx.fillRect(player.x - 8, player.y + 15, 12, 25);
    ctx.fillStyle = "#2C3E50";
    ctx.fillRect(player.x - 6, player.y + 17, 8, 3);
    ctx.fillRect(player.x - 6, player.y + 22, 8, 3);

    // Draw player body (black suit like the avatar)
    ctx.fillStyle = "#2C3E50";
    ctx.fillRect(player.x + 8, player.y + 20, 35, 30);

    // Draw suit details
    ctx.fillStyle = "#1A252F";
    ctx.fillRect(player.x + 15, player.y + 25, 20, 20);

    // Draw arms
    ctx.fillStyle = "#2C3E50";
    // Left arm
    ctx.fillRect(player.x + 5, player.y + 25, 12, 20);
    // Right arm (pointing forward)
    ctx.fillRect(player.x + 43, player.y + 25, 15, 12);

    // Draw hands
    ctx.fillStyle = "#D4A574";
    ctx.beginPath();
    ctx.arc(player.x + 11, player.y + 40, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 58, player.y + 31, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw legs
    ctx.fillStyle = "#2C3E50";
    ctx.fillRect(player.x + 15, player.y + 50, 10, 15);
    ctx.fillRect(player.x + 28, player.y + 50, 10, 15);

    // Draw shoes
    ctx.fillStyle = "#000";
    ctx.fillRect(player.x + 13, player.y + 62, 14, 6);
    ctx.fillRect(player.x + 26, player.y + 62, 14, 6);

    // Draw player head (larger and more cartoon-like)
    ctx.fillStyle = "#D4A574";
    ctx.beginPath();
    ctx.arc(player.x + 30, player.y + 12, 18, 0, Math.PI * 2);
    ctx.fill();

    // Draw hair (dark, messy style)
    ctx.fillStyle = "#2C1810";
    ctx.beginPath();
    ctx.ellipse(player.x + 30, player.y - 2, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair spikes
    ctx.beginPath();
    ctx.moveTo(player.x + 15, player.y + 2);
    ctx.lineTo(player.x + 12, player.y - 5);
    ctx.lineTo(player.x + 20, player.y);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(player.x + 40, player.y + 2);
    ctx.lineTo(player.x + 48, player.y - 5);
    ctx.lineTo(player.x + 45, player.y);
    ctx.fill();

    // Draw eyebrows (thick and expressive)
    ctx.fillStyle = "#2C1810";
    ctx.fillRect(player.x + 22, player.y + 8, 8, 3);
    ctx.fillRect(player.x + 30, player.y + 8, 8, 3);

    // Draw eyes (larger, more expressive)
    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.ellipse(player.x + 25, player.y + 13, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(player.x + 35, player.y + 13, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw pupils
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(player.x + 25, player.y + 13, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 35, player.y + 13, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw eye highlights
    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.arc(player.x + 26, player.y + 12, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 36, player.y + 12, 1, 0, Math.PI * 2);
    ctx.fill();

    // Draw nose
    ctx.fillStyle = "#C49464";
    ctx.beginPath();
    ctx.ellipse(player.x + 30, player.y + 16, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw smile (confident, wide grin)
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x + 30, player.y + 18, 10, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Draw teeth
    ctx.fillStyle = "#FFF";
    ctx.fillRect(player.x + 25, player.y + 20, 10, 3);

    ctx.restore();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const logicalWidth = canvas.clientWidth;
    const logicalHeight = canvas.clientHeight;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, logicalHeight);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(1, "#FFE4B5");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Moving clouds - parallax effect for smoother scrolling
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    const cloudOffset = gameStateRef.current.backgroundOffset * 0.2; // Slower parallax
    for (let i = 0; i < 8; i++) {
      const baseX = i * 180;
      const x = baseX - (cloudOffset % (logicalWidth + 200));
      const y = 50 + (i % 3) * 40;

      // Draw multiple cloud layers for depth
      if (x > -100 && x < logicalWidth + 100) {
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.arc(x + 25, y, 35, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Buildings in background - multiple layers for depth
    const buildingOffset = gameStateRef.current.backgroundOffset * 0.4;

    // Calculate number of buildings needed to cover screen width
    const buildingSpacing = 120;
    const numBackgroundBuildings = Math.ceil(logicalWidth / buildingSpacing) + 4;

    // Background buildings (slower)
    ctx.fillStyle = "#2C3E50";
    for (let i = 0; i < numBackgroundBuildings; i++) {
      const baseX = i * buildingSpacing;
      const x = baseX - ((buildingOffset * 0.6) % (logicalWidth + 200));
      const height = 80 + Math.sin(i * 0.5) * 40;
      if (x > -150 && x < logicalWidth + 150) {
        ctx.fillRect(x, logicalHeight - height - 50, 70, height);
      }
    }

    // Foreground buildings (faster) - ensure full coverage
    const foregroundSpacing = 150;
    const numForegroundBuildings = Math.ceil(logicalWidth / foregroundSpacing) + 4;

    ctx.fillStyle = "#34495E";
    for (let i = 0; i < numForegroundBuildings; i++) {
      const baseX = i * foregroundSpacing;
      const x = baseX - (buildingOffset % (logicalWidth + 200));
      const height = 100 + Math.sin(i) * 50;
      if (x > -180 && x < logicalWidth + 180) {
        ctx.fillRect(x, logicalHeight - height - 50, 80, height);

        ctx.fillStyle = "#F39C12";
        for (let w = 0; w < 3; w++) {
          for (let h = 0; h < Math.floor(height / 20); h++) {
            if ((i * 7 + w * 3 + h) % 5 < 3) {
              ctx.fillRect(x + 10 + w * 20, logicalHeight - height - 30 + h * 20, 8, 8);
            }
          }
        }
        ctx.fillStyle = "#34495E";
      }
    }
  };

  const drawObjects = (ctx: CanvasRenderingContext2D) => {
    gameStateRef.current.objects.forEach((obj) => {
      ctx.fillStyle = obj.color;

      if (obj.type === "company-logo") {
        // Draw company logo background
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);

        // Draw company text
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(obj.company || "", obj.x + obj.width / 2, obj.y + obj.height / 2 + 4);
      } else if (obj.type === "collectible" && !obj.collected) {
        // Draw XP coin only if not collected
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const radius = obj.width / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Date.now() * 0.005);

        // Outer gold ring
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner darker gold circle
        ctx.fillStyle = "#FFA500";
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Sparkle
        if (Math.random() > 0.95) {
          ctx.fillStyle = "#FFF";
          ctx.beginPath();
          ctx.arc(radius * 0.5, -radius * 0.5, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // XP text (not rotated, always left to right)
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (obj.techType === "ticket") {
          // Jira Ticket Visual
          ctx.fillStyle = "#FFF";
          ctx.fillRect(centerX - 12, centerY - 10, 24, 20);
          ctx.fillStyle = "#0052CC"; // Blue strip
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
          icon = "🛡️";
        } else if (obj.powerUpType === "coffee") {
          color = "#6F4E37";
          icon = "☕";
        } else if (obj.powerUpType === "admin-password") {
          color = "#00FF00";
          icon = "🔑";
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
        // Draw tech-themed obstacles
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Apply Glitch Effect
        if (obj.techType === "glitch") {
          const shift = (Math.random() - 0.5) * 4;
          ctx.translate(shift, 0);
          ctx.shadowColor = "#0F0";
          ctx.shadowBlur = 5;
        }

        switch (obj.techType) {
          case "glitch":
            ctx.fillStyle = "#FF00FF";
            ctx.font = "bold 20px Courier New";
            ctx.fillText("ERROR", centerX, centerY);
            // Glitch bars
            ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
            ctx.fillRect(obj.x, obj.y + Math.random() * obj.height, obj.width, 5);
            break;

          case "ransomware":
            ctx.fillStyle = "#800000";
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            // Lock icon
            ctx.fillStyle = "#FFF";
            ctx.beginPath();
            ctx.arc(centerX, centerY - 5, 8, Math.PI, 0);
            ctx.lineTo(centerX + 8, centerY + 5);
            ctx.lineTo(centerX - 8, centerY + 5);
            ctx.fill();
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(centerX, centerY - 5, 4, Math.PI, 0);
            ctx.fill();
            break;

          case "cloud":
            ctx.fillStyle = "#E8E8E8";
            // Draw cloud shape
            ctx.beginPath();
            ctx.arc(centerX - 8, centerY, 6, 0, Math.PI * 2);
            ctx.arc(centerX + 8, centerY, 6, 0, Math.PI * 2);
            ctx.arc(centerX, centerY - 4, 8, 0, Math.PI * 2);
            ctx.fill();
            break;

          case "server":
            ctx.fillStyle = "#2C3E50";
            ctx.fillRect(obj.x + 2, obj.y + 2, obj.width - 4, obj.height - 4);
            ctx.fillStyle = "#00FF00";
            // Server LEDs
            for (let i = 0; i < 3; i++) {
              ctx.fillRect(obj.x + 4, obj.y + 4 + i * 6, 3, 2);
            }
            break;

          case "computer":
            ctx.fillStyle = "#34495E";
            // Monitor
            ctx.fillRect(obj.x + 2, obj.y + 2, obj.width - 4, obj.height - 6);
            ctx.fillStyle = "#3498DB";
            ctx.fillRect(obj.x + 4, obj.y + 4, obj.width - 8, obj.height - 10);
            // Stand
            ctx.fillStyle = "#34495E";
            ctx.fillRect(centerX - 2, obj.y + obj.height - 4, 4, 4);
            break;

          case "printer":
            ctx.fillStyle = "#BDC3C7";
            ctx.fillRect(obj.x + 2, obj.y + 4, obj.width - 4, obj.height - 6);
            ctx.fillStyle = "#34495E";
            ctx.fillRect(obj.x + 4, obj.y + 2, obj.width - 8, 4);
            break;

          case "keyboard":
            ctx.fillStyle = "#2C3E50";
            ctx.fillRect(obj.x + 1, obj.y + 8, obj.width - 2, obj.height - 10);
            ctx.fillStyle = "#ECF0F1";
            // Keys
            for (let i = 0; i < 4; i++) {
              for (let j = 0; j < 2; j++) {
                ctx.fillRect(obj.x + 3 + i * 5, obj.y + 10 + j * 4, 3, 2);
              }
            }
            break;

          case "mouse":
            ctx.fillStyle = "#34495E";
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, 8, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#2C3E50";
            ctx.fillRect(centerX - 1, obj.y + 4, 2, 8);
            break;

          case "ai":
            ctx.fillStyle = "#9B59B6";
            ctx.font = "bold 16px Arial";
            ctx.fillText("AI", centerX, centerY);
            break;

          case "java":
            ctx.fillStyle = "#F39C12";
            ctx.font = "bold 14px Arial";
            ctx.fillText("☕", centerX, centerY);
            break;

          case "code":
            ctx.fillStyle = "#27AE60";
            ctx.font = "bold 12px monospace";
            ctx.fillText("</>", centerX, centerY);
            break;

          case "bug":
            ctx.fillStyle = "#E74C3C";
            ctx.font = "bold 16px Arial";
            ctx.fillText("🐛", centerX, centerY);
            break;

          case "database":
            ctx.fillStyle = "#3498DB";
            ctx.fillRect(obj.x + 2, obj.y + 2, obj.width - 4, 8);
            ctx.fillRect(obj.x + 2, obj.y + 12, obj.width - 4, 8);
            ctx.fillRect(obj.x + 2, obj.y + 22, obj.width - 4, 8);
            break;

          case "network":
            ctx.fillStyle = "#9B59B6";
            ctx.font = "bold 14px Arial";
            ctx.fillText("🌐", centerX, centerY);
            break;

          case "security":
            ctx.fillStyle = "#F39C12";
            ctx.font = "bold 16px Arial";
            ctx.fillText("🔒", centerX, centerY);
            break;

          case "api":
            ctx.fillStyle = "#1ABC9C";
            ctx.font = "bold 12px Arial";
            ctx.fillText("API", centerX, centerY);
            break;

          case "git":
            ctx.fillStyle = "#E67E22";
            ctx.font = "bold 14px Arial";
            ctx.fillText("⚡", centerX, centerY);
            break;

          case "docker":
            ctx.fillStyle = "#2980B9";
            ctx.font = "bold 14px Arial";
            ctx.fillText("🐳", centerX, centerY);
            break;

          case "kubernetes":
            ctx.fillStyle = "#8E44AD";
            ctx.font = "bold 10px Arial";
            ctx.fillText("K8s", centerX, centerY);
            break;

          case "wifi":
            ctx.fillStyle = "#16A085";
            ctx.font = "bold 16px Arial";
            ctx.fillText("📶", centerX, centerY);
            break;

          case "cpu":
            ctx.fillStyle = "#34495E";
            ctx.fillRect(obj.x + 2, obj.y + 2, obj.width - 4, obj.height - 4);
            ctx.fillStyle = "#F1C40F";
            for (let i = 0; i < 3; i++) {
              for (let j = 0; j < 3; j++) {
                ctx.fillRect(obj.x + 4 + i * 4, obj.y + 4 + j * 4, 2, 2);
              }
            }
            break;

          case "ram":
            ctx.fillStyle = "#27AE60";
            ctx.fillRect(obj.x + 2, obj.y + 6, obj.width - 4, obj.height - 12);
            ctx.fillStyle = "#2ECC71";
            for (let i = 0; i < 4; i++) {
              ctx.fillRect(obj.x + 4 + i * 4, obj.y + 2, 2, 4);
            }
            break;

          case "ssd":
            ctx.fillStyle = "#95A5A6";
            ctx.fillRect(obj.x + 2, obj.y + 4, obj.width - 4, obj.height - 8);
            ctx.fillStyle = "#34495E";
            ctx.fillRect(obj.x + 4, obj.y + 6, obj.width - 8, 3);
            break;

          case "cable":
            ctx.fillStyle = "#2C3E50";
            ctx.beginPath();
            ctx.moveTo(obj.x, centerY);
            ctx.quadraticCurveTo(centerX, obj.y + 2, obj.x + obj.width, centerY);
            ctx.lineWidth = 3;
            ctx.stroke();
            break;

          case "router":
            ctx.fillStyle = "#34495E";
            ctx.fillRect(obj.x + 2, obj.y + 4, obj.width - 4, obj.height - 8);
            ctx.fillStyle = "#E74C3C";
            ctx.fillRect(obj.x + 4, obj.y + 2, 3, 3);
            ctx.fillStyle = "#27AE60";
            ctx.fillRect(obj.x + 8, obj.y + 2, 3, 3);
            break;

          case "firewall":
            ctx.fillStyle = "#E74C3C";
            ctx.font = "bold 16px Arial";
            ctx.fillText("🔥", centerX, centerY);
            break;

          case "virus":
            ctx.fillStyle = "#8E44AD";
            ctx.font = "bold 16px Arial";
            ctx.fillText("🦠", centerX, centerY);
            break;

          default:
            // Fallback to simple rectangle
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        }

        ctx.restore();
      } else if (obj.type === "enemy") {
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;

        ctx.save();

        if (obj.enemyType === "zombie") {
          // Zombie User
          ctx.fillStyle = "#90EE90"; // Pale green skin
          // Head
          ctx.beginPath();
          ctx.arc(centerX, obj.y + 10, 12, 0, Math.PI * 2);
          ctx.fill();
          // Body (Ragged suit)
          ctx.fillStyle = "#444";
          ctx.fillRect(centerX - 10, obj.y + 22, 20, 25);
          // Arms (Outstretched)
          ctx.fillStyle = "#90EE90";
          ctx.fillRect(centerX - 15, obj.y + 25, 10, 6); // Left arm back
          ctx.fillRect(centerX + 5, obj.y + 25, 15, 6); // Right arm forward
          // Eyes (Dead)
          ctx.fillStyle = "#FFF";
          ctx.beginPath();
          ctx.arc(centerX - 4, obj.y + 8, 3, 0, Math.PI * 2);
          ctx.arc(centerX + 4, obj.y + 8, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#000";
          ctx.font = "10px Arial";
          ctx.fillText("x", centerX - 6, obj.y + 10);
          ctx.fillText("x", centerX + 2, obj.y + 10);

          // Speech bubble
          if (Math.floor(Date.now() / 1000) % 3 === 0) {
            ctx.fillStyle = "#FFF";
            ctx.fillRect(obj.x + 20, obj.y - 20, 40, 20);
            ctx.fillStyle = "#000";
            ctx.font = "10px Arial";
            ctx.fillText("Fixed?", obj.x + 25, obj.y - 8);
          }
        } else if (obj.enemyType === "micromanager") {
          // Giant Floating Eye with Tie
          // Aura
          ctx.shadowColor = "red";
          ctx.shadowBlur = 20;
          // Eye White
          ctx.fillStyle = "#FFF";
          ctx.beginPath();
          ctx.arc(centerX, centerY - 10, 25, 0, Math.PI * 2);
          ctx.fill();
          // Iris
          ctx.fillStyle = "#3498DB";
          ctx.beginPath();
          ctx.arc(centerX, centerY - 10, 12, 0, Math.PI * 2);
          ctx.fill();
          // Pupil (tracking player vertically)
          const lookY = Math.max(-8, Math.min(8, (playerRef.current.y - obj.y) * 0.1));
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(centerX, centerY - 10 + lookY, 5, 0, Math.PI * 2);
          ctx.fill();
          // Tiny Suit Body
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#2C3E50";
          ctx.beginPath();
          ctx.moveTo(centerX, centerY + 15);
          ctx.lineTo(centerX - 15, centerY + 30);
          ctx.lineTo(centerX + 15, centerY + 30);
          ctx.fill();
          // Red Tie
          ctx.fillStyle = "#E74C3C";
          ctx.beginPath();
          ctx.moveTo(centerX, centerY + 15);
          ctx.lineTo(centerX - 3, centerY + 28);
          ctx.lineTo(centerX + 3, centerY + 28);
          ctx.fill();
        } else if (obj.enemyType === "shadow_it") {
          // Hooded Rogue
          ctx.fillStyle = "#111";
          // Hood/Cloak
          ctx.beginPath();
          ctx.moveTo(centerX, obj.y);
          ctx.lineTo(centerX + 15, obj.y + 10);
          ctx.lineTo(centerX + 20, obj.y + 50);
          ctx.lineTo(centerX - 20, obj.y + 50);
          ctx.lineTo(centerX - 15, obj.y + 10);
          ctx.fill();
          // Glowing Eyes
          ctx.fillStyle = "#0F0";
          ctx.shadowColor = "#0F0";
          ctx.shadowBlur = 10;
          ctx.fillRect(centerX - 8, obj.y + 15, 5, 2);
          ctx.fillRect(centerX + 3, obj.y + 15, 5, 2);
          ctx.shadowBlur = 0;
        } else if (obj.enemyType === "phishing_angler") {
          // Mimic Coin
          const radius = 12.5;
          // Draw Fake Coin
          ctx.fillStyle = "#FFD700";
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();

          // Draw Hook (subtle)
          ctx.strokeStyle = "#888";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - radius);
          ctx.lineTo(centerX, obj.y - 50); // String going up
          ctx.stroke();

          // Glitch effect occasionally
          if (Math.random() < 0.1) {
            ctx.fillStyle = "#F00";
            ctx.font = "10px Arial";
            ctx.fillText("FAKE", centerX - 10, centerY);
          } else {
            ctx.fillStyle = "#FFA500";
            ctx.font = "bold 8px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("XP", centerX, centerY);
          }
        }

        ctx.restore();
      } else if (obj.type === "projectile") {
        // Packet Visual
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

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    gameStateRef.current.particles.forEach((p) => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.type === "sparkle") {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      } else if (p.type === "debris") {
        ctx.rect(p.x, p.y, p.size, p.size);
      } else {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  };

  const drawFloatingTexts = (ctx: CanvasRenderingContext2D) => {
    gameStateRef.current.floatingTexts.forEach((t) => {
      ctx.globalAlpha = t.opacity;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(t.text, t.x, t.y);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.strokeText(t.text, t.x, t.y);
    });
    ctx.globalAlpha = 1.0;
  };

  const drawUI = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const logicalWidth = canvas.clientWidth;
    const logicalHeight = canvas.clientHeight;

    // Get current level data for later use
    const currentLevelData = gameData.levels[currentLevel - 1];

    // Mobile scaling factors
    const scaleFactor = isMobile ? Math.min(logicalWidth / 800, logicalHeight / 600) : 1;

    // Draw Score
    ctx.font = `bold ${isMobile ? 20 : 24}px Arial`;
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "left";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillText(`Score: ${Math.floor(gameStateRef.current.score)}`, 20, 40);
    if (gameStateRef.current.scoreMultiplier > 1) {
      ctx.fillStyle = "#FFD700";
      ctx.fillText(`x${gameStateRef.current.scoreMultiplier}`, 180, 40);
      ctx.fillStyle = "#FFF";
    }

    // Draw Lives
    const heartSize = isMobile ? 20 : 25;
    for (let i = 0; i < gameStateRef.current.lives; i++) {
      ctx.fillText("❤️", 20 + i * (heartSize + 5), 70);
    }

    // Draw Combo Display
    const { combo, comboMultiplier } = gameStateRef.current;
    if (combo >= 2) {
      const comboPulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
      const comboColor =
        comboMultiplier >= 3 ? "#FF6B35" : comboMultiplier >= 2 ? "#FFD700" : "#FFF";
      ctx.font = `bold ${(isMobile ? 18 : 22) * comboPulse}px Arial`;
      ctx.fillStyle = comboColor;
      ctx.fillText(`🔥 COMBO x${combo}!`, 20, 55);

      if (comboMultiplier > 1) {
        ctx.font = `bold ${isMobile ? 14 : 16}px Arial`;
        ctx.fillStyle = "#00FF00";
        ctx.fillText(`(${comboMultiplier}x points)`, 20 + (isMobile ? 100 : 130), 55);
      }
    }

    // Draw Sanity Meter
    const sanity = gameStateRef.current.sanity;
    ctx.font = `bold ${isMobile ? 16 : 20}px Arial`;
    ctx.fillStyle = "#FFF";
    ctx.fillText("Sanity:", 20, 100);

    // Meter Bar
    ctx.fillStyle = "#333";
    ctx.fillRect(90, 85, 100, 15);
    // Fill
    const sanityColor = sanity > 50 ? "#0F0" : sanity > 25 ? "#FF0" : "#F00";
    ctx.fillStyle = sanityColor;
    ctx.fillRect(90, 85, Math.max(0, sanity), 15);
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(90, 85, 100, 15);

    // Draw Career Stage Progress
    if (gamePhase === "playing" && currentLevel < gameData.levels.length) {
      const progressX = 20;
      const progressY = 118;
      const progressWidth = isMobile ? 160 : 220;
      const progressHeight = 12;
      const stageProgress = Math.min(gameStateRef.current.distance / 4500, 1);

      ctx.font = `bold ${isMobile ? 12 : 14}px Arial`;
      ctx.fillStyle = "#FFF";
      ctx.fillText("Next stage", progressX, progressY - 5);
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(progressX + 80, progressY - 15, progressWidth, progressHeight);
      ctx.fillStyle = "#38BDF8";
      ctx.fillRect(progressX + 80, progressY - 15, progressWidth * stageProgress, progressHeight);
      ctx.strokeStyle = "#FFF";
      ctx.strokeRect(progressX + 80, progressY - 15, progressWidth, progressHeight);
    }

    // Draw Active Status Effects
    const effects = gameStateRef.current.activeStatusEffects;
    effects.forEach((effect, index) => {
      const y = 155 + index * 30;
      let icon = "";
      let color = "#FFF";

      switch (effect.type) {
        case "caffeinated":
          icon = "☕";
          color = "#6F4E37";
          break;
        case "lag":
          icon = "🐢";
          color = "#F00";
          break;
        case "ticket_bloat":
          icon = "📋";
          color = "#888";
          break;
        case "encrypted":
          icon = "🔒";
          color = "#800080";
          break;
        case "root_access":
          icon = "⚡";
          color = "#0F0";
          break;
        case "pressure":
          icon = "👁️";
          color = "#E74C3C";
          break;
      }

      ctx.font = "20px Arial";
      ctx.fillStyle = color;
      ctx.fillText(icon, 20, y);

      // Timer bar
      const timeLeft = Math.max(0, effect.duration - (Date.now() - effect.startTime));
      const ratio = timeLeft / effect.duration;

      ctx.fillStyle = "#333";
      ctx.fillRect(50, y - 10, 50, 8);
      ctx.fillStyle = color;
      ctx.fillRect(50, y - 10, 50 * ratio, 8);
    });

    // Draw Shield Indicator
    if (gameStateRef.current.shieldActive) {
      ctx.fillStyle = "#00BFFF";
      ctx.fillText("🛡️ Active", 20, 155 + effects.length * 30);
    }

    ctx.shadowBlur = 0;

    // Career Stage Indicator - only show during ready screen
    if (currentLevelData && gamePhase === "ready") {
      // In portrait mode, make it full-width for better mobile experience
      const stageWidth = isPortrait
        ? logicalWidth - 20
        : isMobile
          ? Math.min(400 * scaleFactor, logicalWidth - 40)
          : 400;
      const stageHeight = isMobile ? Math.max(60, 80 * scaleFactor) : 80;
      const stageX = (logicalWidth - stageWidth) / 2;
      // In portrait mode, move to top; in landscape, keep at bottom
      const stageY = isPortrait ? 20 : logicalHeight - stageHeight - (isMobile ? 10 : 20);

      // Background with gradient and rounded feel
      const hudGradient = ctx.createLinearGradient(stageX, stageY, stageX, stageY + stageHeight);
      hudGradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
      hudGradient.addColorStop(1, "rgba(20, 20, 20, 0.9)");
      ctx.fillStyle = hudGradient;

      ctx.beginPath();
      ctx.roundRect(stageX, stageY, stageWidth, stageHeight, 10);
      ctx.fill();

      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = isMobile ? 2 : 3;
      ctx.stroke();

      // Career Stage Title
      ctx.fillStyle = "#FFD700";
      ctx.font = `bold ${isMobile ? Math.max(16, 20 * scaleFactor) : 20}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText("Current Career Stage", logicalWidth / 2, stageY + (isMobile ? 20 : 25));

      // Company and Role
      ctx.fillStyle = "#FFF";
      ctx.font = `bold ${isMobile ? Math.max(14, 16 * scaleFactor) : 16}px Arial`;
      ctx.fillText(currentLevelData.company, logicalWidth / 2, stageY + (isMobile ? 35 : 45));

      ctx.font = `${isMobile ? Math.max(12, 14 * scaleFactor) : 14}px Arial`;
      ctx.fillText(currentLevelData.title, logicalWidth / 2, stageY + (isMobile ? 50 : 65));

      // Reset text alignment
      ctx.textAlign = "left";
    }

    // Instructions
    if (gamePhase === "ready") {
      const boxWidth = isMobile ? Math.min(400 * scaleFactor, logicalWidth - 40) : 400;
      const boxHeight = isMobile ? Math.min(240 * scaleFactor, logicalHeight - 100) : 240;
      const boxX = (logicalWidth - boxWidth) / 2;
      const boxY = (logicalHeight - boxHeight) / 2;

      ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 15);
      ctx.fill();

      // Border
      ctx.strokeStyle = "#00539C";
      ctx.lineWidth = isMobile ? 2 : 3;
      ctx.stroke();

      ctx.fillStyle = "#FFF";
      ctx.font = `bold ${isMobile ? Math.max(22, 32 * scaleFactor) : 32}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText("Nathan's Career Game", logicalWidth / 2, boxY + (isMobile ? 42 : 52));

      ctx.font = `bold ${isMobile ? Math.max(13, 16 * scaleFactor) : 16}px Arial`;
      ctx.fillStyle = "#94A3B8";
      ctx.fillText(
        "A 2D jetpack adventure through 15+ years in tech",
        logicalWidth / 2,
        boxY + (isMobile ? 68 : 82)
      );

      ctx.font = `bold ${isMobile ? Math.max(14, 18 * scaleFactor) : 18}px Arial`;
      ctx.fillStyle = "#FFD700";
      ctx.fillText(
        "🚀 Jetpack through your professional career!",
        logicalWidth / 2,
        boxY + (isMobile ? 95 : 110)
      );

      ctx.font = `${isMobile ? Math.max(12, 16 * scaleFactor) : 16}px Arial`;
      ctx.fillStyle = "#FFF";
      ctx.fillText(
        isMobile ? "Hold touch to fly up" : "Hold mouse or Space to fly up",
        logicalWidth / 2,
        boxY + (isMobile ? 100 : 120)
      );
      ctx.fillText("Release to fall down", logicalWidth / 2, boxY + (isMobile ? 120 : 145));
      ctx.fillText(
        isMobile ? "Double tap bosses to attack" : "Press X to attack bosses",
        logicalWidth / 2,
        boxY + (isMobile ? 140 : 170)
      );
      if (!isMobile) {
        ctx.fillText("Press P or Esc to pause", logicalWidth / 2, boxY + 190);
      }

      // Small credit link
      ctx.fillStyle = "#64748B";
      ctx.font = `${isMobile ? 10 : 11}px Arial`;
      ctx.fillText("nathanluxford.com  •  luxford.link", logicalWidth / 2, boxY + boxHeight - 18);

      // Pulsing click to start
      const buttonWidth = isMobile ? Math.max(120, 160 * scaleFactor) : 160;
      const buttonHeight = isMobile ? Math.max(30, 35 * scaleFactor) : 35;
      const buttonX = (logicalWidth - buttonWidth) / 2;
      const buttonY = boxY + (isMobile ? 170 : 205);

      const pulseAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
      ctx.fillStyle = `rgba(0, 83, 156, ${pulseAlpha})`;
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
      ctx.fillStyle = "#FFF";
      ctx.font = `bold ${isMobile ? Math.max(14, 18 * scaleFactor) : 18}px Arial`;
      ctx.fillText("CLICK TO START!", logicalWidth / 2, buttonY + (isMobile ? 18 : 22));
    }
  };

  const drawLevelTransition = (ctx: CanvasRenderingContext2D) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const currentCompany = gameData.levels[currentLevel - 1]?.company || "Unknown";

    const logicalWidth = canvas.clientWidth;
    const logicalHeight = canvas.clientHeight;

    // Calculate time elapsed since transition started
    const MIN_TRANSITION_TIME = 1000; // 1 second minimum
    const timeElapsed = levelTransitionStartTime ? Date.now() - levelTransitionStartTime : 0;
    const canContinue = timeElapsed >= MIN_TRANSITION_TIME;
    const timeRemaining = Math.max(0, MIN_TRANSITION_TIME - timeElapsed);

    // Responsive scaling based on canvas size
    const scaleFactor = isMobile ? Math.min(logicalWidth / 800, logicalHeight / 600) : 1;
    const minScale = isMobile ? 0.7 : 1;
    const effectiveScale = Math.max(scaleFactor, minScale);

    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Main content box - responsive dimensions
    const boxWidth = Math.min(400 * effectiveScale, logicalWidth * 0.9);
    const boxHeight = Math.min(220 * effectiveScale, logicalHeight * 0.4);
    const boxX = (logicalWidth - boxWidth) / 2;
    const boxY = (logicalHeight - boxHeight) / 2;

    // Content background
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Border - responsive line width
    ctx.strokeStyle = "#4CAF50";
    ctx.lineWidth = isMobile ? Math.max(2, 3 * effectiveScale) : 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Title - responsive font size
    ctx.fillStyle = "#2E7D32";
    const titleFontSize = Math.max(16, 24 * effectiveScale);
    ctx.font = `bold ${titleFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("New Career Stage!", logicalWidth / 2, boxY + (isMobile ? 35 : 50));

    // Company name - responsive font size
    ctx.fillStyle = "#1976D2";
    const companyFontSize = Math.max(14, 20 * effectiveScale);
    ctx.font = `bold ${companyFontSize}px Arial`;
    ctx.fillText(currentCompany, logicalWidth / 2, boxY + (isMobile ? 60 : 85));

    // Level indicator - responsive font size
    ctx.fillStyle = "#666";
    const levelFontSize = Math.max(12, 16 * effectiveScale);
    ctx.font = `${levelFontSize}px Arial`;
    ctx.fillText(
      `Level ${currentLevel} of ${gameData.levels.length}`,
      logicalWidth / 2,
      boxY + (isMobile ? 80 : 110)
    );

    // Continue button or countdown - responsive dimensions
    const buttonWidth = Math.max(160, Math.min(200 * effectiveScale, logicalWidth * 0.7));
    const buttonHeight = Math.max(36, 40 * effectiveScale);
    const buttonX = (logicalWidth - buttonWidth) / 2;
    const buttonY = boxY + boxHeight - buttonHeight - (isMobile ? 15 : 25);

    if (canContinue) {
      // Show clickable continue button
      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      ctx.fillStyle = "#FFF";
      const buttonFontSize = Math.max(12, 16 * effectiveScale);
      ctx.font = `bold ${buttonFontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(
        "Click to Continue",
        logicalWidth / 2,
        buttonY + buttonHeight / 2 + buttonFontSize / 3
      );
    } else {
      // Show countdown
      ctx.fillStyle = "#FFA726";
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      ctx.fillStyle = "#FFF";
      const buttonFontSize = Math.max(12, 16 * effectiveScale);
      ctx.font = `bold ${buttonFontSize}px Arial`;
      ctx.textAlign = "center";
      const countdown = Math.ceil(timeRemaining / 1000);
      ctx.fillText(
        `Continue in ${countdown}s`,
        logicalWidth / 2,
        buttonY + buttonHeight / 2 + buttonFontSize / 3
      );
    }
  };

  const drawVictoryOverlay = (ctx: CanvasRenderingContext2D) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const logicalWidth = canvas.clientWidth;
    const logicalHeight = canvas.clientHeight;

    const timeRemaining = gameStateRef.current.level7StartTime
      ? Math.max(0, 10 - Math.floor((Date.now() - gameStateRef.current.level7StartTime) / 1000))
      : 10;

    // Responsive scaling based on canvas size
    const scaleFactor = isMobile ? Math.min(logicalWidth / 800, logicalHeight / 600) : 1;
    const minScale = isMobile ? 0.7 : 1;
    const effectiveScale = Math.max(scaleFactor, minScale);

    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Main content box - responsive dimensions
    const boxWidth = Math.min(500 * effectiveScale, logicalWidth * 0.9);
    const boxHeight = Math.min(150 * effectiveScale, logicalHeight * 0.3);
    const boxX = (logicalWidth - boxWidth) / 2;
    const boxY = (logicalHeight - boxHeight) / 2;

    // Content background
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Border - responsive line width
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = isMobile ? Math.max(2, 4 * effectiveScale) : 4;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Title - responsive font size
    ctx.fillStyle = "#2E7D32";
    const titleFontSize = Math.max(18, 28 * effectiveScale);
    ctx.font = `bold ${titleFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("🎉 CAREER JOURNEY COMPLETE! 🎉", logicalWidth / 2, boxY + (isMobile ? 35 : 50));

    // Subtitle - responsive font size
    ctx.fillStyle = "#1976D2";
    const subtitleFontSize = Math.max(14, 18 * effectiveScale);
    ctx.font = `bold ${subtitleFontSize}px Arial`;
    ctx.fillText("You've reached Tesco!", logicalWidth / 2, boxY + (isMobile ? 60 : 80));

    // Countdown - responsive font size
    if (timeRemaining > 0) {
      ctx.fillStyle = "#666";
      const countdownFontSize = Math.max(12, 16 * effectiveScale);
      ctx.font = `${countdownFontSize}px Arial`;
      ctx.fillText(
        `Completing in ${timeRemaining} seconds...`,
        logicalWidth / 2,
        boxY + (isMobile ? 85 : 110)
      );
    }
  };

  const drawEndGameScreen = (ctx: CanvasRenderingContext2D) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const logicalWidth = canvas.clientWidth;
    const logicalHeight = canvas.clientHeight;

    // Responsive scaling based on canvas size
    const scaleFactor = isMobile ? Math.min(logicalWidth / 800, logicalHeight / 600) : 1;
    const minScale = isMobile ? 0.7 : 1;
    const effectiveScale = Math.max(scaleFactor, minScale);

    // Full screen celebration backdrop
    const overlayGradient = ctx.createLinearGradient(0, 0, logicalWidth, logicalHeight);
    overlayGradient.addColorStop(0, "rgba(2, 6, 23, 0.96)");
    overlayGradient.addColorStop(0.5, "rgba(15, 23, 42, 0.94)");
    overlayGradient.addColorStop(1, "rgba(30, 64, 175, 0.9)");
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Decorative celebration sparks. Deterministic positions avoid frame-to-frame flicker.
    for (let i = 0; i < 28; i++) {
      const sparkX = (i * 97) % logicalWidth;
      const sparkY = (i * 53) % logicalHeight;
      const pulse = 0.35 + Math.sin(Date.now() * 0.002 + i) * 0.25;
      ctx.fillStyle =
        i % 3 === 0 ? `rgba(250, 204, 21, ${pulse})` : `rgba(147, 197, 253, ${pulse})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 2 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }

    // Main content box - responsive dimensions
    const boxWidth = Math.min(680 * effectiveScale, logicalWidth * 0.92);
    const boxHeight = Math.min(380 * effectiveScale, logicalHeight * 0.78);
    const boxX = (logicalWidth - boxWidth) / 2;
    const boxY = (logicalHeight - boxHeight) / 2;

    // Content background
    const panelGradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
    panelGradient.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    panelGradient.addColorStop(1, "rgba(219, 234, 254, 0.96)");
    ctx.shadowColor = "rgba(250, 204, 21, 0.5)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = panelGradient;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 24 * effectiveScale);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Border and top accent
    ctx.strokeStyle = "#FACC15";
    ctx.lineWidth = isMobile ? Math.max(2, 4 * effectiveScale) : 4;
    ctx.stroke();
    const accentGradient = ctx.createLinearGradient(boxX + 24, boxY, boxX + boxWidth - 24, boxY);
    accentGradient.addColorStop(0, "#38BDF8");
    accentGradient.addColorStop(0.5, "#FACC15");
    accentGradient.addColorStop(1, "#22C55E");
    ctx.fillStyle = accentGradient;
    ctx.beginPath();
    ctx.roundRect(boxX + 28, boxY + 18, boxWidth - 56, 6, 999);
    ctx.fill();

    // Title - responsive font size
    ctx.fillStyle = "#0F172A";
    const titleFontSize = Math.max(22, 34 * effectiveScale);
    ctx.font = `bold ${titleFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Career Journey Complete", logicalWidth / 2, boxY + (isMobile ? 50 : 68));

    // Subtitle - responsive font size
    ctx.fillStyle = "#2563EB";
    const subtitleFontSize = Math.max(14, 19 * effectiveScale);
    ctx.font = `bold ${subtitleFontSize}px Arial`;
    ctx.fillText(
      "You reached Developer Experience leadership at enterprise scale",
      logicalWidth / 2,
      boxY + (isMobile ? 75 : 98)
    );

    ctx.fillStyle = "#475569";
    ctx.font = `${Math.max(11, 14 * effectiveScale)}px Arial`;
    ctx.fillText(
      "Cloud platforms, FinOps, internal developer portals, AI enablement, and engineering joy unlocked.",
      logicalWidth / 2,
      boxY + (isMobile ? 98 : 122)
    );

    const bestScore = Math.max(highScore, Math.floor(gameStateRef.current.score));
    const stats = [
      { label: "Final Score", value: `${Math.floor(gameStateRef.current.score)}` },
      { label: "Best Score", value: `${bestScore}` },
      { label: "Max Combo", value: `${gameStateRef.current.maxCombo}` },
    ];
    const statGap = 10 * effectiveScale;
    const statWidth = (boxWidth - 64 * effectiveScale - statGap * 2) / 3;
    const statHeight = isMobile ? 58 : 74;
    const statY = boxY + (isMobile ? 120 : 150);
    const statStartX = boxX + 32 * effectiveScale;

    stats.forEach((stat, index) => {
      const statX = statStartX + index * (statWidth + statGap);
      ctx.fillStyle =
        index === 0
          ? "rgba(37, 99, 235, 0.1)"
          : index === 1
            ? "rgba(250, 204, 21, 0.14)"
            : "rgba(34, 197, 94, 0.12)";
      ctx.beginPath();
      ctx.roundRect(statX, statY, statWidth, statHeight, 14);
      ctx.fill();
      ctx.strokeStyle = index === 0 ? "#93C5FD" : index === 1 ? "#FDE68A" : "#86EFAC";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#0F172A";
      ctx.font = `bold ${Math.max(16, 24 * effectiveScale)}px Arial`;
      ctx.fillText(stat.value, statX + statWidth / 2, statY + (isMobile ? 25 : 32));
      ctx.fillStyle = "#64748B";
      ctx.font = `bold ${Math.max(9, 11 * effectiveScale)}px Arial`;
      ctx.fillText(stat.label.toUpperCase(), statX + statWidth / 2, statY + (isMobile ? 45 : 56));
    });

    // Achievement message
    ctx.fillStyle = "#15803D";
    const achievementFontSize = Math.max(12, 16 * effectiveScale);
    ctx.font = `bold ${achievementFontSize}px Arial`;
    ctx.fillText(
      "Mission complete: you turned career obstacles into developer flow.",
      logicalWidth / 2,
      boxY + (isMobile ? 205 : 258)
    );

    ctx.fillStyle = "#64748B";
    ctx.font = `${Math.max(10, 13 * effectiveScale)}px Arial`;
    ctx.fillText(
      "View the full CV or replay to chase a new best score.",
      logicalWidth / 2,
      boxY + (isMobile ? 226 : 282)
    );

    // Buttons - responsive dimensions with minimum touch target size (44x44px)
    const buttonWidth = Math.max(116, Math.min(150 * effectiveScale, logicalWidth * 0.36));
    const buttonHeight = Math.max(46, 42 * effectiveScale); // Ensure minimum 44px for accessibility
    const buttonGap = isMobile ? 10 : 14;
    const totalButtonWidth = buttonWidth * 2 + buttonGap;
    const button1X = logicalWidth / 2 - totalButtonWidth / 2;
    const button2X = button1X + buttonWidth + buttonGap;
    const buttonY = boxY + boxHeight - buttonHeight - (isMobile ? 15 : 25);

    // Visit Site button (links to luxford.link)
    const viewGradient = ctx.createLinearGradient(
      button1X,
      buttonY,
      button1X,
      buttonY + buttonHeight
    );
    viewGradient.addColorStop(0, "#22C55E");
    viewGradient.addColorStop(1, "#15803D");
    ctx.fillStyle = viewGradient;
    ctx.beginPath();
    ctx.roundRect(button1X, buttonY, buttonWidth, buttonHeight, 999);
    ctx.fill();
    ctx.fillStyle = "#FFF";
    const buttonFontSize = Math.max(12, 15 * effectiveScale);
    ctx.font = `bold ${buttonFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(
      "Visit Site",
      button1X + buttonWidth / 2,
      buttonY + buttonHeight / 2 + buttonFontSize / 3
    );

    // Play Again button
    const replayGradient = ctx.createLinearGradient(
      button2X,
      buttonY,
      button2X,
      buttonY + buttonHeight
    );
    replayGradient.addColorStop(0, "#3B82F6");
    replayGradient.addColorStop(1, "#1D4ED8");
    ctx.fillStyle = replayGradient;
    ctx.beginPath();
    ctx.roundRect(button2X, buttonY, buttonWidth, buttonHeight, 999);
    ctx.fill();
    ctx.fillStyle = "#FFF";
    ctx.fillText(
      "Play Again",
      button2X + buttonWidth / 2,
      buttonY + buttonHeight / 2 + buttonFontSize / 3
    );

    // Small branding footer
    ctx.fillStyle = "#64748B";
    ctx.font = `${Math.max(10, 11 * effectiveScale)}px Arial`;
    ctx.fillText("Nathan's Career Game  •  luxford.link", logicalWidth / 2, boxY + boxHeight - 14);
  };

  const drawPauseOverlay = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const logicalWidth = canvas.clientWidth;
    const logicalHeight = canvas.clientHeight;

    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    ctx.fillStyle = "#FFF";
    ctx.font = `bold ${isMobile ? 28 : 40}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Paused", logicalWidth / 2, logicalHeight / 2 - 12);
    ctx.font = `${isMobile ? 14 : 18}px Arial`;
    ctx.fillText("Press P or Esc to resume", logicalWidth / 2, logicalHeight / 2 + 24);
  };

  // Game loop with delta time for smoother scrolling
  const gameLoop = useCallback(
    (currentTime?: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const logicalWidth = canvas.clientWidth;
      const logicalHeight = canvas.clientHeight;

      // Calculate delta time for frame-rate independent movement
      if (!gameStateRef.current.lastFrameTime) {
        gameStateRef.current.lastFrameTime = currentTime || performance.now();
      }
      const frameTime = currentTime || performance.now();
      const rawDeltaTime = frameTime - gameStateRef.current.lastFrameTime;
      const deltaTime = Math.min(Math.max(rawDeltaTime, 0), 33.34); // Smooth on 30/60/120Hz without huge tab-resume jumps.
      gameStateRef.current.lastFrameTime = frameTime;

      // Normalize delta time (60fps = 1.0)
      const normalizedDelta = deltaTime / 16.67;

      // Apply shake
      ctx.save();
      if (gameStateRef.current.shake > 0) {
        const dx = (Math.random() - 0.5) * gameStateRef.current.shake;
        const dy = (Math.random() - 0.5) * gameStateRef.current.shake;
        ctx.translate(dx, dy);
        gameStateRef.current.shake *= 0.9;
        if (gameStateRef.current.shake < 0.5) gameStateRef.current.shake = 0;
      }

      // Clear canvas with optimized settings (using logical dimensions)
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      // Enable smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = isMobile ? "medium" : "high";

      if (isPaused && gamePhase === "playing") {
        drawBackground(ctx);
        drawObjects(ctx);
        drawParticles(ctx);
        drawPlayer(ctx);
        drawFloatingTexts(ctx);
        drawUI(ctx);
        drawPauseOverlay(ctx);
        ctx.restore();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (gamePhase === "playing" || gamePhase === "level-transition" || gamePhase === "victory") {
        const gameState = gameStateRef.current;
        const player = playerRef.current;

        // Handle hit freeze
        if (gameState.hitFreeze) {
          gameState.hitFreezeTime -= deltaTime;
          if (gameState.hitFreezeTime <= 0) {
            gameState.hitFreeze = false;
          }
          // Still draw but skip updates
          drawBackground(ctx);
          drawObjects(ctx);
          if (gameState.bossActive && gameState.boss) {
            // Draw boss (simplified during freeze)
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
          drawParticles(ctx);
          drawPlayer(ctx);
          drawFloatingTexts(ctx);
          drawUI(ctx);
          if (gamePhase === "level-transition") drawLevelTransition(ctx);
          ctx.restore();
          gameLoopRef.current = requestAnimationFrame(gameLoop);
          return;
        }

        // Update Status Effects
        const now = Date.now();
        gameState.activeStatusEffects = gameState.activeStatusEffects.filter((e) => {
          return now - e.startTime < e.duration;
        });

        // Handle Lag Input Queue
        if (hasStatusEffect("lag")) {
          const LAG_DELAY = 500; // 0.5s
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
          // Clear queue if lag expired
          gameState.inputQueue = [];
        }

        // Update powerups
        if (gameState.scoreMultiplier > 1) {
          gameState.multiplierTime -= normalizedDelta * 16.67;
          if (gameState.multiplierTime <= 0) {
            gameState.scoreMultiplier = 1;
          }
        }
        if (gameState.shieldActive) {
          gameState.shieldTime -= normalizedDelta * 16.67;
          if (gameState.shieldTime <= 0) {
            gameState.shieldActive = false;
          }
        }

        // Update player physics with gradual ascent (delta time compensated)
        const gravity = (hasStatusEffect("ticket_bloat") ? 0.5 : 0.35) * normalizedDelta;

        // Update mouse hold time and jetpack power
        if (gameState.mouseDown) {
          gameState.mouseDownTime += normalizedDelta;
          // Gradually increase jetpack power based on hold time
          player.jetpackPower = Math.min(
            player.jetpackPower + 3 * normalizedDelta,
            player.maxJetpackPower
          );
        } else {
          gameState.mouseDownTime = 0;
          player.jetpackPower = Math.max(player.jetpackPower - 4 * normalizedDelta, 0);
        }

        // Calculate gradual thrust based on jetpack power
        let thrustMultiplier = player.jetpackPower / player.maxJetpackPower;
        if (hasStatusEffect("ticket_bloat")) thrustMultiplier *= 0.6; // Heavy

        const maxJetpackForce = 0.6 * normalizedDelta;
        const currentJetpackForce = thrustMultiplier * maxJetpackForce;

        if (player.jetpackActive) {
          player.vy -= currentJetpackForce;
          // Cap maximum upward velocity
          const maxUp = hasStatusEffect("pressure") ? -3 : -5;
          player.vy = Math.max(player.vy, maxUp);
        } else {
          player.vy += gravity;
          // Cap maximum downward velocity
          player.vy = Math.min(player.vy, 5);
        }

        // Apply velocity with delta time compensation
        player.y += player.vy * normalizedDelta;

        // Ground collision - gentler
        if (player.y + player.height > 530) {
          // Higher ground
          player.y = 530 - player.height;
          player.vy = Math.min(player.vy, 0);
        }

        // Ceiling collision - gentler
        if (player.y < 20) {
          // Lower ceiling
          player.y = 20;
          player.vy = Math.max(player.vy, 0);
        }

        // Progressive speed increase for better difficulty curve
        const baseSpeed = 2.5;
        const speedIncrease = Math.min(gameStateRef.current.distance / 15000, 1.0);
        gameStateRef.current.speed = baseSpeed + speedIncrease;

        if (hasStatusEffect("caffeinated")) {
          gameStateRef.current.speed *= 1.5;
        }

        // Update game objects with delta time for smoother movement
        // Pause distance progression during boss battles
        if (!gameStateRef.current.bossActive) {
          gameStateRef.current.distance += gameStateRef.current.speed * normalizedDelta;
          gameStateRef.current.backgroundOffset += gameStateRef.current.speed * normalizedDelta;
        }

        // Update particles
        gameStateRef.current.particles.forEach((p) => {
          p.x += p.vx * normalizedDelta;
          p.y += p.vy * normalizedDelta;
          p.life -= 0.02 * normalizedDelta;
          p.alpha = Math.max(0, p.life / p.maxLife);
        });
        gameStateRef.current.particles = gameStateRef.current.particles.filter((p) => p.life > 0);

        // Update floating texts
        gameStateRef.current.floatingTexts.forEach((t) => {
          t.y += t.vy * normalizedDelta;
          t.life -= 0.015 * normalizedDelta;
          t.opacity = Math.max(0, t.life / t.maxLife);
        });
        gameStateRef.current.floatingTexts = gameStateRef.current.floatingTexts.filter(
          (t) => t.life > 0
        );

        gameStateRef.current.objects.forEach((obj) => {
          obj.x += obj.vx * normalizedDelta;

          if (
            obj.projectileType === "player_attack" &&
            gameStateRef.current.bossActive &&
            gameStateRef.current.boss
          ) {
            const boss = gameStateRef.current.boss;
            const bossHitbox = { x: boss.x - 45, y: boss.y - 45, width: 90, height: 90 };

            if (checkCollision(obj, bossHitbox)) {
              gameStateRef.current.bossHP -= 1;
              playSuccess();
              spawnParticles(obj.x, obj.y, "sparkle", 12, "#00FF00");
              spawnFloatingText(boss.x, boss.y - 50, "-1 HP!", "#00FF00");
              obj.x = -1000;
              gameStateRef.current.shake = 5;
            }
          }

          // Check collisions
          if (checkCollision(player, obj)) {
            if (obj.type === "collectible" && !obj.collected) {
              if (!hasStatusEffect("encrypted")) {
                obj.collected = true;

                // Combo system
                const now = Date.now();
                const COMBO_TIMEOUT = 2000;
                const state = gameStateRef.current;

                if (now - state.lastComboTime < COMBO_TIMEOUT) {
                  state.combo += 1;
                } else {
                  state.combo = 1;
                }
                state.lastComboTime = now;

                // Calculate combo multiplier
                state.comboMultiplier =
                  state.combo <= 2 ? 1 : state.combo <= 5 ? 2 : state.combo <= 10 ? 3 : 5;
                state.maxCombo = Math.max(state.maxCombo, state.combo);

                // Play combo sound at milestones
                if (
                  state.combo === 3 ||
                  state.combo === 5 ||
                  state.combo === 10 ||
                  state.combo === 15 ||
                  state.combo === 20
                ) {
                  playCombo(state.combo);
                }

                const points = 100 * state.scoreMultiplier * state.comboMultiplier;
                addScore(points);
                playSuccess();
                triggerImpact("light"); // Light haptic on XP coin collect
                spawnParticles(
                  obj.x + obj.width / 2,
                  obj.y + obj.height / 2,
                  "sparkle",
                  4,
                  "#FFD700"
                );
                spawnFloatingText(player.x, player.y - 20, `+${points}`, "#FFD700");

                // Show combo text at milestones
                if (state.combo >= 3) {
                  spawnFloatingText(
                    player.x + 30,
                    player.y - 40,
                    `COMBO x${state.combo}!`,
                    "#FF6B35"
                  );
                  if (state.combo % 5 === 0) {
                    spawnParticles(player.x + 30, player.y - 30, "fire", 3, "#FF6B35");
                  }
                }

                if (obj.techType === "ticket") {
                  addStatusEffect("ticket_bloat", 10000);
                  spawnFloatingText(player.x, player.y - 40, "Bloated!", "#888");
                }
              }
            } else if (obj.type === "powerup" && !obj.collected) {
              if (!hasStatusEffect("encrypted")) {
                obj.collected = true;
                playSuccess();
                if (obj.powerUpType === "shield") {
                  gameStateRef.current.shieldActive = true;
                  gameStateRef.current.shieldTime = 10000;
                  spawnFloatingText(player.x, player.y - 20, "Shield!", "#00BFFF");
                  spawnParticles(player.x + 30, player.y + 30, "shield", 15, "#00BFFF");
                } else if (obj.powerUpType === "score-multiplier") {
                  gameStateRef.current.scoreMultiplier = 2;
                  gameStateRef.current.multiplierTime = 10000;
                  spawnFloatingText(player.x, player.y - 20, "2x Score!", "#FFD700");
                } else if (obj.powerUpType === "coffee") {
                  addStatusEffect("caffeinated", 8000);
                  spawnFloatingText(player.x, player.y - 20, "Caffeinated!", "#6F4E37");
                } else if (obj.powerUpType === "admin-password") {
                  addStatusEffect("root_access", 5000);
                  spawnFloatingText(player.x, player.y - 20, "ROOT ACCESS!", "#00FF00");
                  spawnParticles(player.x + 30, player.y + 30, "sparkle", 10, "#00FF00");
                }
              }
            } else if (obj.type === "projectile") {
              if (
                obj.projectileType === "player_attack" &&
                gameStateRef.current.bossActive &&
                gameStateRef.current.boss
              ) {
                obj.x = -1000;
              } else if (obj.projectileType === "boss_attack" || obj.projectileType === "packet") {
                if (Date.now() < gameStateRef.current.invulnerableUntil) {
                  obj.x = -1000;
                } else {
                  const isProtected =
                    gameStateRef.current.shieldActive || hasStatusEffect("root_access");
                  if (isProtected) {
                    if (!hasStatusEffect("root_access")) gameStateRef.current.shieldActive = false;
                    playExplosion();
                    spawnParticles(player.x + 30, player.y + 30, "debris", 4, "#00BFFF");
                    gameStateRef.current.shake = 3;
                    obj.x = -1000;
                  } else {
                    const dmg = obj.projectileType === "packet" ? 5 : 10;
                    playExplosion();
                    triggerImpact("heavy"); // Native haptic on projectile / enemy hit
                    gameStateRef.current.hitFreeze = true;
                    gameStateRef.current.hitFreezeTime = 80;
                    gameStateRef.current.invulnerableUntil = Date.now() + 1500;
                    loseSanity(dmg);
                    spawnParticles(player.x + 30, player.y + 30, "debris", 6, "#E31837");
                    gameStateRef.current.shake = obj.projectileType === "packet" ? 4 : 8;
                    obj.x = -1000;
                  }
                }
              }
            } else if (obj.type === "obstacle") {
              if (Date.now() < gameStateRef.current.invulnerableUntil) {
                obj.x = -1000;
              } else {
                const isProtected =
                  gameStateRef.current.shieldActive || hasStatusEffect("root_access");
                if (isProtected) {
                  if (!hasStatusEffect("root_access")) gameStateRef.current.shieldActive = false;
                  playExplosion();
                  spawnParticles(player.x + 30, player.y + 30, "debris", 6, "#00BFFF");
                  gameStateRef.current.shake = 4;
                  obj.x = -1000;
                } else {
                  playExplosion();
                  triggerImpact("heavy"); // Native haptic feedback on obstacle hit
                  gameStateRef.current.combo = 0;
                  gameStateRef.current.comboMultiplier = 1;
                  gameStateRef.current.hitFreeze = true;
                  gameStateRef.current.hitFreezeTime = 120;
                  gameStateRef.current.invulnerableUntil = Date.now() + 1500;
                  if (obj.techType === "glitch") {
                    addStatusEffect("lag", 4000);
                    spawnFloatingText(player.x, player.y - 20, "LAG!", "#FF0000");
                    loseSanity(8);
                  } else if (obj.techType === "ransomware") {
                    addStatusEffect("encrypted", 6000);
                    spawnFloatingText(player.x, player.y - 20, "Encrypted!", "#800080");
                    loseSanity(10);
                  } else {
                    loseSanity(15);
                  }
                  spawnParticles(player.x + 30, player.y + 30, "debris", 10, "#E31837");
                  gameStateRef.current.shake = 8;
                  if (
                    !obj.techType ||
                    (obj.techType !== "glitch" && obj.techType !== "ransomware")
                  ) {
                    player.x = 150;
                    player.y = 300;
                    player.vy = 0;
                    player.jetpackActive = false;
                    player.isFlying = false;
                    player.jetpackPower = 0;
                    gameStateRef.current.objects = gameStateRef.current.objects.filter(
                      (o) => o.x > player.x + 200
                    );
                  } else {
                    obj.x = -1000;
                  }
                }
              }
            } else if (obj.type === "enemy") {
              if (Date.now() < gameStateRef.current.invulnerableUntil) {
                obj.x = -1000;
              } else if (obj.enemyType === "zombie") {
                if (Date.now() - gameStateRef.current.lastZombieDrainTime > 500) {
                  gameStateRef.current.lastZombieDrainTime = Date.now();
                  playHit();
                  loseSanity(2);
                  spawnFloatingText(player.x, player.y - 40, "-Sanity", "#0F0");
                }
              } else if (obj.enemyType === "micromanager") {
                addStatusEffect("pressure", 2000);
              } else if (obj.enemyType === "phishing_angler") {
                playExplosion();
                gameStateRef.current.combo = 0;
                gameStateRef.current.comboMultiplier = 1;
                gameStateRef.current.hitFreeze = true;
                gameStateRef.current.hitFreezeTime = 100;
                loseSanity(10);
                addScore(-200);
                gameStateRef.current.invulnerableUntil = Date.now() + 1500;
                spawnFloatingText(player.x, player.y - 20, "PHISHING!", "#FF0000");
                spawnParticles(player.x + 30, player.y + 30, "debris", 8, "#000");
                obj.x = -1000;
              }
            }
          }
        });

        gameStateRef.current.objects.forEach((obj) => {
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

        // Remove off-screen objects and collected coins
        gameStateRef.current.objects = gameStateRef.current.objects.filter(
          (obj) =>
            obj.x > -100 &&
            !((obj.type === "collectible" || obj.type === "powerup") && obj.collected)
        );

        // Add new objects - calmer spawn cadence with no stacking
        if (
          Math.floor(gameStateRef.current.distance / 300) >
          Math.floor(
            (gameStateRef.current.distance - gameStateRef.current.speed * normalizedDelta) / 300
          )
        ) {
          const x = logicalWidth + 100;
          const isBossPhase = gameStateRef.current.bossActive;

          // During boss, only spawn coins occasionally
          if (isBossPhase) {
            if (Math.random() < 0.5) {
              gameStateRef.current.objects.push({
                x: x + 150,
                y: 120 + Math.random() * 300,
                width: 25,
                height: 25,
                vx: -gameStateRef.current.speed,
                vy: 0,
                type: "collectible",
                color: "#FFD700",
                techType: "coin",
              });
            }
          } else {
            // Pick ONE primary thing per tick: obstacle, enemy, or coin
            const roll = Math.random();
            const enemyChance = currentLevel <= 2 ? 0 : currentLevel <= 4 ? 0.08 : 0.15;

            if (roll < enemyChance) {
              // Enemy only
              const enemyRand = Math.random();
              let enemyType: EnemyType;
              let width: number;
              let height: number;
              let y: number;
              let vx: number;

              if (enemyRand < 0.3) {
                enemyType = "zombie";
                y = 480;
                width = 40;
                height = 60;
                vx = -gameStateRef.current.speed * 0.5;
              } else if (enemyRand < 0.6) {
                enemyType = "micromanager";
                y = 100 + Math.random() * 300;
                vx = -gameStateRef.current.speed * 1.2;
                width = 50;
                height = 50;
              } else if (enemyRand < 0.8) {
                enemyType = "phishing_angler";
                y = 100 + Math.random() * 300;
                width = 30;
                height = 30;
                vx = -gameStateRef.current.speed;
              } else {
                enemyType = "shadow_it";
                y = 480;
                width = 40;
                height = 50;
                vx = -gameStateRef.current.speed * 0.5;
              }

              gameStateRef.current.objects.push({
                x,
                y,
                width,
                height,
                vx,
                vy: 0,
                type: "enemy",
                color: "#000",
                enemyType,
              });
            } else if (roll < enemyChance + 0.45) {
              // Obstacle only
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
                const techTypes = [
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
                ];
                techType = techTypes[Math.floor(Math.random() * techTypes.length)];
                color = "#E31837";
              }

              const size = Math.random() < 0.5 ? 15 + Math.random() * 10 : 25 + Math.random() * 15;

              gameStateRef.current.objects.push({
                x,
                y: 120 + Math.random() * 350,
                width: size,
                height: size,
                vx: -gameStateRef.current.speed,
                vy: 0,
                type: "obstacle",
                color,
                techType,
              });
            }

            // Coin spawn - separate slot, always possible
            if (Math.random() < 0.7) {
              const isTicket = Math.random() < 0.15;
              gameStateRef.current.objects.push({
                x: x + 200,
                y: 120 + Math.random() * 300,
                width: 25,
                height: 25,
                vx: -gameStateRef.current.speed,
                vy: 0,
                type: "collectible",
                color: isTicket ? "#888" : "#FFD700",
                techType: isTicket ? "ticket" : "coin",
              });
            }

            // Powerup - rare
            if (Math.random() < 0.07) {
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

              gameStateRef.current.objects.push({
                x: x + 250,
                y: 120 + Math.random() * 300,
                width: 30,
                height: 30,
                vx: -gameStateRef.current.speed,
                vy: 0,
                type: "powerup",
                color,
                powerUpType,
              });
            }
          }
        }

        // Handle Shadow IT Shooting
        gameStateRef.current.objects.forEach((obj) => {
          if (obj.type === "enemy" && obj.enemyType === "shadow_it") {
            if (Math.random() < 0.008) {
              gameStateRef.current.objects.push({
                x: obj.x,
                y: obj.y + 10,
                width: 20,
                height: 10,
                vx: -gameStateRef.current.speed * 2,
                vy: 0,
                type: "projectile",
                color: "#F00",
                projectileType: "packet",
              });
            }
          }
        });

        // Check for level 7 completion
        if (currentLevel >= 7 && gamePhase === "playing") {
          if (gameStateRef.current.level7StartTime === null) {
            gameStateRef.current.level7StartTime = Date.now();
          } else if (Date.now() - gameStateRef.current.level7StartTime > 10000) {
            // 10 seconds have passed, complete the journey
            endGame();
          }
        }

        // Boss spawning - spawn boss at distance 3800 before level transition
        const BOSS_SPAWN_DISTANCE = 3800;
        if (
          gameStateRef.current.distance > BOSS_SPAWN_DISTANCE &&
          !gameStateRef.current.bossActive &&
          !gameStateRef.current.bossAppeared &&
          gamePhase === "playing"
        ) {
          const bossData = gameData.bosses[currentLevel - 1];
          if (bossData) {
            gameStateRef.current.bossActive = true;
            gameStateRef.current.bossAppeared = true;
            gameStateRef.current.bossHP = bossData.hp;
            gameStateRef.current.bossMaxHP = bossData.hp;
            playBoss();
            gameStateRef.current.boss = {
              name: bossData.name,
              color: bossData.color,
              pattern: bossData.pattern,
              x: logicalWidth + 100,
              y: 250,
              vx: -0.8,
              vy: 0,
              attackTimer: 0,
            };

            // Show boss warning
            spawnFloatingText(
              logicalWidth / 2,
              logicalHeight / 2,
              `WARNING: ${bossData.name}!`,
              "#FF0000"
            );
            gameStateRef.current.shake = 8;
          }
        }

        // Boss update and attack
        if (gameStateRef.current.bossActive && gameStateRef.current.boss) {
          const boss = gameStateRef.current.boss;

          // Move boss
          boss.x += boss.vx * normalizedDelta;
          boss.attackTimer += normalizedDelta;

          // Boss pattern behavior
          if (boss.pattern === "grow_shrink") {
            boss.vy = Math.sin(Date.now() * 0.003) * 2;
            boss.y += boss.vy * normalizedDelta;
          } else if (boss.pattern === "erratic") {
            if (Math.random() < 0.02) {
              boss.vy = (Math.random() - 0.5) * 5;
            }
            boss.y += boss.vy * normalizedDelta;
            // Keep in bounds
            if (boss.y < 100) boss.y = 100;
            if (boss.y > 450) boss.y = 450;
          }

          // Boss shoots projectiles
          if (boss.attackTimer > 350) {
            boss.attackTimer = 0;
            gameStateRef.current.objects.push({
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

          // Boss collision with player
          const bossHitbox = { x: boss.x - 40, y: boss.y - 40, width: 80, height: 80 };
          if (
            checkCollision(player, bossHitbox) &&
            Date.now() >= gameStateRef.current.invulnerableUntil
          ) {
            if (!gameStateRef.current.shieldActive && !hasStatusEffect("root_access")) {
              playExplosion();
              loseSanity(15);
              gameStateRef.current.combo = 0;
              gameStateRef.current.comboMultiplier = 1;
              gameStateRef.current.hitFreeze = true;
              gameStateRef.current.hitFreezeTime = 120;
              gameStateRef.current.invulnerableUntil = Date.now() + 1500;
              spawnParticles(player.x + 30, player.y + 30, "debris", 10, "#E31837");
              gameStateRef.current.shake = 12;
            }
          }

          // Check boss defeat
          if (gameStateRef.current.bossHP <= 0) {
            gameStateRef.current.bossActive = false;
            gameStateRef.current.bossDefeated = true;
            gameStateRef.current.boss = null;

            triggerNotification("success"); // Strong haptic + vibration on boss defeat
            playBossDefeat();

            // Boss defeat rewards
            addScore(500);
            useGameState.getState().recoverSanity(50);
            spawnFloatingText(
              logicalWidth / 2,
              logicalHeight / 2 - 50,
              `BOSS DEFEATED! +500`,
              "#00FF00"
            );
            spawnParticles(logicalWidth / 2, logicalHeight / 2, "fire", 20, "#FFD700");
            gameStateRef.current.shake = 12;
          }
        }

        // Level progression - check if we haven't already transitioned
        if (
          gameStateRef.current.distance > 4500 &&
          currentLevel < gameData.levels.length &&
          gamePhase === "playing"
        ) {
          nextLevel();
          if (currentLevel + 1 < 7) {
            startLevelTransition();
          } else if (currentLevel + 1 === 7) {
            // Reached level 7, no transition screen
            gameStateRef.current.level7StartTime = null; // Reset timer, will be set in main game loop
          }
          gameStateRef.current.distance = 0; // Reset distance for new level
        }
      }

      // Draw everything
      drawBackground(ctx);
      drawObjects(ctx);

      // Draw Boss
      if (gameStateRef.current.bossActive && gameStateRef.current.boss) {
        const boss = gameStateRef.current.boss;

        // Boss body (glowing)
        ctx.save();
        ctx.shadowColor = boss.color;
        ctx.shadowBlur = 30;

        // Main body
        ctx.fillStyle = boss.color;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, 45, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, 25, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(boss.x - 10, boss.y - 5, 8, 0, Math.PI * 2);
        ctx.arc(boss.x + 10, boss.y - 5, 8, 0, Math.PI * 2);
        ctx.fill();

        // Angry eyebrows
        ctx.fillStyle = "#000";
        ctx.fillRect(boss.x - 20, boss.y - 20, 15, 5);
        ctx.fillRect(boss.x + 5, boss.y - 20, 15, 5);

        // Mouth (angry)
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(boss.x - 15, boss.y + 15);
        ctx.lineTo(boss.x + 15, boss.y + 15);
        ctx.stroke();

        ctx.restore();

        // Boss health bar
        const healthBarWidth = 200;
        const healthBarHeight = 20;
        const healthBarX = (logicalWidth - healthBarWidth) / 2;
        const healthBarY = 100;

        // Background
        ctx.fillStyle = "#333";
        ctx.fillRect(healthBarX - 5, healthBarY - 5, healthBarWidth + 10, healthBarHeight + 10);

        // Health bar fill
        const healthPercent = gameStateRef.current.bossHP / gameStateRef.current.bossMaxHP;
        const healthColor = healthPercent > 0.5 ? "#0F0" : healthPercent > 0.25 ? "#FF0" : "#F00";
        ctx.fillStyle = healthColor;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);

        // Border
        ctx.strokeStyle = "#FFF";
        ctx.lineWidth = 2;
        ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        // Boss name
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(boss.name, logicalWidth / 2, healthBarY - 10);

        // Attack instruction
        ctx.font = "14px Arial";
        ctx.fillStyle = "#AAA";
        ctx.fillText(
          isMobile ? "Double tap to attack!" : "Press X or Space to attack!",
          logicalWidth / 2,
          healthBarY + 40
        );
      }

      drawParticles(ctx);
      drawPlayer(ctx);
      drawFloatingTexts(ctx);
      drawUI(ctx);

      // Draw level transition overlay
      if (gamePhase === "level-transition") {
        drawLevelTransition(ctx);
      }

      // Draw victory overlay for level 7
      if (currentLevel >= 7 && gameStateRef.current.level7StartTime !== null) {
        drawVictoryOverlay(ctx);
      }

      // Draw end game screen
      if (gamePhase === "ended") {
        drawEndGameScreen(ctx);
      }

      ctx.restore(); // Restore shake transform
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    },
    [
      gamePhase,
      isPaused,
      currentLevel,
      addScore,
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
    ]
  );

  useEffect(() => {
    initializeLevel();
  }, [currentLevel, initializeLevel]);

  // Setup canvas and event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initial size
    resizeCanvas(canvas);

    const preventDefault = (e: Event) => e.preventDefault();
    const focusCanvas = () => canvas.focus({ preventScroll: true });

    // Setup event listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousedown", focusCanvas);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchstart", focusCanvas, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

    // Prevent context menu and other mobile behaviors
    canvas.addEventListener("contextmenu", preventDefault);
    canvas.addEventListener("gesturestart", preventDefault);
    canvas.addEventListener("gesturechange", preventDefault);
    canvas.addEventListener("gestureend", preventDefault);

    // Keyboard handler for start, flight, and boss attacks.
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
          if (gameStateRef.current.bossActive && e.code === "Space") {
            handleAttack();
          }
          gameStateRef.current.mouseDown = true;
          playerRef.current.jetpackActive = true;
          playerRef.current.isFlying = true;
          if (playerRef.current.vy >= 0) {
            playerRef.current.vy = -2;
          }
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

    // Start game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
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
  ]);

  // Handle window resize with mobile viewport optimization and DPR support
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeCanvas(canvas);
      });
    };

    // Listen to both resize and visualViewport change events for mobile
    window.addEventListener("resize", handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }

    return () => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      window.removeEventListener("resize", handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      gameStateRef.current.lastFrameTime = 0;
      handleMouseUp();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleMouseUp]);

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
