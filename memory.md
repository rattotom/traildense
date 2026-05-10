# Traildense Dev Memory

## Session 1

### Done
- Read README.md — MVP blueprint defined (6-week sequence, Kotlin + Compose + MapLibre + Room + Hilt)
- Built Week 1 Android prototype in `/workspace/traildense-android/` (separate from main repo)

### Prototype structure (`/workspace/traildense-android/`)
- **Build:** AGP 8.3.0 / Kotlin 1.9.22 / Compose BOM 2024.02.02 / Gradle 8.6
- **Data layer:** Room DB with `Ride` + `TrackPoint` entities, Hilt DI module
- **RideRepository:** singleton StateFlow of `RideMetrics`, handles start/pause/resume/stop, distance + elevation gain calc, GPS jump filter (>200m ignored)
- **TrackingService:** foreground service (type=location), FusedLocationProvider @ 2s/5m intervals, responds to START/PAUSE/RESUME/STOP intents
- **UI:** MapLibreView (OpenFreeMap Liberty style, lifecycle-aware), RideHud (distance, time, elevation, speed/avg/max, pause+stop buttons), PostRideScreen (summary + upload stub)
- **Nav:** map → post_ride on ride complete
- **Map style URL:** `https://tiles.openfreemap.org/styles/liberty` (free, no API key)

### Decisions
- Prototype kept out of main repo per user request
- minSdk 26 (Android 8) — covers >95% of active devices
- GPS jump filter: ignore segments >200m to handle brief signal loss
- Upload button is a stub — wired up in Week 2 (server + road filtering)

### Pending / Next
- Week 2: server upload endpoint, road filtering pipeline (OSM comparison), confidence scoring
- Need gradle wrapper JAR to build — user runs `gradle wrapper` once in `/workspace/traildense-android/`
- Launcher icons are vector placeholders — replace with proper assets before creator APK
- PostRideScreen upload button is a no-op stub

---

## Session 2 — 2026-05-09 / 2026-05-10

### Done — 3D marketing website (`3d-website/`)
- Built a fully 3D static site at `3d-website/` on branch `claude/3d-website-prototype-version-1`. Three files: `index.html`, `style.css`, `main.js`. Three.js loaded from unpkg via importmap, no build step. Open `index.html` directly in a browser.
- **Aesthetic** (intended to carry into the mobile apps): topographic / cartographic — `--ink-deep #08090a`, `--bone #efe7d3`, `--kraft #c9b88a`, `--moss #4a5a3e`, `--blaze #ff4d1c`, `--rust #c63d2f`. Fonts: Big Shoulders Display (display), Instrument Serif (italic accents), Bricolage Grotesque (body), JetBrains Mono (data) — all Google Fonts.
- **TerrainScene:** procedural Cascade-foothills heightfield from layered simplex noise on a 320×320 plane (220×220 segments). Custom GLSL fragment shader computes per-fragment topographic contour lines (minor + every-fifth major + accent at peaks), Lambertian sun lighting, exp² fog. Floor of subtle wireframe overlay for extra topo feel.
- **Trails:** 14 procedural CatmullRom curves that follow terrain gradients (cheap "trail follows contour" approximation), rendered as TubeGeometry with custom shader containing animated highlight pulse. Density-bucket-coded colors (`low/mid/high/hot`) match the legend swatches.
- **DeviceScene:** second canvas with a 3D Pixel-style phone — rounded box body, MeshBasicMaterial screen plane bound to a `CanvasTexture` that gets re-drawn each frame with a live HUD (animated topo map, recording trail, distance/elapsed/speed/climb numbers in brand fonts). Pointer-tracking parallax tilt.
- **Scroll-driven camera:** 7 keyframe stops, smoothstep-eased lerp on scroll progress, plus atmospheric sway.

### Done — interactive layer
- **Custom cursor:** bone SVG crosshair + blaze dot, `mix-blend-mode: difference`, three states (`is-link`, `is-card`, `is-pressed`), live coord readout derived from screen-space mouse position. Disabled on touch via `(hover: hover) and (pointer: fine)`.
- **Floaters class** (added to background scene): six small 3D objects above the terrain that react to cursor — compass with mouse-tracking needle, wireframe tetrahedron peak, three concentric tori (rings), GPS pin with pulsing halos, coordinate crosshair, striped survey rod. Each item has its own `userData.type` switch in the update loop. Proximity is computed by projecting world position into screen space and measuring pixel distance to mouse.
- **CharField class:** splits text into per-character `<span>`s and applies 3D `translate3d + rotateX + rotateY` toward the cursor within a falloff range. Applied to hero title TRAIL/DENSE (range 240, lift 70), the `<i>where the line</i>` italic (subtler), and section tags (smallest).
- **attachHeadingTilt:** big section H2/H3 headings get a single perspective rotateX/rotateY toward cursor.
- **attachTilt:** card-level 3D tilt with `transform-style: preserve-3d` parents and `translateZ` on children. Wired to `.card`, `.datacard`, and the device readout boxes.
- **attachMagnetic:** CTAs drift toward cursor when within ~225px (topbar "Become a creator" + form submit button).
- **attachLegend:** hovering a density bucket in the legend dims trails of other buckets via lerped `uOpacity` uniform.
- **Removed** (per user feedback): terrain shader pointer halo, click shockwave rings (`uPointer`/`uPulses` uniforms + raycaster + ground-plane projection + DOM `.click-ring`). The earlier coord-from-raycast lookup in cursor was replaced with a pure screen-space derivation.

### Done — creator application form
- Multi-row creator form in the `§ 07 — enlistment` section. Fields: name, email, instagram (auto-prefixed with `@` on blur), strava/komoot, region, device, weekly riding, "why you" textarea, GPS-recording consent (required), weekly-notes opt-in (optional).
- Validation: required-field check, email regex, consent gate. Invalid submit triggers an `element.animate` shake.
- **Submission via `mailto:` handoff** — recipient is `rattotom51@gmail.com`. JS builds a structured plain-text body (APPLICANT / RIDING / WHY YOU / CONSENT sections, padded key-value rows) and a subject `Creator application — [Name] · build #NNN`. Mail client opens with everything pre-filled.
- **Success state:** echoes the submitter's email back, shows the build number, includes two fallback buttons — "re-open in mail client" (re-fires the same `mailto:`) and "copy details" (writes `To/Subject/Body` to clipboard via `navigator.clipboard`, with a 2.4s "copied" feedback state).
- Added an entry to **Future Tasks / Backlog** in the root `README.md` to swap `mailto:` for an automated pipeline (Formspree / Web3Forms / EmailJS / serverless function), preserving the existing payload contract.

## Session 3

### Done
- Full Week 1 prototype recode in `prototype/` — user had deleted the old one
- Branch: `claude/week1-prototype-recode`
- All 34 files written fresh with corrected brand theme + MapLibre 11 imports

### Key changes vs old prototype
- MapLibre 11: `org.maplibre.gl` package (not `com.mapbox.mapboxsdk`)
- MapLibre.getInstance() called in Application.onCreate()
- Fonts: Google Fonts runtime provider (no font files needed) — Big Shoulders Display + JetBrains Mono
- Navigation: state-based in MainActivity (Screen.Map / Screen.PostRide), no nav-compose graph
- Metrics passed through onRideComplete lambda (rideId, distM, elapsedSec, elevM, maxKph, avgKph)
- font_certs.xml: GMS provider certificates for downloadable fonts
- Gradle: AGP 8.3.2, Kotlin 1.9.23, KSP 1.9.23-1.0.20, Compose BOM 2024.05.00, Gradle 8.7

### Pending
- User must run `gradle wrapper` once in `prototype/` before first build (or open in Android Studio)
- Week 2: Retrofit upload client, UploadWorker, server endpoint
- PostRideScreen upload button is a no-op stub

---

### In flight — full Android + iOS port
- User requested: full Android app covering all 6 weeks of the MVP build sequence, then port to iOS. Both apps in separate top-level folders (`android/` and `ios/`). Should reuse the website's topographic theme.
- Android Week 1 already exists at `prototype/` — Kotlin · Compose · Room · Hilt · MapLibre · foreground TrackingService. Plan is to rename `prototype/` → `android/` then layer on Weeks 2–6.
- iOS will be a SwiftUI app mirroring the architecture (CoreLocation tracking service, SwiftData persistence, MapLibre Native iOS, RideHUD view).
- **Implementation queued in TODOs but not started** — interrupted while helping the user resolve an Android Studio "create new module" dialog that was conflicting with the existing `prototype/app/` folder. Resolution: cancel the New Module dialog, use File → Open on the `prototype/` folder, wait for Gradle import to finish.
- For Android Studio, the matching project settings are: Application name `Traildense`, Module `app`, Package `com.traildense.app`, Language Kotlin, minSdk API 24 (Nougat), Build Configuration **Kotlin DSL** (project uses `.kts` files exclusively).

### Decisions / preferences observed
- User wants TERSE, plain answers when troubleshooting tooling — drop explanations, just give exact values to type / steps to take.
- "Make no mistakes" was an aspiration; user accepts that mobile builds need iteration since I can't compile/run Gradle or Xcode from here.
- Custom-cursor interactivity is a yes; mouse-reactive terrain shaders / click ripples were a no (felt like too much).
- Website aesthetic is the canonical brand direction — port it to Android Compose theme + iOS SwiftUI when building the apps.

### Pending / Next
- Move `prototype/` → `android/` once user confirms Gradle sync is clean.
- Update Android Compose theme (`Color.kt`, `Type.kt`, `Theme.kt`) to match website palette + Compose Google Fonts for Big Shoulders Display / Instrument Serif / Bricolage Grotesque / JetBrains Mono.
- Week 2 Android: Retrofit upload client + DTOs + UploadWorker + sync repo + networking DI module.
- Week 3–6 Android: topo style + offline MBTiles + region selector + storage dashboard + creator build flavor + telemetry/feedback + settings/polish.
- Scaffold `ios/` as a SwiftUI starter mirroring the Android architecture, with the same theme.
- Replace `mailto:` in 3D-website creator form with automated email pipeline.
