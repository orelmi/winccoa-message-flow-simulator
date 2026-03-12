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

// Auto-collapse info panel on mobile
if (window.innerWidth <= 768) {
  var panel = document.getElementById('info-panel');
  var btn = document.getElementById('panel-toggle-btn');
  panel.classList.add('collapsed');
  btn.innerHTML = '+';
}

// Initialize language UI
updateStaticUI();
