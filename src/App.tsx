import { useEffect, useRef, useCallback } from "react";
import GameCanvas from "./components/GameCanvas";
import GameUI from "./components/GameUI";
import {
  isNative,
  lockToLandscape,
  hideStatusBar,
  registerBackButton,
  removeAllBackButtonListeners,
  exitApp,
  keepAwake,
} from "./lib/capacitor";

function App() {
  const pauseGameRef = useRef<(() => void) | null>(null);
  const lastBackPressRef = useRef(0);

  const registerPause = useCallback((pauseFn: () => void) => {
    pauseGameRef.current = pauseFn;
  }, []);

  useEffect(() => {
    if (!isNative()) return;

    lockToLandscape();
    hideStatusBar();
    keepAwake();

    const BACK_PRESS_TIMEOUT = 2000;

    registerBackButton(() => {
      const now = Date.now();
      const pauseFn = pauseGameRef.current;

      if (pauseFn) {
        pauseFn();
      }

      if (now - lastBackPressRef.current < BACK_PRESS_TIMEOUT) {
        exitApp();
        return;
      }

      lastBackPressRef.current = now;
    });

    return () => {
      removeAllBackButtonListeners();
    };
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      <GameCanvas onRegisterPause={registerPause} />
      <GameUI />
    </div>
  );
}

export default App;
