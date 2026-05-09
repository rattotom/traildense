package com.traildense.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class TraildenseApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        val channel = NotificationChannel(
            TRACKING_CHANNEL_ID,
            "Ride Tracking",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows active ride recording status"
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        const val TRACKING_CHANNEL_ID = "traildense_tracking"
    }
}
