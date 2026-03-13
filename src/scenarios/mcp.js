// ── Scenario: MCP / Claude Desktop App ──
Object.assign(i18n.fr, {
  mcp_1: 'L\'ingenieur maintenance ouvre <b>Claude Desktop App</b> et saisit : "Le four met trop de temps a atteindre la consigne. Analyse les parametres PID et propose un reglage."',
  mcp_2: '<b>Claude Desktop App</b> envoie le prompt a l\'<b>API Anthropic</b> avec la liste des tools MCP disponibles (get_process_data, get_alarms, get_trend_data).',
  mcp_3: 'L\'<b>API Anthropic</b> decide d\'appeler le tool <code>get_process_data</code> pour lire les parametres PID actuels (Kp, Ki, Kd), la consigne et la temperature.',
  mcp_4: '<b>Claude Desktop App</b> appelle le <b>MCP Server</b> (passerelle Node.js). Le MCP Server fait un <code>dpGet</code> sur l\'<b>EV</b> : PID_TOP.kp=1.2, ki=1.0, kd=0.3, setpoint=900, TC_101=845.',
  mcp_5: '<b>Claude Desktop App</b> renvoie le resultat a l\'<b>API Anthropic</b>. Claude demande les tendances via <code>get_trend_data(TC_101, PID_TOP.output, -1h)</code> pour analyser la reponse.',
  mcp_6: 'Le <b>MCP Server</b> fait un <code>dpGetPeriod</code> sur l\'<b>EV</b>. L\'EV interroge le <b>NGA Frontend</b> \u2192 <b>PostgreSQL</b>. Claude recoit la courbe de temperature et la sortie PID sur 1h.',
  mcp_7: 'L\'<b>API Anthropic</b> analyse : temps de montee 45min (lent), depassement 2%. Recommandation : "Augmenter Kp de 1.2 a 2.1, reduire Ki de 1.0 a 0.8 pour une reponse plus rapide."',
  mcp_8: '<b>Optimisation PID terminee !</b> Flux : Claude Desktop App \u2194 API Anthropic \u2192 MCP Server (passerelle) \u2192 EV (dpGet/dpGetPeriod) \u2192 retour. Claude analyse les courbes et propose un reglage.',
});
Object.assign(i18n.en, {
  mcp_1: 'Maintenance engineer opens <b>Claude Desktop App</b> and types: "The furnace takes too long to reach setpoint. Analyze PID parameters and suggest tuning."',
  mcp_2: '<b>Claude Desktop App</b> sends the prompt to <b>Anthropic API</b> with the list of available MCP tools (get_process_data, get_alarms, get_trend_data).',
  mcp_3: '<b>Anthropic API</b> decides to call the <code>get_process_data</code> tool to read current PID parameters (Kp, Ki, Kd), setpoint and temperature.',
  mcp_4: '<b>Claude Desktop App</b> calls the <b>MCP Server</b> (Node.js gateway). The MCP Server performs a <code>dpGet</code> on <b>EV</b>: PID_TOP.kp=1.2, ki=1.0, kd=0.3, setpoint=900, TC_101=845.',
  mcp_5: '<b>Claude Desktop App</b> sends the result back to <b>Anthropic API</b>. Claude requests trends via <code>get_trend_data(TC_101, PID_TOP.output, -1h)</code> to analyze response.',
  mcp_6: '<b>MCP Server</b> performs a <code>dpGetPeriod</code> on <b>EV</b>. EV queries <b>NGA Frontend</b> \u2192 <b>PostgreSQL</b>. Claude receives temperature curve and PID output over 1h.',
  mcp_7: '<b>Anthropic API</b> analyzes: rise time 45min (slow), overshoot 2%. Recommendation: "Increase Kp from 1.2 to 2.1, reduce Ki from 1.0 to 0.8 for faster response."',
  mcp_8: '<b>PID optimization complete!</b> Flow: Claude Desktop App \u2194 Anthropic API \u2192 MCP Server (gateway) \u2192 EV (dpGet/dpGetPeriod) \u2192 return. Claude analyzes curves and suggests tuning.',
});

async function scenarioMcp() {
  subscriptions = [];
  renderSubTable();
  renderProcessImage();

  var steps = 8;

  // Step 1: User types prompt in Claude Desktop App
  showStep(1, steps, t('mcp_1'));
  await waitForStep();
  glowManager('claude_app', 'rgba(217,70,239', 1200);
  await addMessage('claude_app', 'claude_app', 'PID tuning request', '#d946ef', msgDuration() * 0.5);
  await wait(150);

  // Step 2: Claude Desktop App sends to Anthropic API
  showStep(2, steps, t('mcp_2'));
  await waitForStep();
  await addMessage('claude_app', 'anthropic', 'API: prompt + tools MCP', '#d946ef', msgDuration());
  glowManager('anthropic', 'rgba(217,70,239', 1000);
  await wait(150);

  // Step 3: Anthropic returns tool_use get_process_data
  showStep(3, steps, t('mcp_3'));
  await waitForStep();
  await addMessage('anthropic', 'claude_app', 'tool_use: get_process_data', '#d946ef', msgDuration());
  glowManager('claude_app', 'rgba(217,70,239', 800);
  await wait(100);

  // Step 4: Claude Desktop App calls MCP Server, which queries EV for PID params
  showStep(4, steps, t('mcp_4'));
  await waitForStep();
  await addMessage('claude_app', 'mcp_server', 'MCP: get_process_data', '#a855f7', msgDuration());
  glowManager('mcp_server', 'rgba(168,85,247', 800);
  await addMessage('mcp_server', 'ev', 'dpGet(PID_TOP.kp/ki/kd, TC_101)', COLORS.request, msgDuration());
  glowManager('ev', 'rgba(59,130,246', 600);
  piFlash['TC_101.temperature'] = true;
  piFlash['PID_TOP.output'] = true;
  piFlash['PID_TOP.setpoint'] = true;
  renderProcessImage();
  await addMessage('ev', 'mcp_server', 'response: PID params + values', COLORS.response, msgDuration());
  piFlash['TC_101.temperature'] = false;
  piFlash['PID_TOP.output'] = false;
  piFlash['PID_TOP.setpoint'] = false;
  renderProcessImage();
  await addMessage('mcp_server', 'claude_app', 'tool_result: {kp:1.2, ki:1.0, ...}', '#a855f7', msgDuration());
  await wait(150);

  // Step 5: Claude sends tool_result to Anthropic, gets second tool_use
  showStep(5, steps, t('mcp_5'));
  await waitForStep();
  await addMessage('claude_app', 'anthropic', 'tool_result + continuation', '#d946ef', msgDuration() * 0.8);
  glowManager('anthropic', 'rgba(217,70,239', 1000);
  await addMessage('anthropic', 'claude_app', 'tool_use: get_trend_data', '#d946ef', msgDuration() * 0.8);
  glowManager('claude_app', 'rgba(217,70,239', 800);
  await wait(150);

  // Step 6: Second MCP call for trends → EV → NGA → PostgreSQL
  showStep(6, steps, t('mcp_6'));
  await waitForStep();
  await addMessage('claude_app', 'mcp_server', 'MCP: get_trend_data(TC_101, PID_TOP)', '#a855f7', msgDuration() * 0.8);
  glowManager('mcp_server', 'rgba(168,85,247', 600);
  await addMessage('mcp_server', 'ev', 'dpGetPeriod(TC_101, PID_TOP.output, -1h)', COLORS.request, msgDuration() * 0.8);
  glowManager('ev', 'rgba(59,130,246', 600);
  await addMessage('ev', 'nga', 'history read', COLORS.archive, msgDuration() * 0.6);
  glowManager('nga', 'rgba(236,72,153', 600);
  await addMessage('nga', 'pgsql', 'SELECT ... FROM history', '#336791', msgDuration() * 0.6);
  glowManager('pgsql', 'rgba(51,103,145', 600);
  await addMessage('pgsql', 'nga', 'result set', '#336791', msgDuration() * 0.6);
  glowManager('nga', 'rgba(236,72,153', 600);
  await addMessage('nga', 'dm', 'history response', COLORS.response, msgDuration() * 0.6);
  glowManager('dm', 'rgba(139,92,246', 600);
  await addMessage('dm', 'ev', 'history data', COLORS.response, msgDuration() * 0.6);
  await addMessage('ev', 'mcp_server', 'response: temp + PID curves', COLORS.response, msgDuration() * 0.8);
  await addMessage('mcp_server', 'claude_app', 'tool_result: [{ts,temp,pid}...]', '#a855f7', msgDuration() * 0.8);
  await wait(150);

  // Step 7: Final response from Anthropic — PID tuning recommendation
  showStep(7, steps, t('mcp_7'));
  await waitForStep();
  await addMessage('claude_app', 'anthropic', 'tool_result + continuation', '#d946ef', msgDuration() * 0.8);
  glowManager('anthropic', 'rgba(217,70,239', 1200);
  await addMessage('anthropic', 'claude_app', 'PID recommendation: Kp=2.1, Ki=0.8', '#d946ef', msgDuration());
  glowManager('claude_app', 'rgba(217,70,239', 1500);
  await wait(200);

  // Step 8: Summary
  showStep(8, steps, t('mcp_8'));
  await waitForStep();
  var path = ['claude_app', 'anthropic', 'claude_app', 'mcp_server', 'ev', 'mcp_server', 'claude_app'];
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

registerScenario('mcp', scenarioMcp);
