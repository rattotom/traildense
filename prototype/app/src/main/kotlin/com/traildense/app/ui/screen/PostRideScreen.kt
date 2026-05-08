package com.traildense.app.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.traildense.app.ui.viewmodel.RideViewModel
import kotlin.math.roundToInt

@Composable
fun PostRideScreen(
    onDone: () -> Unit,
    viewModel: RideViewModel = hiltViewModel()
) {
    val metrics by viewModel.metrics.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp, Alignment.CenterVertically)
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.size(72.dp)
        )

        Text(text = "Ride Complete", fontSize = 32.sp, fontWeight = FontWeight.Bold)

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                SummaryRow("Distance", formatDistance(metrics.distanceMeters))
                SummaryRow("Time", formatTime(metrics.elapsedSeconds))
                SummaryRow("Elevation Gain", "${metrics.elevationGainMeters.roundToInt()} m")
                SummaryRow("Avg Speed", "${(metrics.avgSpeedMs * 3.6f).roundToInt()} km/h")
                SummaryRow("Max Speed", "${(metrics.maxSpeedMs * 3.6f).roundToInt()} km/h")
            }
        }

        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Button(
                onClick = { /* TODO Week 2: upload to server */ },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Upload to Traildense Map")
            }
            OutlinedButton(onClick = onDone, modifier = Modifier.fillMaxWidth()) {
                Text("Save Locally & Done")
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(text = label, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f))
        Text(text = value, fontWeight = FontWeight.SemiBold)
    }
}

private fun formatDistance(meters: Double) =
    if (meters < 1000) "${meters.roundToInt()} m" else "${"%.1f".format(meters / 1000)} km"

private fun formatTime(seconds: Long): String {
    val h = seconds / 3600
    val m = (seconds % 3600) / 60
    val s = seconds % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}
