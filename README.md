# Traildense Android MVP Blueprint

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

## Future Tasks / Backlog
- **Automate creator-application email delivery** — the `3d-website/` creator form currently dispatches submissions via a `mailto:` handoff that opens the visitor's mail client. Replace this with a real automated pipeline (Formspree / Web3Forms / EmailJS / a small serverless function) so applications land in `rattotom51@gmail.com` without requiring the visitor to hit send in their own mail app. Should preserve the existing structured payload (name, email, instagram, strava, region, device, riding cadence, reason, consent flags, build number, timestamp).
