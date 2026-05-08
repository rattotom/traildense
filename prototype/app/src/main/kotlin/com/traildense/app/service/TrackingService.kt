package com.traildense.app.service

import android.annotation.SuppressLint
import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.traildense.app.MainActivity
import com.traildense.app.R
import com.traildense.app.TraildenseApplication.Companion.TRACKING_CHANNEL_ID
import com.traildense.app.data.repository.RideRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject

@AndroidEntryPoint
class TrackingService : Service() {

    @Inject lateinit var repository: RideRepository

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    serviceScope.launch { repository.addTrackPoint(location) }
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> handleStart()
            ACTION_PAUSE -> serviceScope.launch { repository.pauseRide() }
            ACTION_RESUME -> serviceScope.launch { repository.resumeRide() }
            ACTION_STOP -> handleStop()
        }
        return START_STICKY
    }

    private fun handleStart() {
        startForeground(NOTIFICATION_ID, buildNotification())
        serviceScope.launch {
            repository.startNewRide()
            requestLocationUpdates()
        }
    }

    private fun handleStop() {
        serviceScope.launch {
            repository.stopRide()
            if (::locationCallback.isInitialized) {
                fusedLocationClient.removeLocationUpdates(locationCallback)
            }
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    @SuppressLint("MissingPermission")
    private fun requestLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, LOCATION_INTERVAL_MS)
            .setMinUpdateIntervalMillis(LOCATION_FASTEST_INTERVAL_MS)
            .setMinUpdateDistanceMeters(MIN_DISTANCE_METERS)
            .build()
        fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
    }

    private fun buildNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, TRACKING_CHANNEL_ID)
            .setContentTitle("Traildense")
            .setContentText("Recording ride…")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        if (::locationCallback.isInitialized) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
    }

    companion object {
        const val ACTION_START = "com.traildense.app.ACTION_START"
        const val ACTION_PAUSE = "com.traildense.app.ACTION_PAUSE"
        const val ACTION_RESUME = "com.traildense.app.ACTION_RESUME"
        const val ACTION_STOP = "com.traildense.app.ACTION_STOP"
        private const val NOTIFICATION_ID = 1001
        private const val LOCATION_INTERVAL_MS = 2000L
        private const val LOCATION_FASTEST_INTERVAL_MS = 1000L
        private const val MIN_DISTANCE_METERS = 5f
    }
}
