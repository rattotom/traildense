package com.traildense.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.sp
import com.traildense.app.R

private val provider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage   = "com.google.android.gms",
    certificates      = R.array.com_google_android_gms_fonts_certs
)

val BigShoulders = FontFamily(
    Font(GoogleFont("Big Shoulders Display"), provider, weight = FontWeight.Bold),
    Font(GoogleFont("Big Shoulders Display"), provider, weight = FontWeight.Normal)
)

val JetBrainsMono = FontFamily(
    Font(GoogleFont("JetBrains Mono"), provider, weight = FontWeight.Normal),
    Font(GoogleFont("JetBrains Mono"), provider, weight = FontWeight.Bold)
)

val TraildenseTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = BigShoulders, fontWeight = FontWeight.Bold,
        fontSize = 52.sp, lineHeight = 52.sp, letterSpacing = (-1).sp
    ),
    displayMedium = TextStyle(
        fontFamily = BigShoulders, fontWeight = FontWeight.Bold,
        fontSize = 40.sp, lineHeight = 44.sp, letterSpacing = (-0.5).sp
    ),
    headlineLarge = TextStyle(
        fontFamily = BigShoulders, fontWeight = FontWeight.Bold,
        fontSize = 32.sp, lineHeight = 36.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = BigShoulders, fontWeight = FontWeight.Bold,
        fontSize = 24.sp, lineHeight = 28.sp
    ),
    titleLarge = TextStyle(
        fontFamily = JetBrainsMono, fontWeight = FontWeight.Bold,
        fontSize = 20.sp, lineHeight = 24.sp
    ),
    titleMedium = TextStyle(
        fontFamily = JetBrainsMono, fontWeight = FontWeight.Normal,
        fontSize = 14.sp, lineHeight = 20.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default, fontWeight = FontWeight.Normal,
        fontSize = 16.sp, lineHeight = 24.sp
    ),
    labelSmall = TextStyle(
        fontFamily = JetBrainsMono, fontWeight = FontWeight.Normal,
        fontSize = 11.sp, lineHeight = 16.sp, letterSpacing = 1.sp
    )
)
