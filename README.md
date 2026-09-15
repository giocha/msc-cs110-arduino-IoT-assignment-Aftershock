# Aftershock

Aftershock is a personal safety system with three parts working together:

- A **phone app** (React Native / Expo) that watches the accelerometer for a sudden impact (fall/crash), shows a cancelable countdown, and reports the incident.
- **Node-RED**, which receives incident reports, correlates them against live earthquake data from the USGS API, decides how severe the alert should be, and drives the physical station.
- An **Arduino UNO base station** (Educational Shield + Ethernet Shield) that raises a physical alarm - buzzer, LEDs, relay - and can resolve an alert locally with a button.

> This is a first-pass prototype built for an academic assignment, not a finished product. All three parts talk to each other over plain HTTP on the same local network - there's no cloud, no authentication, and no hardening for real-world/production use.

## Why this exists

A phone's accelerometer is a poor sensor for detecting earthquakes when the phone is on a person - the body absorbs most of the ground vibration, so it doesn't reliably reflect what the ground is actually doing. It's a good sensor, however, for detecting a sudden *personal* impact - a fall or a crash - which produces a short, sharp spike in acceleration well above the usual 1g. That's the same basic idea real accident/fall-detection systems use.

Aftershock is built around that distinction: the phone detects impact events, not earthquakes. Node-RED sits in between and does the actual judgment call - when an incident comes in with real coordinates, it queries the USGS API live for that specific location and time window, and uses whatever it finds to decide whether the alert should read as "likely just a fall" or "possibly related to a nearby quake." The Arduino base station has no idea which of those it is; it just receives a severity level and reacts.

The phone app started as a separate assignment ("Σεισμοί κοντά μου" - location + nearby earthquakes + a live accelerometer panel) for the same course, and was extended here to add the impact-detection role described above.

This README is about getting the whole system running yourself.

## Architecture

```
   Phone app                  Node-RED                   Arduino base station
 (React Native)          (Docker, port 1880)         (UNO + Educational + Ethernet Shield)

 accelerometer  --POST--> /aftershock/felt-report
                          -- correlates with USGS -->
                          -- decides severity      --GET /alert?level=N--> buzzer / LEDs / relay
 useRemoteThreshold <--GET-- /aftershock/config <----------- POST /aftershock/telemetry --
                                                     (potentiometer threshold, every 5s)

                          <---------------------------- POST /aftershock/resolve --
                                                          (button resolves an alert)

                          <-- periodic poll -- earthquake.usgs.gov (live data)
```

Both the Arduino and the phone must be reachable on the same local network as the machine running Node-RED - there's no cloud component.

## Repository layout

```
.
├── App.tsx                          # Phone app entry point
├── src/
│   ├── components/                  # SensorPanel, IncidentAlertModal, IncidentHistory, ...
│   ├── hooks/                       # useLocation, useEarthquakes, useImpactDetector,
│   │                                 # useIncidentReporter, useRemoteThreshold, ...
│   └── config.ts                    # NODE_RED_BASE_URL - point this at your Node-RED host
├── arduino/
│   └── aftershock_base_station/
│       └── aftershock_base_station.ino
├── node-red/
│   └── data/
│       ├── flows.json               # The Node-RED flow (import this, or run via Docker below)
│       ├── package.json             # Declares the @flowfuse/node-red-dashboard dependency
│       └── package-lock.json
└── README.md
```

## Prerequisites

- **Arduino IDE**, to flash the base station.
- **Docker**, to run Node-RED.
- **Node.js ≥ 24** and **npm**, to run the phone app.
- **Expo Go** on your phone (the app is developed/tested through Expo Go, not a native build).
- All three devices/services on the same LAN.

## 1. Arduino base station

Hardware used from the Educational Shield: potentiometer (**A1**), one button (**D7**), the RGB LED (**D6/D9/D10**), buzzer (**D5**), relay (**D2**), plus the Ethernet Shield stacked on top.

1. Open `arduino/aftershock_base_station/aftershock_base_station.ino` in the Arduino IDE.
2. Near the top, set `nodeRedIp` to the LAN IP of the machine that will run Node-RED (see step 2). `mac`/`boardIp` only matter if DHCP fails on your network.
3. Select **Board → Arduino Uno** and the correct **Port**, then **Upload**. Only `SPI` and `Ethernet` are used - both ship with the Arduino IDE, no extra libraries needed.
4. Open the **Serial Monitor** (9600 baud) - you should see `Base station ready at <ip>`, and the blue heartbeat LED should be blinking once a second.
5. Note the IP it printed - you'll need it for Node-RED's outgoing alert/resolve URLs (see below).

One hardware quirk worth knowing: this shield's LEDs are **active-low** (`LOW` = on). The firmware already accounts for this (`LED_ON`/`LED_OFF` constants) - if you're using a different shield, check this first if the LEDs seem inverted.

## 2. Node-RED

Run it in Docker, with the dashboard palette installed:

```bash
docker run -d --name aftershock-node-red -p 1880:1880 \
  -v "$(pwd)/node-red/data:/data" \
  nodered/node-red:latest

docker exec aftershock-node-red sh -c \
  "cd /data && npm install @flowfuse/node-red-dashboard --no-audit --no-fund"

docker restart aftershock-node-red
```

Because the flow is already committed at `node-red/data/flows.json`, mounting that folder as `/data` loads it automatically - you don't need to rebuild it by hand. If you'd rather import it manually instead: open `http://localhost:1880`, use the editor menu → **Import**, and paste in `node-red/data/flows.json`.

Once it's running:

- **Editor**: `http://<host>:1880`
- **Dashboard**: `http://<host>:1880/dashboard`

You need to update one thing so Node-RED knows where your Arduino is:

- The `chg_alert_url` node (sends `/alert?level=N`) and the dashboard's "Resolve Incident" button both hardcode the Arduino's IP. Edit them to match the IP your Arduino printed in step 1.

| Endpoint | Method | Purpose |
|---|---|---|
| `/aftershock/telemetry` | POST | Arduino → Node-RED: potentiometer threshold, current alert state. |
| `/aftershock/felt-report` | POST | Incident report, from the phone or the Arduino's button. |
| `/aftershock/resolve` | POST | Arduino → Node-RED: an alert was resolved locally. |
| `/aftershock/config` | GET | Node-RED → phone: current sensitivity threshold. |

The correlation logic queries the live USGS API using the incident's own coordinates (100km / 15 minutes), rather than a generic, pre-polled list - the same query only happens once real coordinates exist, so the dashboard never shows a placeholder location as if it were real.

## 3. Phone app

```bash
npm install
```

Edit `src/config.ts` and point `NODE_RED_BASE_URL` at your Node-RED host (e.g. `http://192.168.1.246:1880`), then:

```bash
npm start
```

Scan the QR code with Expo Go. You'll be asked for location permission on first launch.

To test the impact-detection flow without actually dropping your phone, use the **Simulate Incident** button in the app - it triggers the same countdown → report pipeline as a real detected impact.

### Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` | Start and open on Android |
| `npm run ios` | Start and open on iOS |
| `npm run web` | Start and open in a browser |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler in check-only mode |

### Libraries used

- [Expo](https://docs.expo.dev/) (managed workflow, SDK 57), tested through **Expo Go**
- [expo-location](https://docs.expo.dev/versions/latest/sdk/location/) - foreground location + accuracy
- [expo-sensors](https://docs.expo.dev/versions/latest/sdk/sensors/) - `Accelerometer`, for both the Sensor Panel and impact detection
- [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) - local incident queue (works offline, retries automatically)
- [expo-status-bar](https://docs.expo.dev/versions/latest/sdk/status-bar/)
- [react-native-svg](https://github.com/software-mansion/react-native-svg) - Sensor Panel visualization
- [NativeWind](https://www.nativewind.dev/) + [Tailwind CSS](https://tailwindcss.com/) - styling
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) / `react-native-worklets` - required peer dependency of NativeWind, not used directly
- [react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context)
- TypeScript, ESLint (`eslint-config-expo`), Prettier

## Troubleshooting

- **Phone can't reach Node-RED / requests hang**: confirm the phone, the Node-RED host, and the Arduino are all on the same Wi-Fi/LAN, and that `NODE_RED_BASE_URL` in `src/config.ts` matches the host's actual LAN IP (not `localhost`). Fetches to Node-RED time out after 8s rather than hanging indefinitely.
- **Dashboard shows "Waiting for a phone location..."**: expected until the first incident report with real coordinates arrives - it deliberately never falls back to a placeholder location.
- **Arduino LEDs behave backwards**: check the active-low note in the Arduino section above.
- **"No response from server" in Node-RED logs right after a (re)deploy or container restart**: a harmless transient - networking briefly isn't ready yet; it clears on the next request.
