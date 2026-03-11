// ── Scenario: Cycle complet ──
Object.assign(i18n.fr, {
  cycle_1: '<b>Phase d\'initialisation</b> — Le <b>CTRL PID</b> appelle <code>dpConnect("onTemp", "TC_101.temperature")</code> pour s\'abonner a la temperature.',
  cycle_2: 'Les <b>2 UI Managers</b> s\'abonnent a differents DPE via <code>dpConnect</code>. UI Operator: TC_101.temp + PID_TOP.output, UI Monitoring: TC_101.temp + PID_TOP.setpoint.',
  cycle_3: 'L\'<b>automate</b> (PLC) envoie la temperature mesuree au <b>Driver</b> via <b>OPC UA</b>. Le Driver appelle <code>dpSet("TC_101.temperature", 845.2)</code>.',
  cycle_4: 'L\'<b>EV</b> met a jour sa <b>process image</b> : TC_101.temperature = <code>845.2</code>',
  cycle_5: 'L\'<b>EV</b> transmet au <b>DM</b> pour persistence (SQLite). En parallele, <b>Online Change</b> vers le <b>NGA Frontend</b> (\u2192 PostgreSQL).',
  cycle_6: 'L\'<b>EV</b> notifie le <b>CTRL PID</b> \u2192 le CTRL appelle localement <code>onTemp(845.2)</code> et calcule une nouvelle commande PID.',
  cycle_7: 'L\'<b>EV</b> notifie les <b>2 UI Managers</b> abonnes a TC_101.temp — distribution multicast. Chaque UI appelle son callback.',
  cycle_8: 'Le <b>CTRL PID</b> a calcule une sortie de 72.5%. Il appelle <code>dpSet("PID_TOP.output", 72.5)</code>',
  cycle_9: 'Persistance via <b>DM</b> (SQLite) + <b>Online Change</b> vers <b>NGA</b> (\u2192 PostgreSQL). Les <b>UI</b> abonnes a PID_TOP.output sont notifies.',
  cycle_10: 'L\'<b>EV</b> notifie le <b>Driver</b> de la commande PID. Le Driver envoie un <b>OPC UA Write</b> vers l\'<b>automate</b> pour piloter les resistances a 72.5%.',
  cycle_11: 'L\'<b>automate</b> applique la commande. La temperature monte. Le Driver lit <code>847.8</code> et relance le cycle avec un nouveau <code>dpSet</code>.',
  cycle_12: '<b>Cycle complet !</b> Automate \u2192 Driver \u2192 EV (process image + DM/NGA) \u2192 notifications multicast \u2192 CTRL PID + 2 UI Managers + Driver \u2192 Automate. Le cycle se repete a chaque mesure.',
});
Object.assign(i18n.en, {
  cycle_1: '<b>Initialization phase</b> — <b>CTRL PID</b> calls <code>dpConnect("onTemp", "TC_101.temperature")</code> to subscribe to temperature.',
  cycle_2: 'The <b>2 UI Managers</b> subscribe to different DPEs via <code>dpConnect</code>. UI Operator: TC_101.temp + PID_TOP.output, UI Monitoring: TC_101.temp + PID_TOP.setpoint.',
  cycle_3: '<b>PLC</b> sends measured temperature to <b>Driver</b> via <b>OPC UA</b>. Driver calls <code>dpSet("TC_101.temperature", 845.2)</code>.',
  cycle_4: '<b>EV</b> updates its <b>process image</b>: TC_101.temperature = <code>845.2</code>',
  cycle_5: '<b>EV</b> sends to <b>DM</b> for persistence (SQLite). In parallel, <b>Online Change</b> to <b>NGA Frontend</b> (\u2192 PostgreSQL).',
  cycle_6: '<b>EV</b> notifies <b>CTRL PID</b> \u2192 CTRL locally calls <code>onTemp(845.2)</code> and computes new PID output.',
  cycle_7: '<b>EV</b> notifies both <b>UI Managers</b> subscribed to TC_101.temp — multicast distribution. Each UI calls its callback.',
  cycle_8: '<b>CTRL PID</b> computed output 72.5%. It calls <code>dpSet("PID_TOP.output", 72.5)</code>',
  cycle_9: 'Persistence via <b>DM</b> (SQLite) + <b>Online Change</b> to <b>NGA</b> (\u2192 PostgreSQL). <b>UI</b> managers subscribed to PID_TOP.output are notified.',
  cycle_10: '<b>EV</b> notifies <b>Driver</b> of PID output. Driver sends <b>OPC UA Write</b> to <b>PLC</b> to drive heating elements at 72.5%.',
  cycle_11: '<b>PLC</b> applies command. Temperature rises. Driver reads <code>847.8</code> and restarts cycle with new <code>dpSet</code>.',
  cycle_12: '<b>Full cycle!</b> PLC \u2192 Driver \u2192 EV (process image + DM/NGA) \u2192 multicast notifications \u2192 CTRL PID + 2 UI Managers + Driver \u2192 PLC. Cycle repeats with each measurement.',
});

async function scenarioCycle() {
  // Start clean
  subscriptions = [];
  renderSubTable();
  processImage['TC_101.temperature'] = 820.0;
  processImage['PID_TOP.output'] = 65.0;
  renderProcessImage();

  var steps = 12;

  // Step 1: CTRL PID dpConnect
  showStep(1, steps, t('cycle_1'));
  await waitForStep();
  glowManager('ctrl_pid', 'rgba(16,185,129', 1200);
  await addMessage('ctrl_pid', 'ev', 'dpConnect(onTemp, TC_101.temp)', COLORS.request, msgDuration());
  glowManager('ev', 'rgba(59,130,246', 800);
  subscriptions.push({ mgr: 'ctrl_pid', mgrLabel: 'CTRL PID', dpe: 'TC_101.temp', cb: 'onTemp' });
  highlightSubs = [0];
  renderSubTable();
  await addMessage('ev', 'ev', 'register subscription', COLORS.internal, msgDuration() * 0.4);
  // EV sends initial value
  await addMessage('ev', 'ctrl_pid', 'notif(820.0)', COLORS.notify, msgDuration() * 0.7);
  await addMessage('ctrl_pid', 'ctrl_pid', '-> callback onTemp()', COLORS.callback, msgDuration() * 0.3);
  highlightSubs = [];
  renderSubTable();

  // Step 2: All 3 UIs dpConnect
  showStep(2, steps, t('cycle_2'));
  await waitForStep();
  // UI1 subscribes to TC_101.temp and PID_TOP.output
  glowManager('ui1', 'rgba(245,158,11', 1400);
  await addMessage('ui1', 'ev', 'dpConnect(updateDisp, TC_101.temp)', COLORS.request, msgDuration());
  glowManager('ev', 'rgba(59,130,246', 600);
  subscriptions.push({ mgr: 'ui1', mgrLabel: 'UI Operator', dpe: 'TC_101.temp', cb: 'updateDisp' });
  highlightSubs = [subscriptions.length - 1];
  renderSubTable();
  await addMessage('ev', 'ev', 'register', COLORS.internal, msgDuration() * 0.3);
  await addMessage('ev', 'ui1', 'notif(820.0)', COLORS.notify, msgDuration() * 0.5);

  await addMessage('ui1', 'ev', 'dpConnect(updateDisp, PID_TOP.output)', COLORS.request, msgDuration() * 0.8);
  subscriptions.push({ mgr: 'ui1', mgrLabel: 'UI Operator', dpe: 'PID_TOP.output', cb: 'updateDisp' });
  highlightSubs = [subscriptions.length - 1];
  renderSubTable();
  await addMessage('ev', 'ev', 'register', COLORS.internal, msgDuration() * 0.3);
  await addMessage('ev', 'ui1', 'notif(65.0)', COLORS.notify, msgDuration() * 0.5);

  // UI Monitoring subscribes to TC_101.temp and PID_TOP.setpoint
  glowManager('ui2', 'rgba(234,179,8', 1200);
  await addMessage('ui2', 'ev', 'dpConnect(updateTrend, TC_101.temp)', COLORS.request, msgDuration() * 0.8);
  subscriptions.push({ mgr: 'ui2', mgrLabel: 'UI Monitoring', dpe: 'TC_101.temp', cb: 'updateTrend' });
  highlightSubs = [subscriptions.length - 1];
  renderSubTable();
  await addMessage('ev', 'ev', 'register', COLORS.internal, msgDuration() * 0.3);
  await addMessage('ev', 'ui2', 'notif(820.0)', COLORS.notify, msgDuration() * 0.5);

  await addMessage('ui2', 'ev', 'dpConnect(checkAlarm, PID_TOP.setpoint)', COLORS.request, msgDuration() * 0.8);
  subscriptions.push({ mgr: 'ui2', mgrLabel: 'UI Monitoring', dpe: 'PID_TOP.setpoint', cb: 'checkAlarm' });
  highlightSubs = [subscriptions.length - 1];
  renderSubTable();
  await addMessage('ev', 'ev', 'register', COLORS.internal, msgDuration() * 0.3);
  await addMessage('ev', 'ui2', 'notif(900.0)', COLORS.notify, msgDuration() * 0.5);
  highlightSubs = [];
  renderSubTable();

  // Step 3: PLC sends value to Driver
  showStep(3, steps, t('cycle_3'));
  await waitForStep();
  glowManager('plc', 'rgba(148,163,184', 1000);
  await addMessage('plc', 'driver', 'OPC UA Read -> 845.2', '#94a3b8', msgDuration());
  glowManager('driver', 'rgba(249,115,22', 1000);
  await addMessage('driver', 'ev', 'dpSet(TC_101.temp, 845.2)', COLORS.write, msgDuration());

  // Step 4: EV updates process image
  showStep(4, steps, t('cycle_4'));
  await waitForStep();
  glowManager('ev', 'rgba(59,130,246', 800);
  processImage['TC_101.temperature'] = 845.2;
  piFlash['TC_101.temperature'] = true;
  renderProcessImage();
  await addMessage('ev', 'ev', 'update process image', COLORS.internal, msgDuration() * 0.4);
  piFlash['TC_101.temperature'] = false;
  renderProcessImage();

  // Step 5: EV → DM (persistence) AND EV → NGA → PostgreSQL (Online Change) in parallel
  showStep(5, steps, t('cycle_5'));
  await waitForStep();
  await addMessagesParallel([
    { from: 'ev', to: 'dm', label: 'persistence (SQLite)', color: COLORS.internal, duration: msgDuration() * 0.6 },
    { from: 'ev', to: 'nga', label: 'Online Change', color: COLORS.archive, duration: msgDuration() * 0.6 },
  ]);
  glowManager('dm', 'rgba(139,92,246', 600);
  glowManager('nga', 'rgba(236,72,153', 500);
  await addMessage('nga', 'pgsql', 'INSERT INTO history', '#336791', msgDuration() * 0.5);
  glowManager('pgsql', 'rgba(51,103,145', 500);

  // Step 6: Notify CTRL PID
  showStep(6, steps, t('cycle_6'));
  await waitForStep();
  highlightSubs = [0];
  renderSubTable();
  await addMessage('ev', 'ctrl_pid', 'notif(845.2)', COLORS.notify, msgDuration());
  glowManager('ctrl_pid', 'rgba(16,185,129', 1000);
  await addMessage('ctrl_pid', 'ctrl_pid', '-> callback onTemp()', COLORS.callback, msgDuration() * 0.4);
  highlightSubs = [];
  renderSubTable();

  // Step 7: Notify both UIs (multicast) — subscribed to TC_101.temp: UI Operator, UI Monitoring
  showStep(7, steps, t('cycle_7'));
  await waitForStep();
  // UI1 and UI2 are subscribed to TC_101.temp
  highlightSubs = [1, 3]; // indices of UI1 TC_101.temp and UI2 TC_101.temp
  renderSubTable();
  await addMessagesParallel([
    { from: 'ev', to: 'ui1', label: 'notif(845.2)', color: COLORS.notify, duration: msgDuration() },
    { from: 'ev', to: 'ui2', label: 'notif(845.2)', color: COLORS.notify, duration: msgDuration() },
  ]);
  glowManager('ui1', 'rgba(245,158,11', 800);
  glowManager('ui2', 'rgba(234,179,8', 800);
  await addMessagesParallel([
    { from: 'ui1', to: 'ui1', label: '-> updateDisp()', color: COLORS.callback, duration: msgDuration() * 0.3 },
    { from: 'ui2', to: 'ui2', label: '-> updateTrend()', color: COLORS.callback, duration: msgDuration() * 0.3 },
  ]);
  highlightSubs = [];
  renderSubTable();

  // Step 8: CTRL PID dpSet output
  showStep(8, steps, t('cycle_8'));
  await waitForStep();
  glowManager('ctrl_pid', 'rgba(16,185,129', 800);
  await addMessage('ctrl_pid', 'ev', 'dpSet(PID_TOP.output, 72.5)', COLORS.write, msgDuration());
  glowManager('ev', 'rgba(59,130,246', 800);
  processImage['PID_TOP.output'] = 72.5;
  processImage['HR_TOP.power'] = 72.5;
  piFlash['PID_TOP.output'] = true;
  renderProcessImage();
  await addMessage('ev', 'ev', 'update process image', COLORS.internal, msgDuration() * 0.3);
  piFlash['PID_TOP.output'] = false;
  renderProcessImage();

  // Step 9: DM + NGA for output + notify UI1 (subscribed to PID_TOP.output)
  showStep(9, steps, t('cycle_9'));
  await waitForStep();
  await addMessagesParallel([
    { from: 'ev', to: 'dm', label: 'persistence (SQLite)', color: COLORS.internal, duration: msgDuration() * 0.5 },
    { from: 'ev', to: 'nga', label: 'Online Change', color: COLORS.archive, duration: msgDuration() * 0.5 },
  ]);
  glowManager('dm', 'rgba(139,92,246', 500);
  glowManager('nga', 'rgba(236,72,153', 500);
  await addMessage('nga', 'pgsql', 'INSERT INTO history', '#336791', msgDuration() * 0.4);
  glowManager('pgsql', 'rgba(51,103,145', 500);
  // UI1 is subscribed to PID_TOP.output
  highlightSubs = [2]; // index of UI1 PID_TOP.output
  renderSubTable();
  await addMessage('ev', 'ui1', 'notif(72.5%)', COLORS.notify, msgDuration());
  glowManager('ui1', 'rgba(245,158,11', 800);
  await addMessage('ui1', 'ui1', '-> updateDisp()', COLORS.callback, msgDuration() * 0.4);
  highlightSubs = [];
  renderSubTable();

  // Step 10: Driver receives command + sends to PLC
  showStep(10, steps, t('cycle_10'));
  await waitForStep();
  await addMessage('ev', 'driver', 'notif(72.5)', COLORS.notify, msgDuration());
  glowManager('driver', 'rgba(249,115,22', 1200);
  await addMessage('driver', 'plc', 'OPC UA Write -> 72.5%', '#94a3b8', msgDuration());
  glowManager('plc', 'rgba(148,163,184', 800);

  // Step 11: PLC responds with new temperature
  showStep(11, steps, t('cycle_11'));
  await waitForStep();
  glowManager('plc', 'rgba(148,163,184', 1000);
  await addMessage('plc', 'driver', 'OPC UA Read -> 847.8', '#94a3b8', msgDuration());
  glowManager('driver', 'rgba(249,115,22', 800);
  await addMessage('driver', 'ev', 'dpSet(TC_101.temp, 847.8)', COLORS.write, msgDuration());
  processImage['TC_101.temperature'] = 847.8;
  piFlash['TC_101.temperature'] = true;
  renderProcessImage();
  await wait(400);
  piFlash['TC_101.temperature'] = false;
  renderProcessImage();

  // Step 12: Summary
  showStep(12, steps, t('cycle_12'));
  await waitForStep();
  // Flash all managers sequentially for visual effect
  var order = ['plc', 'driver', 'ev', 'dm', 'nga', 'ctrl_pid', 'ui1', 'ui2'];
  for (var j = 0; j < order.length; j++) {
    var id = order[j];
    var c = managers[id].color;
    var r = parseInt(c.slice(1,3), 16);
    var g = parseInt(c.slice(3,5), 16);
    var b = parseInt(c.slice(5,7), 16);
    glowManager(id, 'rgba(' + r + ',' + g + ',' + b, 1500);
    await wait(100);
  }
}

registerScenario('cycle', scenarioCycle);
