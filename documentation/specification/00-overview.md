# WinCC OA Message Flows — dpConnect, dpSet, dpGet

## Purpose of this document

Describe the internal communication model of WinCC OA based on datapoint functions
(`dpConnect`, `dpSet`, `dpGet`), showing how messages flow between the different
managers. This document will serve as the basis for generating an interactive animation/simulator.

---

## 1. The actors: managers

WinCC OA operates on a **multi-process** architecture (managers). Each manager has a specific
role and communicates with the others through the **Event Manager (EV)**, which acts as the
**central message bus**.

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  UI Manager  │   │ CTRL Manager │   │  JS Manager  │   │    Driver    │
│ (visualization)│ │   (logic)    │   │  (Node.js)   │   │   (field)    │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │                  │
       └──────────────────┼──────────────────┼──────────────────┘
                          │                  │
                   ┌──────┴──────────────────┴──────┐
                   │       Event Manager (EV)       │
                   │  (message bus + process         │
                   │   image in RAM)                 │
                   └───────┬─────────────┬──────────┘
                           │             │
              ┌────────────┴───┐   ┌─────┴──────────────────────────┐
              │ Data Manager   │   │ NGA Frontend Manager           │
              │ (DM)           │   │ (Backend Local In-Proc)        │
              │ (persistence   │   │                                │
              │  current       │   │  ┌──────────────┐             │
              │  values —      │   │  │ Backend      │             │
              │  SQLite)       │   │  │ In-Proc      │             │
              └────────────────┘   │  └──────┬───────┘             │
                                   └─────────│─────────────────────┘
                                             │
                                      ┌──────┴──────────┐
                                      │   PostgreSQL    │
                                      │   (database)    │
                                      │                 │
                                      └─────────────────┘
```

### Role of each manager

| Manager | Role | Examples |
|---------|------|----------|
| **Event Manager (EV)** | Central message router and **process image**: maintains in RAM the current value of all DPEs, manages the subscription table, notifies subscribed managers upon a change, and forwards **Online Changes** to the NGA for archiving. | Heart of the system — always active |
| **Data Manager (DM)** | Responsible for **persistence** of current values in the configuration database (**SQLite**). Receives initial values from the NGA at startup (Init/Read Answer). | Current value persistence |
| **NGA Frontend Manager** | **Next Generation Archive** manager. Receives "Online Changes" directly from the EV. The **Backend Local In-Proc** distributes data to **PostgreSQL** (external database). Multi-backend architecture with Queue Buffer for resilience. | Historical archiving |
| **UI Manager** | Displays graphical panels. Subscribes to displayed DPEs and sends operator commands. | Furnace panel, synoptic |
| **CTRL Manager** | Executes business logic (CTRL scripts). Subscribes to required DPEs and writes results. | Simulator, alarms, calculations |
| **JS Manager** | Executes logic in Node.js. Same principle as CTRL but in JavaScript. | REST API, integrations |
| **Driver** | Interface with the field (PLCs, sensors). Reads physical values and writes commands. | OPC UA, S7, Modbus |
