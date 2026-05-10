package com.traildense.app.ui.viewmodel

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import com.traildense.app.data.repository.RideMetrics
import com.traildense.app.data.repository.RideRepository
import com.traildense.app.service.TrackingService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@HiltViewModel
class RideViewModel @Inject constructor(
    private val repo: RideRepository
) : ViewModel() {

    val metrics: StateFlow<RideMetrics> = repo.metrics

    fun startRide(ctx: Context) {
        ctx.startForegroundService(Intent(ctx, TrackingService::class.java).apply {
            action = TrackingService.ACTION_START
        })
    }

    fun pauseRide(ctx: Context) {
        ctx.startService(Intent(ctx, TrackingService::class.java).apply {
            action = TrackingService.ACTION_PAUSE
        })
    }

    fun resumeRide(ctx: Context) {
        ctx.startService(Intent(ctx, TrackingService::class.java).apply {
            action = TrackingService.ACTION_RESUME
        })
    }

    fun stopRide(ctx: Context) {
        ctx.startService(Intent(ctx, TrackingService::class.java).apply {
            action = TrackingService.ACTION_STOP
        })
    }
}
