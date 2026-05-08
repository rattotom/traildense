package com.traildense.app.data.repository

import android.location.Location
import com.traildense.app.data.db.RideDao
import com.traildense.app.data.db.TrackPointDao
import com.traildense.app.data.model.Ride
import com.traildense.app.data.model.RideStatus
import com.traildense.app.data.model.TrackPoint
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

data class RideMetrics(
    val rideId: Long = -1L,
    val status: RideStatus = RideStatus.RECORDING,
    val distanceMeters: Double = 0.0,
    val elapsedSeconds: Long = 0L,
    val elevationGainMeters: Double = 0.0,
    val currentSpeedMs: Float = 0f,
    val avgSpeedMs: Float = 0f,
    val maxSpeedMs: Float = 0f,
    val currentLatitude: Double = 0.0,
    val currentLongitude: Double = 0.0
) {
    val isActive: Boolean get() = rideId != -1L && status != RideStatus.COMPLETED
}

@Singleton
class RideRepository @Inject constructor(
    private val rideDao: RideDao,
    private val trackPointDao: TrackPointDao
) {
    private val _metrics = MutableStateFlow(RideMetrics())
    val metrics: StateFlow<RideMetrics> = _metrics.asStateFlow()

    private var currentRideId = -1L
    private var rideStartTime = 0L
    private var pausedDurationMs = 0L
    private var pauseStartTime = 0L
    private var lastLocation: Location? = null
    private var totalDistanceM = 0.0
    private var totalElevationGainM = 0.0
    private var maxSpeedMs = 0f
    private var lastAltitude: Double? = null

    suspend fun startNewRide(): Long {
        val ride = Ride(startTime = System.currentTimeMillis())
        currentRideId = rideDao.insert(ride)
        rideStartTime = System.currentTimeMillis()
        pausedDurationMs = 0L
        pauseStartTime = 0L
        totalDistanceM = 0.0
        totalElevationGainM = 0.0
        maxSpeedMs = 0f
        lastLocation = null
        lastAltitude = null
        _metrics.value = RideMetrics(rideId = currentRideId, status = RideStatus.RECORDING)
        return currentRideId
    }

    suspend fun pauseRide() {
        val rideId = currentRideId.takeIf { it != -1L } ?: return
        pauseStartTime = System.currentTimeMillis()
        rideDao.getById(rideId)?.let { rideDao.update(it.copy(status = RideStatus.PAUSED)) }
        _metrics.value = _metrics.value.copy(status = RideStatus.PAUSED)
    }

    suspend fun resumeRide() {
        val rideId = currentRideId.takeIf { it != -1L } ?: return
        if (pauseStartTime > 0L) {
            pausedDurationMs += System.currentTimeMillis() - pauseStartTime
            pauseStartTime = 0L
        }
        rideDao.getById(rideId)?.let { rideDao.update(it.copy(status = RideStatus.RECORDING)) }
        _metrics.value = _metrics.value.copy(status = RideStatus.RECORDING)
    }

    suspend fun stopRide(): Ride? {
        val rideId = currentRideId.takeIf { it != -1L } ?: return null
        val ride = rideDao.getById(rideId) ?: return null
        val completed = ride.copy(
            endTime = System.currentTimeMillis(),
            status = RideStatus.COMPLETED,
            distanceMeters = totalDistanceM,
            elevationGainMeters = totalElevationGainM,
            maxSpeedMs = maxSpeedMs
        )
        rideDao.update(completed)
        _metrics.value = _metrics.value.copy(status = RideStatus.COMPLETED)
        currentRideId = -1L
        return completed
    }

    suspend fun addTrackPoint(location: Location) {
        val rideId = currentRideId.takeIf { it != -1L } ?: return
        if (_metrics.value.status == RideStatus.PAUSED) return

        trackPointDao.insert(
            TrackPoint(
                rideId = rideId,
                latitude = location.latitude,
                longitude = location.longitude,
                altitude = location.altitude,
                accuracy = location.accuracy,
                speedMs = location.speed
            )
        )

        lastLocation?.let { prev ->
            val segment = prev.distanceTo(location).toDouble()
            // Ignore jumps larger than 200m — likely GPS error
            if (segment < 200.0) totalDistanceM += segment
        }
        lastLocation = location

        lastAltitude?.let { prevAlt ->
            val gain = location.altitude - prevAlt
            if (gain > 0.0) totalElevationGainM += gain
        }
        lastAltitude = location.altitude

        if (location.speed > maxSpeedMs) maxSpeedMs = location.speed

        val elapsedMs = System.currentTimeMillis() - rideStartTime - pausedDurationMs
        val elapsedSec = elapsedMs / 1000L
        val avgSpeed = if (elapsedSec > 0) (totalDistanceM / elapsedSec).toFloat() else 0f

        _metrics.value = RideMetrics(
            rideId = rideId,
            status = RideStatus.RECORDING,
            distanceMeters = totalDistanceM,
            elapsedSeconds = elapsedSec,
            elevationGainMeters = totalElevationGainM,
            currentSpeedMs = location.speed,
            avgSpeedMs = avgSpeed,
            maxSpeedMs = maxSpeedMs,
            currentLatitude = location.latitude,
            currentLongitude = location.longitude
        )
    }

    fun getCurrentRideId(): Long = currentRideId
}
