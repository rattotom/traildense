package com.traildense.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class RideStatus { RECORDING, PAUSED, COMPLETED }

@Entity(tableName = "rides")
data class Ride(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val startedAt: Long = System.currentTimeMillis(),
    val endedAt: Long? = null,
    val distanceMeters: Float = 0f,
    val elevationGainMeters: Float = 0f,
    val maxSpeedKph: Float = 0f,
    val status: RideStatus = RideStatus.RECORDING
)
