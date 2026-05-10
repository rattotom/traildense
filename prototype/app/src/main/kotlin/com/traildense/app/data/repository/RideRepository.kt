package com.traildense.app.data.repository

import com.traildense.app.data.db.RideDao
import com.traildense.app.data.db.TrackPointDao
import com.traildense.app.data.model.Ride
import com.traildense.app.data.model.RideStatus
import com.traildense.app.data.model.TrackPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.*

data class RideMetrics(
    val rideId: Long = -1,
    val status: RideStatus = RideStatus.RECORDING,
    val distanceMeters: Float = 0f,
    val elapsedSeconds: Long = 0L,
    val elevationGainMeters: Float = 0f,
    val currentSpeedKph: Float = 0f,
    val avgSpeedKph: Float = 0f,
    val maxSpeedKph: Float = 0f,
    val isActive: Boolean = false
)

@Singleton
class RideRepository @Inject constructor(
    private val rideDao: RideDao,
    private val trackPointDao: TrackPointDao
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _metrics = MutableStateFlow(RideMetrics())
    val metrics: StateFlow<RideMetrics> = _metrics.asStateFlow()

    private var currentRide: Ride? = null
    private var lastPoint: TrackPoint? = null
    private var rideStartMs: Long = 0L
    private var pauseAccumulatedMs: Long = 0L
    private var pauseStartMs: Long = 0L

    fun startRide() {
        scope.launch {
            val ride = Ride()
            val id = rideDao.insert(ride)
            currentRide = ride.copy(id = id)
            rideStartMs = System.currentTimeMillis()
            pauseAccumulatedMs = 0L
            lastPoint = null
            _metrics.value = RideMetrics(rideId = id, status = RideStatus.RECORDING, isActive = true)
        }
    }

    fun pauseRide() {
        pauseStartMs = System.currentTimeMillis()
        currentRide?.let { ride ->
            val updated = ride.copy(status = RideStatus.PAUSED)
            currentRide = updated
            scope.launch { rideDao.update(updated) }
        }
        _metrics.value = _metrics.value.copy(status = RideStatus.PAUSED)
    }

    fun resumeRide() {
        if (pauseStartMs > 0) {
            pauseAccumulatedMs += System.currentTimeMillis() - pauseStartMs
            pauseStartMs = 0L
        }
        currentRide?.let { ride ->
            val updated = ride.copy(status = RideStatus.RECORDING)
            currentRide = updated
            scope.launch { rideDao.update(updated) }
        }
        _metrics.value = _metrics.value.copy(status = RideStatus.RECORDING)
    }

    fun stopRide() {
        currentRide?.let { ride ->
            val m = _metrics.value
            val updated = ride.copy(
                status = RideStatus.COMPLETED,
                endedAt = System.currentTimeMillis(),
                distanceMeters = m.distanceMeters,
                elevationGainMeters = m.elevationGainMeters,
                maxSpeedKph = m.maxSpeedKph
            )
            currentRide = updated
            scope.launch { rideDao.update(updated) }
        }
        _metrics.value = _metrics.value.copy(status = RideStatus.COMPLETED, isActive = false)
    }

    fun addPoint(lat: Double, lon: Double, altM: Double, accM: Float, speedMps: Float) {
        val ride = currentRide ?: return
        if (_metrics.value.status != RideStatus.RECORDING) return

        val prev = lastPoint
        val point = TrackPoint(
            rideId = ride.id,
            latitude = lat,
            longitude = lon,
            altitudeMeters = altM,
            accuracyMeters = accM,
            speedMps = speedMps
        )

        var addedDist = 0f
        var addedElev = 0f

        if (prev != null) {
            val dist = haversineMeters(prev.latitude, prev.longitude, lat, lon)
            if (dist > 200f) return   // GPS jump filter
            addedDist = dist
            val elvDiff = (altM - prev.altitudeMeters).toFloat()
            if (elvDiff > 0) addedElev = elvDiff
        }

        lastPoint = point
        scope.launch { trackPointDao.insert(point) }

        val m = _metrics.value
        val newDist = m.distanceMeters + addedDist
        val newElev = m.elevationGainMeters + addedElev
        val speedKph = speedMps * 3.6f
        val newMax = maxOf(m.maxSpeedKph, speedKph)
        val elapsedSec = (System.currentTimeMillis() - rideStartMs - pauseAccumulatedMs) / 1000L
        val avgKph = if (elapsedSec > 0) (newDist / elapsedSec.toFloat()) * 3.6f else 0f

        _metrics.value = m.copy(
            distanceMeters = newDist,
            elevationGainMeters = newElev,
            currentSpeedKph = speedKph,
            avgSpeedKph = avgKph,
            maxSpeedKph = newMax,
            elapsedSeconds = elapsedSec
        )
    }

    fun tickElapsed() {
        val m = _metrics.value
        if (m.status != RideStatus.RECORDING) return
        val elapsedSec = (System.currentTimeMillis() - rideStartMs - pauseAccumulatedMs) / 1000L
        _metrics.value = m.copy(elapsedSeconds = elapsedSec)
    }

    private fun haversineMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Float {
        val r = 6_371_000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
        return (2 * r * asin(sqrt(a))).toFloat()
    }
}
