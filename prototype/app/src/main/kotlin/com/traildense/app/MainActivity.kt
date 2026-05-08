package com.traildense.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.traildense.app.ui.screen.MapScreen
import com.traildense.app.ui.screen.PostRideScreen
import com.traildense.app.ui.theme.TraildenseTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TraildenseTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    NavHost(navController = navController, startDestination = "map") {
                        composable("map") {
                            MapScreen(
                                onRideCompleted = {
                                    navController.navigate("post_ride") {
                                        launchSingleTop = true
                                    }
                                }
                            )
                        }
                        composable("post_ride") {
                            PostRideScreen(
                                onDone = { navController.popBackStack("map", inclusive = false) }
                            )
                        }
                    }
                }
            }
        }
    }
}
