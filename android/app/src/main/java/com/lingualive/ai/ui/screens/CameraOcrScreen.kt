package com.lingualive.ai.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Crop
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lingualive.ai.ml.TranslationRepository
import com.lingualive.ai.ui.theme.*

@Composable
fun CameraOcrScreen() {
    val sampleSigns = listOf(
        Pair("कृपया यहाँ शांति बनाए रखें", "Please maintain silence here"),
        Pair("सावधानी — 440 वोल्ट उच्च वोल्टेज", "Caution — 440 Volts High Voltage"),
        Pair("जम्मू तवी रेलवे स्टेशन अगाहां ऐ", "Jammu Tawi Railway Station is ahead"),
        Pair("Authorized Personnel Only", "केवल अधिकृत कर्मियों के लिए")
    )
    var currentSampleIdx by remember { mutableStateOf(0) }
    var isCropActive by remember { mutableStateOf(false) }

    val detectedText = sampleSigns[currentSampleIdx].first
    val translatedText = sampleSigns[currentSampleIdx].second

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Camera Viewport Simulation Frame
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1.3f)
                .background(SurfaceDark, RoundedCornerShape(20.dp))
                .border(2.dp, if (isCropActive) AccentCyan else AccentCyan.copy(alpha = 0.5f), RoundedCornerShape(20.dp)),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.CameraAlt, contentDescription = "Camera", tint = AccentCyan, modifier = Modifier.size(48.dp))
                Spacer(modifier = Modifier.height(12.dp))
                Text("Google ML Kit Vision OCR", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(if (isCropActive) "Area Selection Active (Cropped)" else "Tap below to scan or crop signs", color = TextMuted, fontSize = 12.sp)

                Spacer(modifier = Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { currentSampleIdx = (currentSampleIdx + 1) % sampleSigns.size },
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Next Sample", modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Scan Next Sign")
                    }

                    Button(
                        onClick = { isCropActive = !isCropActive },
                        colors = ButtonDefaults.buttonColors(containerColor = if (isCropActive) AccentCyan else SurfaceDark),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Crop, contentDescription = "Crop Area", modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (isCropActive) "Exit Crop" else "Crop Area")
                    }
                }
            }
        }

        // Extracted & Translated Result
        Card(
            colors = CardDefaults.cardColors(containerColor = CardDark),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("RECOGNIZED SIGN TEXT", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text(detectedText, color = TextWhite, fontSize = 16.sp, modifier = Modifier.padding(vertical = 4.dp))
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f), modifier = Modifier.padding(vertical = 6.dp))
                    Text("TRANSLATED OUTPUT", color = AccentGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text(translatedText, color = AccentGreen, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    IconButton(onClick = {
                        TranslationRepository.speak(translatedText, "en")
                    }) {
                        Icon(Icons.AutoMirrored.Filled.VolumeUp, contentDescription = "Play voice", tint = AccentGreen)
                    }
                }
            }
        }
    }
}
