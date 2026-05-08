package com.traildense.app.data.db

import androidx.room.TypeConverter
import com.traildense.app.data.model.RideStatus

class Converters {
    @TypeConverter
    fun fromRideStatus(status: RideStatus): String = status.name

    @TypeConverter
    fun toRideStatus(name: String): RideStatus = RideStatus.valueOf(name)
}
