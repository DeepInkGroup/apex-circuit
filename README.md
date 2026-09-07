# Deep Racing — Race Hub

A self-contained browser racing game with twelve circuits, an intelligent race engineer, solo practice, AI races, qualifying-based online rooms, and multiplayer for up to eight drivers. No external assets, API keys, or runtime npm dependencies.

The static build is published at `https://deepinkgroup.github.io/apex-circuit/`. GitHub Pages runs every circuit, time attack, AI rivals, ghosts, medals, lap history, touch controls, and the follow camera in the browser. Online rooms need a running server because GitHub Pages cannot execute Node.js; connect the Pages UI to a deployed `server.js` address from the Online rooms tab.

## Start

Install Node.js 20 or newer. Double-click **START GAME.cmd**, or run `node server.js`, then open **http://localhost:3000**. The launcher opens your browser and reuses an already-running Harbor Run server.

## Race Hub update

- **Event-first home page:** choose Practice, AI Race, or Online Race before configuring the event. The selected format reveals its circuit, distance, opponent, server, and garage controls while the home page stays focused and easy to scan.
- **Twelve circuits:** Aurora Icefield, Sakura Circuit, Marina Grand Prix, Crimson Caldera, and Obsidian Pass join the original destinations. Every circuit has its own geometry, colors, atmosphere, personal bests, ghosts, and lap history.
- **Qualifying and grid:** online rooms run qualifying before the race. The fastest valid lap takes pole, the grid locks in qualifying order, and the host releases the field from that grid.
- **Intelligent race engineering:** the engineer creates a tailored setup for each circuit. Drivers can still choose Qualifying, Balanced, Race, or Wet presets and tune nine parameters. Live analysis reports top speed, cornering, stability, tyre life, and understeer/neutral/rotation balance.
- **Tyre degradation:** compounds now trade peak grip for life. Pressure, speed, slip, and compound affect wear; worn tyres progressively reduce available grip and the HUD reports remaining tyre life.
- **Correct starting grid:** all eight grid slots alternate sides in four rows, remain fully behind the timing line, and keep safe longitudinal and lateral separation on every circuit.
- **Improved handling:** suspension, anti-roll stiffness, steering ratio, tyre pressure, and differential now shape turn-in, lateral grip, yaw response, kerb control, wheelspin, and the tyre temperature window. Handbrake rotation is progressive and retains more forward momentum.
- **Expanded race distance:** choose a one-lap shootout, 3-lap sprint, 5-lap Grand Prix, 10-lap endurance race, 15-lap marathon, or 20-lap full distance. The multiplayer API safely accepts 1–20 laps.
- **Four-wheel track-limit stewarding:** the white line is the circuit boundary and kerbs are outside it. An incident is recorded only when all four wheels leave the circuit. Practice laps are deleted; races issue a black-and-white warning at strike three and add five seconds at strike four and every later strike.
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

The white line defines the circuit edge. Kerbs do not count as part of the circuit, but a car remains legal while at least one wheel still contacts the track. Once all four wheels cross the line, the current lap is deleted. In races, the first two incidents are strikes, strike three shows the black-and-white warning, and strike four plus every later strike adds **5 seconds**. The incident rearms only after a wheel returns within the line, preventing repeated strikes during one excursion. Using recovery also invalidates the current lap. Invalid practice laps do not set a personal best or save a ghost. Cars are ghost cars and do not collide.

Solo practice pauses its simulation while the page is hidden. Multiplayer races continue on the server; input releases on blur and stale input stops applying. Disconnected clients leave the room after 30 seconds, and host control transfers to another driver. A page refresh creates a new session; ask the host to return to the lobby to rejoin.

## Play online from GitHub Pages

The GitHub Pages site is a static game client. It needs a separate public server for Online Race. The simplest path is a Render web service because this repository already includes `server.js` and the service reads Render's `PORT` variable automatically.

### Deploy the race server on Render

1. Create a [Render Web Service](https://dashboard.render.com/select-repo?type=web) and connect the `DeepInkGroup/apex-circuit` repository.
2. Use these settings:

   | Render field | Value |
   | --- | --- |
   | Runtime | Node |
   | Branch | `main` |
   | Build command | `npm install` |
   | Start command | `node server.js` |
   | Health check path | `/health` |
3. In **Environment**, create `ALLOWED_ORIGINS` with exactly `https://deepinkgroup.github.io`. Add your own custom game domain too, separated by commas, if you use one.
4. Deploy. Render provides an address similar to `https://your-race-server.onrender.com` when the deploy becomes live.
5. Open [Deep Racing on GitHub Pages](https://deepinkgroup.github.io/apex-circuit/), choose **Online Race**, paste that HTTPS address in **Multiplayer server**, and select **Connect**. The page remembers the address in that browser.
6. Create a room, share its six-character code, run qualifying, then lock the grid and start the race.

Render's Node web-service flow uses a build command, start command, environment variables, and a public `onrender.com` address as described in the [official Render documentation](https://render.com/docs/web-services). Rooms are held in memory, so use one service instance; restarting or redeploying the service clears active rooms.

### Play with friends on your network

1. Everyone opens the **same server address**.
2. Enter a driver name, choose a setup and race distance, then create a room.
3. Share the six-character code; other drivers enter it and select Join.
4. The host starts qualifying. Each driver sets a clean lap, the fastest valid lap takes pole, then the host locks the grid and starts the race.

On the same LAN/Wi-Fi, friends open `http://YOUR-PC-LAN-IP:3000` (find the IPv4 address with `ipconfig`). Windows Firewall must permit Node.js connections on the private network.

For another host, run this folder on a public Node.js or container service supporting long-lived HTTP connections. Start command: `node server.js`. The server listens on `0.0.0.0`, reads `PORT` (default 3000), and uses SSE for race snapshots. Disable reverse-proxy response buffering for `/events`, configure `ALLOWED_ORIGINS=https://deepinkgroup.github.io`, and use one server instance because rooms live in memory. Share the public HTTPS address and room code.

## Storage and checks

Practice ghosts and personal bests use a new track-specific browser storage key. Old oval records are not mixed with Harbor Run records. Rooms and multiplayer results reset when the server restarts.

- `npm test`: twelve-circuit geometry, starting-grid placement, timing, tyre degradation, four-wheel incident penalties, setup handling, stability, AI sprint, qualifying/grid multiplayer flow, and Pages asset paths.
- `npm run build:pages`: creates the static `dist/` folder used by GitHub Pages.
- `node drive-check.cjs`: complete clean laps driven using only throttle, brake, and steering by a test driver.
- `node browser-check.cjs`: Windows/Edge browser checks covering the event-first home page, all twelve renders, race-engineer setups, tyre analysis, desktop/mobile controls, ghost persistence, qualifying, locked grids, and two-player racing. This uses local test ports 3100 and 9235 and saves screenshots under `artifacts/`.

This remains a casual game prototype. Persistent accounts, public matchmaking, production anti-abuse controls and multi-server room storage are outside this version.
