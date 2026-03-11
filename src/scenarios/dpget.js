// ── Scenario: dpGet ──
Object.assign(i18n.fr, {
  dpGet_1: 'Le <b>CTRL PID</b> appelle <code>dpGet("TC_101.temperature")</code> — requete envoyee a l\'<b>EV</b>',
  dpGet_2: 'L\'<b>EV</b> lit la valeur dans sa <b>process image</b> en RAM : <code>820.0</code>',
  dpGet_3: 'L\'<b>EV</b> retourne la valeur <code>820.0</code> au <b>CTRL PID</b> — operation terminee, aucun abonnement cree',
});
Object.assign(i18n.en, {
  dpGet_1: '<b>CTRL PID</b> calls <code>dpGet("TC_101.temperature")</code> — request sent to <b>EV</b>',
  dpGet_2: '<b>EV</b> reads the value from its <b>process image</b> in RAM: <code>820.0</code>',
  dpGet_3: '<b>EV</b> returns value <code>820.0</code> to <b>CTRL PID</b> — operation complete, no subscription created',
});

async function scenarioDpGet() {
  subscriptions = [];
  renderSubTable();
  renderProcessImage();

  var steps = 3;

  showStep(1, steps, t('dpGet_1'));
  await waitForStep();
  glowManager('ctrl_pid', 'rgba(16,185,129', 1200);
  await addMessage('ctrl_pid', 'ev', 'dpGet(TC_101.temp)', COLORS.request, msgDuration());
  await wait(200);

  showStep(2, steps, t('dpGet_2'));
  await waitForStep();
  glowManager('ev', 'rgba(59,130,246', 800);
  piFlash['TC_101.temperature'] = true;
  renderProcessImage();
  await addMessage('ev', 'ev', 'read process image', COLORS.internal, msgDuration() * 0.6);
  piFlash['TC_101.temperature'] = false;
  renderProcessImage();
  await wait(200);

  showStep(3, steps, t('dpGet_3'));
  await waitForStep();
  await addMessage('ev', 'ctrl_pid', 'response: 820.0', COLORS.response, msgDuration());
  glowManager('ctrl_pid', 'rgba(16,185,129', 600);
}

registerScenario('dpGet', scenarioDpGet);
