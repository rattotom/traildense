package com.traildense.app.data.db

import androidx.room.*
import com.traildense.app.data.model.TrackPoint
import kotlinx.coroutines.flow.Flow

@Dao
interface TrackPointDao {
    @Insert suspend fun insert(point: TrackPoint)
    @Query("SELECT * FROM track_points WHERE rideId = :rideId ORDER BY timestamp ASC")
    fun pointsForRide(rideId: Long): Flow<List<TrackPoint>>
    @Query("SELECT * FROM track_points WHERE rideId = :rideId ORDER BY timestamp ASC")
    suspend fun pointsForRideOnce(rideId: Long): List<TrackPoint>
}
