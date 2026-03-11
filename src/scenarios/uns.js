// ── Scenario: UNS / MQTT Publisher ──
Object.assign(i18n.fr, {
  uns_1: 'L\'<b>automate</b> envoie la temperature mesuree au <b>Driver</b> via OPC UA. Le Driver appelle <code>dpSet("TC_101.temperature", 847.3)</code>.',
  uns_2: 'L\'<b>EV</b> met a jour la <b>process image</b> et notifie le <b>MQTT Publisher</b> (abonne a TC_101.temp, PID_TOP.output, CYCLE_001.status, CYCLE_001.part_count).',
  uns_3: 'Le <b>MQTT Publisher</b> formate le payload JSON UNS et publie sur le <b>MQTT Broker</b> : topic <code>uns/paris/building-A/furnace-01/TC_101/temperature</code>.',
  uns_4: 'Le <b>MES</b> (abonne a <code>uns/+/+/furnace-01/CYCLE_001/#</code>) recoit les donnees de production : statut du cycle, nombre de pieces traitees, qualite.',
  uns_5: 'Le <b>Cloud Historian</b> (abonne a <code>uns/#</code>) recoit <b>toutes</b> les donnees brutes (temperatures, sorties PID, statut) et les archive pour l\'analyse long terme et l\'IA/ML.',
  uns_6: 'Le <b>CTRL PID</b> calcule une nouvelle sortie (73.1%). Le <b>MQTT Publisher</b> publie <code>uns/.../PID_TOP/output</code>. Le MES et le Cloud Historian recoivent chacun les donnees selon leur abonnement.',
  uns_7: '<b>UNS termine !</b> Architecture decouplees : WinCC OA publie via MQTT, chaque consommateur s\'abonne aux topics qui l\'interessent (MES \u2192 production, Historian \u2192 tout). Topics hierarchiques ISA-95.',
});
Object.assign(i18n.en, {
  uns_1: '<b>PLC</b> sends measured temperature to <b>Driver</b> via OPC UA. Driver calls <code>dpSet("TC_101.temperature", 847.3)</code>.',
  uns_2: '<b>EV</b> updates the <b>process image</b> and notifies the <b>MQTT Publisher</b> (subscribed to TC_101.temp, PID_TOP.output, CYCLE_001.status, CYCLE_001.part_count).',
  uns_3: '<b>MQTT Publisher</b> formats the UNS JSON payload and publishes to <b>MQTT Broker</b>: topic <code>uns/paris/building-A/furnace-01/TC_101/temperature</code>.',
  uns_4: '<b>MES</b> (subscribed to <code>uns/+/+/furnace-01/CYCLE_001/#</code>) receives production data: cycle status, part count, quality.',
  uns_5: '<b>Cloud Historian</b> (subscribed to <code>uns/#</code>) receives <b>all</b> raw data (temperatures, PID outputs, status) and archives for long-term analytics and AI/ML.',
  uns_6: '<b>CTRL PID</b> computes new output (73.1%). <b>MQTT Publisher</b> publishes <code>uns/.../PID_TOP/output</code>. MES and Cloud Historian each receive data per their subscription.',
  uns_7: '<b>UNS complete!</b> Decoupled architecture: WinCC OA publishes via MQTT, each consumer subscribes to relevant topics (MES \u2192 production, Historian \u2192 all). Hierarchical ISA-95 topics.',
});

async function scenarioUns() {
  subscriptions = [
    { mgr: 'mqtt_pub', mgrLabel: 'MQTT Publisher', dpe: 'TC_101.temp', cb: 'onValueChanged' },
    { mgr: 'mqtt_pub', mgrLabel: 'MQTT Publisher', dpe: 'PID_TOP.output', cb: 'onValueChanged' },
    { mgr: 'mqtt_pub', mgrLabel: 'MQTT Publisher', dpe: 'CYCLE_001.status', cb: 'onValueChanged' },
    { mgr: 'mqtt_pub', mgrLabel: 'MQTT Publisher', dpe: 'CYCLE_001.part_count', cb: 'onValueChanged' },
  ];
  renderSubTable();
  renderProcessImage();

  var steps = 7;

  // Step 1: PLC → Driver → EV
  showStep(1, steps, t('uns_1'));
  await waitForStep();
  glowManager('plc', 'rgba(148,163,184', 1200);
  await addMessage('plc', 'driver', 'OPC UA Read', '#94a3b8', msgDuration());
  glowManager('driver', 'rgba(249,115,22', 1000);
  await addMessage('driver', 'ev', 'dpSet(TC_101.temp, 847.3)', COLORS.write, msgDuration());
  await wait(150);

  // Step 2: EV updates & notifies MQTT Publisher
  showStep(2, steps, t('uns_2'));
  await waitForStep();
  glowManager('ev', 'rgba(59,130,246', 800);
  processImage['TC_101.temperature'] = 847.3;
  piFlash['TC_101.temperature'] = true;
  renderProcessImage();
  await addMessage('ev', 'ev', 'update process image', COLORS.internal, msgDuration() * 0.4);
  piFlash['TC_101.temperature'] = false;
  renderProcessImage();
  highlightSubs = [0];
  renderSubTable();
  await addMessage('ev', 'mqtt_pub', 'notif(TC_101=847.3)', COLORS.notify, msgDuration());
  glowManager('mqtt_pub', 'rgba(34,211,238', 1000);
  highlightSubs = [];
  renderSubTable();
  await wait(150);

  // Step 3: MQTT Publisher → Mosquitto
  showStep(3, steps, t('uns_3'));
  await waitForStep();
  await addMessage('mqtt_pub', 'mqtt_pub', 'format UNS payload', '#22d3ee', msgDuration() * 0.4);
  await addMessage('mqtt_pub', 'mqtt_broker', 'PUBLISH uns/.../TC_101/temp', '#22d3ee', msgDuration());
  glowManager('mqtt_broker', 'rgba(34,211,238', 1000);
  await wait(150);

  // Step 4: Broker → MES (production data)
  showStep(4, steps, t('uns_4'));
  await waitForStep();
  await addMessage('mqtt_broker', 'uns_mes', 'uns/.../CYCLE_001/status + part_count', '#84cc16', msgDuration());
  glowManager('uns_mes', 'rgba(132,204,22', 1200);
  await addMessage('uns_mes', 'uns_mes', 'update production tracking', '#84cc16', msgDuration() * 0.4);
  await wait(150);

  // Step 5: Broker → Cloud Historian (all raw data)
  showStep(5, steps, t('uns_5'));
  await waitForStep();
  await addMessage('mqtt_broker', 'uns_hist', 'uns/.../TC_101/temp (all topics)', '#84cc16', msgDuration());
  glowManager('uns_hist', 'rgba(132,204,22', 1200);
  await addMessage('uns_hist', 'uns_hist', 'archive to data lake', '#84cc16', msgDuration() * 0.4);
  await wait(150);

  // Step 6: CTRL PID output → MQTT Publisher → Broker
  showStep(6, steps, t('uns_6'));
  await waitForStep();
  glowManager('ctrl_pid', 'rgba(16,185,129', 800);
  await addMessage('ctrl_pid', 'ev', 'dpSet(PID_TOP.output, 73.1)', COLORS.write, msgDuration() * 0.8);
  processImage['PID_TOP.output'] = 73.1;
  piFlash['PID_TOP.output'] = true;
  renderProcessImage();
  await addMessage('ev', 'ev', 'update process image', COLORS.internal, msgDuration() * 0.3);
  piFlash['PID_TOP.output'] = false;
  renderProcessImage();
  highlightSubs = [1];
  renderSubTable();
  await addMessage('ev', 'mqtt_pub', 'notif(PID_TOP.output=73.1)', COLORS.notify, msgDuration() * 0.8);
  glowManager('mqtt_pub', 'rgba(34,211,238', 800);
  highlightSubs = [];
  renderSubTable();
  await addMessage('mqtt_pub', 'mqtt_broker', 'PUBLISH uns/.../PID_TOP/output', '#22d3ee', msgDuration() * 0.8);
  glowManager('mqtt_broker', 'rgba(34,211,238', 600);
  await addMessagesParallel([
    { from: 'mqtt_broker', to: 'uns_mes', label: 'PID_TOP.output=73.1', color: '#84cc16', duration: msgDuration() * 0.8 },
    { from: 'mqtt_broker', to: 'uns_hist', label: 'PID_TOP.output=73.1', color: '#84cc16', duration: msgDuration() * 0.8 },
  ]);
  glowManager('uns_mes', 'rgba(132,204,22', 800);
  glowManager('uns_hist', 'rgba(132,204,22', 800);
  await wait(150);

  // Step 7: Summary
  showStep(7, steps, t('uns_7'));
  await waitForStep();
  var path = ['plc', 'driver', 'ev', 'mqtt_pub', 'mqtt_broker', 'uns_mes', 'uns_hist'];
  for (var j = 0; j < path.length; j++) {
    var id = path[j];
    var c = managers[id].color;
    var r = parseInt(c.slice(1,3), 16);
    var g = parseInt(c.slice(3,5), 16);
    var b = parseInt(c.slice(5,7), 16);
    glowManager(id, 'rgba(' + r + ',' + g + ',' + b, 1500);
    await wait(100);
  }
}

registerScenario('uns', scenarioUns);
