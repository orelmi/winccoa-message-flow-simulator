# 9. Use case MCP: PID Optimization via Claude Desktop App

## Industrial context

The maintenance engineer notices that the furnace takes too long to reach the temperature setpoint. They use **Claude Desktop App** to request an analysis of PID performance and tuning recommendations. Claude connects to an **MCP server** (Node.js) acting as a **gateway** to WinCC OA. The MCP server is connected directly to the **Event Manager** via the WinCC OA Node.js API — it contains no business logic and serves solely as a bridge between Claude and the SCADA system.

The **Model Context Protocol (MCP)** (https://modelcontextprotocol.io) is an open protocol that enables AI applications to access external data sources via "tools". Claude Desktop App supports MCP natively: you simply declare the MCP server in the application configuration.

## Architecture

```
  WinCC OA                                     Workstation
 ┌──────────────────────────────┐              ┌──────────────────────────────────┐
 │                              │              │                                  │
 │  Driver ──> EV ─────────────┼──── TCP ────>│  MCP Server           Claude     │
 │  OPC UA      │               │   (WinCC OA  │  (Node.js)          Desktop App  │
 │              │               │    API)      │  gateway      <───>  (Anthropic) │
 │  CTRL PID <──┘               │              │  no business         natural     │
 │              │               │              │  logic               language    │
 │  UI Panel <──┘               │              │                      analysis   │
 │                              │              │  Tools:                          │
 │  PLC (Automate)              │              │  - get_process_data               │
 │                              │              │  - get_alarms                     │
 │                              │              │  - get_trend_data                 │
 └──────────────────────────────┘              └──────────────────────────────────┘
```

## Component roles

| Component | Role |
|-----------|------|
| **Claude Desktop App** | Anthropic desktop application. The user enters a natural language prompt (e.g., "Analyze the furnace temperatures"). Claude calls MCP tools to obtain data, then analyzes and responds in the conversation. |
| **MCP Server (Node.js)** | Node.js process connected directly to the WinCC OA Event Manager via the native Node.js API (`dpGet`, `dpGetPeriod`). **Pure gateway**: contains no business logic, simply translates MCP calls into WinCC OA requests and returns the results. |
| **Event Manager (EV)** | Responds to MCP Server requests like any other client. Reads values from its process image (RAM) for `dpGet`, and queries the NGA for `dpGetPeriod`. |

## MCP tools exposed by the server

| MCP Tool | Description | Parameters |
|----------|-------------|------------|
| `get_process_data` | Reads current values via `dpGet` on the EV | `dpe_list: string[]` |
| `get_alarms` | Returns active alarms and recent history | `time_range: string, severity?: string` |
| `get_trend_data` | Reads archived data via `dpGetPeriod` on the EV (→ NGA → PostgreSQL) | `dpe: string, duration: string` |

## Detailed message flow

```
  Claude Desktop    MCP Server       EV              NGA Frontend   PostgreSQL
  App               (Node.js)    (process image)   (archiving)
      │                 │              │                │              │
      │  Prompt:        │              │                │              │
      │  "Analyze the   │              │                │              │
      │   furnace       │              │                │              │
      │   temperatures" │              │                │              │
      │                 │              │                │              │
      │  tool_use:      │              │                │              │
      │  get_process_   │              │                │              │
      │  data           │              │                │              │
      │────────────────>│              │                │              │
      │                 │              │                │              │
      │                 │ dpGet        │                │              │
      │                 │ TC_101,TC_102│                │              │
      │                 │ PID_TOP,...  │                │              │
      │                 │─────────────>│                │              │
      │                 │              │                │              │
      │                 │  response    │                │              │
      │                 │  (current    │                │              │
      │                 │   values)    │                │              │
      │                 │<─────────────│                │              │
      │                 │              │                │              │
      │  tool_result:   │              │                │              │
      │  {TC_101:845,   │              │                │              │
      │   TC_102:842,...}│              │                │              │
      │<────────────────│              │                │              │
      │                 │              │                │              │
      │  (Claude        │              │                │              │
      │   analyzes and  │              │                │              │
      │   requests      │              │                │              │
      │   trends)       │              │                │              │
      │                 │              │                │              │
      │  tool_use:      │              │                │              │
      │  get_trend_data │              │                │              │
      │  (TC_101, -1h)  │              │                │              │
      │────────────────>│              │                │              │
      │                 │              │                │              │
      │                 │ dpGetPeriod  │                │              │
      │                 │ TC_101, -1h  │                │              │
      │                 │─────────────>│                │              │
      │                 │              │                │              │
      │                 │              │ history read   │              │
      │                 │              │───────────────>│              │
      │                 │              │                │  SELECT ...  │
      │                 │              │                │─────────────>│
      │                 │              │                │  result set  │
      │                 │              │                │<─────────────│
      │                 │              │  history data  │              │
      │                 │              │<───────────────│              │
      │                 │  response    │                │              │
      │                 │  (history)   │                │              │
      │                 │<─────────────│                │              │
      │                 │              │                │              │
      │  tool_result:   │              │                │              │
      │  [{ts,val},...]  │              │                │              │
      │<────────────────│              │                │              │
      │                 │              │                │              │
      │  Claude responds:│              │                │              │
      │  "TC_101 temp    │              │                │              │
      │   is stable at   │              │                │              │
      │   845°C for      │              │                │              │
      │   20 min.        │              │                │              │
      │   TC_102 shows   │              │                │              │
      │   a 3°C gap →    │              │                │              │
      │   check the      │              │                │              │
      │   probe."        │              │                │              │
```

## Claude Desktop App configuration

In the Claude Desktop configuration file (`claude_desktop_config.json`), you declare the MCP server:

```json
{
  "mcpServers": {
    "winccoa-four": {
      "command": "node",
      "args": ["C:/WinCC_OA/mcp-winccoa-server.js"],
      "env": {
        "WINCCOA_HOST": "localhost",
        "WINCCOA_PORT": "5678"
      }
    }
  }
}
```

## Code example — MCP Server (gateway)

```javascript
// mcp-winccoa-server.js — MCP gateway to WinCC OA
// This server contains no business logic.
// It translates MCP calls into dpGet/dpGetPeriod requests to the Event Manager.

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { WCCOAClient } = require('winccoa-nodejs'); // WinCC OA Node.js API

const wccoa = new WCCOAClient({
  host: process.env.WINCCOA_HOST || 'localhost',
  port: parseInt(process.env.WINCCOA_PORT || '5678'),
});

const server = new McpServer({
  name: 'winccoa-process',
  version: '1.0.0',
});

// Tool: read current values (dpGet on the EV)
server.tool(
  'get_process_data',
  'Reads the current furnace datapoint values via dpGet',
  { dpe_list: z.array(z.string()).describe('List of DPEs (e.g., TC_101.temperature, PID_TOP.output)') },
  async ({ dpe_list }) => {
    const results = {};
    for (const dpe of dpe_list) {
      results[dpe] = await wccoa.dpGet(dpe + ':_online.._value');
    }
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

// Tool: read active alarms
server.tool(
  'get_alarms',
  'Returns active alarms and recent furnace alarm history',
  {
    time_range: z.string().describe('Time range (e.g., -2h, -30m)'),
    severity: z.string().optional().describe('Severity filter (warning, danger, critical)'),
  },
  async ({ time_range, severity }) => {
    const alarms = await wccoa.dpGetAlarmHistory(time_range, severity);
    return { content: [{ type: 'text', text: JSON.stringify(alarms, null, 2) }] };
  }
);

// Tool: read historical trends (dpGetPeriod on the EV → NGA → PostgreSQL)
server.tool(
  'get_trend_data',
  'Reads archived DPE data via dpGetPeriod',
  {
    dpe: z.string().describe('DPE name (e.g., TC_101.temperature)'),
    duration: z.string().describe('Duration (e.g., -1h, -30m, -24h)'),
  },
  async ({ dpe, duration }) => {
    const data = await wccoa.dpGetPeriod(dpe + ':_online.._value', duration);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

async function main() {
  await wccoa.connect();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
```

## Prompt example in Claude Desktop App — PID Optimization

> **User**: The furnace takes too long to reach the setpoint. Analyze the PID parameters and propose a tuning.
>
> **Claude**: I will analyze the furnace PID performance.
>
> *[Tool call: get_process_data({dpe_list: ["PID_TOP.kp", "PID_TOP.ki", "PID_TOP.kd", "PID_TOP.setpoint", "PID_TOP.output", "TC_101.temperature"]})]*
>
> *[Tool call: get_trend_data({dpe: "TC_101.temperature", duration: "-1h"})]*
> *[Tool call: get_trend_data({dpe: "PID_TOP.output", duration: "-1h"})]*
>
> Here is my PID performance analysis:
> - **Current parameters**: Kp=1.2, Ki=1.0, Kd=0.3
> - **Setpoint**: 900°C, **Current temperature**: 845°C
> - **Rise time**: ~45 min (slow for this furnace type)
> - **Overshoot**: 2% (acceptable)
> - **PID output**: plateaus at 72.5% — the command is too conservative
>
> **Recommendation**: Increase Kp from 1.2 to **2.1** and reduce Ki from 1.0 to **0.8**. This will speed up the response without significantly increasing overshoot. Estimated rise time after tuning: ~25 min.
