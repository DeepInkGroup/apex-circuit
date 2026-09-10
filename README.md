# Deep Racing — Race Hub

A self-contained browser racing game with sixteen circuits, an intelligent race engineer, solo practice, AI races, qualifying-based online rooms, and multiplayer for up to eight drivers. No external assets, API keys, or runtime npm dependencies.

The static build is published at `https://deepinkgroup.github.io/apex-circuit/`. GitHub Pages runs every circuit, time attack, AI rivals, ghosts, medals, lap history, keyboard, touch, PlayStation and Xbox controller input, and all four cameras in the browser. Online rooms need a running server because GitHub Pages cannot execute Node.js; connect the Pages UI to a deployed `server.js` address from the Online rooms tab.

## Start

Install Node.js 20 or newer. Double-click **START GAME.cmd**, or run `node server.js`, then open **http://localhost:3000**. The launcher opens your browser and reuses an already-running Harbor Run server.

## Race Hub update

- **Apex Dynamics handling:** speed-sensitive steering, smoother pedal response, progressive kerb-to-grass grip, and calmer yaw recovery make the car easier to place without removing the setup differences.
- **Racing-line guide:** the centre dots are replaced by an offset driving line with direction arrows and green push, amber lift, and red braking zones calculated from each circuit's next corner.
- **Stable cameras:** chase and cinematic cameras now use the visible car position for look-ahead and account for camera rotation when clamping to circuit boundaries, eliminating edge jumps and exposed corners.
- **Layered sound:** gear-aware engine RPM drives separate engine, harmonic, bass, intake-filter, and road-noise layers, with extra surface sound when the car leaves the asphalt.
- **Clean circuit edges:** the repeated rounded colour-and-white edge markers are removed from every circuit while the continuous white track-limit boundary remains clearly visible.
- **Tyre Lab:** front and rear pressures are tuned independently in 0.1 PSI steps. Each axle now develops its own temperature, wear, and available grip from steering, braking, throttle, slip, compound, pressure, camber, and toe.
- **Brake cooling:** adjustable brake ducts trade straight-line efficiency for cooling. Sustained heat can now produce brake fade, and live car status warns the driver when the brakes overheat.
- **Onboard cockpit:** the heading-locked camera now adds a detailed open-wheel nose, front wing, treaded steering tyres, suspension arms, mirrors, halo, steering wheel, driver gloves, shift lights, gear display, speed display, motion, and speed-sensitive vibration.
- **Race HUD:** a new timing and driver display gives gear and speed more space, adds live throttle/brake traces, exposes brake temperature, and groups tyre, damage, and track-limit status into clearer cards.
- **Two new worlds:** Copper Works is an orange-lit industrial sprint around foundries, tanks, and pipelines. Lotus Delta has been rebuilt into a 3.60 km night race across three river channels, linked switchbacks, lantern structures, and a flat-out levee return.
- **Guided race-weekend flow:** choose Practice, AI Race, or Online Race, select a Grand Prix, then enter your driver name and engineer the car. Locking the setup opens the circuit and removes the garage controls so the live map becomes the focus.
- **Four rebuilt circuits:** Neon Metro now runs through fast boulevards and a railway hairpin, Zenith Hills climbs through a new summit sequence, Aurora Icefield combines a polar straight with glacier sweepers, and Obsidian Pass is a new three-stack canyon challenge. Each has new scenery, corner labels, geometry, and a circuit-specific setup target.
- **Sixteen circuits:** Titan Ridge and Vesper Coast remain the long expert Grand Tours, joined by the industrial Copper Works sprint and the completely rebuilt Lotus Delta night endurance course.
- **Qualifying and grid:** online rooms run qualifying before the race. The fastest valid lap takes pole, the grid locks in qualifying order, and the host releases the field from that grid.
- **Intelligent race engineering:** the engineer creates a tailored setup for each circuit. Drivers can choose Qualifying, Balanced, Race, or Wet presets and tune twenty-two parameters, including separate power-on and coast differentials, front/rear wings, individual axle pressures, toe, brake pressure and cooling, engine braking, ride height, camber, gearing, suspension, and tyres. Live analysis reports top speed, cornering, stability, tyre life, and understeer/neutral/rotation balance.
- **PlayStation and Xbox controllers:** connect by USB or Bluetooth and use the left stick to steer. R2/RT controls throttle, L2/LT controls brake, Cross/Square or A/X controls the handbrake, and Triangle/Y recovers the car. Analog stick and trigger travel feed directly into Practice, AI Race, and Online Race.
- **Setup diagnostics:** the garage now renders a detailed top-down open-wheel model with floor, sidepods, halo, suspension, steering toe, wing span, front/rear load bars, differential split, pressure, platform height, and camber. The circuit engineer produces a 100% track-matched baseline that remains fully adjustable.
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
- **Three cameras:** cycle between the full-circuit Overview, responsive Chase, and wider Cinematic corner camera. Speed-sensitive zoom, look-ahead, chassis motion, impact shake, and subtle camera roll keep the car readable.
- **Live circuit map:** automatically fits every circuit and shows the start line, sector splits, heavy braking corners, driver heading, and current lap progress.
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
| C | Cycle Overview / Chase / Cinematic camera |
| L | Guide dots |
| G | Personal-best ghost |
| M | Engine sound |

Touch controls appear on phones and touch devices. DualShock 4, DualSense, Xbox One, and Xbox Series controllers work through the browser Gamepad API after any controller button is pressed. Buttons in the circuit toolbar also control the camera, guide, ghost, sound and fullscreen.

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
2. Choose Online Race, select the Grand Prix, enter a driver name, choose the distance and setup, then lock the setup and create a room from the circuit screen.
3. Share the six-character code; other drivers enter it and select Join.
4. The host starts qualifying. Each driver sets a clean lap, the fastest valid lap takes pole, then the host locks the grid and starts the race.

On the same LAN/Wi-Fi, friends open `http://YOUR-PC-LAN-IP:3000` (find the IPv4 address with `ipconfig`). Windows Firewall must permit Node.js connections on the private network.

For another host, run this folder on a public Node.js or container service supporting long-lived HTTP connections. Start command: `node server.js`. The server listens on `0.0.0.0`, reads `PORT` (default 3000), and uses SSE for race snapshots. Disable reverse-proxy response buffering for `/events`, configure `ALLOWED_ORIGINS=https://deepinkgroup.github.io`, and use one server instance because rooms live in memory. Share the public HTTPS address and room code.

## Storage and checks

Practice ghosts and personal bests use a new track-specific browser storage key. Old oval records are not mixed with Harbor Run records. Rooms and multiplayer results reset when the server restarts.

- `npm test`: sixteen-circuit geometry and distance, starting-grid placement, timing, tyre degradation, four-wheel incident penalties, analog controller handling, setup handling, stability, AI sprint, qualifying/grid multiplayer flow, and Pages asset paths.
- `npm run build:pages`: creates the static `dist/` folder used by GitHub Pages.
- `node drive-check.cjs`: complete clean laps driven using only throttle, brake, and steering by a test driver.
- `node browser-check.cjs`: Windows/Edge browser checks covering all four cameras, DualSense and Xbox analog input, setup diagnostics, fullscreen circuit map, all sixteen renders, desktop/mobile controls, ghost persistence, qualifying, locked grids, and two-player racing. This uses local test ports 3100 and 9235 and saves screenshots under `artifacts/`.

This remains a casual game prototype. Persistent accounts, public matchmaking, production anti-abuse controls and multi-server room storage are outside this version.
