import type { RectLike } from "./types";

export function checkCollision(rect1: RectLike, rect2: RectLike): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

export function getEndScreenButtonLayout(
  logicalWidth: number,
  logicalHeight: number,
  isMobile: boolean,
  effectiveScale: number
) {
  const boxHeight = Math.min(380 * effectiveScale, logicalHeight * 0.78);
  const boxY = (logicalHeight - boxHeight) / 2;
  const buttonWidth = Math.max(116, Math.min(150 * effectiveScale, logicalWidth * 0.36));
  const buttonHeight = Math.max(46, 42 * effectiveScale);
  const buttonGap = isMobile ? 10 : 14;
  const totalButtonWidth = buttonWidth * 2 + buttonGap;
  const button1X = logicalWidth / 2 - totalButtonWidth / 2;
  const button2X = button1X + buttonWidth + buttonGap;
  const buttonY = boxY + boxHeight - buttonHeight - (isMobile ? 15 : 25);
  return { buttonWidth, buttonHeight, button1X, button2X, buttonY };
}
