package com.traildense.app.di

import android.content.Context
import androidx.room.Room
import com.traildense.app.data.db.AppDatabase
import com.traildense.app.data.db.RideDao
import com.traildense.app.data.db.TrackPointDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Singleton
    @Provides
    fun provideDatabase(@ApplicationContext ctx: Context): AppDatabase =
        Room.databaseBuilder(ctx, AppDatabase::class.java, "traildense.db").build()

    @Provides fun provideRideDao(db: AppDatabase): RideDao = db.rideDao()
    @Provides fun provideTrackPointDao(db: AppDatabase): TrackPointDao = db.trackPointDao()
}
