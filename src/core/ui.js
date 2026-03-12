// ── Panel collapse/expand ──
function togglePanel() {
  var panel = document.getElementById('info-panel');
  var btn = document.getElementById('panel-toggle-btn');
  panel.classList.toggle('collapsed');
  btn.innerHTML = panel.classList.contains('collapsed') ? '+' : '&#8722;';
}

// ── Panel dragging ──
(function() {
  var panel = document.getElementById('info-panel');
  var handle = document.getElementById('panel-drag-handle');
  var isDragging = false, startX, startY, startLeft, startTop;

  function startDrag(clientX, clientY) {
    isDragging = true;
    var panelRect = panel.getBoundingClientRect();
    var parentRect = panel.parentElement.getBoundingClientRect();
    startX = clientX;
    startY = clientY;
    startLeft = panelRect.left - parentRect.left;
    startTop = panelRect.top - parentRect.top;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = startLeft + 'px';
    panel.style.top = startTop + 'px';
  }
  function moveDrag(clientX, clientY) {
    if (!isDragging) return;
    var dx = clientX - startX;
    var dy = clientY - startY;
    panel.style.left = (startLeft + dx) + 'px';
    panel.style.top = (startTop + dy) + 'px';
  }

  handle.addEventListener('mousedown', function(e) {
    if (e.target.closest('.panel-toggle')) return;
    startDrag(e.clientX, e.clientY);
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) { moveDrag(e.clientX, e.clientY); });
  document.addEventListener('mouseup', function() { isDragging = false; });

  handle.addEventListener('touchstart', function(e) {
    if (e.target.closest('.panel-toggle')) return;
    var t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    var t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', function() { isDragging = false; });
})();

// ── Mobile detection ──
function isMobileView() {
  return window.innerWidth <= 768;
}

// Auto-collapse info panel on mobile
if (isMobileView()) {
  var panel = document.getElementById('info-panel');
  var btn = document.getElementById('panel-toggle-btn');
  panel.classList.add('collapsed');
  btn.innerHTML = '+';
}

// ── Mobile menu ──
function showMobileMenu() {
  if (!isMobileView()) return;
  document.getElementById('mobile-menu').classList.add('visible');
}

function hideMobileMenu() {
  document.getElementById('mobile-menu').classList.remove('visible');
}

function mobileSelectScenario(name) {
  hideMobileMenu();
  showScenarioIntro(name);
  syncMobileToolbar();
  checkLandscapeHint();
}

function mobileBackToMenu() {
  resetAll();
  showMobileMenu();
  checkLandscapeHint();
}

// Show mobile menu on load (mobile only)
if (isMobileView()) {
  document.getElementById('mobile-menu').classList.add('visible');
}

// ── Sync mobile toolbar buttons with desktop buttons ──
function syncMobileToolbar() {
  if (!isMobileView()) return;
  var prev = document.getElementById('btn-prev');
  var step = document.getElementById('btn-step');
  var start = document.getElementById('btn-start-scenario');

  var prevM = document.getElementById('btn-prev-mobile');
  var stepM = document.getElementById('btn-step-mobile');
  var startM = document.getElementById('btn-start-mobile');

  if (prevM) prevM.disabled = prev.disabled;
  if (stepM) {
    stepM.disabled = step.disabled;
    stepM.innerHTML = step.textContent.trim() === '\u2713' ? '\u2713' : '&#9656;';
  }
  if (startM) startM.style.display = start.style.display;
}

// Observe desktop button changes to sync mobile toolbar
(function() {
  if (!isMobileView()) return;

  var observer = new MutationObserver(function() { syncMobileToolbar(); });
  var config = { attributes: true, attributeFilter: ['disabled', 'style'] };

  var ids = ['btn-prev', 'btn-step', 'btn-start-scenario'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) observer.observe(el, config);
  });

  // Also sync the speed slider
  var speedMobile = document.getElementById('speed-mobile');
  var speedDesktop = document.getElementById('speed');
  if (speedMobile && speedDesktop) {
    speedMobile.value = speedDesktop.value;
    speedMobile.addEventListener('input', function() {
      speedDesktop.value = speedMobile.value;
      speedDesktop.dispatchEvent(new Event('input'));
    });
    speedDesktop.addEventListener('input', function() {
      speedMobile.value = speedDesktop.value;
    });
  }
})();

// ── Landscape hint ──
var landscapeHintDismissed = false;

function dismissLandscapeHint() {
  landscapeHintDismissed = true;
  document.getElementById('landscape-hint').classList.remove('active');
}

function checkLandscapeHint() {
  if (landscapeHintDismissed) return;
  var hint = document.getElementById('landscape-hint');
  if (!hint) return;
  var menu = document.getElementById('mobile-menu');
  var menuVisible = menu && menu.classList.contains('visible');
  if (isMobileView() && window.innerHeight > window.innerWidth && !menuVisible) {
    hint.classList.add('active');
  } else {
    hint.classList.remove('active');
  }
}

if (isMobileView()) {
  checkLandscapeHint();
}
window.addEventListener('resize', function() {
  checkLandscapeHint();
});
if (screen && screen.orientation) {
  screen.orientation.addEventListener('change', checkLandscapeHint);
}

// Override resetAll to show mobile menu again on mobile
var _originalResetAll = typeof resetAll === 'function' ? resetAll : null;
function resetAllMobile() {
  if (_originalResetAll) _originalResetAll();
  if (isMobileView()) {
    showMobileMenu();
  }
}

// Sync mobile lang buttons with desktop ones + update tile descriptions
var _originalSetLang = setLang;
setLang = function(lang) {
  _originalSetLang(lang);
  var frMobile = document.getElementById('lang-fr-mobile');
  var enMobile = document.getElementById('lang-en-mobile');
  if (frMobile) frMobile.className = 'lang-btn' + (lang === 'fr' ? ' active' : '');
  if (enMobile) enMobile.className = 'lang-btn' + (lang === 'en' ? ' active' : '');

  // Update tile descriptions and menu subtitle
  var subtitle = document.getElementById('mobile-menu-subtitle');
  if (subtitle) subtitle.textContent = t('menuSubtitle');
  var scenarios = ['dpGet', 'dpSet', 'dpConnect', 'plcLive', 'cycle', 'history', 'kafka', 'mcp', 'uns'];
  scenarios.forEach(function(s) {
    var el = document.getElementById('tile-desc-' + s);
    if (el) el.textContent = t('tile_' + s);
  });
};

// Initialize language UI
updateStaticUI();
// Apply detected language to mobile elements
if (isMobileView()) {
  setLang(currentLang);
}
