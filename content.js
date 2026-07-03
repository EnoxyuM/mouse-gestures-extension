let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let isMouseDown = false;
let gesturePath = [];
let targetImageUrl = null;
let hasMovedPastThreshold = false;

// Visual feedback elements
let canvas = null;
let ctx = null;
let tooltip = null;
let points = [];
let registeredGestures = {};

// Load gestures initially and keep them updated
chrome.storage.local.get({ gestures: {} }, (data) => {
  registeredGestures = data.gestures;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.gestures) {
    registeredGestures = changes.gestures.newValue || {};
  }
});

function initCanvas() {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '2147483646';
    canvas.style.pointerEvents = 'none';
    document.documentElement.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.display = 'block';
}

function initTooltip() {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '2147483647';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    tooltip.style.color = '#ffffff';
    tooltip.style.padding = '6px 12px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    tooltip.style.fontSize = '13px';
    tooltip.style.fontWeight = '500';
    tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    tooltip.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.display = 'none';
    document.documentElement.appendChild(tooltip);
  }
}

function clearVisuals() {
  if (canvas) canvas.style.display = 'none';
  if (tooltip) tooltip.style.display = 'none';
  points = [];
}

document.addEventListener('mousedown', (e) => {
  if (e.button === 2) { // RMB
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;
    isMouseDown = true;
    gesturePath = [];
    hasMovedPastThreshold = false;
    points = [{ x: e.clientX, y: e.clientY }];

    if (e.target && e.target.tagName === 'IMG') {
      targetImageUrl = e.target.src;
    } else {
      targetImageUrl = null;
    }

    initCanvas();
    initTooltip();
  }
});

document.addEventListener('mousemove', (e) => {
  if (!isMouseDown) return;

  points.push({ x: e.clientX, y: e.clientY });

  // Redraw the path on Canvas
  if (ctx) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2563eb';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  const dxFromStart = e.clientX - startX;
  const dyFromStart = e.clientY - startY;
  const totalDist = Math.sqrt(dxFromStart * dxFromStart + dyFromStart * dyFromStart);

  if (totalDist >= 10) {
    hasMovedPastThreshold = true;
  }

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist >= 10) {
    let dir = '';
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'R' : 'L';
    } else {
      dir = dy > 0 ? 'D' : 'U';
    }

    if (gesturePath.length === 0 || gesturePath[gesturePath.length - 1] !== dir) {
      gesturePath.push(dir);
    }

    lastX = e.clientX;
    lastY = e.clientY;
  }

  // Handle Tooltip logic
  if (tooltip) {
    const currentGesture = gesturePath.join('-');
    const action = registeredGestures[currentGesture];

    if (action && hasMovedPastThreshold) {
      tooltip.style.display = 'block';
      tooltip.textContent = action;
      tooltip.style.left = `${e.clientX + 15}px`;
      tooltip.style.top = `${e.clientY + 15}px`;
    } else {
      tooltip.style.display = 'none';
    }
  }
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 2 && isMouseDown) {
    isMouseDown = false;
    clearVisuals();
    if (gesturePath.length > 0) {
      chrome.runtime.sendMessage({
        type: 'EXECUTE_GESTURE',
        gesture: gesturePath.join('-'),
        imageUrl: targetImageUrl
      });
    }
  }
});

document.addEventListener('contextmenu', (e) => {
  if (hasMovedPastThreshold) {
    e.preventDefault();
    hasMovedPastThreshold = false;
  }
});