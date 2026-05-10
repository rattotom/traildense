package com.traildense.app.ui.screen

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.traildense.app.data.model.RideStatus
import com.traildense.app.ui.component.MapLibreView
import com.traildense.app.ui.component.RideHud
import com.traildense.app.ui.theme.*
import com.traildense.app.ui.viewmodel.RideViewModel

@Composable
fun MapScreen(
    onRideComplete: (rideId: Long, distM: Float, elapsedSec: Long, elevM: Float, maxKph: Float, avgKph: Float) -> Unit,
    vm: RideViewModel = hiltViewModel()
) {
    val ctx     = LocalContext.current
    val metrics by vm.metrics.collectAsState()

    var locationGranted by remember { mutableStateOf(
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED
    )}

    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> locationGranted = granted }

    // Navigate when ride completes
    LaunchedEffect(metrics.status) {
        if (metrics.status == RideStatus.COMPLETED && metrics.rideId != -1L) {
            onRideComplete(
                metrics.rideId,
                metrics.distanceMeters,
                metrics.elapsedSeconds,
                metrics.elevationGainMeters,
                metrics.maxSpeedKph,
                metrics.avgSpeedKph
            )
        }
    }

    Box(Modifier.fillMaxSize().background(InkDeep)) {

        if (!locationGranted) {
            PermissionPrompt { permLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION) }
        } else {
            // Map
            MapLibreView(
                modifier    = Modifier.fillMaxSize(),
                lat         = 0.0,
                lon         = 0.0,
                hasLocation = false
            )

            // HUD or start button
            Column(
                modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth()
            ) {
                if (metrics.isActive) {
                    RideHud(
                        metrics  = metrics,
                        onPause  = { vm.pauseRide(ctx) },
                        onResume = { vm.resumeRide(ctx) },
                        onStop   = { vm.stopRide(ctx) }
                    )
                } else {
                    StartButton { vm.startRide(ctx) }
                }
            }
        }
    }
}

@Composable
private fun PermissionPrompt(onRequest: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(40.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            "TRAILDENSE",
            fontFamily = BigShoulders,
            fontWeight = FontWeight.Bold,
            fontSize = 40.sp,
            color = Bone,
            letterSpacing = (-1).sp
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Location access required\nto record your trail.",
            fontFamily = JetBrainsMono,
            fontSize = 14.sp,
            color = Kraft,
            textAlign = TextAlign.Center,
            lineHeight = 22.sp
        )
        Spacer(Modifier.height(32.dp))
        Button(
            onClick = onRequest,
            colors = ButtonDefaults.buttonColors(containerColor = Blaze, contentColor = InkDeep),
            modifier = Modifier.fillMaxWidth().height(52.dp)
        ) {
            Text(
                "GRANT LOCATION",
                fontFamily = JetBrainsMono,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                letterSpacing = 1.sp
            )
        }
    }
}

@Composable
private fun StartButton(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(InkDeep.copy(alpha = 0.92f))
            .padding(20.dp)
    ) {
        Button(
            onClick = onClick,
            modifier = Modifier.fillMaxWidth().height(60.dp),
            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Blaze, contentColor = InkDeep)
        ) {
            Text(
                "START RIDE",
                fontFamily = BigShoulders,
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp,
                letterSpacing = 1.sp
            )
        }
    }
}
