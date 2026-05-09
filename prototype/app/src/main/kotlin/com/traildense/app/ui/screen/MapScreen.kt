package com.traildense.app.ui.screen

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.traildense.app.data.model.RideStatus
import com.traildense.app.ui.component.MapLibreView
import com.traildense.app.ui.component.RideHud
import com.traildense.app.ui.viewmodel.RideViewModel

@Composable
fun MapScreen(
    onRideCompleted: () -> Unit,
    viewModel: RideViewModel = hiltViewModel()
) {
    val metrics by viewModel.metrics.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasLocationPermission = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
    }

    LaunchedEffect(metrics.status) {
        if (metrics.status == RideStatus.COMPLETED) onRideCompleted()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        MapLibreView(
            modifier = Modifier.fillMaxSize(),
            currentLatitude = metrics.currentLatitude.takeIf { it != 0.0 },
            currentLongitude = metrics.currentLongitude.takeIf { it != 0.0 }
        )

        if (!hasLocationPermission) {
            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Location permission required to record rides",
                    style = MaterialTheme.typography.bodyLarge
                )
                Button(onClick = { permissionLauncher.launch(requiredPermissions()) }) {
                    Text("Grant Permission")
                }
            }
        }

        Column(modifier = Modifier.align(Alignment.BottomCenter)) {
            if (metrics.isActive) {
                RideHud(
                    metrics = metrics,
                    onPause = viewModel::pauseRide,
                    onResume = viewModel::resumeRide,
                    onStop = viewModel::stopRide,
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 36.dp),
                    contentAlignment = Alignment.Center
                ) {
                    ExtendedFloatingActionButton(
                        onClick = {
                            if (hasLocationPermission) viewModel.startRide()
                            else permissionLauncher.launch(requiredPermissions())
                        },
                        icon = { Icon(Icons.Default.PlayArrow, contentDescription = null) },
                        text = { Text("Start Ride") },
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

private fun requiredPermissions(): Array<String> = buildList {
    add(Manifest.permission.ACCESS_FINE_LOCATION)
    add(Manifest.permission.ACCESS_COARSE_LOCATION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        add(Manifest.permission.POST_NOTIFICATIONS)
    }
}.toTypedArray()
