// ── MOBILE UI: Menu, Play/Pause/Restart, Overview, Lang/Speed ──
// Loaded after mobile-viewport.js and all scenarios

// ── Auto-play ──
var mobileAutoPlay = true;
var autoPlayTimer = null;
var lastScheduledResolve = null;

// ── Startup state ──
var mobileScenarioStarting = false;
var mobileStartTimer = null;
var mobileStartingName = '';

function scheduleAutoAdvance() {
  if (!mobileAutoPlay || !stepResolve || !scenarioRunning) return;
  if (stepResolve === lastScheduledResolve) return;
  lastScheduledResolve = stepResolve;
  autoPlayTimer = setTimeout(function() {
    if (mobileAutoPlay && stepResolve) {
      nextStep();
      lastScheduledResolve = null;
    }
  }, 1800 / getSpeed());
}

// Poll for stepResolve to auto-advance
setInterval(function() {
  scheduleAutoAdvance();
  // Update play/pause icon when scenario finishes
  if (!scenarioRunning && !mobileScenarioStarting) {
    if (document.getElementById('icon-pause').style.display !== 'none') {
      updatePlayPauseIcon();
    }
    // Clear persistent messages when scenario ends
    if (persistentMessages.length > 0) {
      persistentMessages = [];
    }
  }
}, 200);

// ── Play / Pause ──
function togglePlayPause() {
  // During startup overview: start scenario on play click
  if (mobileScenarioStarting) {
    if (mobileStartTimer) {
      clearTimeout(mobileStartTimer);
      mobileStartTimer = null;
    }
    mobileScenarioStarting = false;
    overviewMode = false;
    mobileAutoPlay = true;
    runScenario(mobileStartingName);
    // Update icon after runScenario sets scenarioRunning = true
    updatePlayPauseIcon();
    return;
  }

  // If scenario is running, toggle play/pause
  if (scenarioRunning) {
    mobileAutoPlay = !mobileAutoPlay;
    updatePlayPauseIcon();
    if (mobileAutoPlay) {
      lastScheduledResolve = null;
      scheduleAutoAdvance();
    } else {
      if (autoPlayTimer) { clearTimeout(autoPlayTimer); autoPlayTimer = null; }
      lastScheduledResolve = null;
    }
    return;
  }

  // Nothing running: go back to menu
  if (!document.getElementById('mobile-menu').classList.contains('visible')) {
    mobileRestart();
  }
}

function updatePlayPauseIcon() {
  var playIcon = document.getElementById('icon-play');
  var pauseIcon = document.getElementById('icon-pause');
  if (mobileAutoPlay && scenarioRunning) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = '';
  } else {
    playIcon.style.display = '';
    pauseIcon.style.display = 'none';
  }
}

// ── Restart ──
function mobileRestart() {
  // Cancel timers
  if (autoPlayTimer) { clearTimeout(autoPlayTimer); autoPlayTimer = null; }
  if (mobileStartTimer) { clearTimeout(mobileStartTimer); mobileStartTimer = null; }
  lastScheduledResolve = null;
  mobileScenarioStarting = false;

  resetAll();
  persistentMessages = [];
  mobileAutoPlay = true;
  overviewMode = true;
  updatePlayPauseIcon();

  // Show menu
  document.getElementById('mobile-menu').classList.add('visible');
  resize();
}

// ── Scenario selection ──
function mobileSelectScenario(name) {
  // Cancel any pending timers
  if (autoPlayTimer) { clearTimeout(autoPlayTimer); autoPlayTimer = null; }
  if (mobileStartTimer) { clearTimeout(mobileStartTimer); mobileStartTimer = null; }
  lastScheduledResolve = null;

  resetAll();
  persistentMessages = [];

  // Hide menu
  document.getElementById('mobile-menu').classList.remove('visible');

  // Set visible managers for this scenario
  visibleManagers = new Set(scenarioVisibility[name] || BASE_MANAGERS);
  resize();

  // Snap camera to overview
  overviewMode = true;
  computeOverviewTarget();
  camera.x = camera.targetX;
  camera.y = camera.targetY;
  camera.zoom = camera.targetZoom;

  // Wait for user to press play — do not auto-start
  mobileScenarioStarting = true;
  mobileStartingName = name;
  mobileAutoPlay = false;
  updatePlayPauseIcon();
}

// ── Overview toggle ──
function toggleOverview() {
  overviewMode = !overviewMode;
  document.getElementById('ctrl-overview').classList.toggle('active', overviewMode);
}

// ── Language ──
function mobileSetLang(lang) {
  setLang(lang);
  // Update mobile-specific lang buttons
  var frBtn = document.getElementById('lang-fr-mobile');
  var enBtn = document.getElementById('lang-en-mobile');
  if (frBtn) frBtn.className = 'lang-btn' + (lang === 'fr' ? ' active' : '');
  if (enBtn) enBtn.className = 'lang-btn' + (lang === 'en' ? ' active' : '');
  // Update tile descriptions
  var subtitle = document.getElementById('mobile-menu-subtitle');
  if (subtitle) subtitle.textContent = t('menuSubtitle');
  var scenarios = ['dpGet', 'dpSet', 'dpConnect', 'plcLive', 'cycle', 'history', 'kafka', 'mcp', 'uns'];
  scenarios.forEach(function(s) {
    var el = document.getElementById('tile-desc-' + s);
    if (el) el.textContent = t('tile_' + s);
  });
}

// ── Speed sync ──
(function() {
  var speedMobile = document.getElementById('speed-mobile');
  var speedDesktop = document.getElementById('speed');
  if (speedMobile && speedDesktop) {
    speedMobile.value = speedDesktop.value;
    speedMobile.addEventListener('input', function() {
      speedDesktop.value = speedMobile.value;
      speedDesktop.dispatchEvent(new Event('input'));
    });
  }
})();

// ── Init ──
// Apply detected language to mobile elements
mobileSetLang(currentLang);
// Show menu on load
document.getElementById('mobile-menu').classList.add('visible');
