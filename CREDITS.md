# Credits & Licensing

## Audio

All game audio is bundled locally in `public/sounds/` for offline use and Play Store distribution.

| File                    | Source / Artist                                      | Notes / Status |
|-------------------------|------------------------------------------------------|----------------|
| background-music.mp3    | "Play Me Like That Video Game" – Josef Bel Habib     | Downloaded from original CDN. Likely Epidemic Sound or similar stock library. **Requires commercial redistribution license verification before Google Play release.** |
| explosion.mp3           | 8-bit game explosion – Tomas Herudek                 | Same as above. **License must be confirmed.** |
| hit.mp3                 | Original project asset                               | Bundled locally |
| success.mp3             | Original project asset                               | Bundled locally |
| combo.mp3               | Duplicate of success.mp3 (temporary)                 | Placeholder – replace with a distinct combo chime sound if desired |

**Action required before Play Store submission:**
- Confirm Epidemic Sound / stock audio license allows mobile app redistribution, or
- Replace both background-music.mp3 and explosion.mp3 with CC0 / properly licensed 8-bit tracks (e.g. from OpenGameArt, freesound.org with commercial OK license, or commissioned work).

## Visual Assets

- Company logos (AssetWare, Rock IT, Eze Castle, Agilisys, Interoute, Kaplan, Tesco) — used in-game as career level markers.
  - These are real company trademarks.
  - Current status: included as in the original web game.
  - **Recommendation:** Add an in-game disclaimer or replace with generic/abstract badges before public distribution to avoid trademark issues.

## Game Engine & Code

- Core 2D canvas game engine originally developed for nathanluxford.com interactive CV.
- Ported and adapted for native Android (Capacitor) as "Nathan's Career Game".

## Links

- Original portfolio site: https://nathanluxford.com
- Personal site: https://luxford.link

## Trademark & Logo Notice (Important for Play Store)

The game includes references to the following real companies as part of the career progression narrative:

- AssetWare
- Rock IT
- Eze Castle Integration
- Agilisys
- Interoute
- Kaplan International
- Tesco Technology

**Current status:** Company names and logos are used in the same way as the original web version of the game.

**Before publishing to Google Play, you must choose one of the following:**

1. **Add a clear disclaimer** (recommended low-effort option)
   - Add text on the title screen and/or credits:  
     *"Career journey inspired by real experiences. No affiliation or endorsement by the mentioned companies is implied."*

2. **Replace logos with generic/abstract badges**
   - Keep the company names as text only
   - Replace the SVG logos with neutral icons (star, shield, circuit, etc.)

3. **Obtain permission**
   - Contact the companies for explicit written permission to use their names and logos in a commercial mobile game (unlikely to be granted easily).

**Audio Licensing Note**
The background music and explosion sound effects are currently bundled locally. These tracks originated from stock music libraries. Confirm commercial redistribution rights or replace them before release.

---
Last updated: May 2026 (during Android port)
