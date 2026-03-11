// ── PROCESS IMAGE STATE ──
var processImage = {
  'TC_101.temperature': 820.0,
  'PID_TOP.setpoint': 900.0,
  'PID_TOP.output': 65.0,
  'HR_TOP.power': 65.0,
  'TC_102.temperature': 815.0,
  'CYCLE_001.phase': 'rampe',
};
var piFlash = {};

// ── SUBSCRIPTIONS ──
var subscriptions = [];
var highlightSubs = [];

function renderSubTable() {
  var tbody = document.getElementById('sub-body');
  tbody.innerHTML = '';
  subscriptions.forEach(function(s, i) {
    var tr = document.createElement('tr');
    if (highlightSubs.includes(i)) tr.className = 'highlight';
    tr.innerHTML = '<td style="color:' + (managers[s.mgr]?.color || '#fff') + '">' + s.mgrLabel + '</td><td>' + s.dpe + '</td><td>' + s.cb + '</td>';
    tbody.appendChild(tr);
  });
}

function renderProcessImage() {
  var div = document.getElementById('pi-values');
  div.innerHTML = '';
  for (var k in processImage) {
    if (!processImage.hasOwnProperty(k)) continue;
    var v = processImage[k];
    var row = document.createElement('div');
    row.className = 'pi-row' + (piFlash[k] ? ' flash' : '');
    var val = typeof v === 'number' ? v.toFixed(1) : v;
    row.innerHTML = '<span class="dpe">' + k + '</span><span class="val">' + val + '</span>';
    div.appendChild(row);
  }
}
