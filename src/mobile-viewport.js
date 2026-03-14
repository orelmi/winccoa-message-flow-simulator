// ── MOBILE VIEWPORT: Camera follow + Overview + Persistent messages ──
// Loaded after renderer.js — overrides resize(), draw(), addMessage(), glowManager()

// Virtual layout dimensions (desktop scale for readable managers)
var VIRTUAL_W = 1200;
var VIRTUAL_H = 700;

// Camera state
var camera = {
  x: 0, y: 0, zoom: 0.4,
  targetX: 0, targetY: 0, targetZoom: 0.4
};
var overviewMode = true;

// ── Persistent messages ──
// Completed arrows that stay visible until destination node glows
var persistentMessages = []; // { from, to, label, color }

// Override addMessage: keep a persistent copy after the arrow animation completes
var _origAddMessage = addMessage;
addMessage = function(fromId, toId, label, color, duration) {
  // Clear persistent arrows pointing TO the source node (we're moving on from it)
  persistentMessages = persistentMessages.filter(function(pm) {
    return pm.to !== fromId;
  });
  var promise = _origAddMessage(fromId, toId, label, color, duration);
  promise.then(function() {
    // Keep arrow visible as a persistent overlay
    persistentMessages.push({
      from: fromId, to: toId, label: label, color: color
    });
  });
  return promise;
};

// Override glowManager: when a node highlights, clear persistent arrows pointing TO it
var _origGlowManager = glowManager;
glowManager = function(id, color, duration) {
  persistentMessages = persistentMessages.filter(function(pm) {
    return pm.to !== id;
  });
  _origGlowManager(id, color, duration);
};

// Compute overview target: fit all visible managers in viewport
function computeOverviewTarget() {
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (var id in managers) {
    if (!managers.hasOwnProperty(id)) continue;
    if (!isManagerVisible(id)) continue;
    var p = mgrPos[id];
    if (!p) continue;
    minX = Math.min(minX, p.x - mgrW / 2);
    maxX = Math.max(maxX, p.x + mgrW / 2);
    minY = Math.min(minY, p.y - mgrH / 2);
    maxY = Math.max(maxY, p.y + mgrH / 2);
  }
  if (minX === Infinity) return;
  var margin = 50;
  minX -= margin; minY -= margin; maxX += margin; maxY += margin;
  camera.targetX = (minX + maxX) / 2;
  camera.targetY = (minY + maxY) / 2;
  // Account for step bar (~40px top) and control bar (~60px bottom)
  var usableH = canvasH - 100;
  if (usableH < 100) usableH = canvasH;
  camera.targetZoom = Math.min(
    canvasW / (maxX - minX),
    usableH / (maxY - minY)
  );
}

// Update camera each frame
function updateCamera() {
  if (overviewMode) {
    computeOverviewTarget();
  } else if (messages.length > 0) {
    var msg = messages[messages.length - 1];
    var from = mgrPos[msg.from];
    var to = mgrPos[msg.to];
    if (from && to) {
      if (msg.from === msg.to) {
        // Self-message: center on the manager
        camera.targetX = from.x;
        camera.targetY = from.y;
        camera.targetZoom = Math.min(canvasW / (mgrW * 5), canvasH / (mgrH * 5), 1.2);
      } else {
        // Center between source and destination
        camera.targetX = (from.x + to.x) / 2;
        camera.targetY = (from.y + to.y) / 2;
        // Zoom to fit both managers with padding
        var dx = Math.abs(to.x - from.x) + mgrW * 3.5;
        var dy = Math.abs(to.y - from.y) + mgrH * 4;
        camera.targetZoom = Math.min(canvasW / dx, canvasH / dy, 1.2);
        camera.targetZoom = Math.max(camera.targetZoom, 0.35);
      }
    }
  }
  // Smooth lerp
  var lerp = 0.065;
  camera.x += (camera.targetX - camera.x) * lerp;
  camera.y += (camera.targetY - camera.y) * lerp;
  camera.zoom += (camera.targetZoom - camera.zoom) * lerp;
}

// Override resize: layout at virtual desktop size
resize = function() {
  var area = document.getElementById('canvas-area');
  var dpr = window.devicePixelRatio || 1;
  canvasW = area.clientWidth;
  canvasH = area.clientHeight;
  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Layout at virtual desktop size for readable manager boxes
  layoutManagers(VIRTUAL_W, VIRTUAL_H);
  if (overviewMode) {
    computeOverviewTarget();
    // Snap camera immediately on resize
    camera.x = camera.targetX;
    camera.y = camera.targetY;
    camera.zoom = camera.targetZoom;
  }
};
resize();

// Override draw: apply camera transform + render persistent messages
var _origDraw = draw;
draw = function() {
  updateCamera();

  var dpr = window.devicePixelRatio || 1;
  // Clear full canvas with identity transform
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Apply camera: translate so camera center maps to screen center
  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // Original draw handles: clearRect (harmless redo), grid, boundary,
  // connections, managers, messages, glows, requestAnimationFrame(draw)
  _origDraw();

  // Draw persistent messages (completed arrows that stay until node glows)
  for (var i = 0; i < persistentMessages.length; i++) {
    var pm = persistentMessages[i];
    var pfrom = mgrPos[pm.from];
    var pto = mgrPos[pm.to];
    if (!pfrom || !pto) continue;
    if (pm.from === pm.to) {
      // Self-loop
      var lcx = pfrom.x, lcy = pfrom.y - mgrH / 2 - 20;
      ctx.beginPath();
      ctx.arc(lcx, lcy, 18, 0, Math.PI * 2);
      ctx.strokeStyle = pm.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (pm.label) {
        var s = getCanvasScale();
        var fs = Math.max(8, Math.round(10 * s));
        ctx.font = '600 ' + fs + 'px "Consolas", "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = pm.color;
        ctx.fillText(pm.label, lcx, lcy - 24);
      }
    } else {
      drawArrow(pfrom.x, pfrom.y, pto.x, pto.y, pm.color, 1.0, pm.label);
    }
  }

  ctx.restore();
};
