// ── Scenario: dpConnect ──
Object.assign(i18n.fr, {
  dpConnect_1: 'Le <b>UI Operator</b> appelle <code>dpConnect("updateDisp", "TC_101.temperature")</code> — demande d\'abonnement',
  dpConnect_2: 'L\'<b>EV</b> enregistre l\'abonnement dans sa <b>table interne</b> : UI Operator \u2192 TC_101.temp \u2192 updateDisp',
  dpConnect_3: 'L\'<b>EV</b> lit la valeur initiale dans sa <b>process image</b> et envoie une <b>notification</b> au UI Operator',
  dpConnect_4_tpl: 'Le <b>UI Operator</b> recoit la notification et appelle localement <b><code>updateDisp(${val})</code></b> — premier appel du callback',
  dpConnect_5: '<b>dpConnect termine</b> — l\'abonnement est actif. A chaque futur <code>dpSet</code> sur TC_101.temp, l\'EV notifiera automatiquement le UI Operator.',
});
Object.assign(i18n.en, {
  dpConnect_1: '<b>UI Operator</b> calls <code>dpConnect("updateDisp", "TC_101.temperature")</code> — subscription request',
  dpConnect_2: '<b>EV</b> registers subscription in its <b>internal table</b>: UI Operator \u2192 TC_101.temp \u2192 updateDisp',
  dpConnect_3: '<b>EV</b> reads initial value from <b>process image</b> and sends <b>notification</b> to UI Operator',
  dpConnect_4_tpl: '<b>UI Operator</b> receives notification and locally calls <b><code>updateDisp(${val})</code></b> — first callback invocation',
  dpConnect_5: '<b>dpConnect complete</b> — subscription is active. On every future <code>dpSet</code> on TC_101.temp, EV will automatically notify UI Operator.',
});

async function scenarioDpConnect() {
  subscriptions = [];
  renderSubTable();
  renderProcessImage();

  var steps = 5;

  showStep(1, steps, t('dpConnect_1'));
  await waitForStep();
  glowManager('ui1', 'rgba(245,158,11', 1000);
  await addMessage('ui1', 'ev', 'dpConnect(updateDisp, TC_101.temp)', COLORS.request, msgDuration());
  await wait(200);

  showStep(2, steps, t('dpConnect_2'));
  await waitForStep();
  glowManager('ev', 'rgba(59,130,246', 1000);
  subscriptions.push({ mgr: 'ui1', mgrLabel: 'UI Operator', dpe: 'TC_101.temp', cb: 'updateDisp' });
  highlightSubs = [subscriptions.length - 1];
  renderSubTable();
  await addMessage('ev', 'ev', 'register subscription', COLORS.internal, msgDuration() * 0.5);
  await wait(300);

  showStep(3, steps, t('dpConnect_3'));
  await waitForStep();
  piFlash['TC_101.temperature'] = true;
  renderProcessImage();
  await wait(300);
  piFlash['TC_101.temperature'] = false;
  renderProcessImage();
  var val = processImage['TC_101.temperature'];
  await addMessage('ev', 'ui1', 'notif(' + val.toFixed(1) + ')', COLORS.notify, msgDuration());
  glowManager('ui1', 'rgba(245,158,11', 800);
  await wait(200);

  var step4Text = t('dpConnect_4_tpl').replace('${val}', val.toFixed(1));
  showStep(4, steps, step4Text);
  await waitForStep();
  await addMessage('ui1', 'ui1', '-> callback updateDisp()', COLORS.callback, msgDuration() * 0.5);
  highlightSubs = [];
  renderSubTable();
  await wait(300);

  showStep(5, steps, t('dpConnect_5'));
  await waitForStep();
}

registerScenario('dpConnect', scenarioDpConnect);
