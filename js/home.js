import { CANDLE_FLAME } from "./candle-position.js";

const video = document.getElementById("ritual-video");
const dimEl = document.getElementById("ritual-dim");
const flameEl = document.getElementById("virtual-flame");

function placeFlame() {
  const x = window.innerWidth * CANDLE_FLAME.x;
  const y = window.innerHeight * CANDLE_FLAME.y;
  flameEl.style.left = `${x}px`;
  flameEl.style.top = `${y}px`;
}

function hideDim() {
  dimEl.classList.add("is-hidden");
}

video.muted = true;
video.defaultMuted = true;
video.playsInline = true;
video.controls = false;
video.setAttribute("muted", "");
video.setAttribute("playsinline", "");

async function attemptPlay() {
  try {
    await video.play();
    hideDim();
  } catch {
    /* Safari fallback */
  }
}

video.addEventListener("playing", hideDim);
video.addEventListener("loadeddata", attemptPlay);
video.addEventListener("canplay", attemptPlay);

document.addEventListener(
  "click",
  () => {
    attemptPlay();
  },
  { once: true },
);

window.addEventListener("resize", placeFlame);

placeFlame();
attemptPlay();
