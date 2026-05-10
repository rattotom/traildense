package com.traildense.app.data.db

import androidx.room.*
import com.traildense.app.data.model.Ride
import kotlinx.coroutines.flow.Flow

@Dao
interface RideDao {
    @Insert suspend fun insert(ride: Ride): Long
    @Update suspend fun update(ride: Ride)
    @Query("SELECT * FROM rides ORDER BY startedAt DESC") fun allRides(): Flow<List<Ride>>
    @Query("SELECT * FROM rides WHERE id = :id") suspend fun byId(id: Long): Ride?
}
