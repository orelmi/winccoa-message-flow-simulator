# 5. Advanced concepts

## 5.1. dpConnect with response (dpConnectUserData)

Allows passing user data to the callback to contextualize the notification.

## 5.2. Grouped dpSet (dpSetWait)

`dpSetWait` waits for confirmation that the value has been successfully written (synchronous).
`dpSet` is asynchronous — it does not wait for confirmation.

## 5.3. dpDisconnect — Unsubscribe

```ctrl
dpDisconnect("myCallback", "TC_101.temperature:_online.._value");
```

Removes the subscription from the EV's table. The callback will no longer be called.

## 5.4. Configs and attributes

DPEs have **configs** that are themselves addressable:

| Config | Access via dpConnect/dpSet/dpGet | Content |
|--------|-------------------------------|---------|
| `_online.._value` | Real-time value | Current DPE value |
| `_online.._stime` | Source timestamp | Source time stamp |
| `_original.._value` | Original value | Raw value before processing |
| `_alert_hdl.._act_state` | Alarm state | Alarm active or not |
| `_address.._drv_ident` | Driver address | Field connection identifier |

You can subscribe via `dpConnect` to any config:
```ctrl
// Subscribe to the thermocouple alarm state
dpConnect("onAlarm", "TC_101.temperature:_alert_hdl.._act_state");
```

## 5.5. Optimization: smoothing and debouncing

The EV can group rapid changes using the `_smooth` config to avoid overloading subscribed managers with overly frequent notifications.
