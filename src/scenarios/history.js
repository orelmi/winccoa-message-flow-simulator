// ── Scenario: History Read ──
Object.assign(i18n.fr, {
  history_1: 'Le <b>UI Monitoring</b> demande l\'historique de TC_101.temperature sur les 2 dernieres heures via <code>dpGetPeriod()</code>.',
  history_2: 'L\'<b>EV</b> recoit la requete et la transmet au <b>NGA Frontend Manager</b> (lecture historique).',
  history_3: 'Le <b>NGA Frontend</b> interroge la base <b>PostgreSQL</b> pour recuperer les donnees archivees.',
  history_4: '<b>PostgreSQL</b> retourne les donnees historiques au <b>NGA Frontend</b>.',
  history_5: 'Le <b>NGA Frontend</b> transmet la reponse au <b>DM</b> (Data Manager).',
  history_6: 'Le <b>DM</b> retourne les donnees historiques directement au <b>UI Monitoring</b>. Le panel affiche la courbe de temperature. L\'EV n\'est pas implique dans la reponse.',
  history_7: '<b>Lecture historique terminee !</b> Le flux complet : UI \u2192 EV \u2192 NGA Frontend \u2192 PostgreSQL \u2192 NGA Frontend \u2192 DM \u2192 UI.',
});
Object.assign(i18n.en, {
  history_1: '<b>UI Monitoring</b> requests history of TC_101.temperature for the last 2 hours via <code>dpGetPeriod()</code>.',
  history_2: '<b>EV</b> receives the request and forwards it to the <b>NGA Frontend Manager</b> (history read).',
  history_3: '<b>NGA Frontend</b> queries the <b>PostgreSQL</b> database to retrieve archived data.',
  history_4: '<b>PostgreSQL</b> returns historical data to <b>NGA Frontend</b>.',
  history_5: '<b>NGA Frontend</b> sends the response to <b>DM</b> (Data Manager).',
  history_6: '<b>DM</b> returns historical data directly to <b>UI Monitoring</b>. The panel displays the temperature curve. The EV is not involved in the response.',
  history_7: '<b>History read complete!</b> Full flow: UI \u2192 EV \u2192 NGA Frontend \u2192 PostgreSQL \u2192 NGA Frontend \u2192 DM \u2192 UI.',
});

async function scenarioHistoryRead() {
  var steps = 7;

  showStep(1, steps, t('history_1'));
  await waitForStep();
  glowManager('ui2', 'rgba(234,179,8', 1200);
  await addMessage('ui2', 'ev', 'dpGetPeriod(TC_101.temp, -2h)', COLORS.request, msgDuration());
  await wait(200);

  showStep(2, steps, t('history_2'));
  await waitForStep();
  glowManager('ev', 'rgba(59,130,246', 800);
  await addMessage('ev', 'nga', 'history read request', COLORS.archive, msgDuration());
  await wait(200);

  showStep(3, steps, t('history_3'));
  await waitForStep();
  glowManager('nga', 'rgba(236,72,153', 1000);
  await addMessage('nga', 'pgsql', 'SELECT ... FROM history', '#336791', msgDuration());
  await wait(200);

  showStep(4, steps, t('history_4'));
  await waitForStep();
  glowManager('pgsql', 'rgba(51,103,145', 1000);
  await addMessage('pgsql', 'nga', 'result set (N rows)', '#336791', msgDuration());
  await wait(200);

  showStep(5, steps, t('history_5'));
  await waitForStep();
  glowManager('nga', 'rgba(236,72,153', 800);
  await addMessage('nga', 'dm', 'history response', COLORS.response, msgDuration());
  await wait(200);

  showStep(6, steps, t('history_6'));
  await waitForStep();
  glowManager('dm', 'rgba(139,92,246', 800);
  await addMessage('dm', 'ui2', 'response: history data', COLORS.response, msgDuration());
  glowManager('ui2', 'rgba(234,179,8', 1200);
  await wait(200);

  showStep(7, steps, t('history_7'));
  await waitForStep();
  // Flash the full path for visual effect
  var path = ['ui2', 'ev', 'nga', 'pgsql', 'nga', 'dm', 'ui2'];
  for (var j = 0; j < path.length; j++) {
    var id = path[j];
    var c = managers[id].color;
    var r = parseInt(c.slice(1,3), 16);
    var g = parseInt(c.slice(3,5), 16);
    var b = parseInt(c.slice(5,7), 16);
    glowManager(id, 'rgba(' + r + ',' + g + ',' + b, 1500);
    await wait(120);
  }
}

registerScenario('history', scenarioHistoryRead);
