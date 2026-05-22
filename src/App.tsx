import { useEffect, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import GameUI from "./components/GameUI";
import { isNative, lockToLandscape, hideStatusBar, registerBackButton } from "./lib/capacitor";

function App() {
  const [isPaused, setIsPaused] = useState(false);

  // Native initialization on mount
  useEffect(() => {
    if (isNative()) {
      // Lock to landscape as soon as the app starts
      lockToLandscape();
      // Hide the status bar for immersive gameplay
      hideStatusBar();

      // Handle Android back button
      registerBackButton(() => {
        // If we're in a game, pause it instead of exiting
        if (!isPaused) {
          setIsPaused(true);
          return; // prevent default exit
        }
        // If already paused, allow the system to handle exit (or we could show a confirm dialog)
        return false;
      });
    }
  }, [isPaused]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      <GameCanvas />
      <GameUI />
    </div>
  );
}

export default App;
