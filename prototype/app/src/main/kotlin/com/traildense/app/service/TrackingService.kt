package com.traildense.app.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.traildense.app.MainActivity
import com.traildense.app.R
import com.traildense.app.data.repository.RideRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject

@AndroidEntryPoint
class TrackingService : Service() {

    companion object {
        const val ACTION_START  = "com.traildense.TRACKING_START"
        const val ACTION_PAUSE  = "com.traildense.TRACKING_PAUSE"
        const val ACTION_RESUME = "com.traildense.TRACKING_RESUME"
        const val ACTION_STOP   = "com.traildense.TRACKING_STOP"
        private const val CHANNEL_ID = "traildense_tracking"
        private const val NOTIF_ID   = 1
    }

    @Inject lateinit var repo: RideRepository

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var fusedClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var tickJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { loc ->
                    repo.addPoint(
                        lat    = loc.latitude,
                        lon    = loc.longitude,
                        altM   = loc.altitude,
                        accM   = loc.accuracy,
                        speedMps = loc.speed
                    )
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START  -> {
                startForeground(NOTIF_ID, buildNotification("Recording ride…"))
                repo.startRide()
                startLocationUpdates()
                startTick()
            }
            ACTION_PAUSE  -> {
                repo.pauseRide()
                updateNotification("Ride paused")
            }
            ACTION_RESUME -> {
                repo.resumeRide()
                updateNotification("Recording ride…")
            }
            ACTION_STOP   -> {
                repo.stopRide()
                stopLocationUpdates()
                tickJob?.cancel()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun startLocationUpdates() {
        val req = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 2_000L)
            .setMinUpdateDistanceMeters(5f)
            .build()
        try { fusedClient.requestLocationUpdates(req, locationCallback, mainLooper) } catch (_: SecurityException) {}
    }

    private fun stopLocationUpdates() {
        fusedClient.removeLocationUpdates(locationCallback)
    }

    private fun startTick() {
        tickJob = scope.launch {
            while (isActive) {
                delay(1_000)
                repo.tickElapsed()
            }
        }
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(CHANNEL_ID, "Ride Tracking", NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pi = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Traildense")
            .setContentText(text)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIF_ID, buildNotification(text))
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
        stopLocationUpdates()
    }
}
