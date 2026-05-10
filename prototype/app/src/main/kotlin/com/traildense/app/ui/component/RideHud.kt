package com.traildense.app.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.traildense.app.data.model.RideStatus
import com.traildense.app.data.repository.RideMetrics
import com.traildense.app.ui.theme.*

@Composable
fun RideHud(
    metrics: RideMetrics,
    onPause: () -> Unit,
    onResume: () -> Unit,
    onStop: () -> Unit
) {
    val shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Ink.copy(alpha = 0.96f))
            .border(1.dp, Kraft.copy(alpha = 0.18f), shape)
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // Top accent line
        Box(
            Modifier
                .align(Alignment.CenterHorizontally)
                .width(40.dp)
                .height(3.dp)
                .background(Kraft.copy(alpha = 0.4f), RoundedCornerShape(2.dp))
        )

        Spacer(Modifier.height(14.dp))

        // Primary metrics row
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            MetricCell(
                label = "DIST",
                value = formatDistance(metrics.distanceMeters),
                unit  = if (metrics.distanceMeters >= 1000) "km" else "m",
                large = true
            )
            VerticalDivider()
            MetricCell(
                label = "TIME",
                value = formatTime(metrics.elapsedSeconds),
                unit  = "",
                large = true
            )
            VerticalDivider()
            MetricCell(
                label = "ELEV",
                value = "%.0f".format(metrics.elevationGainMeters),
                unit  = "m",
                large = true
            )
        }

        Spacer(Modifier.height(12.dp))

        HorizontalDivider(color = Kraft.copy(alpha = 0.12f))

        Spacer(Modifier.height(12.dp))

        // Speed row
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            MetricCell("NOW",  "%.1f".format(metrics.currentSpeedKph), "km/h")
            MetricCell("AVG",  "%.1f".format(metrics.avgSpeedKph),     "km/h")
            MetricCell("MAX",  "%.1f".format(metrics.maxSpeedKph),     "km/h")
        }

        Spacer(Modifier.height(16.dp))

        // Controls
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Pause / Resume
            OutlinedButton(
                onClick = if (metrics.status == RideStatus.PAUSED) onResume else onPause,
                modifier = Modifier.weight(1f).height(52.dp),
                shape = RoundedCornerShape(10.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Kraft.copy(alpha = 0.4f)),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Bone)
            ) {
                Icon(
                    imageVector = if (metrics.status == RideStatus.PAUSED) Icons.Filled.PlayArrow else Icons.Filled.Pause,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    if (metrics.status == RideStatus.PAUSED) "RESUME" else "PAUSE",
                    fontFamily = JetBrainsMono,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    letterSpacing = 1.sp
                )
            }

            // Stop
            Button(
                onClick = onStop,
                modifier = Modifier.weight(1f).height(52.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Blaze,
                    contentColor   = InkDeep
                )
            ) {
                Icon(Icons.Filled.Stop, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(6.dp))
                Text(
                    "STOP",
                    fontFamily = JetBrainsMono,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    letterSpacing = 1.sp
                )
            }
        }

        Spacer(Modifier.height(4.dp))
    }
}

@Composable
private fun MetricCell(label: String, value: String, unit: String, large: Boolean = false) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            label,
            fontFamily = JetBrainsMono,
            fontSize = 10.sp,
            letterSpacing = 1.5.sp,
            color = Kraft
        )
        Spacer(Modifier.height(2.dp))
        Text(
            value,
            fontFamily = JetBrainsMono,
            fontWeight = FontWeight.Bold,
            fontSize = if (large) 28.sp else 20.sp,
            color = Bone
        )
        if (unit.isNotEmpty()) {
            Text(
                unit,
                fontFamily = JetBrainsMono,
                fontSize = 10.sp,
                color = Bone2
            )
        }
    }
}

@Composable
private fun VerticalDivider() {
    Box(
        Modifier
            .width(1.dp)
            .height(56.dp)
            .background(Kraft.copy(alpha = 0.15f))
    )
}

private fun formatDistance(meters: Float): String =
    if (meters >= 1000) "%.2f".format(meters / 1000f) else "%.0f".format(meters)

private fun formatTime(seconds: Long): String {
    val h = seconds / 3600
    val m = (seconds % 3600) / 60
    val s = seconds % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%02d:%02d".format(m, s)
}
