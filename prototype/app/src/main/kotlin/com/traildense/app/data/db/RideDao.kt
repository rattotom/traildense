package com.traildense.app.data.db

import androidx.room.*
import com.traildense.app.data.model.Ride
import com.traildense.app.data.model.RideStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface RideDao {
    @Insert
    suspend fun insert(ride: Ride): Long

    @Update
    suspend fun update(ride: Ride)

    @Query("SELECT * FROM rides WHERE id = :id")
    suspend fun getById(id: Long): Ride?

    @Query("SELECT * FROM rides WHERE status = :status ORDER BY startTime DESC")
    fun getByStatus(status: RideStatus): Flow<List<Ride>>

    @Query("SELECT * FROM rides ORDER BY startTime DESC")
    fun getAll(): Flow<List<Ride>>
}
