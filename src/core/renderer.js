// ── CONFIG ──
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var speedSlider = document.getElementById('speed');
var speedLabel = document.getElementById('speed-label');

speedSlider.addEventListener('input', function() {
  var v = [0.25, 0.5, 1, 2, 3][speedSlider.value - 1];
  speedLabel.textContent = '\u00d7' + v;
});
function getSpeed() {
  return [0.25, 0.5, 1, 2, 3][speedSlider.value - 1];
}

// ── MESSAGES (animated arrows) ──
var messages = []; // { from, to, label, color, progress, speed, onDone }

function addMessage(fromId, toId, label, color, duration) {
  if (replayMode) return Promise.resolve();
  checkCancelled();
  return new Promise(function(resolve) {
    messages.push({
      from: fromId, to: toId, label: label, color: color,
      progress: 0,
      speed: 1 / (duration / (1000 / 60)),
      onDone: resolve,
    });
    // 3D camera fly-to target
    if (typeof flyTo3D === 'function') flyTo3D(toId);
  });
}

// Send messages in parallel (returns when all are done)
function addMessagesParallel(arr) {
  if (replayMode) return Promise.resolve();
  checkCancelled();
  return Promise.all(arr.map(function(a) { return addMessage(a.from, a.to, a.label, a.color, a.duration); }));
}

// ── GLOW EFFECT ──
var glowManagers = {}; // id -> { color, t }

function glowManager(id, color, duration) {
  if (replayMode) return;
  glowManagers[id] = { color: color, t: 0, duration: duration };
}

// ── ANIMATION LOOP ──
var animating = true;

function resize() {
  var area = document.getElementById('canvas-area');
  canvas.width = area.clientWidth;
  canvas.height = area.clientHeight;
  layoutManagers(canvas.width, canvas.height);
  // Reset info panel position on resize to prevent offscreen panel
  var panel = document.getElementById('info-panel');
  if (panel) {
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.bottom = '';
  }
}
window.addEventListener('resize', resize);
resize();

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getCanvasScale() {
  var isMobile = canvas.width < 768 || (canvas.width < 1024 && canvas.height < 500);
  return isMobile ? Math.max(Math.min(canvas.width / 900, canvas.height / 450), 0.38) : 1;
}

function drawManager(id) {
  var m = managers[id];
  var p = mgrPos[id];
  if (!p) return;
  var x = p.x - mgrW/2, y = p.y - mgrH/2;
  var s = getCanvasScale();

  // Glow
  if (glowManagers[id]) {
    var g = glowManagers[id];
    var alpha = Math.sin(g.t / g.duration * Math.PI) * 0.5;
    ctx.save();
    ctx.shadowColor = g.color;
    ctx.shadowBlur = 25 * s;
    drawRoundedRect(x - 3 * s, y - 3 * s, mgrW + 6 * s, mgrH + 6 * s, 10 * s);
    ctx.fillStyle = g.color.replace(')', ',' + alpha + ')').replace('rgb', 'rgba');
    ctx.fill();
    ctx.restore();
  }

  // Box
  drawRoundedRect(x, y, mgrW, mgrH, 8 * s);
  ctx.fillStyle = m.style === 'dashed' ? '#141c2b' : '#1e293b';
  ctx.fill();
  ctx.strokeStyle = m.color;
  ctx.lineWidth = 2 * s;
  if (m.style === 'dashed') ctx.setLineDash([6 * s, 4 * s]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Label
  var lines = m.label.split('\n');
  var fontSize1 = Math.round(12 * s);
  var fontSize2 = Math.round(11 * s);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 ' + fontSize1 + 'px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var lineH = Math.round(15 * s);
  var startY = p.y - ((lines.length - 1) * lineH) / 2;
  lines.forEach(function(line, i) {
    ctx.fillStyle = i === 0 ? '#fff' : m.color;
    ctx.font = i === 0 ? '600 ' + fontSize1 + 'px "Segoe UI", system-ui, sans-serif' : fontSize2 + 'px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(line, p.x, startY + i * lineH);
  });
}

function drawArrow(x1, y1, x2, y2, color, progress, label) {
  var s = getCanvasScale();
  // Clamp endpoints to manager box edges
  var dx = x2 - x1, dy = y2 - y1;
  var dist = Math.sqrt(dx*dx + dy*dy);
  if (dist < 1) return;
  var nx = dx/dist, ny = dy/dist;

  // offset start/end from box edges (scaled)
  var startDist = mgrW * 0.35;
  var endDist = mgrW * 0.35;
  var sx = x1 + nx * startDist, sy = y1 + ny * startDist;
  var ex = x2 - nx * endDist, ey = y2 - ny * endDist;

  var segDx = ex - sx, segDy = ey - sy;
  var segDist = Math.sqrt(segDx*segDx + segDy*segDy);

  // Trail
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  var px = sx + segDx * progress, py = sy + segDy * progress;
  ctx.lineTo(px, py);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, 3 * s);
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Arrowhead
  if (progress > 0.05) {
    var aLen = Math.max(6, 10 * s);
    var angle = Math.atan2(segDy, segDx);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - aLen * Math.cos(angle - 0.4), py - aLen * Math.sin(angle - 0.4));
    ctx.lineTo(px - aLen * Math.cos(angle + 0.4), py - aLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Dot at head
  ctx.beginPath();
  ctx.arc(px, py, Math.max(3, 5 * s), 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px, py, Math.max(5, 8 * s), 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * s;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Label
  if (label) {
    var fontSize = Math.max(8, Math.round(11 * s));
    var lx = sx + segDx * Math.min(progress, 0.55);
    var ly = sy + segDy * Math.min(progress, 0.55) - 14 * s;
    ctx.font = '600 ' + fontSize + 'px "Consolas", "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    // background
    var tw = ctx.measureText(label).width + 10 * s;
    drawRoundedRect(lx - tw/2, ly - 14 * s, tw, 17 * s, 4 * s);
    ctx.fillStyle = 'rgba(17,24,39,0.9)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(label, lx, ly);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid dots
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (var x = 0; x < canvas.width; x += 30) {
    for (var y = 0; y < canvas.height; y += 30) {
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // WinCC OA boundary box
  if (mgrPos.plc && mgrPos.driver) {
    var boundLeft = mgrPos.driver.x - mgrW/2 - 20;
    var boundTop = Math.min(
      mgrPos.ctrl_pid ? mgrPos.ctrl_pid.y - mgrH/2 - 30 : mgrPos.ev.y - mgrH/2 - 30,
      mgrPos.ui1 ? mgrPos.ui1.y - mgrH/2 - 30 : 9999
    );
    // Include inside-ext managers (js_mgr, mcp_server, mqtt_pub) only when visible
    var insideExtRight = Math.max(
      (isManagerVisible('js_mgr') && mgrPos.js_mgr) ? mgrPos.js_mgr.x + mgrW/2 + 20 : 0,
      (isManagerVisible('mcp_server') && mgrPos.mcp_server) ? mgrPos.mcp_server.x + mgrW/2 + 20 : 0,
      (isManagerVisible('mqtt_pub') && mgrPos.mqtt_pub) ? mgrPos.mqtt_pub.x + mgrW/2 + 20 : 0
    );
    var boundRight = Math.max(
      mgrPos.ui1 ? mgrPos.ui1.x + mgrW/2 + 20 : 0,
      mgrPos.ui2 ? mgrPos.ui2.x + mgrW/2 + 20 : 0,
      mgrPos.nga ? mgrPos.nga.x + mgrW/2 + 20 : 0,
      insideExtRight
    );
    var boundBottom = Math.max(
      mgrPos.dm ? mgrPos.dm.y + mgrH/2 + 30 : 0,
      mgrPos.nga ? mgrPos.nga.y + mgrH/2 + 30 : 0,
      mgrPos.ui2 ? mgrPos.ui2.y + mgrH/2 + 30 : 0
    );
    ctx.save();
    ctx.setLineDash([10, 6]);
    ctx.strokeStyle = 'rgba(96,165,250,0.15)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(boundLeft, boundTop, boundRight - boundLeft, boundBottom - boundTop, 16);
    ctx.stroke();
    ctx.setLineDash([]);
    // Label
    ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(96,165,250,0.3)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('WinCC OA', boundLeft + 12, boundTop + 6);
    ctx.restore();
  }

  // Connection lines (faint) — from EV to other WinCC OA managers
  ctx.strokeStyle = 'rgba(96,165,250,0.18)';
  ctx.lineWidth = 1.5;
  var evP = mgrPos.ev;
  for (var id in managers) {
    if (!managers.hasOwnProperty(id)) continue;
    if (!isManagerVisible(id)) continue;
    if (id === 'ev' || id === 'plc' || id === 'pgsql' || id === 'kafka' || id === 'pred_maint' || id === 'claude_app' || id === 'anthropic' || id === 'mqtt_broker' || id === 'uns_mes' || id === 'uns_hist') continue;
    var p = mgrPos[id];
    if (!p) continue;
    ctx.beginPath();
    ctx.moveTo(evP.x, evP.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  // Driver <-> PLC line (OPC UA)
  if (mgrPos.driver && mgrPos.plc) {
    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mgrPos.driver.x, mgrPos.driver.y);
    ctx.lineTo(mgrPos.plc.x, mgrPos.plc.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // "OPC UA" label on the link
    var midX = (mgrPos.driver.x + mgrPos.plc.x) / 2;
    var midY = (mgrPos.driver.y + mgrPos.plc.y) / 2 - 12;
    ctx.font = '600 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(148,163,184,0.55)';
    ctx.fillText('OPC UA', midX, midY);
    ctx.restore();
  }

  // NGA <-> PostgreSQL line (external database)
  if (mgrPos.nga && mgrPos.pgsql) {
    ctx.save();
    ctx.strokeStyle = 'rgba(51,103,145,0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mgrPos.nga.x, mgrPos.nga.y);
    ctx.lineTo(mgrPos.pgsql.x, mgrPos.pgsql.y);
    ctx.stroke();
    ctx.setLineDash([]);
    var midX = (mgrPos.nga.x + mgrPos.pgsql.x) / 2;
    var midY = (mgrPos.nga.y + mgrPos.pgsql.y) / 2 - 12;
    ctx.font = '600 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(51,103,145,0.6)';
    ctx.fillText('SQL', midX + 14, midY);
    ctx.restore();
  }
  // NGA <-> DM link (history read return path)
  if (mgrPos.nga && mgrPos.dm) {
    ctx.strokeStyle = 'rgba(139,92,246,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mgrPos.nga.x, mgrPos.nga.y);
    ctx.lineTo(mgrPos.dm.x, mgrPos.dm.y);
    ctx.stroke();
  }
  // JS Manager <-> Kafka line
  if (isManagerVisible('kafka') && mgrPos.js_mgr && mgrPos.kafka) {
    ctx.save();
    ctx.strokeStyle = 'rgba(6,182,212,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mgrPos.js_mgr.x, mgrPos.js_mgr.y);
    ctx.lineTo(mgrPos.kafka.x, mgrPos.kafka.y);
    ctx.stroke();
    ctx.setLineDash([]);
    var midX = (mgrPos.js_mgr.x + mgrPos.kafka.x) / 2;
    var midY = (mgrPos.js_mgr.y + mgrPos.kafka.y) / 2 - 12;
    ctx.font = '600 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(6,182,212,0.6)';
    ctx.fillText('Kafka', midX, midY);
    ctx.restore();
  }
  // Kafka <-> Predictive Maintenance line
  if (isManagerVisible('pred_maint') && mgrPos.kafka && mgrPos.pred_maint) {
    ctx.save();
    ctx.strokeStyle = 'rgba(20,184,166,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mgrPos.kafka.x, mgrPos.kafka.y);
    ctx.lineTo(mgrPos.pred_maint.x, mgrPos.pred_maint.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // MCP Server <-> Claude Desktop App line
  if (isManagerVisible('mcp_server') && mgrPos.mcp_server && mgrPos.claude_app) {
    ctx.save();
    ctx.strokeStyle = 'rgba(217,70,239,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mgrPos.mcp_server.x, mgrPos.mcp_server.y);
    ctx.lineTo(mgrPos.claude_app.x, mgrPos.claude_app.y);
    ctx.stroke();
    ctx.setLineDash([]);
    var midX = (mgrPos.mcp_server.x + mgrPos.claude_app.x) / 2;
    var midY = (mgrPos.mcp_server.y + mgrPos.claude_app.y) / 2 - 12;
    ctx.font = '600 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(217,70,239,0.6)';
    ctx.fillText('MCP', midX, midY);
    ctx.restore();
  }
  // Claude Desktop App <-> Anthropic API line
  if (isManagerVisible('anthropic') && mgrPos.claude_app && mgrPos.anthropic) {
    ctx.save();
    ctx.strokeStyle = 'rgba(217,70,239,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mgrPos.claude_app.x, mgrPos.claude_app.y);
    ctx.lineTo(mgrPos.anthropic.x, mgrPos.anthropic.y);
    ctx.stroke();
    ctx.setLineDash([]);
    var midX = (mgrPos.claude_app.x + mgrPos.anthropic.x) / 2;
    var midY = (mgrPos.claude_app.y + mgrPos.anthropic.y) / 2 - 12;
    ctx.font = '600 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(217,70,239,0.6)';
    ctx.fillText('API', midX, midY);
    ctx.restore();
  }
  // EV <-> MCP Server line (direct connection)
  if (isManagerVisible('mcp_server') && mgrPos.ev && mgrPos.mcp_server) {
    ctx.strokeStyle = 'rgba(168,85,247,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mgrPos.ev.x, mgrPos.ev.y);
    ctx.lineTo(mgrPos.mcp_server.x, mgrPos.mcp_server.y);
    ctx.stroke();
  }
  // MQTT Publisher <-> Mosquitto Broker line
  if (isManagerVisible('mqtt_pub') && mgrPos.mqtt_pub && mgrPos.mqtt_broker) {
    ctx.save();
    ctx.strokeStyle = 'rgba(34,211,238,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mgrPos.mqtt_pub.x, mgrPos.mqtt_pub.y);
    ctx.lineTo(mgrPos.mqtt_broker.x, mgrPos.mqtt_broker.y);
    ctx.stroke();
    ctx.setLineDash([]);
    var midX = (mgrPos.mqtt_pub.x + mgrPos.mqtt_broker.x) / 2;
    var midY = (mgrPos.mqtt_pub.y + mgrPos.mqtt_broker.y) / 2 - 12;
    ctx.font = '600 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(34,211,238,0.6)';
    ctx.fillText('MQTT', midX, midY);
    ctx.restore();
  }
  // Mosquitto <-> MES line
  if (isManagerVisible('uns_mes') && mgrPos.mqtt_broker && mgrPos.uns_mes) {
    ctx.save();
    ctx.strokeStyle = 'rgba(132,204,22,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mgrPos.mqtt_broker.x, mgrPos.mqtt_broker.y);
    ctx.lineTo(mgrPos.uns_mes.x, mgrPos.uns_mes.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // Mosquitto <-> Cloud Historian line
  if (isManagerVisible('uns_hist') && mgrPos.mqtt_broker && mgrPos.uns_hist) {
    ctx.save();
    ctx.strokeStyle = 'rgba(132,204,22,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mgrPos.mqtt_broker.x, mgrPos.mqtt_broker.y);
    ctx.lineTo(mgrPos.uns_hist.x, mgrPos.uns_hist.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // EV <-> MQTT Publisher line
  if (isManagerVisible('mqtt_pub') && mgrPos.ev && mgrPos.mqtt_pub) {
    ctx.strokeStyle = 'rgba(34,211,238,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mgrPos.ev.x, mgrPos.ev.y);
    ctx.lineTo(mgrPos.mqtt_pub.x, mgrPos.mqtt_pub.y);
    ctx.stroke();
  }

  // Managers (only visible ones)
  for (var id in managers) {
    if (!managers.hasOwnProperty(id)) continue;
    if (isManagerVisible(id)) drawManager(id);
  }

  // Animated messages
  var speed = getSpeed();
  for (var i = messages.length - 1; i >= 0; i--) {
    var msg = messages[i];
    var from = mgrPos[msg.from];
    var to = mgrPos[msg.to];
    if (!from || !to) { messages.splice(i, 1); continue; }

    // Hold time: keep arrow visible after arrival (in ms, adjusted by speed)
    var holdFrames = Math.round(400 / (16 * speed)); // ~400ms hold

    // self-arrow (internal)
    if (msg.from === msg.to) {
      if (msg.progress < 1) {
        msg.progress += msg.speed * speed;
        if (msg.progress >= 1) { msg.progress = 1; msg.holdCount = 0; }
      } else {
        msg.holdCount = (msg.holdCount || 0) + 1;
        if (msg.holdCount >= holdFrames) {
          messages.splice(i, 1);
          msg.onDone();
          continue;
        }
      }
      // Draw a small loop
      var lcx = from.x, lcy = from.y - mgrH/2 - 20;
      var r = 18;
      var angle = Math.min(msg.progress, 1) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(lcx, lcy, r, 0, angle);
      ctx.strokeStyle = msg.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Label
      if (msg.label) {
        ctx.font = '600 10px "Consolas", "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = msg.color;
        ctx.fillText(msg.label, lcx, lcy - r - 6);
      }
      continue;
    }

    drawArrow(from.x, from.y, to.x, to.y, msg.color, Math.min(msg.progress, 1), msg.label);
    if (msg.progress < 1) {
      msg.progress += msg.speed * speed;
      if (msg.progress >= 1) { msg.progress = 1; msg.holdCount = 0; }
    } else {
      msg.holdCount = (msg.holdCount || 0) + 1;
      if (msg.holdCount >= holdFrames) {
        messages.splice(i, 1);
        msg.onDone();
      }
    }
  }

  // Update glows
  for (var gid in glowManagers) {
    if (!glowManagers.hasOwnProperty(gid)) continue;
    var g = glowManagers[gid];
    g.t += 16 * getSpeed();
    if (g.t >= g.duration) delete glowManagers[gid];
  }

  requestAnimationFrame(draw);
}
draw();
renderSubTable();
renderProcessImage();
