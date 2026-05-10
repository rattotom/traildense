package com.traildense.app.data.db

import androidx.room.TypeConverter
import com.traildense.app.data.model.RideStatus

class Converters {
    @TypeConverter fun fromStatus(s: RideStatus): String = s.name
    @TypeConverter fun toStatus(s: String): RideStatus = RideStatus.valueOf(s)
}
