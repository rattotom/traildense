package com.traildense.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import com.traildense.app.ui.screen.MapScreen
import com.traildense.app.ui.screen.PostRideScreen
import com.traildense.app.ui.theme.TraildenseTheme
import dagger.hilt.android.AndroidEntryPoint

sealed class Screen {
    object Map : Screen()
    data class PostRide(
        val rideId: Long,
        val distanceMeters: Float,
        val elapsedSeconds: Long,
        val elevationGainMeters: Float,
        val maxSpeedKph: Float,
        val avgSpeedKph: Float
    ) : Screen()
}

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TraildenseTheme {
                var screen: Screen by remember { mutableStateOf(Screen.Map) }

                when (val s = screen) {
                    is Screen.Map -> MapScreen(
                        onRideComplete = { rideId, distM, elapsedSec, elevM, maxKph, avgKph ->
                            screen = Screen.PostRide(
                                rideId              = rideId,
                                distanceMeters      = distM,
                                elapsedSeconds      = elapsedSec,
                                elevationGainMeters = elevM,
                                maxSpeedKph         = maxKph,
                                avgSpeedKph         = avgKph
                            )
                        }
                    )
                    is Screen.PostRide -> PostRideScreen(
                        rideId              = s.rideId,
                        distanceMeters      = s.distanceMeters,
                        elapsedSeconds      = s.elapsedSeconds,
                        elevationGainMeters = s.elevationGainMeters,
                        maxSpeedKph         = s.maxSpeedKph,
                        avgSpeedKph         = s.avgSpeedKph,
                        onDone              = { screen = Screen.Map }
                    )
                }
            }
        }
    }
}
