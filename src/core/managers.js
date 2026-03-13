// ── MANAGERS ──
var managers = {
  plc:      { label: 'PLC\n(S7 / Simatic)',               color: '#94a3b8', icon: '', style: 'dashed' },
  driver:   { label: 'Driver\nOPC UA',                     color: '#f97316', icon: '' },
  ev:       { label: 'Event Manager\n(EV)',                color: '#3b82f6', icon: '' },
  dm:       { label: 'Data Manager\n(DM \u2014 SQLite)',   color: '#8b5cf6', icon: '' },
  ctrl_pid: { label: 'CTRL Manager\n(PID)',                color: '#10b981', icon: '' },
  ui1:      { label: 'UI Manager\n(Operator)',             color: '#f59e0b', icon: '' },
  ui2:      { label: 'UI Manager\n(Monitoring)',           color: '#eab308', icon: '' },
  nga:      { label: 'NGA Frontend\n(Backend In-Proc)',      color: '#ec4899', icon: '' },
  pgsql:    { label: 'PostgreSQL\n(database)',               color: '#336791', icon: '', style: 'dashed' },
  js_mgr:    { label: 'JS Manager\n(Node.js)',                  color: '#06b6d4', icon: '' },
  kafka:     { label: 'Broker\nKafka',                          color: '#06b6d4', icon: '', style: 'dashed' },
  pred_maint:{ label: 'Predictive\nMaintenance (ML)',            color: '#14b8a6', icon: '', style: 'dashed' },
  mcp_server:{ label: 'MCP Server\n(Node.js gateway)',           color: '#a855f7', icon: '' },
  claude_app:{ label: 'Claude\nDesktop App',                     color: '#d946ef', icon: '' },
  anthropic: { label: 'Anthropic\nAPI',                          color: '#d946ef', icon: '', style: 'dashed' },
  mqtt_pub:  { label: 'MQTT Publisher\n(WinCC OA)',              color: '#22d3ee', icon: '' },
  mqtt_broker:{ label: 'MQTT Broker\n(Mosquitto)',                color: '#22d3ee', icon: '', style: 'dashed' },
  uns_mes:   { label: 'MES\n(Manufacturing)',                    color: '#84cc16', icon: '', style: 'dashed' },
  uns_hist:  { label: 'Cloud Historian\n(Data Lake)',            color: '#84cc16', icon: '', style: 'dashed' },
};

// positions computed on resize
var mgrPos = {};
var mgrW = 120, mgrH = 64;
var baseMgrW = 120, baseMgrH = 64;
var currentScale = 1;

// Manager visibility per scenario
var BASE_MANAGERS = ['plc', 'driver', 'ev', 'dm', 'ctrl_pid', 'ui1', 'ui2', 'nga', 'pgsql'];
var KAFKA_MANAGERS = ['js_mgr', 'kafka', 'pred_maint'];
var MCP_MANAGERS = ['mcp_server', 'claude_app', 'anthropic'];
var MQTT_MANAGERS = ['mqtt_pub', 'mqtt_broker', 'uns_mes', 'uns_hist'];

var scenarioVisibility = {
  dpGet:      BASE_MANAGERS,
  dpSet:      BASE_MANAGERS,
  dpConnect:  BASE_MANAGERS,
  plcLive:    BASE_MANAGERS,
  cycle:      BASE_MANAGERS,
  history:    BASE_MANAGERS,
  kafka:      BASE_MANAGERS.concat(KAFKA_MANAGERS),
  mcp:        BASE_MANAGERS.concat(MCP_MANAGERS),
  uns:        BASE_MANAGERS.concat(MQTT_MANAGERS),
};
var visibleManagers = new Set(BASE_MANAGERS);

function isManagerVisible(id) {
  return visibleManagers.has(id);
}

function layoutManagers(w, h) {
  var isMobile = w < 768 || (w < 1024 && h < 500);
  var isPortrait = isMobile && h > w * 1.1;
  var scale;

  if (isPortrait) {
    scale = Math.max(Math.min(w / 480, h / 850), 0.45);
  } else {
    scale = isMobile ? Math.max(Math.min(w / 900, h / 450), 0.38) : 1;
  }

  currentScale = scale;
  mgrW = Math.round(baseMgrW * scale);
  mgrH = Math.round(baseMgrH * scale);

  if (isPortrait) {
    layoutPortrait(w, h, scale);
  } else {
    layoutLandscape(w, h, scale, isMobile);
  }
}

// Portrait: vertical spine PLC->Driver->EV->DM->NGA->PGSQL
// CTRL branches left, UIs branch right
function layoutPortrait(w, h, scale) {
  var cx = w / 2;
  var colW = Math.min((w - mgrW - 16) / 2, mgrW * 1.3);
  var leftCol = cx - colW;
  var rightCol = cx + colW;

  var pad = 8;
  var rowH = (h - pad * 2) / 6;

  // Vertical spine (center column)
  mgrPos.plc =    { x: cx, y: pad + rowH * 0.5 };
  mgrPos.driver = { x: cx, y: pad + rowH * 1.5 };
  mgrPos.ev =     { x: cx, y: pad + rowH * 2.5 };
  mgrPos.dm =     { x: cx, y: pad + rowH * 3.5 };
  mgrPos.nga =    { x: cx, y: pad + rowH * 4.3 };
  mgrPos.pgsql =  { x: cx, y: pad + rowH * 5.2 };

  // Left branch: CTRL at same row as EV
  mgrPos.ctrl_pid = { x: leftCol, y: pad + rowH * 2.5 };

  // Right branch: UIs stacked around EV row
  var uiGap = mgrH * 0.55;
  mgrPos.ui1 = { x: rightCol, y: pad + rowH * 2.5 - uiGap };
  mgrPos.ui2 = { x: rightCol, y: pad + rowH * 2.5 + uiGap };

  // Inside extension managers (right column, below UIs)
  var insideExtY = pad + rowH * 3.5;
  mgrPos.js_mgr =     { x: rightCol, y: insideExtY };
  mgrPos.mcp_server = { x: rightCol, y: insideExtY };
  mgrPos.mqtt_pub =   { x: rightCol, y: insideExtY };

  // Outside extension managers (right column, further down)
  var extSpacing = mgrH + 8 * scale;
  var extY = pad + rowH * 4.5;

  mgrPos.kafka =       { x: rightCol, y: extY };
  mgrPos.pred_maint =  { x: rightCol, y: extY + extSpacing };

  mgrPos.claude_app =  { x: rightCol, y: extY };
  mgrPos.anthropic =   { x: rightCol, y: extY + extSpacing };

  mgrPos.mqtt_broker = { x: rightCol, y: extY };
  var unsSubY = extY + extSpacing;
  mgrPos.uns_mes =  { x: leftCol, y: unsSubY };
  mgrPos.uns_hist = { x: rightCol, y: unsSubY };
}

// Landscape: horizontal layout (existing design, improved space usage)
function layoutLandscape(w, h, scale, isMobile) {
  var panelOffset = isMobile ? 0 : 280;
  var cx = (w - panelOffset) / 2;
  var cy = h / 2;

  // Use more space on mobile
  var rx, ry;
  if (isMobile) {
    rx = Math.min(cx * 0.58, 280 * scale);
    ry = Math.min(cy * 0.58, 180 * scale);
  } else {
    rx = Math.min(cx * 0.50, 240 * scale);
    ry = Math.min(cy * 0.48, 150 * scale);
  }

  // EV center
  mgrPos.ev = { x: cx, y: cy - 16 * scale };
  // DM below EV
  mgrPos.dm = { x: cx - rx * 0.45, y: cy + ry * 0.85 };
  // NGA below EV, right side
  mgrPos.nga = { x: cx + rx * 0.45, y: cy + ry * 0.85 };
  // PostgreSQL database — external, below NGA
  mgrPos.pgsql = { x: cx + rx * 0.45, y: cy + ry * 1.55 };
  // Driver left of EV
  mgrPos.driver = { x: cx - rx, y: cy - 16 * scale };
  // PLC far left (outside WinCC OA boundary)
  mgrPos.plc = { x: cx - rx * 1.7, y: cy - 16 * scale };
  // CTRL top right
  mgrPos.ctrl_pid = { x: cx + rx * 0.6, y: cy - ry * 0.9 };
  // 2 UI Managers stacked vertically on the right
  var uiX = cx + rx * 1.05;
  var uiSpacing = mgrH + 10 * scale;
  mgrPos.ui1 = { x: uiX, y: cy - uiSpacing / 2 - 4 * scale };
  mgrPos.ui2 = { x: uiX, y: cy + uiSpacing / 2 + 4 * scale };
  // Inside-WinCC-OA extension managers (one per scenario, shared position)
  var insideExtX = uiX + mgrW + 40 * scale;
  var extSpacing = mgrH + 30 * scale;

  // JS Manager, MCP Server, MQTT Publisher share the same inside position
  mgrPos.js_mgr = { x: insideExtX, y: cy };
  mgrPos.mcp_server = { x: insideExtX, y: cy };
  mgrPos.mqtt_pub = { x: insideExtX, y: cy };

  // Outside-WinCC-OA managers (further right, well spaced)
  var outsideExtX = insideExtX + mgrW + (isMobile ? 60 : 120);
  var extCenterY = cy;

  // Kafka scenario: JS Manager center, Broker Kafka above, Predictive Maintenance below
  mgrPos.kafka = { x: outsideExtX, y: extCenterY - extSpacing };
  mgrPos.pred_maint = { x: outsideExtX, y: extCenterY + extSpacing };

  // MCP scenario: Claude Desktop App above center, Anthropic API below
  mgrPos.claude_app = { x: outsideExtX, y: extCenterY - extSpacing };
  mgrPos.anthropic = { x: outsideExtX, y: extCenterY + extSpacing };

  // UNS scenario: MQTT Broker top, MES and Cloud Historian spread below
  mgrPos.mqtt_broker = { x: outsideExtX, y: extCenterY - extSpacing };
  mgrPos.uns_mes = { x: outsideExtX - mgrW * 0.7, y: extCenterY + extSpacing };
  mgrPos.uns_hist = { x: outsideExtX + mgrW * 0.7, y: extCenterY + extSpacing };
}
