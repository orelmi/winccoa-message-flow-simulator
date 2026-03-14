// ── SCENARIO ENGINE ──
var scenarioRunning = false;
var stepMode = false;
var stepResolve = null;
var currentSteps = [];
var currentStepIdx = 0;
var currentScenarioName = '';
var replayTarget = -1;
var replayMode = false;
var globalStepIdx = 0;
var pendingScenario = null;
var scenarioGen = 0;
var currentGen = 0;
var autoAdvanceFirst = false;

function checkCancelled() {
  if (currentGen !== scenarioGen) throw 'scenario_cancelled';
}

var scenarioTitles = {
  dpGet: 'S1 \u2014 dpGet',
  dpSet: 'S2 \u2014 dpSet',
  dpConnect: 'S3 \u2014 dpConnect',
  plcLive: 'S4 \u2014 PLC Live',
  cycle: 'S5 \u2014 Cycle complet',
  history: 'S6 \u2014 Lecture historique',
  kafka: 'S7 \u2014 Node.js \u2192 Kafka',
  mcp: 'S8 \u2014 Claude AI (MCP)',
  uns: 'S9 \u2014 UNS (MQTT)',
};

function setButtons(disabled) {
  document.getElementById('btn-dpget').disabled = disabled;
  document.getElementById('btn-dpset').disabled = disabled;
  document.getElementById('btn-dpconnect').disabled = disabled;
  document.getElementById('btn-plclive').disabled = disabled;
  document.getElementById('btn-cycle').disabled = disabled;
  document.getElementById('btn-history').disabled = disabled;
  document.getElementById('btn-kafka').disabled = disabled;
  document.getElementById('btn-mcp').disabled = disabled;
  document.getElementById('btn-uns').disabled = disabled;
}

function showStep(num, total, html) {
  document.getElementById('idle-msg').style.display = 'none';
  document.getElementById('scenario-intro').style.display = 'none';
  var sn = document.getElementById('step-num');
  var st = document.getElementById('step-text');
  sn.style.display = '';
  st.style.display = '';
  sn.textContent = num + ' / ' + total;
  st.innerHTML = html;
  // Update navigation buttons
  document.getElementById('btn-prev').disabled = (num <= 1);
  if (num >= total) {
    document.getElementById('btn-step').textContent = '\u2713';
  } else {
    document.getElementById('btn-step').innerHTML = t('nextBtn') + ' &#9656;';
  }
}

function hideStep() {
  var idleEl = document.getElementById('idle-msg');
  idleEl.style.display = '';
  idleEl.textContent = 'Choose a scenario to start the animation.';
  document.getElementById('step-num').style.display = 'none';
  document.getElementById('step-text').style.display = 'none';
  document.getElementById('scenario-intro').style.display = 'none';
  document.getElementById('btn-start-scenario').style.display = 'none';
}

function wait(ms) {
  checkCancelled();
  if (replayMode) return new Promise(function(r) { setTimeout(r, 5); });
  return new Promise(function(r) { setTimeout(r, ms / getSpeed()); });
}

async function waitForStep() {
  checkCancelled();
  // In replay mode, auto-advance until reaching target
  if (replayMode && globalStepIdx < replayTarget) {
    globalStepIdx++;
    document.getElementById('btn-prev').disabled = (globalStepIdx <= 0);
    await wait(50);
    return;
  }
  if (replayMode && globalStepIdx >= replayTarget) {
    replayMode = false;
    // Fall through to normal step wait
  }

  globalStepIdx++;
  document.getElementById('btn-prev').disabled = (globalStepIdx <= 1);

  // Auto-advance on first step after Start is clicked
  if (autoAdvanceFirst) {
    autoAdvanceFirst = false;
    document.getElementById('btn-step').disabled = false;
    return;
  }

  document.getElementById('btn-step').disabled = false;
  return new Promise(function(r) { stepResolve = r; });
}

function nextStep() {
  if (stepResolve) {
    document.getElementById('btn-step').disabled = true;
    stepResolve();
    stepResolve = null;
  }
}

function showScenarioIntro(name) {
  if (scenarioRunning) return;
  pendingScenario = name;

  // Show relevant managers for this scenario
  visibleManagers = new Set(scenarioVisibility[name] || BASE_MANAGERS);
  if (typeof rebuild3DNodes === 'function') rebuild3DNodes();

  document.getElementById('idle-msg').style.display = 'none';
  document.getElementById('step-num').style.display = 'none';
  document.getElementById('step-text').style.display = 'none';
  document.getElementById('scenario-intro').style.display = 'flex';
  document.getElementById('intro-title').textContent = scenarioTitles[name] || name;
  document.getElementById('intro-desc').innerHTML = t('intro_' + name);

  // Show start button in controls bar
  document.getElementById('btn-start-scenario').style.display = '';
}

function startPendingScenario() {
  if (!pendingScenario) return;
  document.getElementById('scenario-intro').style.display = 'none';
  document.getElementById('btn-start-scenario').style.display = 'none';
  var name = pendingScenario;
  pendingScenario = null;
  autoAdvanceFirst = true;
  runScenario(name);
}

async function prevStep() {
  if (!scenarioRunning || globalStepIdx <= 1) return;
  var targetStep = globalStepIdx - 2; // go back one step (0-based)
  var scenarioName = currentScenarioName;

  // Cancel current scenario via generation counter
  scenarioGen++;
  if (stepResolve) {
    stepResolve();
    stepResolve = null;
  }
  // Let the cancelled scenario unwind
  await new Promise(function(r) { setTimeout(r, 20); });

  // Reset everything
  messages = [];
  subscriptions = [];
  highlightSubs = [];
  piFlash = {};
  glowManagers = {};
  processImage = {
    'TC_101.temperature': 820.0,
    'PID_TOP.setpoint': 900.0,
    'PID_TOP.output': 65.0,
    'HR_TOP.power': 65.0,
    'TC_102.temperature': 815.0,
    'CYCLE_001.phase': 'rampe',
  };
  renderSubTable();
  renderProcessImage();

  // Set replay mode
  replayMode = true;
  replayTarget = targetStep;
  globalStepIdx = 0;
  scenarioRunning = false; // allow re-entry

  // Re-run the scenario (will auto-advance in replay mode)
  await runScenario(scenarioName);
}

function msgDuration() {
  return 600;
}

var COLORS = {
  request: '#3b82f6',
  write: '#3b82f6',
  notify: '#f59e0b',
  callback: '#10b981',
  response: '#10b981',
  internal: '#6366f1',
  archive: '#ec4899',
};

// ── Scenario Registry ──
var scenarioRegistry = {};

function registerScenario(name, fn) {
  scenarioRegistry[name] = fn;
}

async function runScenario(name) {
  if (scenarioRunning) return;
  currentScenarioName = name;
  scenarioRunning = true;
  currentGen = ++scenarioGen;
  setButtons(true);
  stepMode = true; // ALL scenarios are now step mode
  messages = [];
  highlightSubs = [];
  globalStepIdx = 0;

  // Set visible managers for this scenario
  visibleManagers = new Set(scenarioVisibility[name] || BASE_MANAGERS);
  if (typeof rebuild3DNodes === 'function') rebuild3DNodes();

  document.getElementById('btn-step').disabled = false;
  document.getElementById('btn-prev').disabled = true; // disabled at step 0

  var scenarioFn = scenarioRegistry[name];
  if (!scenarioFn) return;

  try {
    await scenarioFn();
  } catch (e) {
    if (e === 'scenario_cancelled') return;
    throw e;
  }

  if (currentGen !== scenarioGen) return; // stale run

  await wait(500);
  hideStep();
  scenarioRunning = false;
  setButtons(false);
  document.getElementById('btn-step').disabled = true;
  document.getElementById('btn-prev').disabled = true;
  replayMode = false;
  replayTarget = -1;
}

function resetAll() {
  messages = [];
  subscriptions = [];
  highlightSubs = [];
  piFlash = {};
  glowManagers = {};
  visibleManagers = new Set(BASE_MANAGERS);
  if (typeof rebuild3DNodes === 'function') rebuild3DNodes();
  processImage = {
    'TC_101.temperature': 820.0,
    'PID_TOP.setpoint': 900.0,
    'PID_TOP.output': 65.0,
    'HR_TOP.power': 65.0,
    'TC_102.temperature': 815.0,
    'CYCLE_001.phase': 'rampe',
  };
  renderSubTable();
  renderProcessImage();
  hideStep();
  scenarioRunning = false;
  stepResolve = null;
  pendingScenario = null;
  replayMode = false;
  replayTarget = -1;
  globalStepIdx = 0;
  document.getElementById('scenario-intro').style.display = 'none';
  document.getElementById('btn-start-scenario').style.display = 'none';
  setButtons(false);
  document.getElementById('btn-step').disabled = true;
  document.getElementById('btn-prev').disabled = true;
}
