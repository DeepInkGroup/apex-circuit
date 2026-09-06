# Apex Circuit — World Tour

A self-contained browser racing game with three circuits, solo time attacks, AI sprint races, and multiplayer rooms for up to eight drivers. No external assets, API keys, or runtime npm dependencies.

The static build is published at `https://deepinkgroup.github.io/apex-circuit/`. GitHub Pages runs every circuit, time attack, AI rivals, ghosts, medals, lap history, touch controls, and the follow camera in the browser. Online rooms need a running server because GitHub Pages cannot execute Node.js; connect the Pages UI to a deployed `server.js` address from the Online rooms tab.

## Start

Install Node.js 20 or newer. Double-click **START GAME.cmd**, or run `node server.js`, then open **http://localhost:3000**. The launcher opens your browser and reuses an already-running Harbor Run server.

## World Tour update

- **Three circuits:** Harbor Run is technical and balanced, Alpine Crest links switchbacks and rhythm changes, and Sunset Speedway uses wide, fast desert sweepers. Each has separate procedural scenery, colors, road width, personal bests, ghosts, and lap history.
- **Expanded race distance:** choose a one-lap shootout, 3-lap sprint, 5-lap Grand Prix, 10-lap endurance race, 15-lap marathon, or 20-lap full distance. The multiplayer API safely accepts 1–20 laps.
- **Track-limit stewarding:** spending more than a brief moment beyond the legal road edge invalidates the lap and adds three seconds. A clean re-entry is required before another incident can be recorded. The HUD reports incidents and total penalty time.
- **Driver model:** progressive throttle and brake input, tire temperature and grip variation, traction-control intervention, ABS behavior on low-grip braking, longitudinal weight transfer, barrier-impact damage, and reduced performance after damage.
- **Track-aware multiplayer:** each room stores its circuit, and joining clients automatically load the host's circuit. Independent rooms can race different tracks at the same time.

## Earlier features

- **Harbor Run:** a technical circuit with a main straight, linked esses, a harbor hairpin, a forest loop, three timing sectors, and a pit complex.
- **Momentum and grip:** progressive steering, independent world-space velocity, rear slip, speed-sensitive cornering limits, braking load bias, curb grip and grass drag. This is approachable arcade handling, not a full tire simulation.
- **Handbrake:** briefly releases rear grip and helps rotate the car in tight corners. Release it to regain traction.
- **Personal-best ghost:** finish a clean practice lap to save a replay in your browser. The next lap races against that ghost. Sector splits show your progress against the best lap.
- **Visuals:** detailed cars, tire marks, dust, smoke, water, trees, pit buildings, grandstands and a new dashboard.
- **Follow camera:** a closer view with a minimap, enabled by default on phones. Switch to overview whenever you want.
- **Engine sound:** optional synthesized audio; off until enabled.
- **Online racing:** 3-lap sprints or 5-lap races, a countdown, smooth remote-car interpolation and results including penalties.
- **AI sprint mode:** three offline rivals with Rookie, Club, and Pro pace. It uses the same physics, sectors, track limits, penalties, and recovery system as the player car.
- **Race medals and history:** clean lap targets, a ten-lap local history, JSON export, and a chequered-flag results card.
- **GitHub Pages build:** relative asset paths, a static runtime configuration, a Pages Actions workflow, favicon, metadata, and a Pages-safe online-server connection form.

## Controls

| Control | Action |
| --- | --- |
| W / Up | Accelerate |
| S / Down | Brake; reverse at low speed |
| A / D or Left / Right | Steer |
| Space | Handbrake |
| R | Recover to the last safe track position; invalidates this lap |
| C | Follow camera / overview |
| L | Guide dots |
| G | Personal-best ghost |
| M | Engine sound |

Touch controls appear on phones and touch devices. Buttons in the circuit toolbar also control the camera, guide, ghost, sound and fullscreen.

## Timing and track limits

Cross the start line to begin your lap timer, then follow the guide dots around the full circuit. All three sectors must be completed. Reversing subtracts progress, and jumping between distant sections cannot award a lap.

Staying beyond the track edge for 0.28 seconds records a track-limit incident, invalidates the current lap, and adds **3 seconds** to race results. The incident remains armed until the car clearly rejoins, preventing repeated penalties while the same excursion continues. Using recovery also invalidates the current lap. Invalid practice laps do not set a personal best or save a ghost. Cars are ghost cars and do not collide. Final classification is settled when everyone finishes; a host can return a stuck race to the lobby.

Solo practice pauses its simulation while the page is hidden. Multiplayer races continue on the server; input releases on blur and stale input stops applying. Disconnected clients leave the room after 30 seconds, and host control transfers to another driver. A page refresh creates a new session; ask the host to return to the lobby to rejoin.

## Play with friends

1. Everyone opens the **same server address**.
2. Enter a driver name, choose 3 or 5 laps, and create a room.
3. Share the six-character code; other drivers enter it and select Join.
4. The host starts the race. The host can start a rematch or return everyone to the lobby.

On the same LAN/Wi-Fi, friends open `http://YOUR-PC-LAN-IP:3000` (find the IPv4 address with `ipconfig`). Windows Firewall must permit Node.js connections on the private network.

For internet play, run this folder on a public Node.js or container host supporting long-lived HTTP connections. Start command: `node server.js`. The server listens on `0.0.0.0`, reads `PORT` (default 3000), and uses SSE for race snapshots. Disable reverse-proxy response buffering for `/events`, configure `ALLOWED_ORIGINS=https://deepinkgroup.github.io`, and use one server instance because rooms live in memory. Share the public HTTPS address and room code. A separate public multiplayer server is not included in this local installation.

## Storage and checks

Practice ghosts and personal bests use a new track-specific browser storage key. Old oval records are not mixed with Harbor Run records. Rooms and multiplayer results reset when the server restarts.

- `npm test`: all-circuit geometry, timing, incident penalties, handling systems, stability, AI sprint, Pages asset paths, and track-aware multiplayer integration checks.
- `npm run build:pages`: creates the static `dist/` folder used by GitHub Pages.
- `node drive-check.cjs`: three complete clean laps on every circuit, driven using only throttle, brake, and steering by a test driver.
- `node browser-check.cjs`: optional Windows/Edge browser checks, including desktop/mobile render, controls, ghost persistence and two-player racing. This uses local test ports 3100 and 9235 and saves screenshots under `artifacts/`.

This remains a casual game prototype. Persistent accounts, public matchmaking, production anti-abuse controls and multi-server room storage are outside this version.
