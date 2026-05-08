package com.traildense.app.data.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "track_points",
    foreignKeys = [ForeignKey(
        entity = Ride::class,
        parentColumns = ["id"],
        childColumns = ["rideId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("rideId")]
)
data class TrackPoint(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val rideId: Long,
    val timestamp: Long = System.currentTimeMillis(),
    val latitude: Double,
    val longitude: Double,
    val altitude: Double,
    val accuracy: Float,
    val speedMs: Float
)
