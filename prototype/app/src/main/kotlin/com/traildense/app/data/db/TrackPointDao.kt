package com.traildense.app.data.db

import androidx.room.*
import com.traildense.app.data.model.TrackPoint
import kotlinx.coroutines.flow.Flow

@Dao
interface TrackPointDao {
    @Insert
    suspend fun insert(trackPoint: TrackPoint)

    @Query("SELECT * FROM track_points WHERE rideId = :rideId ORDER BY timestamp ASC")
    fun getByRide(rideId: Long): Flow<List<TrackPoint>>

    @Query("SELECT * FROM track_points WHERE rideId = :rideId ORDER BY timestamp ASC")
    suspend fun getByRideSync(rideId: Long): List<TrackPoint>
}
