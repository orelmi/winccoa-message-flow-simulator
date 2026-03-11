// ── Scenario: Node.js → Kafka ──
Object.assign(i18n.fr, {
  kafka_1: 'L\'<b>automate</b> envoie la temperature et les vibrations au <b>Driver</b> via OPC UA. Le Driver appelle <code>dpSet</code> pour TC_101.temp et HR_TOP.vibration.',
  kafka_2: 'L\'<b>EV</b> met a jour la <b>process image</b> et notifie le <b>JS Manager</b> (abonne via <code>dpConnect</code>).',
  kafka_3: 'Le <b>JS Manager</b> transforme les donnees en message JSON et appelle <code>kafka.produce("furnace-telemetry", ...)</code>.',
  kafka_4: 'Le message transite par le <b>Broker Kafka</b> vers le <b>Service de Maintenance Predictive</b>.',
  kafka_5: 'Le <b>Service ML</b> analyse les vibrations : 2.4 mm/s > seuil 2.0 mm/s \u2192 <b>anomalie detectee</b> (usure roulement HR_TOP, confiance 87%).',
  kafka_6: 'Le service publie une alerte sur le topic <code>furnace-alerts</code>. Le <b>JS Manager</b> consomme l\'alerte.',
  kafka_7: 'Le <b>JS Manager</b> ecrit l\'alerte dans WinCC OA via <code>dpSet("HR_TOP.maint_alert", ...)</code>.',
  kafka_8: 'L\'<b>EV</b> notifie le <b>UI Panel</b> qui affiche l\'alerte de maintenance predictive a l\'operateur.',
  kafka_9: '<b>Streaming Kafka termine !</b> Flux complet : Automate \u2192 Driver \u2192 EV \u2192 JS Manager \u2192 Kafka \u2192 ML Predictif \u2192 Kafka \u2192 JS Manager \u2192 EV \u2192 UI Panel.',
});
Object.assign(i18n.en, {
  kafka_1: '<b>PLC</b> sends temperature and vibration to <b>Driver</b> via OPC UA. Driver calls <code>dpSet</code> for TC_101.temp and HR_TOP.vibration.',
  kafka_2: '<b>EV</b> updates the <b>process image</b> and notifies <b>JS Manager</b> (subscribed via <code>dpConnect</code>).',
  kafka_3: '<b>JS Manager</b> transforms data into a JSON message and calls <code>kafka.produce("furnace-telemetry", ...)</code>.',
  kafka_4: 'The message flows through the <b>Kafka Broker</b> to the <b>Predictive Maintenance Service</b>.',
  kafka_5: 'The <b>ML Service</b> analyzes vibrations: 2.4 mm/s > threshold 2.0 mm/s \u2192 <b>anomaly detected</b> (HR_TOP bearing wear, confidence 87%).',
  kafka_6: 'The service publishes an alert on topic <code>furnace-alerts</code>. <b>JS Manager</b> consumes the alert.',
  kafka_7: '<b>JS Manager</b> writes the alert to WinCC OA via <code>dpSet("HR_TOP.maint_alert", ...)</code>.',
  kafka_8: '<b>EV</b> notifies <b>UI Panel</b> which displays the predictive maintenance alert to the operator.',
  kafka_9: '<b>Kafka streaming complete!</b> Full flow: PLC \u2192 Driver \u2192 EV \u2192 JS Manager \u2192 Kafka \u2192 Predictive ML \u2192 Kafka \u2192 JS Manager \u2192 EV \u2192 UI Panel.',
});

async function scenarioKafka() {
  subscriptions = [
    { mgr: 'js_mgr', mgrLabel: 'JS Manager', dpe: 'TC_101.temp', cb: 'onTelemetry' },
    { mgr: 'js_mgr', mgrLabel: 'JS Manager', dpe: 'HR_TOP.vibration', cb: 'onTelemetry' },
    { mgr: 'ui1', mgrLabel: 'UI Operator', dpe: 'HR_TOP.maint_alert', cb: 'showAlert' },
  ];
  renderSubTable();
  processImage['HR_TOP.vibration'] = 1.8;
  processImage['HR_TOP.maint_alert'] = '-';
  processImage['HR_TOP.maint_confidence'] = '-';
  renderProcessImage();

  var steps = 9;

  // Step 1: PLC → Driver → EV
  showStep(1, steps, t('kafka_1'));
  await waitForStep();
  glowManager('plc', 'rgba(148,163,184', 1200);
  await addMessage('plc', 'driver', 'OPC UA Read', '#94a3b8', msgDuration());
  glowManager('driver', 'rgba(249,115,22', 1000);
  await addMessagesParallel([
    { from: 'driver', to: 'ev', label: 'dpSet(TC_101.temp, 845.2)', color: COLORS.write, duration: msgDuration() },
    { from: 'driver', to: 'ev', label: 'dpSet(HR_TOP.vibr, 2.4)', color: COLORS.write, duration: msgDuration() * 0.9 },
  ]);
  await wait(150);

  // Step 2: EV updates & notifies JS Manager
  showStep(2, steps, t('kafka_2'));
  await waitForStep();
  glowManager('ev', 'rgba(59,130,246', 800);
  processImage['TC_101.temperature'] = 845.2;
  processImage['HR_TOP.vibration'] = 2.4;
  piFlash['TC_101.temperature'] = true;
  piFlash['HR_TOP.vibration'] = true;
  renderProcessImage();
  await addMessage('ev', 'ev', 'update process image', COLORS.internal, msgDuration() * 0.4);
  piFlash['TC_101.temperature'] = false;
  piFlash['HR_TOP.vibration'] = false;
  renderProcessImage();
  highlightSubs = [0, 1];
  renderSubTable();
  await addMessage('ev', 'js_mgr', 'notif(TC_101=845.2, vibr=2.4)', COLORS.notify, msgDuration());
  glowManager('js_mgr', 'rgba(6,182,212', 1000);
  highlightSubs = [];
  renderSubTable();
  await wait(150);

  // Step 3: JS Manager → Kafka produce
  showStep(3, steps, t('kafka_3'));
  await waitForStep();
  await addMessage('js_mgr', 'js_mgr', '\u2192 transform JSON', '#06b6d4', msgDuration() * 0.4);
  await addMessage('js_mgr', 'kafka', 'kafka.produce(furnace-telemetry)', '#06b6d4', msgDuration());
  glowManager('kafka', 'rgba(6,182,212', 800);
  await wait(150);

  // Step 4: Kafka → Predictive Maintenance
  showStep(4, steps, t('kafka_4'));
  await waitForStep();
  await addMessage('kafka', 'pred_maint', 'kafka.consume(furnace-telemetry)', '#14b8a6', msgDuration());
  glowManager('pred_maint', 'rgba(20,184,166', 1200);
  await wait(150);

  // Step 5: ML analysis
  showStep(5, steps, t('kafka_5'));
  await waitForStep();
  await addMessage('pred_maint', 'pred_maint', 'ML: vibr 2.4 > seuil 2.0', '#14b8a6', msgDuration() * 0.8);
  await wait(400);

  // Step 6: Alert back via Kafka
  showStep(6, steps, t('kafka_6'));
  await waitForStep();
  await addMessage('pred_maint', 'kafka', 'kafka.produce(furnace-alerts)', '#14b8a6', msgDuration());
  glowManager('kafka', 'rgba(6,182,212', 800);
  await addMessage('kafka', 'js_mgr', 'kafka.consume(furnace-alerts)', '#06b6d4', msgDuration());
  glowManager('js_mgr', 'rgba(6,182,212', 1000);
  await wait(150);

  // Step 7: JS Manager → WinCC OA
  showStep(7, steps, t('kafka_7'));
  await waitForStep();
  await addMessage('js_mgr', 'ev', 'dpSet(HR_TOP.maint_alert)', COLORS.write, msgDuration());
  glowManager('ev', 'rgba(59,130,246', 800);
  processImage['HR_TOP.maint_alert'] = 'Bearing wear';
  processImage['HR_TOP.maint_confidence'] = 87;
  piFlash['HR_TOP.maint_alert'] = true;
  piFlash['HR_TOP.maint_confidence'] = true;
  renderProcessImage();
  await addMessage('ev', 'ev', 'update process image', COLORS.internal, msgDuration() * 0.4);
  piFlash['HR_TOP.maint_alert'] = false;
  piFlash['HR_TOP.maint_confidence'] = false;
  renderProcessImage();
  await wait(150);

  // Step 8: EV → UI notification
  showStep(8, steps, t('kafka_8'));
  await waitForStep();
  highlightSubs = [2];
  renderSubTable();
  await addMessage('ev', 'ui1', 'notif(HR_TOP.maint_alert)', COLORS.notify, msgDuration());
  glowManager('ui1', 'rgba(245,158,11', 1000);
  await addMessage('ui1', 'ui1', '\u2192 callback updateAlert()', COLORS.callback, msgDuration() * 0.4);
  highlightSubs = [];
  renderSubTable();
  await wait(150);

  // Step 9: Summary
  showStep(9, steps, t('kafka_9'));
  await waitForStep();
  var path = ['plc', 'driver', 'ev', 'js_mgr', 'kafka', 'pred_maint', 'kafka', 'js_mgr', 'ev', 'ui1'];
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

registerScenario('kafka', scenarioKafka);
