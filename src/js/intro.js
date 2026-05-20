const ritual = document.getElementById("ritual");
const canvas = document.getElementById("ritual-canvas");
const messageEl = document.getElementById("ritual-message");
const veilEl = document.getElementById("ritual-veil");
const dimEl = document.getElementById("ritual-dim");
const video = document.getElementById("ritual-video");

const ctx = canvas.getContext("2d");
const CANDLE = { x: 0.5, y: 0.52 };

let points = [];
let drawing = false;
let completed = false;
let messageTimer = null;

const LINE = {
  color: "rgba(230, 236, 245, 0.95)",
  glow: "rgba(220, 230, 255, 0.9)",
  width: 8,
};

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
  ctx.shadowBlur = 28;

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

  setTimeout(() => {
    window.location.href = "/home";
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
    return;
  }

  try {
    await video.play();
    hideDim();
  } catch {
    /* Safari: 사용자 제스처 후 재시도 */
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
video.addEventListener("playing", hideDim);

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

canvas.addEventListener("touchstart", resumeOnGesture, { passive: true });
canvas.addEventListener("mousedown", resumeOnGesture);

resizeCanvas();
