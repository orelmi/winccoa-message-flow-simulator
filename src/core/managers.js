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
  // Scale factor for small screens (use both dimensions to ensure fit)
  var isMobile = w < 768 || (w < 1024 && h < 500);
  var scale = isMobile ? Math.max(Math.min(w / 900, h / 450), 0.38) : 1;
  mgrW = Math.round(baseMgrW * scale);
  mgrH = Math.round(baseMgrH * scale);

  // On mobile, don't subtract info panel width (panel overlays or is collapsed)
  var panelOffset = isMobile ? 0 : 280;
  var cx = (w - panelOffset) / 2;
  var cy = h / 2;
  var rx = Math.min(cx * 0.50, 240 * scale);
  var ry = Math.min(cy * 0.48, 150 * scale);

  // EV center
  mgrPos.ev = { x: cx, y: cy - 16 * scale };
  // DM below EV
  mgrPos.dm = { x: cx - rx * 0.45, y: cy + ry * 0.85 };
  // NGA below EV, right side (receives directly from EV)
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
  var extSpacing = mgrH + 10 * scale;
  var extTopY = cy - extSpacing - 8 * scale;

  // JS Manager, MCP Server, MQTT Publisher share the same inside position
  mgrPos.js_mgr = { x: insideExtX, y: cy };
  mgrPos.mcp_server = { x: insideExtX, y: cy };
  mgrPos.mqtt_pub = { x: insideExtX, y: cy };

  // Outside-WinCC-OA managers (further right, stacked vertically)
  var outsideExtX = insideExtX + mgrW + (isMobile ? 40 : 100);

  // Kafka scenario: Broker Kafka, Predictive Maintenance
  mgrPos.kafka = { x: outsideExtX, y: extTopY };
  mgrPos.pred_maint = { x: outsideExtX, y: extTopY + extSpacing };

  // MCP scenario: Claude Desktop App, Anthropic API
  mgrPos.claude_app = { x: outsideExtX, y: extTopY };
  mgrPos.anthropic = { x: outsideExtX, y: extTopY + extSpacing };

  // UNS scenario: MQTT Broker on top, MES and Cloud Historian side by side below
  mgrPos.mqtt_broker = { x: outsideExtX, y: extTopY };
  var unsSubY = extTopY + extSpacing + 16 * scale;
  mgrPos.uns_mes = { x: outsideExtX - mgrW/2 - 16 * scale, y: unsSubY };
  mgrPos.uns_hist = { x: outsideExtX + mgrW/2 + 16 * scale, y: unsSubY };
}
