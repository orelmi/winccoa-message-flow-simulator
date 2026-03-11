# 8. Use case Node.js + Kafka: streaming to predictive maintenance

## Industrial context

In a heat treatment plant with **multiple furnaces**, production data (temperatures, vibrations, electrical consumption) must be centralized to an analytics platform for **predictive maintenance**. The **Apache Kafka** protocol serves as a distributed message bus between the SCADA system (WinCC OA) and the analytical services.

## Architecture

```
  WinCC OA                          Data Platform
 ┌─────────────────────────┐       ┌──────────────────────────────────────────┐
 │                         │       │                                          │
 │  Driver ──> EV ──> JS   │       │   Kafka        Predictive Maintenance   │
 │  OPC UA      │    Mgr ──┼──────>│   Broker ────> Service (ML)             │
 │              │          │       │     │                  │                 │
 │  CTRL PID <──┘    JS <──┼───────│     │<─────────────────┘                │
 │              │    Mgr   │       │   (topic:                               │
 │  UI Panel <──┘          │       │    furnace-alerts)                      │
 │                         │       │                                          │
 └─────────────────────────┘       └──────────────────────────────────────────┘
```

## Component roles

| Component | Role |
|-----------|------|
| **JS Manager (Kafka producer)** | Subscribes to furnace DPEs via `dpConnect`, transforms data into JSON messages and publishes them to the Kafka topic `furnace-telemetry` via the `kafkajs` library. |
| **Kafka Broker** | Distributed message bus. Decouples WinCC OA from consumers. Guarantees message delivery and replay. Topics: `furnace-telemetry` (process data), `furnace-alerts` (return alerts). |
| **Predictive Maintenance Service** | Consumes the `furnace-telemetry` topic, applies an ML model (anomaly detection on vibrations and temperatures). If an anomaly is detected, publishes an alert to the `furnace-alerts` topic. |
| **JS Manager (Kafka consumer)** | Consumes the `furnace-alerts` topic and writes alerts into WinCC OA via `dpSet` for display in the operator panel. |

## Detailed message flow

```
  Driver/Simu    EV           JS Manager        Kafka Broker     Pred. Maintenance    UI Panel
      │            │              │                  │                   │                 │
      │ dpSet      │              │                  │                   │                 │
      │ TC_101     │              │                  │                   │                 │
      │ =845.2     │              │                  │                   │                 │
      │───────────>│              │                  │                   │                 │
      │            │              │                  │                   │                 │
      │ dpSet      │              │                  │                   │                 │
      │ HR_TOP     │              │                  │                   │                 │
      │ vibr=2.4   │              │                  │                   │                 │
      │───────────>│              │                  │                   │                 │
      │            │              │                  │                   │                 │
      │            │ notif        │                  │                   │                 │
      │            │ (dpConnect)  │                  │                   │                 │
      │            │─────────────>│                  │                   │                 │
      │            │              │                  │                   │                 │
      │            │              │ kafka.produce    │                   │                 │
      │            │              │ topic:           │                   │                 │
      │            │              │ furnace-telemetry│                   │                 │
      │            │              │ {temp:845.2,     │                   │                 │
      │            │              │  vibration:2.4,  │                   │                 │
      │            │              │  furnace:'FOUR_01'}                  │                 │
      │            │              │─────────────────>│                   │                 │
      │            │              │                  │                   │                 │
      │            │              │                  │ kafka.consume     │                 │
      │            │              │                  │ furnace-telemetry │                 │
      │            │              │                  │──────────────────>│                 │
      │            │              │                  │                   │                 │
      │            │              │                  │             ML model:               │
      │            │              │                  │             vibration 2.4 mm/s      │
      │            │              │                  │             > threshold 2.0 mm/s    │
      │            │              │                  │             → anomaly detected      │
      │            │              │                  │                   │                 │
      │            │              │                  │ kafka.produce     │                 │
      │            │              │                  │ furnace-alerts    │                 │
      │            │              │                  │<──────────────────│                 │
      │            │              │                  │                   │                 │
      │            │              │ kafka.consume    │                   │                 │
      │            │              │ furnace-alerts   │                   │                 │
      │            │              │<─────────────────│                   │                 │
      │            │              │                  │                   │                 │
      │            │ dpSet        │                  │                   │                 │
      │            │ HR_TOP.      │                  │                   │                 │
      │            │ maint_alert  │                  │                   │                 │
      │            │<─────────────│                  │                   │                 │
      │            │              │                  │                   │                 │
      │            │ notif        │                  │                   │                 │
      │            │ (dpConnect)  │                  │                   │                 │
      │            │─────────────────────────────────────────────────────────────────────>│
      │            │              │                  │                   │                 │
      │            │              │                  │                   │     Displays    │
      │            │              │                  │                   │     predictive  │
      │            │              │                  │                   │     maintenance │
      │            │              │                  │                   │     alert       │
```

## JS Manager code example

```javascript
// JS Manager WinCC OA — Kafka producer
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'winccoa-four01', brokers: ['kafka-broker:9092'] });
const producer = kafka.producer();

async function main() {
  await producer.connect();

  // Subscribe to furnace data via the WinCC OA Node.js API
  dpConnect(async (dpe, value) => {
    const message = {
      furnaceId: 'FOUR_01',
      timestamp: new Date().toISOString(),
      temperature: null,
      vibration: null,
    };

    // Collect current values
    message.temperature = await dpGetAsync('TC_101.temperature:_online.._value');
    message.vibration = await dpGetAsync('HR_TOP.vibration:_online.._value');

    await producer.send({
      topic: 'furnace-telemetry',
      messages: [{ key: 'FOUR_01', value: JSON.stringify(message) }],
    });
  }, 'TC_101.temperature:_online.._value');
}

main();
```

```javascript
// JS Manager WinCC OA — Kafka consumer (return alerts)
const consumer = kafka.consumer({ groupId: 'winccoa-alerts' });

async function listenAlerts() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'furnace-alerts', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const alert = JSON.parse(message.value.toString());
      // Write the alert into WinCC OA
      dpSet(alert.component + '.maint_alert:_online.._value', alert.description);
      dpSet(alert.component + '.maint_confidence:_online.._value', alert.confidence);
    },
  });
}

listenAlerts();
```
