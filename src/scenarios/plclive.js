// ── Scenario: PLC Live ──
Object.assign(i18n.fr, {
  plcLive_1: 'La temperature dans le four change spontanement. L\'<b>automate</b> envoie la nouvelle valeur au <b>Driver</b> via OPC UA.',
  plcLive_2: 'Le <b>Driver</b> appelle <code>dpSet("TC_101.temperature", 852.7)</code> vers l\'<b>EV</b>.',
  plcLive_3: 'L\'<b>EV</b> met a jour sa <b>process image</b> et transmet au <b>DM</b> (SQLite) + <b>NGA Frontend</b> (\u2192 PostgreSQL).',
  plcLive_4: 'L\'<b>EV</b> notifie le <b>CTRL PID</b> (abonne a TC_101.temperature). Le CTRL recalcule la commande PID.',
  plcLive_5: 'L\'<b>EV</b> notifie les <b>2 UI Managers</b> abonnes — distribution <b>multicast</b>. Chaque UI met a jour son affichage.',
  plcLive_6: '<b>Flux PLC Live termine !</b> Un changement dans l\'automate traverse : PLC \u2192 Driver \u2192 EV \u2192 DM/NGA \u2192 CTRL PID + UI Managers. Les UIs sont mis a jour en temps reel sans interrogation.',
});
Object.assign(i18n.en, {
  plcLive_1: 'Temperature in the furnace changes spontaneously. <b>PLC</b> sends the new value to <b>Driver</b> via OPC UA.',
  plcLive_2: '<b>Driver</b> calls <code>dpSet("TC_101.temperature", 852.7)</code> on <b>EV</b>.',
  plcLive_3: '<b>EV</b> updates its <b>process image</b> and sends to <b>DM</b> (SQLite) + <b>NGA Frontend</b> (\u2192 PostgreSQL).',
  plcLive_4: '<b>EV</b> notifies <b>CTRL PID</b> (subscribed to TC_101.temperature). CTRL recomputes the PID output.',
  plcLive_5: '<b>EV</b> notifies both <b>UI Managers</b> — <b>multicast</b> distribution. Each UI updates its display.',
  plcLive_6: '<b>PLC Live complete!</b> A PLC change traverses: PLC \u2192 Driver \u2192 EV \u2192 DM/NGA \u2192 CTRL PID + UI Managers. UIs update in real-time without polling.',
});

async function scenarioPlcLive() {
  subscriptions = [
    { mgr: 'ctrl_pid', mgrLabel: 'CTRL PID', dpe: 'TC_101.temp', cb: 'onTemp' },
    { mgr: 'ui1', mgrLabel: 'UI Operator', dpe: 'TC_101.temp', cb: 'updateDisp' },
    { mgr: 'ui2', mgrLabel: 'UI Monitoring', dpe: 'TC_101.temp', cb: 'updateTrend' },
  ];
  renderSubTable();
  processImage['TC_101.temperature'] = 845.0;
  renderProcessImage();

  var steps = 6;

  // Step 1: PLC temperature changes → Driver via OPC UA
  showStep(1, steps, t('plcLive_1'));
  await waitForStep();
  glowManager('plc', 'rgba(148,163,184', 1200);
  await addMessage('plc', 'driver', 'OPC UA Read -> 852.7', '#94a3b8', msgDuration());
  glowManager('driver', 'rgba(249,115,22', 1000);
  await wait(150);

  // Step 2: Driver → EV dpSet
  showStep(2, steps, t('plcLive_2'));
  await waitForStep();
  await addMessage('driver', 'ev', 'dpSet(TC_101.temp, 852.7)', COLORS.write, msgDuration());
  glowManager('ev', 'rgba(59,130,246', 800);
  processImage['TC_101.temperature'] = 852.7;
  piFlash['TC_101.temperature'] = true;
  renderProcessImage();
  await addMessage('ev', 'ev', 'update process image', COLORS.internal, msgDuration() * 0.4);
  piFlash['TC_101.temperature'] = false;
  renderProcessImage();
  await wait(150);

  // Step 3: EV → DM + NGA → PostgreSQL
  showStep(3, steps, t('plcLive_3'));
  await waitForStep();
  await addMessagesParallel([
    { from: 'ev', to: 'dm', label: 'persistence (SQLite)', color: COLORS.internal, duration: msgDuration() * 0.6 },
    { from: 'ev', to: 'nga', label: 'Online Change', color: COLORS.archive, duration: msgDuration() * 0.6 },
  ]);
  glowManager('dm', 'rgba(139,92,246', 600);
  glowManager('nga', 'rgba(236,72,153', 500);
  await addMessage('nga', 'pgsql', 'INSERT INTO history', '#336791', msgDuration() * 0.5);
  glowManager('pgsql', 'rgba(51,103,145', 500);
  await wait(150);

  // Step 4: EV notifies CTRL PID
  showStep(4, steps, t('plcLive_4'));
  await waitForStep();
  highlightSubs = [0];
  renderSubTable();
  await addMessage('ev', 'ctrl_pid', 'notif(852.7)', COLORS.notify, msgDuration());
  glowManager('ctrl_pid', 'rgba(16,185,129', 1000);
  await addMessage('ctrl_pid', 'ctrl_pid', '-> callback onTemp()', COLORS.callback, msgDuration() * 0.4);
  highlightSubs = [];
  renderSubTable();
  await wait(150);

  // Step 5: EV notifies both UIs (multicast)
  showStep(5, steps, t('plcLive_5'));
  await waitForStep();
  highlightSubs = [1, 2];
  renderSubTable();
  await addMessagesParallel([
    { from: 'ev', to: 'ui1', label: 'notif(852.7)', color: COLORS.notify, duration: msgDuration() },
    { from: 'ev', to: 'ui2', label: 'notif(852.7)', color: COLORS.notify, duration: msgDuration() },
  ]);
  glowManager('ui1', 'rgba(245,158,11', 800);
  glowManager('ui2', 'rgba(234,179,8', 800);
  await addMessagesParallel([
    { from: 'ui1', to: 'ui1', label: '-> updateDisp()', color: COLORS.callback, duration: msgDuration() * 0.3 },
    { from: 'ui2', to: 'ui2', label: '-> updateTrend()', color: COLORS.callback, duration: msgDuration() * 0.3 },
  ]);
  highlightSubs = [];
  renderSubTable();
  await wait(150);

  // Step 6: Summary
  showStep(6, steps, t('plcLive_6'));
  await waitForStep();
  var path = ['plc', 'driver', 'ev', 'dm', 'nga', 'pgsql', 'ctrl_pid', 'ui1', 'ui2'];
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

registerScenario('plcLive', scenarioPlcLive);
