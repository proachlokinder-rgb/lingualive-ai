package com.lingualive.ai.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val PrimaryIndigo = Color(0xFF6366F1)
val SecondaryViolet = Color(0xFF8B5CF6)
val AccentCyan = Color(0xFF06B6D4)
val AccentGreen = Color(0xFF10B981)
val BackgroundDark = Color(0xFF090D16)
val SurfaceDark = Color(0xFF0F172A)
val CardDark = Color(0xFF111827)
val TextWhite = Color(0xFFF8FAFC)
val TextMuted = Color(0xFF94A3B8)

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryIndigo,
    secondary = SecondaryViolet,
    tertiary = AccentCyan,
    background = BackgroundDark,
    surface = SurfaceDark,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = TextWhite,
    onSurface = TextWhite
)

@Composable
fun LinguaLiveTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
