# 7. Key rules to remember

1. **Everything goes through the Event Manager** — no manager communicates directly with another.
2. **dpConnect is the primary mechanism** — it is what makes WinCC OA reactive and real-time.
3. **A dpSet triggers N notifications** — the EV notifies as many managers as there are subscribers on that DPE. Each manager then calls its callback locally.
4. **dpGet is a snapshot** — never for real-time, only to read a config or an initial value.
5. **The EV holds the process image** — current values are in RAM in the EV, for ultra-fast access.
6. **The DM handles current value persistence** (SQLite). **Historical archiving** is handled directly by **EV → NGA Frontend Manager** to the Backends (PostgreSQL, InfluxDB).
7. **Notifications are asynchronous** — the notification order between managers is not guaranteed.
