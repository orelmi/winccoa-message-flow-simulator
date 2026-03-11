# 10. Scenario S9 — UNS (Unified Namespace) via MQTT

## Context

The **Unified Namespace (UNS)** is an Industry 4.0 architecture pattern where all data flows through a **central MQTT broker** organized in hierarchical topics (ISA-95: Enterprise/Site/Area/Line/Device/DataPoint). The advantage is **decoupling**: any system can publish or subscribe without point-to-point integration.

WinCC OA has a native **MQTT Publisher** that can publish datapoint changes to an MQTT broker. Each consumer subscribes to the topics of interest:
- **MES**: subscribes to production data (`uns/+/+/furnace-01/CYCLE_001/#`) — cycle status, number of parts treated, quality
- **Cloud Historian**: subscribes to all topics (`uns/#`) — complete raw data archiving (temperatures, PID outputs, status) for long-term analysis and AI/ML

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  WinCC OA                                                          │
│                                                                    │
│  PLC ──OPC UA──▶ Driver ──dpSet──▶ EV ──dpConnect──▶ MQTT         │
│  (Automate)                                    Publisher           │
│                                                │                   │
│  CTRL PID ──dpSet──▶ EV ─────dpConnect──▶ MQTT Publisher           │
│                                                │                   │
└────────────────────────────────────────────────┼───────────────────┘
                                                 │ MQTT PUBLISH
                                                 ▼
                                        ┌────────────────┐
                                        │  MQTT Broker    │
                                        │  (Mosquitto)    │
                                        └───┬────────┬───┘
                                SUBSCRIBE   │        │   SUBSCRIBE
                                    ┌───────┘        └───────┐
                                    ▼                        ▼
                             ┌────────────┐           ┌────────────┐
                             │    MES      │           │   Cloud    │
                             │(Production) │           │ Historian  │
                             └────────────┘           │ (Data Lake)│
                                                      └────────────┘
```

## UNS topic hierarchy (ISA-95)

```
uns/
  paris/                           # Site
    building-A/                    # Area
      furnace-01/                  # Line / Equipment
        TC_101/
          temperature              # 847.3
        TC_102/
          temperature              # 842.1
        PID_TOP/
          output                   # 73.1
          setpoint                 # 900.0
        HR_TOP/
          power                    # 73.1
```

## Sequence diagram

```
PLC         Driver     EV      MQTT Publisher   Mosquitto    MES    Cloud Historian
   │          │        │            │               │         │          │
   │──OPC UA─▶│        │            │               │         │          │
   │          │─dpSet─▶│            │               │         │          │
   │          │        │─notif─────▶│               │         │          │
   │          │        │            │──PUBLISH──────▶│         │          │
   │          │        │            │  uns/.../temp  │         │          │
   │          │        │            │               │──msg───▶│          │
   │          │        │            │               │──msg──────────────▶│
   │          │        │            │               │         │          │
```

## Scenario configuration (JSON)

```json
{
  "id": "uns",
  "title": { "fr": "S9 — UNS (MQTT)", "en": "S9 — UNS (MQTT)" },
  "managers_extra": ["mqtt_pub", "mqtt_broker", "uns_mes", "uns_hist"],
  "steps": [
    { "id": "uns_1", "action": "PLC → Driver → EV (dpSet TC_101.temp)" },
    { "id": "uns_2", "action": "EV update process image + notify MQTT Publisher" },
    { "id": "uns_3", "action": "MQTT Publisher → Mosquitto (PUBLISH UNS topic)" },
    { "id": "uns_4", "action": "Mosquitto → MES (SUBSCRIBE)" },
    { "id": "uns_5", "action": "Mosquitto → Cloud Historian (SUBSCRIBE)" },
    { "id": "uns_6", "action": "CTRL PID dpSet → EV → MQTT Publisher → Broker → all subscribers" },
    { "id": "uns_7", "action": "Summary: decoupled UNS architecture" }
  ]
}
```
