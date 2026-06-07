# AI Context

## Project Snapshot

- Project path: `/Users/chloe/wab`
- Project name: `runestone`
- Description from `package.json`: `위치룬 - witch rune ritual web`
- Runtime: plain Node.js HTTP server with ES modules
- Frontend: static HTML/CSS/JavaScript, no framework and no build step
- Primary asset: `assets/video/ritual.mp4` (~6.1 MB)

This project is a fullscreen ritual-style web experience. The entry page plays a looping background video, asks the user to draw a circle around a candle position, then fades to the home page when the gesture is accepted.

## How To Run

```sh
npm start
```

Development mode:

```sh
npm run dev
```

Default URL:

```text
http://localhost:3000
```

Routes served by `server.js`:

- `/`, `/index.html`, `/intro` -> `index.html`
- `/home`, `/home.html` -> `home.html`
- `/css/*`, `/js/*`, `/assets/*` -> static files

## File Map

- `package.json`: project metadata and scripts. Requires Node `>=24.15.0`.
- `server.js`: small custom HTTP server. Serves HTML, CSS, JS, and assets. Handles MP4 range requests for smoother video playback.
- `index.html`: intro ritual page. Contains the fullscreen video, dim overlay, drawing canvas, prompt message, and fade veil.
- `home.html`: home page after ritual completion. Uses the same fullscreen video background.
- `css/intro.css`: fullscreen intro layout, video styling, canvas layer, center message, black fade veil.
- `css/home.css`: fullscreen home layout and optional virtual flame styles.
- `js/intro.js`: main ritual interaction logic, canvas drawing, circle validation, audio ambience, video autoplay fallback, transition to home.
- `js/home.js`: home video autoplay/dim handling and virtual flame placement logic.
- `js/candle-position.js`: shared candle coordinate constants used by intro and home.
- `assets/video/ritual.mp4`: looping ritual video used on both pages.

## User Flow

1. User opens `/` or `/intro`.
2. `index.html` loads `assets/video/ritual.mp4` fullscreen.
3. `js/intro.js` starts muted autoplay and generated Web Audio ocean ambience when possible.
4. User draws on the canvas.
5. If the drawn path is close enough to a circle around the candle center, the page fades to black.
6. After about 1.9 seconds, `window.location.href = "home.html"` navigates to the home page.
7. `home.html` displays the same video as a fullscreen background.

## Important Interaction Logic

### Candle Coordinates

`js/candle-position.js` stores normalized viewport coordinates:

```js
export const CANDLE = {
  x: 0.5,
  y: 0.41,
};

export const CANDLE_FLAME = {
  x: 0.5,
  y: 0.37,
};
```

`CANDLE` is the center used for validating the drawn circle on the intro page. `CANDLE_FLAME` is intended for positioning an optional virtual flame on the home page.

### Circle Validation

`js/intro.js` validates a circle with these main constraints:

- At least 24 pointer samples.
- Average radius must be at least `50px`.
- Average radius must be no more than `42%` of the smaller viewport dimension.
- End point must be close enough to start point.
- Radius variation cannot be too large.
- Path center must be close to `CANDLE`.
- Too many points near the candle center invalidates the gesture.

If validation fails and the path had more than four points, the message `원을 그리세요` appears briefly.

### Canvas Drawing

The intro canvas is scaled for device pixel ratio in `resizeCanvas()`. Pointer input supports both mouse and touch. The visual stroke is a pale line with glow:

```js
const LINE = {
  color: "rgba(230, 236, 245, 0.95)",
  glow: "rgba(220, 230, 255, 0.9)",
  width: 3,
};
```

### Audio

`js/intro.js` generates ambient ocean/night audio with Web Audio. It does not load an audio file. Audio is unlocked through autoplay attempts and first user gesture fallbacks. The ambience fades out during the transition to `home.html`.

### Video Playback

Both pages force muted inline video playback:

- `muted`
- `defaultMuted`
- `playsInline`
- `controls = false`
- `playsinline` attribute

`server.js` supports byte range requests for `.mp4` files and sends long cache headers for video.

## Current Notes And Cautions

- `home.html` currently has the virtual flame markup commented out.
- `js/home.js` still expects `document.getElementById("virtual-flame")` to exist and calls `flameEl.style...` in `placeFlame()`.
- Because of that mismatch, opening `home.html` can throw if the flame markup remains commented. Either restore the markup or guard against `flameEl === null` before using it.
- `css/home.css` includes full virtual flame styles even though the matching HTML is commented.
- There is no automated test setup in this project.
- There is no bundler, transpiler, or frontend framework. Keep changes compatible with direct browser-loaded ES modules.
- Keep asset paths relative to the served root, for example `css/intro.css`, `js/intro.js`, and `assets/video/ritual.mp4`.

## Development Conventions

- Prefer small, direct edits to the existing static files.
- Avoid adding a framework or build pipeline unless explicitly requested.
- Use Korean UI text unless the user asks otherwise.
- For visual changes, test both `/intro` and `/home` because both depend on the same video and overlay assumptions.
- If changing candle alignment, update `js/candle-position.js` first because it is the shared source of truth.
- If changing video behavior, verify Safari/mobile autoplay assumptions. The current code intentionally uses muted inline playback and gesture fallback listeners.

## Quick Verification Checklist

After edits, run:

```sh
npm start
```

Then check:

- `/` loads the fullscreen ritual video.
- The black dim overlay disappears once the video plays.
- Drawing an invalid shape shows `원을 그리세요`.
- Drawing a circle around the candle fades to black and navigates to `home.html`.
- `/home` loads without console errors.
- The video remains fullscreen and hidden controls do not appear.
