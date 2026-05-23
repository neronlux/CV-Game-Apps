import React, { useState, useEffect } from "react";
import { useAudio } from "../lib/stores/useAudio";
import { useGameState } from "../lib/stores/useGameState";
import { useIsMobile } from "../hooks/use-is-mobile";
import { useIsTablet } from "../hooks/use-is-tablet";
import { shareText, triggerImpact } from "../lib/capacitor";

const GameUI: React.FC = () => {
  const { isMuted, toggleMute, volume, setVolume } = useAudio();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [showControls, setShowControls] = useState(!isMobile);
  const [isVerySmall, setIsVerySmall] = useState(false);
  const [showAudioPanel, setShowAudioPanel] = useState(false);

  // Detect very small screens (< 375px)
  useEffect(() => {
    const checkSize = () => {
      setIsVerySmall(window.innerWidth < 375);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  const openLuxfordLink = () => {
    window.open("https://luxford.link", "_blank", "noopener,noreferrer");
  };

  const { gamePhase, score, maxCombo } = useGameState();

  const handleShareScore = async () => {
    const text = `I scored ${score} points in Nathan's Career Game! Max combo: ${maxCombo}x`;
    await shareText("Nathan's Career Game", text, "https://luxford.link");
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Top Right Controls (Audio + Visit Site) */}
      <div
        className={`absolute ${isMobile ? (isVerySmall ? "top-1 right-1" : "top-2 right-2") : "top-4 right-4"} pointer-events-auto flex gap-2`}
      >
        {/* Audio Button */}
        <button
          onClick={() => {
            triggerImpact("light");
            setShowAudioPanel(!showAudioPanel);
          }}
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-white/20 bg-black/60 px-2 py-1 text-white transition-colors hover:bg-black/80 hover:text-yellow-400 ${isMobile || isTablet ? "text-base" : "text-sm"}`}
          aria-label="Audio Settings"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>

        {/* Visit Site Button */}
        <button
          onClick={openLuxfordLink}
          className={`min-h-[44px] rounded border border-white/20 bg-black/60 px-3 py-1 text-sm text-white transition-colors hover:bg-black/80 hover:text-blue-400`}
        >
          Visit Site
        </button>

        {/* Share Score Button (only after game ends) */}
        {gamePhase === "ended" && (
          <button
            onClick={() => {
              triggerImpact("light");
              handleShareScore();
            }}
            className="pointer-events-auto min-h-[44px] rounded border border-white/20 bg-emerald-600/80 px-3 py-1 text-sm text-white hover:bg-emerald-600"
          >
            📤 Share
          </button>
        )}
      </div>

      {/* Audio Panel (simple dropdown) */}
      {showAudioPanel && (
        <div className="pointer-events-auto absolute top-16 right-4 z-20 w-64 rounded-lg border border-white/20 bg-black/90 p-4 text-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Audio Settings</span>
              <button
                onClick={() => {
                  triggerImpact("light");
                  setShowAudioPanel(false);
                }}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Mute</span>
              <button
                onClick={() => {
                  triggerImpact("light");
                  toggleMute();
                }}
                className={`rounded px-3 py-1 text-sm ${isMuted ? "bg-red-600" : "bg-gray-700"}`}
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-yellow-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Controls Help */}
      {(isMobile || isTablet) && (
        <div
          className={`absolute ${isVerySmall ? "right-1 bottom-1" : "right-2 bottom-2"} pointer-events-auto`}
        >
          <button
            onClick={() => {
              triggerImpact("light");
              setShowControls(!showControls);
            }}
            className="min-h-[44px] min-w-[44px] rounded border border-white/20 bg-black/60 p-2 text-white hover:bg-black/80"
            aria-label="Toggle controls help"
          >
            {showControls ? "✕" : "?"}
          </button>
          {showControls && (
            <div className="absolute right-0 bottom-12 max-w-[180px] rounded border border-white/20 bg-black/80 p-3 text-xs text-white">
              <p>
                <strong>Touch &amp; Hold:</strong> Fly Up
              </p>
              <p>
                <strong>Release:</strong> Fall Down
              </p>
              <p className="mt-1 text-[10px] text-gray-400">
                Double-tap during boss fights to attack
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameUI;
