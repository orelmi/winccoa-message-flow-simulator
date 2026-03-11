// ── Scenario: dpSet ──
Object.assign(i18n.fr, {
  dpSet_1: 'L\'operateur modifie la consigne dans le panel. Le <b>UI Operator</b> appelle <code>dpSet("PID_TOP.setpoint", 950.0)</code>',
  dpSet_2: 'L\'<b>EV</b> met a jour sa <b>process image</b> en RAM : PID_TOP.setpoint = <code>950.0</code>',
  dpSet_3: 'L\'<b>EV</b> transmet au <b>DM</b> pour persistence (SQLite). En parallele, l\'EV envoie un <b>Online Change</b> au <b>NGA Frontend</b> (\u2192 PostgreSQL).',
  dpSet_4: 'L\'<b>EV</b> notifie le <b>CTRL PID</b> (abonne a PID_TOP.setpoint). Le CTRL appelle son <b>callback <code>onSetpoint(950.0)</code></b> et adapte sa regulation.',
  dpSet_5: 'L\'<b>EV</b> notifie le <b>Driver</b> (abonne via la config d\'adressage). Le Driver prepare l\'ecriture vers l\'automate.',
  dpSet_6: 'Le <b>Driver</b> traduit la valeur en ecriture protocolaire et envoie un <b>OPC UA Write</b> vers l\'<b>automate</b>.',
  dpSet_7: 'L\'<b>automate</b> recoit la consigne <code>950.0</code> et l\'applique au regulateur physique du four.',
  dpSet_8: 'L\'<b>EV</b> notifie le <b>UI Monitoring</b> (abonne a PID_TOP.setpoint) qui met a jour la courbe de tendance et verifie les seuils d\'alarme.',
  dpSet_9: '<b>dpSet termine</b> — La consigne operateur a traverse toute la chaine : <b>UI Operator \u2192 EV \u2192 DM (SQLite) + NGA (PostgreSQL) + CTRL PID + Driver \u2192 Automate</b>. Tous les managers abonnes ont ete notifies.',
});
Object.assign(i18n.en, {
  dpSet_1: 'Operator changes the setpoint in the panel. <b>UI Operator</b> calls <code>dpSet("PID_TOP.setpoint", 950.0)</code>',
  dpSet_2: '<b>EV</b> updates its <b>process image</b> in RAM: PID_TOP.setpoint = <code>950.0</code>',
  dpSet_3: '<b>EV</b> sends to <b>DM</b> for persistence (SQLite). In parallel, EV sends <b>Online Change</b> to <b>NGA Frontend</b> (\u2192 PostgreSQL).',
  dpSet_4: '<b>EV</b> notifies <b>CTRL PID</b> (subscribed to PID_TOP.setpoint). CTRL calls its <b>callback <code>onSetpoint(950.0)</code></b> and adjusts regulation.',
  dpSet_5: '<b>EV</b> notifies <b>Driver</b> (subscribed via address config). Driver prepares write to PLC.',
  dpSet_6: '<b>Driver</b> translates value to protocol write and sends <b>OPC UA Write</b> to <b>PLC</b>.',
  dpSet_7: '<b>PLC</b> receives setpoint <code>950.0</code> and applies it to the furnace physical regulator.',
  dpSet_8: '<b>EV</b> notifies <b>UI Monitoring</b> (subscribed to PID_TOP.setpoint) which updates the trend curve and checks alarm thresholds.',
  dpSet_9: '<b>dpSet complete</b> — Operator setpoint traversed the full chain: <b>UI Operator \u2192 EV \u2192 DM (SQLite) + NGA (PostgreSQL) + CTRL PID + Driver \u2192 PLC</b>. All subscribed managers notified.',
});

async function scenarioDpSet() {
  // Setup subscriptions
  subscriptions = [
    { mgr: 'ctrl_pid', mgrLabel: 'CTRL PID', dpe: 'PID_TOP.setpoint', cb: 'onSetpoint' },
    { mgr: 'driver', mgrLabel: 'Driver', dpe: 'PID_TOP.setpoint', cb: 'address' },
    { mgr: 'ui2', mgrLabel: 'UI Monitoring', dpe: 'PID_TOP.setpoint', cb: 'onSetpointChanged' },
  ];
  renderSubTable();
  processImage['PID_TOP.setpoint'] = 900.0;
  renderProcessImage();

  var steps = 9;

  // Step 1: UI1 sends dpSet
  showStep(1, steps, t('dpSet_1'));
  await waitForStep();
  glowManager('ui1', 'rgba(245,158,11', 1000);
  await addMessage('ui1', 'ev', 'dpSet(PID_TOP.setpoint, 950.0)', COLORS.write, msgDuration());
  await wait(150);

  // Step 2: EV updates process image
  showStep(2, steps, t('dpSet_2'));
  await waitForStep();
  glowManager('ev', 'rgba(59,130,246', 800);
  processImage['PID_TOP.setpoint'] = 950.0;
  piFlash['PID_TOP.setpoint'] = true;
  renderProcessImage();
  await addMessage('ev', 'ev', 'update process image', COLORS.internal, msgDuration() * 0.5);
  piFlash['PID_TOP.setpoint'] = false;
  renderProcessImage();
  await wait(150);

  // Step 3: EV → DM (persistence) AND EV → NGA → PostgreSQL (Online Change) in parallel
  showStep(3, steps, t('dpSet_3'));
  await waitForStep();
  await addMessagesParallel([
    { from: 'ev', to: 'dm', label: 'persistence (SQLite)', color: COLORS.internal, duration: msgDuration() * 0.7 },
    { from: 'ev', to: 'nga', label: 'Online Change', color: COLORS.archive, duration: msgDuration() * 0.7 },
  ]);
  glowManager('dm', 'rgba(139,92,246', 800);
  glowManager('nga', 'rgba(236,72,153', 600);
  await addMessage('nga', 'pgsql', 'INSERT INTO history', '#336791', msgDuration() * 0.6);
  glowManager('pgsql', 'rgba(51,103,145', 600);
  await wait(150);

  // Step 4: EV notifies CTRL PID
  showStep(4, steps, t('dpSet_4'));
  await waitForStep();
  highlightSubs = [0];
  renderSubTable();
  await addMessage('ev', 'ctrl_pid', 'notif(950.0)', COLORS.notify, msgDuration());
  glowManager('ctrl_pid', 'rgba(16,185,129', 800);
  await addMessage('ctrl_pid', 'ctrl_pid', '-> callback onSetpoint()', COLORS.callback, msgDuration() * 0.5);
  highlightSubs = [];
  renderSubTable();
  await wait(150);

  // Step 5: EV notifies Driver
  showStep(5, steps, t('dpSet_5'));
  await waitForStep();
  highlightSubs = [1];
  renderSubTable();
  await addMessage('ev', 'driver', 'notif(950.0)', COLORS.notify, msgDuration());
  glowManager('driver', 'rgba(249,115,22', 1000);
  await addMessage('driver', 'driver', '-> callback address()', COLORS.callback, msgDuration() * 0.5);
  highlightSubs = [];
  renderSubTable();
  await wait(150);

  // Step 6: Driver → PLC
  showStep(6, steps, t('dpSet_6'));
  await waitForStep();
  await addMessage('driver', 'plc', 'OPC UA Write -> 950.0', '#94a3b8', msgDuration());
  glowManager('plc', 'rgba(148,163,184', 800);
  await wait(150);

  // Step 7: PLC applies
  showStep(7, steps, t('dpSet_7'));
  await waitForStep();
  glowManager('plc', 'rgba(148,163,184', 1200);
  await wait(600);

  // Step 8: EV notifies UI Monitoring
  showStep(8, steps, t('dpSet_8'));
  await waitForStep();
  highlightSubs = [2];
  renderSubTable();
  await addMessage('ev', 'ui2', 'notif(950.0)', COLORS.notify, msgDuration());
  glowManager('ui2', 'rgba(234,179,8', 800);
  await addMessage('ui2', 'ui2', '-> onSetpointChanged()', COLORS.callback, msgDuration() * 0.4);
  highlightSubs = [];
  renderSubTable();
  await wait(150);

  // Step 9: Summary
  showStep(9, steps, t('dpSet_9'));
  await waitForStep();
}

registerScenario('dpSet', scenarioDpSet);
