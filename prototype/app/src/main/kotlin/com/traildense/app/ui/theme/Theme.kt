package com.traildense.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = TrailGreen,
    onPrimary = TrailOnSurface,
    primaryContainer = TrailGreenDark,
    secondary = TrailGreenLight,
    tertiary = TrailOrange,
    background = TrailSurface,
    surface = TrailSurface,
    surfaceVariant = TrailSurfaceVariant,
    onBackground = TrailOnSurface,
    onSurface = TrailOnSurface
)

@Composable
fun TraildenseTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
