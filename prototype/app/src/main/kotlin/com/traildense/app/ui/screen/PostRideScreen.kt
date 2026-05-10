package com.traildense.app.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.traildense.app.ui.theme.*

@Composable
fun PostRideScreen(
    rideId: Long,
    distanceMeters: Float,
    elapsedSeconds: Long,
    elevationGainMeters: Float,
    maxSpeedKph: Float,
    avgSpeedKph: Float,
    onDone: () -> Unit
) {
    var uploaded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(InkDeep)
            .padding(horizontal = 24.dp)
            .systemBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(40.dp))

        Text(
            "RIDE\nCOMPLETE",
            fontFamily = BigShoulders,
            fontWeight = FontWeight.Bold,
            fontSize = 52.sp,
            lineHeight = 52.sp,
            color = Bone,
            textAlign = TextAlign.Center,
            letterSpacing = (-1).sp
        )

        Spacer(Modifier.height(6.dp))

        Text(
            "// ride #$rideId",
            fontFamily = JetBrainsMono,
            fontSize = 12.sp,
            color = Kraft.copy(alpha = 0.7f),
            letterSpacing = 1.sp
        )

        Spacer(Modifier.height(36.dp))

        // Stats card
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Ink)
                .border(1.dp, Kraft.copy(alpha = 0.18f), RoundedCornerShape(16.dp))
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            SummaryRow("DISTANCE",  formatDistance(distanceMeters))
            HorizontalDivider(color = Kraft.copy(alpha = 0.1f))
            SummaryRow("TIME",      formatTime(elapsedSeconds))
            HorizontalDivider(color = Kraft.copy(alpha = 0.1f))
            SummaryRow("ELEVATION", "%.0f m".format(elevationGainMeters))
            HorizontalDivider(color = Kraft.copy(alpha = 0.1f))
            SummaryRow("AVG SPEED", "%.1f km/h".format(avgSpeedKph))
            HorizontalDivider(color = Kraft.copy(alpha = 0.1f))
            SummaryRow("MAX SPEED", "%.1f km/h".format(maxSpeedKph))
        }

        Spacer(Modifier.height(32.dp))

        // Upload button (stub — Week 2)
        Button(
            onClick = { uploaded = true },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (uploaded) Moss else Blaze,
                contentColor   = if (uploaded) Bone else InkDeep
            ),
            enabled = !uploaded
        ) {
            Icon(
                imageVector = if (uploaded) Icons.Filled.Check else Icons.Filled.CloudUpload,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                if (uploaded) "UPLOADED" else "UPLOAD TO MAP",
                fontFamily = JetBrainsMono,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                letterSpacing = 1.sp
            )
        }

        if (uploaded) {
            Spacer(Modifier.height(8.dp))
            Text(
                "Server upload wired in Week 2",
                fontFamily = JetBrainsMono,
                fontSize = 11.sp,
                color = Kraft.copy(alpha = 0.6f)
            )
        }

        Spacer(Modifier.height(16.dp))

        OutlinedButton(
            onClick = onDone,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Kraft.copy(alpha = 0.35f)),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Bone)
        ) {
            Text(
                "BACK TO MAP",
                fontFamily = JetBrainsMono,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                letterSpacing = 1.sp
            )
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            label,
            fontFamily = JetBrainsMono,
            fontSize = 11.sp,
            letterSpacing = 1.5.sp,
            color = Kraft
        )
        Text(
            value,
            fontFamily = JetBrainsMono,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            color = Bone
        )
    }
}

private fun formatDistance(m: Float): String =
    if (m >= 1000) "%.2f km".format(m / 1000f) else "%.0f m".format(m)

private fun formatTime(s: Long): String {
    val h = s / 3600; val m = (s % 3600) / 60; val sec = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, sec) else "%02d:%02d".format(m, sec)
}
