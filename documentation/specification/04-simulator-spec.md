# 6. Specifications for the animation/simulator

## Visual elements to represent

1. **Managers**: 7 boxes (PLC, Driver, EV, DM, NGA Frontend, CTRL PID, UI Panel)
2. **Messages**: animated arrows between boxes, with message content
3. **Subscription table**: visible table in the EV showing active subscriptions
4. **Process image**: display of current values in the EV (RAM)
5. **Timeline**: time bar at the bottom allowing play/pause/step forward

## Scenarios to simulate

| Scenario | Description |
|----------|-------------|
| **S1 — Simple dpGet** | A CTRL reads TC_101.temperature. The EV responds from its process image. |
| **S2 — Simple dpSet** | The operator sends a setpoint from the UI Operator. The value passes through the EV, notifies the CTRL PID and the Driver, which writes it to the PLC via OPC UA. The UI Monitoring is also notified. |
| **S3 — dpConnect** | The UI Operator subscribes to TC_101.temperature. The EV registers and sends the initial value. |
| **S4 — PLC Live** | The temperature changes spontaneously in the PLC. The Driver sends the value up via dpSet. The EV distributes by multicast to the CTRL PID and to both UI Managers (Operator + Monitoring). |
| **S5 — Full cycle** | Complete regulation cycle: PLC → Driver → EV → DM/NGA → CTRL PID + 2 UIs → Driver → PLC. |
| **S6 — History read** | The UI Monitoring requests the history of TC_101.temperature via dpGetPeriod(). The EV forwards the request to the NGA Frontend, which queries PostgreSQL. The response returns via NGA → DM → UI (the EV is not involved in the response path). |
| **S7 — Node.js → Kafka (streaming)** | The JS Manager subscribes to furnace data via dpConnect, transforms and publishes messages to a Kafka broker. A predictive maintenance service consumes the Kafka topic and sends back an alert via the JS Manager. |
| **S8 — Claude AI (MCP) — PID Optimization** | The maintenance engineer asks Claude to analyze PID performance. Via MCP, the Node.js gateway server reads PID parameters and trends. Claude analyzes the curves and proposes an optimized tuning (Kp, Ki). |
| **S9 — UNS (MQTT)** | The MQTT Publisher publishes furnace data to an MQTT broker (Mosquitto). The MES subscribes to production data (cycle, parts), the Cloud Historian to all raw data. Decoupled ISA-95 architecture. |

## User interactions

- **"dpGet" button**: triggers scenario S1 with message animation
- **"dpSet" button**: triggers scenario S2
- **"dpConnect" button**: triggers S3 (subscription phase)
- **"PLC Live" button**: triggers scenario S4 — spontaneous PLC data → Driver → EV → multicast to CTRL PID + 2 UI Managers
- **"Full cycle" button**: plays scenario S5 step by step (complete regulation cycle)
- **"History read" button**: triggers scenario S6 with the flow UI → EV → NGA → PostgreSQL → NGA → DM → UI
- **"Node.js → Kafka" button**: triggers scenario S7 with the flow Driver → EV → JS Manager → Kafka → Predictive Maintenance Service → Kafka → JS Manager → EV → UI
- **"Claude AI (MCP)" button**: triggers scenario S8 — PID optimization via Claude Desktop App → MCP Server → EV (dpGet/dpGetPeriod) → analysis and recommendation
- **"UNS (MQTT)" button**: triggers scenario S9 — MQTT Publisher → MQTT Broker → MES (production) + Cloud Historian (raw data)
- **Speed slider**: controls the animation speed
- **Pause/Play**: pauses or resumes the animation

## Suggested data format for the simulator

```json
{
  "managers": [
    {"id": "plc", "label": "Automate (PLC)", "x": 50, "y": 200},
    {"id": "driver", "label": "Driver OPC UA", "x": 200, "y": 200},
    {"id": "ev", "label": "Event Manager", "x": 400, "y": 200},
    {"id": "dm", "label": "Data Manager", "x": 350, "y": 350},
    {"id": "nga", "label": "NGA Frontend", "x": 500, "y": 350},
    {"id": "ctrl_pid", "label": "CTRL PID", "x": 600, "y": 100},
    {"id": "ui", "label": "UI Panel", "x": 650, "y": 200},
    {"id": "js_mgr", "label": "JS Manager (Node.js)", "x": 600, "y": 300},
    {"id": "kafka", "label": "Broker Kafka", "x": 800, "y": 300},
    {"id": "pred_maint", "label": "Service Maintenance Prédictive", "x": 1000, "y": 300},
    {"id": "mcp_server", "label": "MCP Server (Node.js, passerelle)", "x": 800, "y": 150},
    {"id": "claude_app", "label": "Claude Desktop App", "x": 1000, "y": 50},
    {"id": "anthropic", "label": "Anthropic API", "x": 1200, "y": 50}
  ],
  "subscriptions": [
    {"subscriber": "ctrl_pid", "dpe": "TC_101.temperature", "callback": "onTemp"},
    {"subscriber": "ui", "dpe": "TC_101.temperature", "callback": "updateDisplay"},
    {"subscriber": "ui", "dpe": "PID_TOP.output", "callback": "updateDisplay"},
    {"subscriber": "nga", "dpe": "TC_101.temperature", "callback": "archive"},
    {"subscriber": "nga", "dpe": "PID_TOP.output", "callback": "archive"}
  ],
  "scenarios": {
    "S1_dpGet": {
      "steps": [
        {"from": "ctrl_pid", "to": "ev", "label": "dpGet(TC_101.temperature)", "type": "request"},
        {"from": "ev", "to": "ev", "label": "lecture process image", "type": "internal"},
        {"from": "ev", "to": "ctrl_pid", "label": "réponse: 845.2", "type": "response"}
      ]
    },
    "S2_dpSet": {
      "steps": [
        {"from": "ui", "to": "ev", "label": "dpSet(PID_TOP.setpoint, 950.0)", "type": "write"},
        {"from": "ev", "to": "ev", "label": "maj process image", "type": "internal"},
        {"from": "ev", "to": "dm", "label": "persistance (SQLite)", "type": "internal"},
        {"from": "ev", "to": "nga", "label": "Online Change → PostgreSQL", "type": "archive"},
        {"from": "ev", "to": "ctrl_pid", "label": "notif(950.0)", "type": "notify"},
        {"from": "ctrl_pid", "to": "ctrl_pid", "label": "→ callback(950.0)", "type": "callback"},
        {"from": "ev", "to": "driver", "label": "notif(950.0)", "type": "notify"},
        {"from": "driver", "to": "plc", "label": "OPC UA Write → 950.0", "type": "external"}
      ]
    },
    "S4_cycle_complet": {
      "steps": [
        {"from": "plc", "to": "driver", "label": "OPC UA Read → 845.2", "type": "external"},
        {"from": "driver", "to": "ev", "label": "dpSet(TC_101.temp, 845.2)", "type": "write"},
        {"from": "ev", "to": "ev", "label": "maj process image", "type": "internal"},
        {"from": "ev", "to": "dm", "label": "persistance (SQLite)", "type": "internal"},
        {"from": "ev", "to": "nga", "label": "Online Change → PostgreSQL", "type": "archive"},
        {"from": "ev", "to": "ctrl_pid", "label": "notif(845.2)", "type": "notify"},
        {"from": "ctrl_pid", "to": "ctrl_pid", "label": "→ callback onTemp(845.2)", "type": "callback"},
        {"from": "ev", "to": "ui", "label": "notif(845.2)", "type": "notify"},
        {"from": "ui", "to": "ui", "label": "→ callback updateDisplay(845.2)", "type": "callback"},
        {"from": "ctrl_pid", "to": "ev", "label": "dpSet(PID_TOP.output, 72.5)", "type": "write"},
        {"from": "ev", "to": "ev", "label": "maj process image", "type": "internal"},
        {"from": "ev", "to": "dm", "label": "persistance (SQLite)", "type": "internal"},
        {"from": "ev", "to": "nga", "label": "Online Change → PostgreSQL", "type": "archive"},
        {"from": "ev", "to": "ui", "label": "notif(72.5%)", "type": "notify"},
        {"from": "ui", "to": "ui", "label": "→ callback updateDisplay(72.5%)", "type": "callback"},
        {"from": "ev", "to": "driver", "label": "notif(72.5)", "type": "notify"},
        {"from": "driver", "to": "plc", "label": "OPC UA Write → 72.5%", "type": "external"}
      ]
    },
    "S6_history_read": {
      "steps": [
        {"from": "ui", "to": "ev", "label": "dpGetPeriod(TC_101.temp, -2h)", "type": "request"},
        {"from": "ev", "to": "nga", "label": "history read request", "type": "archive"},
        {"from": "nga", "to": "pgsql", "label": "SELECT ... FROM history", "type": "external"},
        {"from": "pgsql", "to": "nga", "label": "result set (N rows)", "type": "response"},
        {"from": "nga", "to": "dm", "label": "history response", "type": "response"},
        {"from": "dm", "to": "ui", "label": "response: history data", "type": "response"}
      ]
    },
    "S7_nodejs_kafka": {
      "steps": [
        {"from": "plc", "to": "driver", "label": "OPC UA Read → TC_101=845.2, vibration=2.4mm/s", "type": "external"},
        {"from": "driver", "to": "ev", "label": "dpSet(TC_101.temp, 845.2)\ndpSet(HR_TOP.vibration, 2.4)", "type": "write"},
        {"from": "ev", "to": "ev", "label": "maj process image", "type": "internal"},
        {"from": "ev", "to": "js_mgr", "label": "notif(TC_101.temp=845.2, HR_TOP.vibration=2.4)", "type": "notify"},
        {"from": "js_mgr", "to": "js_mgr", "label": "→ callback: transforme en message Kafka\n{topic:'furnace-telemetry', key:'FOUR_01'}", "type": "callback"},
        {"from": "js_mgr", "to": "kafka", "label": "kafka.produce('furnace-telemetry',\n{temp:845.2, vibration:2.4, ts:...})", "type": "external"},
        {"from": "kafka", "to": "pred_maint", "label": "kafka.consume('furnace-telemetry')\n→ modele ML analyse vibrations", "type": "external"},
        {"from": "pred_maint", "to": "pred_maint", "label": "Detection anomalie vibration\nHR_TOP : usure roulement probable\nConfiance: 87%", "type": "callback"},
        {"from": "pred_maint", "to": "kafka", "label": "kafka.produce('furnace-alerts',\n{type:'predictive', component:'HR_TOP'})", "type": "external"},
        {"from": "kafka", "to": "js_mgr", "label": "kafka.consume('furnace-alerts')\n→ alerte maintenance predictive", "type": "external"},
        {"from": "js_mgr", "to": "ev", "label": "dpSet(HR_TOP.maint_alert, 'Usure roulement probable')\ndpSet(HR_TOP.maint_confidence, 87)", "type": "write"},
        {"from": "ev", "to": "ui", "label": "notif(HR_TOP.maint_alert='Usure roulement probable')", "type": "notify"},
        {"from": "ui", "to": "ui", "label": "→ callback: affiche alerte maintenance\npredictive dans le panel operateur", "type": "callback"}
      ]
    },
    "S8_mcp_claude_desktop": {
      "steps": [
        {"from": "claude_app", "to": "claude_app", "label": "Prompt: 'Analyse les temperatures\ndu four'", "type": "callback"},
        {"from": "claude_app", "to": "anthropic", "label": "API Anthropic: prompt\n+ tools MCP disponibles", "type": "external"},
        {"from": "anthropic", "to": "claude_app", "label": "tool_use: get_process_data\n(['TC_101.temp','TC_102.temp',...])", "type": "response"},
        {"from": "claude_app", "to": "mcp_server", "label": "MCP tool call:\nget_process_data", "type": "external"},
        {"from": "mcp_server", "to": "ev", "label": "dpGet(TC_101.temp,\nTC_102.temp, PID_TOP...)", "type": "request"},
        {"from": "ev", "to": "mcp_server", "label": "reponse: TC_101=845,\nTC_102=842, PID_TOP=72.5", "type": "response"},
        {"from": "mcp_server", "to": "claude_app", "label": "tool_result: {TC_101:845,...}", "type": "response"},
        {"from": "claude_app", "to": "anthropic", "label": "tool_result + suite\ndu prompt", "type": "external"},
        {"from": "anthropic", "to": "claude_app", "label": "tool_use: get_trend_data\n(TC_101.temp, -1h)", "type": "response"},
        {"from": "claude_app", "to": "mcp_server", "label": "MCP tool call:\nget_trend_data", "type": "external"},
        {"from": "mcp_server", "to": "ev", "label": "dpGetPeriod(TC_101, -1h)", "type": "request"},
        {"from": "ev", "to": "mcp_server", "label": "historique: [{ts,val},...]", "type": "response"},
        {"from": "mcp_server", "to": "claude_app", "label": "tool_result: tendances 1h", "type": "response"},
        {"from": "claude_app", "to": "anthropic", "label": "tool_result + suite", "type": "external"},
        {"from": "anthropic", "to": "claude_app", "label": "Reponse finale:\n'TC_101 stable a 845°C,\nTC_103 ecart 7°C a surveiller'", "type": "response"}
      ]
    }
  }
}
```
