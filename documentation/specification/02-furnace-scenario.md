# 4. Complete scenario: furnace regulation cycle

This scenario illustrates a complete message cycle during the furnace temperature regulation.

## Actors involved

- **Driver OPC UA**: reads the field temperature (TC_101)
- **CTRL Simulator**: simulates the furnace physics (in demo mode)
- **CTRL PID**: PID controller that calculates heating power
- **UI Panel**: displays the temperature and power
- **NGA Archiver**: records historical values

## Message chronology

```
  Time    Sender             Action                              Notified receivers
  ─────   ────────           ──────                              ───────────────────
  t=0     CTRL PID           dpConnect("onTemp",                 (subscription registered
                               "TC_101.temperature")              in the EV)

  t=0     UI Panel           dpConnect("updateDisplay",          (subscription registered
                               "TC_101.temperature")              in the EV)
                             dpConnect("updateDisplay",
                               "PID_TOP.output")

  t=1     Driver/Simu        dpSet("TC_101.temperature", 845.2)  → EV notifies CTRL PID
                                                                  → EV notifies UI Panel
                                                                  → EV → DM (SQLite persistence)
                                                                  → EV → NGA Frontend (Online Change)

  t=1     CTRL PID           [receives notif → calls onTemp]
                             Computes output = 72.5%
                             dpSet("PID_TOP.output", 72.5)       → EV notifies UI Panel
                                                                  → EV notifies Driver
                                                                  → EV → DM (persistence)
                                                                  → EV → NGA Frontend (Online Change)

  t=1     Driver             [receives PID_TOP.output = 72.5]
                             Sends OPC UA command
                             to physical controller

  t=2     Driver/Simu        dpSet("TC_101.temperature", 847.8)  → EV notifies CTRL PID
                                                                  → EV notifies UI Panel
                                                                  → DM → NGA Archiver
  ...     (the cycle repeats)
```

## Complete sequence diagram

```
  Driver/Simu    EV            DM        NGA Frontend   CTRL PID    UI Panel     Field
      │            │            │            │              │           │            │
      │ dpSet      │            │            │              │           │            │
      │ TC_101     │            │            │              │           │            │
      │ =845.2     │            │            │              │           │            │
      │───────────>│            │            │              │           │            │
      │            │            │            │              │           │            │
      │            │ (process   │            │              │           │            │
      │            │  image     │            │              │           │            │
      │            │  updated)  │            │              │           │            │
      │            │            │            │              │           │            │
      │            │            │            │              │           │            │
      │            │ persist    │            │              │           │            │
      │            │───────────>│            │              │           │            │
      │            │            │            │              │           │            │
      │            │ Online Change → PostgreSQL  │              │           │            │
      │            │────────────────────────>│              │           │            │
      │            │            │            │→ Backends    │           │            │
      │            │            │            │              │           │            │
      │            │ notif(845.2)            │              │           │            │
      │            │─────────────────────────────────────-->│           │            │
      │            │            │            │         → callback()    │            │
      │            │            │            │              │           │            │
      │            │ notif(845.2)            │              │           │            │
      │            │──────────────────────────────────────────────────->│            │
      │            │            │            │              │      → callback()     │
      │            │            │            │              │           │            │
      │            │  dpSet     │            │              │           │            │
      │            │  PID_TOP   │            │              │           │            │
      │            │  =72.5%    │            │              │           │            │
      │            │<───────────────────────────────────────│           │            │
      │            │            │            │              │           │            │
      │            │ persist    │            │              │           │            │
      │            │───────────>│            │              │           │            │
      │            │ Online Change → PostgreSQL  │              │           │            │
      │            │────────────────────────>│              │           │            │
      │            │            │            │→ Backends    │           │            │
      │            │            │            │              │           │            │
      │            │ notif(72.5%)            │              │           │            │
      │            │──────────────────────────────────────────────────->│            │
      │            │            │            │              │      → callback()     │
      │            │            │            │              │           │            │
      │            │ notif      │            │              │           │            │
      │<───────────│            │            │              │           │            │
      │            │            │            │              │           │            │
      │  OPC UA command        │            │              │           │            │
      │──────────────────────────────────────────────────────────────────────────-->│
      │            │            │            │              │           │            │
```
