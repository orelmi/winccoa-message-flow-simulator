# 2. The three fundamental functions

## 2.1. dpSet — Writing a value

**Principle**: a manager writes a new value to a datapoint element (DPE). The `dpSet` is typically issued by a **UI Manager** (operator action) or a **CTRL Manager** (business logic), and the value propagates to the field via the Driver.

**Message flow — from operator to PLC**:

```
   UI / CTRL            EV                  DM           NGA Frontend     Driver        PLC
   (sender)         (Event Mgr +        (persistence   (archiving →    (OPC UA,       (field
                     process image)      SQLite)        PostgreSQL)     S7...)         API)
      │                  │                  │               │              │              │
      │ 1. dpSet         │                  │               │              │              │
      │   (setpoint,950) │                  │               │              │              │
      │─────────────────>│                  │               │              │              │
      │                  │                  │               │              │              │
      │      2. Updates the                 │               │              │              │
      │         process image (RAM)         │               │              │              │
      │                  │                  │               │              │              │
      │                  │ 3a. Persistence  │               │              │              │
      │                  │─────────────────>│               │              │              │
      │                  │                  │               │              │              │
      │                  │ 3b. Online Change → PostgreSQL                  │              │
      │                  │─────────────────────────────────>│              │              │
      │                  │                  │          → Backends          │              │
      │                  │                  │          → PostgreSQL        │              │
      │                  │                  │               │              │              │
      │                  │ 4. Notifies Driver (subscribed)  │              │              │
      │                  │────────────────────────────────────────────────>│              │
      │                  │                  │               │         → callback()       │
      │                  │                  │               │              │              │
      │                  │                  │               │              │ 5. OPC UA    │
      │                  │                  │               │              │    Write     │
      │                  │                  │               │              │─────────────>│
      │                  │                  │               │              │              │
      │                  │ 4b. Notifies other subscribed managers          │              │
      │                  │    (UI, CTRL...)  │               │              │              │
      │                  │                  │               │              │              │
      │ 6. Acknowledgment│                  │               │              │              │
      │<─────────────────│                  │               │              │              │
```

**Detailed steps**:

1. The operator modifies a setpoint in a panel (UI Manager) or a CTRL script sends a command. The manager calls `dpSet("DPE", value)`.
2. The message arrives at the **Event Manager**, which updates its **process image** in RAM (current DPE value).
3. In parallel, the EV:
   - **3a.** Forwards the value to the **Data Manager** for **persistence** in the configuration database (SQLite).
   - **3b.** Sends an **Online Change** to the **NGA Frontend Manager** for historical archiving (if the DPE is archived). The NGA distributes to its Backends (PostgreSQL, InfluxDB).
4. The EV scans its **subscription table** and sends a **notification** to each subscribed manager. In particular, the **Driver** receives the notification and **writes the value to the PLC** via the field protocol (OPC UA, S7, Modbus...).
5. The Driver translates the value into a protocol write (e.g., OPC UA Write) and sends it to the physical PLC.
6. The sender receives an acknowledgment (success or error).

**Concrete example — furnace: the operator changes the setpoint**:
```ctrl
// The operator modifies the temperature setpoint in the panel
dpSet("PID_TOP.setpoint:_online.._value", 950.0);
```

> The setpoint `950.0` arrives at the EV, which updates its **process image**, then:
- The EV forwards to the **DM** for persistence (SQLite) and sends an **Online Change** to the **NGA Frontend Manager** (→ PostgreSQL Backends)
- The EV **notifies** the **Driver** (subscribed via the addressing config) → the Driver writes the setpoint to the physical controller via OPC UA
- The EV **notifies** the **CTRL Manager** PID → the CTRL calls its callback and adapts its regulation logic
- The EV **notifies** the other subscribed **UI Managers** → display update on all workstations

**Another example — the CTRL writes a computed output**:
```ctrl
// The PID controller calculates a power level and sends it to the field
dpSet("HR_TOP.power:_online.._value", 72.5);
```

> The Driver receives the notification, translates it into an OPC UA write, and commands the furnace heating element power.

---

## 2.2. dpGet — One-time read

**Principle**: a manager reads the current value of a DPE. This is a **synchronous** and **one-time** operation (no subscription).

**Message flow**:

```
   Requester                   EV
                           (process image
                            in RAM)
      │                        │
      │  1. dpGet(DPE)         │
      │───────────────────────>│
      │                        │
      │        2. Reads from the
      │           process image (RAM)
      │                        │
      │  3. Response(value)    │
      │<───────────────────────│
```

**Detailed steps**:

1. The manager calls `dpGet("DPE", value)`.
2. The request arrives at the **Event Manager**, which reads the current value directly from its **process image** in RAM.
3. The value is returned to the requester.

**Important**: `dpGet` creates **no subscription**. It is a point-in-time snapshot. If the value changes afterwards, the requester will not be notified.

**Concrete example — furnace**:
```ctrl
float temp;
dpGet("TC_101.temperature:_online.._value", temp);
DebugN("Current temperature: " + temp);
```

---

## 2.3. dpConnect — Subscription (publish/subscribe)

**Principle**: a manager **subscribes** to one or more DPEs. On each value change, the EV sends a **notification** to the manager, which **locally calls its callback function**. This is the **publish/subscribe (pub/sub)** model.

**Message flow — subscription phase**:

```
   Subscriber                  EV
                           (process image
                            + subscription table)
      │                        │
      │  1. dpConnect(cb, DPE) │
      │───────────────────────>│
      │                        │
      │  (EV registers         │
      │   the subscription in  │
      │   its internal table)  │
      │                        │
      │  2. Notification       │
      │     (initial value     │
      │      from process      │
      │      image)            │
      │<───────────────────────│
      │                        │
      │  3. The manager calls  │
      │     its callback       │
      │     locally(init val)  │
```

**Message flow — subsequent notification**:

```
   Sender           EV         Subscriber A  Subscriber B  Subscriber C
      │              │              │           │           │
      │  dpSet(DPE)  │              │           │           │
      │─────────────>│              │           │           │
      │              │              │           │           │
      │              │  notif(val)  │           │           │
      │              │─────────────>│           │           │
      │              │         → callback()    │           │
      │              │              │           │           │
      │              │  notif(val)  │           │           │
      │              │─────────────────────────>│           │
      │              │              │     → callback()     │
      │              │              │           │           │
      │              │  notif(val)  │           │           │
      │              │─────────────────────────────────────>│
      │              │              │           │     → callback()
```

**Detailed steps**:

1. The manager calls `dpConnect("myCallback", "DPE")`.
2. The EV **registers the subscription** in its internal table (associates DPE → manager).
3. The EV **immediately** sends the current DPE value (read from its **process image** in RAM) to the subscribed manager.
4. The manager receives the notification and **locally calls its callback** for the first time with the current value.
5. **Subsequently**, on each `dpSet` on that DPE (by any manager), the EV sends a notification to all subscribed managers. Each manager then calls its callback locally.

**Concrete example — furnace**:
```ctrl
// The panel subscribes to the temperature
dpConnect("updateTempDisplay", "TC_101.temperature:_online.._value");

void updateTempDisplay(string dpe, float val)
{
  setValue("txtTemp", "text", "T = " + val + " °C");
  // Change color if > 900°C
  if (val > 900.0)
    setValue("txtTemp", "foreCol", "red");
  else
    setValue("txtTemp", "foreCol", "green");
}
```

---

# 3. Comparison of the three functions

| Characteristic | dpGet | dpSet | dpConnect |
|----------------|-------|-------|-----------|
| **Direction** | Read | Write | Subscription (continuous read) |
| **Model** | Request/response | Fire & notify | Publish/subscribe |
| **Frequency** | One-time | One-time | Continuous (event-driven) |
| **Creates a subscription** | No | No | Yes |
| **Callback** | No | No | Yes |
| **Network load** | Low (1 message) | Low (1 message + notifications) | Low initially, then 1 message per change |
| **Typical use** | Read a config at startup | Write a setpoint, a command | Real-time display, reactive logic |
