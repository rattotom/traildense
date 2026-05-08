# Traildense Android MVP Blueprint

## Prototype — Week 1

> **Location:** `../traildense-android/`

### What's Included

| Area | Files | Notes |
|------|-------|-------|
| Build config | `build.gradle.kts`, `settings.gradle.kts`, `gradle/libs.versions.toml` | AGP 8.3.0 · Kotlin 1.9.22 · Compose BOM 2024.02.02 |
| Data models | `data/model/Ride.kt`, `data/model/TrackPoint.kt` | Room entities with foreign key + cascade delete |
| Database | `data/db/AppDatabase.kt`, `RideDao.kt`, `TrackPointDao.kt`, `Converters.kt` | Room v2.6.1, enum type converter |
| Repository | `data/repository/RideRepository.kt` | Singleton `StateFlow<RideMetrics>`, live distance/elevation/speed calc, GPS jump filter |
| DI | `di/DatabaseModule.kt` | Hilt `SingletonComponent` providing DB and DAOs |
| Foreground service | `service/TrackingService.kt` | `foregroundServiceType="location"`, FusedLocationProvider at 2 s / 5 m intervals, START · PAUSE · RESUME · STOP intents |
| ViewModel | `ui/viewmodel/RideViewModel.kt` | Hilt ViewModel, exposes `StateFlow<RideMetrics>`, dispatches service intents |
| Map | `ui/component/MapLibreView.kt` | MapLibre Android SDK 11, OpenFreeMap Liberty style (no API key), lifecycle-aware, follows rider position |
| HUD | `ui/component/RideHud.kt` | Distance · time · elevation · speed/avg/max, one-handed pause + stop |
| Screens | `ui/screen/MapScreen.kt`, `ui/screen/PostRideScreen.kt` | Permission flow, ride summary, upload stub for Week 2 |
| Theme | `ui/theme/` | Dark-mode Material 3, trail-green palette |
| App entry | `MainActivity.kt`, `TraildenseApplication.kt` | Edge-to-edge, Compose nav graph, notification channel setup |
| Resources | `res/` | Adaptive launcher icon, monochrome notification icon, theme XML |

### How to Run

**Requirements:** Android Studio Hedgehog or newer · Android SDK 34 · JDK 17

```bash
# 1. Bootstrap the Gradle wrapper (one-time)
cd traildense-android
gradle wrapper

# 2. Build a debug APK
./gradlew assembleDebug

# 3. Install directly to a connected device or emulator
./gradlew installDebug
```

Or open `traildense-android/` as a project in Android Studio and hit **Run**.

**On first launch the app will request:**
- Fine location (`ACCESS_FINE_LOCATION`)
- Notifications (`POST_NOTIFICATIONS` — Android 13+)

For accurate GPS on a physical device, go to **Settings → Battery → Traildense → Unrestricted** to prevent the OS from throttling the foreground service.

### Current State (Week 1)
- ✅ Foreground service records GPS track to local Room database
- ✅ Live HUD — distance, elapsed time, elevation gain, current/avg/max speed
- ✅ Pause / resume / stop controls
- ✅ Post-ride summary screen
- ✅ MapLibre outdoor map following rider position
- 🔲 Server upload (Week 2)
- 🔲 Road filtering & confidence scoring (Week 2)
- 🔲 Topo / hillshade / contour layers (Week 3)
- 🔲 Offline tile caching (Week 3)

---

## Android-First Tech Stack
- **Language:** Kotlin (native Android)
- **UI Framework:** Jetpack Compose
- **Mapping Engine:** MapLibre Android SDK
- **Location Services:** FusedLocationProvider with foreground service for reliable background recording
- **Local Storage:** Room database combined with file provider for tile cache management
- **Sync & Networking:** WorkManager for background tasks, Retrofit for API communication
- **Monitoring:** Crash reporting and performance telemetry for creator builds

**Android-Specific Requirements:**
- Request fine location, foreground service, and notification permissions
- Prompt users to disable battery optimization for the app during onboarding
- Use high-accuracy location sampling to ensure trail precision

## Topographic Map Implementation
- **Base Layer:** Custom-styled vector tiles optimized for trail visibility and outdoor readability
- **Terrain Layer:** Hillshade raster tiles generated from elevation data to provide depth and contour context
- **Contour Lines:** Vector lines showing elevation intervals for route planning
- **Trail Density Layer:** Dynamic line styling that increases thickness and opacity based on recorded ride frequency
- **Tile Generation Pipeline:** Base maps, hillshade, contours, and aggregated trail data are processed into compressed MBTiles per region. Delta updates are pushed to avoid full re-downloads.
- **Offline Loading Strategy:** Cache base terrain and contours per region. Trail density tiles update independently. Detail levels are prioritized based on active recording vs. background viewing.

## Minimal Fitness UI/UX
- **Live HUD:** Persistent overlay showing distance, elapsed time, elevation gain, average speed, and maximum speed
- **Controls:** Simple pause, stop, and upload buttons positioned for one-handed use
- **Optional Recording Toggle:** Users can toggle off HUD elements or recording at the start of a ride for minimal distraction
- **Post-Ride Screen:** Summary of ride metrics, toggle to upload data to the public map, and option to save route locally for future replay features
- **Design Philosophy:** Glanceable, distraction-free interface focused on core metrics. Advanced fitness tracking, calories, and social features are deferred to later versions.

## Road Filtering Pipeline
- **Data Source:** OpenStreetMap road classifications are fetched and processed server-side
- **Filtering Logic:** Uploaded routes are compared against road networks. Segments overlapping with paved or primary roads are automatically removed using spatial buffering to account for GPS drift
- **Validation Heuristics:** Remaining segments are evaluated for elevation variance, GPS accuracy, and movement patterns typical of mountain biking
- **Confidence Scoring:** Trails are tagged as verified, pending, or low-confidence based on ride overlap and data quality
- **Edge Case Handling:** Fire roads and mixed-surface connectors are flagged separately and styled distinctly. Short GPS drift segments near roads are ignored to prevent false trails.

## Creator APK Testing Workflow
- **Build Configuration:** Dedicated debug builds with creator mode enabled, verbose logging, and hidden feedback tools
- **Distribution:** Secure hosting of APK files with version tracking and build metadata visible in the app
- **Tester Guidelines:** Clear instructions covering permissions, battery settings, assigned seed regions, and expected app behavior
- **Feedback Loop:** Automated crash reporting, GPS accuracy tracking, sync performance metrics, and a built-in issue submission form
- **Quality Gates:** Creators complete multiple rides in assigned regions before providing structured feedback. Weekly iteration cycles based on reported data.

## Offline Storage Strategy
- **Cache Management:** Transparent storage dashboard showing used space, available capacity, and region details
- **User Controls:** One-tap removal or compression of downloaded regions. Automatic archival of unused regions when storage thresholds are reached
- **Sync Optimization:** Background updates only fetch changed tiles. Sync is throttled to occur during charging, Wi-Fi connectivity, and device idle states
- **Data Efficiency:** Vector tiles are compressed and versioned. Metadata is retained even when tiles are archived to allow quick restoration.

## MVP Build Sequence
| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Location recording & foreground service | Stable ride capture with pause/resume and basic metrics |
| 2 | Server upload & road filtering | Clean trail aggregation, ride counting, and confidence scoring |
| 3 | Topo map styling & offline caching | Working terrain map, region selector, and tile management |
| 4 | HUD & post-ride flow | Minimal metrics overlay, upload toggle, and storage dashboard |
| 5 | Creator build & telemetry | Testable APK with logging, crash reporting, and feedback tools |
| 6 | Polish & regional beta | Creator testing in launch region, bug resolution, release prep |
