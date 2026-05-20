import { CANDLE } from "./candle-position.js";

const ritual = document.getElementById("ritual");
const canvas = document.getElementById("ritual-canvas");
const messageEl = document.getElementById("ritual-message");
const veilEl = document.getElementById("ritual-veil");
const dimEl = document.getElementById("ritual-dim");
const video = document.getElementById("ritual-video");

const ctx = canvas.getContext("2d");

let points = [];
let drawing = false;
let completed = false;
let messageTimer = null;

const LINE = {
  color: "rgba(230, 236, 245, 0.95)",
  glow: "rgba(220, 230, 255, 0.9)",
  width: 3,
};

/* ── Web Audio: 밤바다 / 잔잔한 파도 (파일 없음) ── */
let oceanCtx = null;
let oceanMaster = null;
let oceanStarted = false;
let waveTimer = null;

function createBrownNoise(ctx, seconds = 3) {
  const len = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.04 * white) / 1.04;
    data[i] = last * 2.8;
  }
  return buffer;
}

function initOceanAudio() {
  if (oceanCtx) return;

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  oceanCtx = ctx;

  oceanMaster = ctx.createGain();
  oceanMaster.gain.value = 0;
  oceanMaster.connect(ctx.destination);

  const deepSrc = ctx.createBufferSource();
  deepSrc.buffer = createBrownNoise(ctx, 4);
  deepSrc.loop = true;

  const deepFilter = ctx.createBiquadFilter();
  deepFilter.type = "lowpass";
  deepFilter.frequency.value = 280;
  deepFilter.Q.value = 0.6;

  const deepGain = ctx.createGain();
  deepGain.gain.value = 0.55;

  deepSrc.connect(deepFilter);
  deepFilter.connect(deepGain);
  deepGain.connect(oceanMaster);
  deepSrc.start();

  const surfSrc = ctx.createBufferSource();
  surfSrc.buffer = createBrownNoise(ctx, 2);
  surfSrc.loop = true;

  const surfFilter = ctx.createBiquadFilter();
  surfFilter.type = "bandpass";
  surfFilter.frequency.value = 520;
  surfFilter.Q.value = 0.4;

  const surfGain = ctx.createGain();
  surfGain.gain.value = 0.12;

  surfSrc.connect(surfFilter);
  surfFilter.connect(surfGain);
  surfGain.connect(oceanMaster);
  surfSrc.start();

  const nightTone = ctx.createOscillator();
  nightTone.type = "sine";
  nightTone.frequency.value = 48;
  const nightGain = ctx.createGain();
  nightGain.gain.value = 0.04;
  nightTone.connect(nightGain);
  nightGain.connect(oceanMaster);
  nightTone.start();

  scheduleWaveSwell();
}

function scheduleWaveSwell() {
  if (!oceanCtx || !oceanMaster) return;

  const ctx = oceanCtx;
  const now = ctx.currentTime;
  const cycle = 4 + Math.random() * 2;
  const peak = 0.14 + Math.random() * 0.08;

  oceanMaster.gain.cancelScheduledValues(now);
  oceanMaster.gain.setValueAtTime(oceanMaster.gain.value, now);
  oceanMaster.gain.linearRampToValueAtTime(peak, now + cycle * 0.45);
  oceanMaster.gain.linearRampToValueAtTime(0.05, now + cycle * 0.85);
  oceanMaster.gain.linearRampToValueAtTime(0.1, now + cycle);

  waveTimer = setTimeout(scheduleWaveSwell, cycle * 1000 - 80);
}

async function unlockAudioContext() {
  initOceanAudio();
  if (!oceanCtx) return false;

  if (oceanCtx.state === "suspended") {
    try {
      await oceanCtx.resume();
    } catch {
      return false;
    }
  }
  return oceanCtx.state === "running";
}

async function startOceanAudio() {
  if (oceanStarted) return;
  const ready = await unlockAudioContext();
  if (!ready || !oceanMaster) return;

  const now = oceanCtx.currentTime;
  oceanMaster.gain.cancelScheduledValues(now);
  oceanMaster.gain.setValueAtTime(0, now);
  oceanMaster.gain.linearRampToValueAtTime(0.12, now + 1.8);

  oceanStarted = true;
}

function fadeOutOceanAudio() {
  if (!oceanCtx || !oceanMaster) return;

  clearTimeout(waveTimer);
  const now = oceanCtx.currentTime;
  oceanMaster.gain.cancelScheduledValues(now);
  oceanMaster.gain.setValueAtTime(oceanMaster.gain.value, now);
  oceanMaster.gain.linearRampToValueAtTime(0, now + 1.6);
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawPath();
}

function candleCenter() {
  return {
    x: window.innerWidth * CANDLE.x,
    y: window.innerHeight * CANDLE.y,
  };
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function redrawPath() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  if (points.length < 2) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = LINE.width;
  ctx.strokeStyle = LINE.color;
  ctx.shadowColor = LINE.glow;
  ctx.shadowBlur = 20;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function showMessage() {
  if (completed) return;
  clearTimeout(messageTimer);
  messageEl.hidden = false;
  messageEl.classList.add("is-visible");

  messageTimer = setTimeout(() => {
    messageEl.classList.remove("is-visible");
    setTimeout(() => {
      if (!messageEl.classList.contains("is-visible")) {
        messageEl.hidden = true;
      }
    }, 600);
  }, 1800);
}

function validateCircle(pts) {
  if (pts.length < 24) return false;

  const { x: cx, y: cy } = candleCenter();
  const start = pts[0];
  const end = pts[pts.length - 1];
  const closure = Math.hypot(end.x - start.x, end.y - start.y);

  const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const avgR = radii.reduce((a, b) => a + b, 0) / radii.length;
  const minR = Math.min(...radii);
  const maxR = Math.max(...radii);

  if (avgR < 50 || avgR > Math.min(window.innerWidth, window.innerHeight) * 0.42) {
    return false;
  }

  if (closure > avgR * 0.55) return false;

  if (maxR - minR > avgR * 0.6) return false;

  const pathCx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const pathCy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  if (Math.hypot(pathCx - cx, pathCy - cy) > avgR * 0.4) return false;

  const nearCenter = pts.filter((p) => Math.hypot(p.x - cx, p.y - cy) < avgR * 0.35);
  if (nearCenter.length > pts.length * 0.15) return false;

  return true;
}

function transitionNext() {
  completed = true;
  ritual.classList.add("is-complete");
  veilEl.classList.add("is-active");
  fadeOutOceanAudio();

  setTimeout(() => {
    window.location.href = "home.html";
  }, 1900);
}

function onPointerDown(e) {
  if (completed) return;
  e.preventDefault();
  drawing = true;
  points = [pointerPos(e)];
  redrawPath();
}

function onPointerMove(e) {
  if (!drawing || completed) return;
  e.preventDefault();
  const pos = pointerPos(e);
  const last = points[points.length - 1];
  if (Math.hypot(pos.x - last.x, pos.y - last.y) < 3) return;
  points.push(pos);
  redrawPath();
}

function onPointerUp(e) {
  if (!drawing || completed) return;
  e.preventDefault();
  drawing = false;

  if (validateCircle(points)) {
    transitionNext();
    return;
  }

  if (points.length > 4) {
    showMessage();
  }

  setTimeout(() => {
    if (!completed) {
      points = [];
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }, 400);
}

function onQuickTap(e) {
  if (completed || drawing || points.length > 0) return;
  if (e.target !== canvas && e.target !== ritual) return;
  showMessage();
}

canvas.addEventListener("mousedown", onPointerDown);
canvas.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", onPointerUp);

canvas.addEventListener("touchstart", onPointerDown, { passive: false });
canvas.addEventListener("touchmove", onPointerMove, { passive: false });
canvas.addEventListener("touchend", onPointerUp, { passive: false });

ritual.addEventListener("click", onQuickTap);

window.addEventListener("resize", resizeCanvas);

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

video.muted = true;
video.defaultMuted = true;
video.playsInline = true;
video.controls = false;
video.setAttribute("muted", "");
video.setAttribute("playsinline", "");

function hideDim() {
  dimEl.classList.add("is-hidden");
}

async function attemptPlay() {
  if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    hideDim();
    await startOceanAudio();
    return;
  }

  try {
    await video.play();
    hideDim();
    await startOceanAudio();
  } catch {
    /* Safari: 첫 제스처 시 재시도 */
  }
}

function onVideoReady() {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    attemptPlay();
  }
}

video.addEventListener("loadedmetadata", onVideoReady);
video.addEventListener("loadeddata", onVideoReady);
video.addEventListener("canplay", onVideoReady);
video.addEventListener("canplaythrough", onVideoReady);
video.addEventListener("playing", () => {
  hideDim();
  if (oceanCtx?.state === "suspended") {
    oceanCtx.resume().then(() => startOceanAudio());
  } else {
    startOceanAudio();
  }
});

video.addEventListener("waiting", () => {
  if (isSafari && video.paused) onVideoReady();
});

video.addEventListener("stalled", onVideoReady);

function resumeOnGesture() {
  video.muted = true;
  attemptPlay();
}

document.addEventListener("touchstart", resumeOnGesture, { once: true, passive: true });
document.addEventListener("click", resumeOnGesture, { once: true });

initOceanAudio();
attemptPlay();
setTimeout(() => startOceanAudio(), 300);

resizeCanvas();
