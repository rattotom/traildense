package com.traildense.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val TraildenseDark = darkColorScheme(
    primary         = Blaze,
    onPrimary       = InkDeep,
    primaryContainer = Rust,
    secondary       = Kraft,
    onSecondary     = InkDeep,
    tertiary        = Moss,
    onTertiary      = Bone,
    background      = InkDeep,
    onBackground    = Bone,
    surface         = Ink,
    onSurface       = Bone,
    surfaceVariant  = MossDeep,
    onSurfaceVariant = Bone2,
    error           = Hot,
    outline         = Kraft
)

@Composable
fun TraildenseTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TraildenseDark,
        typography  = TraildenseTypography,
        content     = content
    )
}
