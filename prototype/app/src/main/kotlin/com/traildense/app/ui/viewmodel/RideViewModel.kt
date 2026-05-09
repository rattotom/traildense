package com.traildense.app.ui.viewmodel

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.traildense.app.data.repository.RideMetrics
import com.traildense.app.data.repository.RideRepository
import com.traildense.app.service.TrackingService
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class RideViewModel @Inject constructor(
    private val repository: RideRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    val metrics: StateFlow<RideMetrics> = repository.metrics
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), RideMetrics())

    fun startRide() = context.startForegroundService(
        Intent(context, TrackingService::class.java).apply { action = TrackingService.ACTION_START }
    )

    fun pauseRide() = context.startService(
        Intent(context, TrackingService::class.java).apply { action = TrackingService.ACTION_PAUSE }
    )

    fun resumeRide() = context.startService(
        Intent(context, TrackingService::class.java).apply { action = TrackingService.ACTION_RESUME }
    )

    fun stopRide() = context.startService(
        Intent(context, TrackingService::class.java).apply { action = TrackingService.ACTION_STOP }
    )
}
