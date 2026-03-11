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

  handle.addEventListener('mousedown', function(e) {
    if (e.target.closest('.panel-toggle')) return;
    isDragging = true;
    var panelRect = panel.getBoundingClientRect();
    var parentRect = panel.parentElement.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    // Position relative to parent (canvas-area)
    startLeft = panelRect.left - parentRect.left;
    startTop = panelRect.top - parentRect.top;
    panel.style.right = 'auto';
    panel.style.left = startLeft + 'px';
    panel.style.top = startTop + 'px';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    panel.style.left = (startLeft + dx) + 'px';
    panel.style.top = (startTop + dy) + 'px';
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
  });
})();

// Initialize language UI
updateStaticUI();
