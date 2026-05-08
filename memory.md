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
