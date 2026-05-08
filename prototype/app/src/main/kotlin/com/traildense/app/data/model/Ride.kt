package com.traildense.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class RideStatus { RECORDING, PAUSED, COMPLETED }

@Entity(tableName = "rides")
data class Ride(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val startTime: Long = System.currentTimeMillis(),
    val endTime: Long? = null,
    val distanceMeters: Double = 0.0,
    val elevationGainMeters: Double = 0.0,
    val maxSpeedMs: Float = 0f,
    val status: RideStatus = RideStatus.RECORDING
)
