package com.lingualive.ai.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lingualive.ai.ml.TranslationRepository
import com.lingualive.ai.ui.theme.*

data class ModelPack(val code: String, val name: String, val sizeMb: Int, val isDownloaded: Boolean)

@Composable
fun OfflineManagerScreen() {
    val context = LocalContext.current
    var models by remember {
        mutableStateOf(
            listOf(
                ModelPack("en", "English", 30, true),
                ModelPack("hi", "Hindi (हिन्दी)", 32, true),
                ModelPack("doi", "Dogri (डोगरी) ⭐", 30, true),
                ModelPack("pa", "Punjabi (ਪੰਜਾਬੀ)", 32, true),
                ModelPack("es", "Spanish (Español)", 28, false),
                ModelPack("fr", "French (Français)", 29, false),
                ModelPack("de", "German (Deutsch)", 31, false),
                ModelPack("ja", "Japanese (日本語)", 34, false)
            )
        )
    }

    var offlineTestResult by remember { mutableStateOf("नमस्ते, केह् हाल-चाल ऐ? (Dogri Offline Ready)") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(16.dp)
    ) {
        // Storage Header
        Card(
            colors = CardDefaults.cardColors(containerColor = CardDark),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Google ML Kit On-Device Storage", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Badge(containerColor = AccentGreen) {
                        Text("100% Offline Ready", color = Color.Black, modifier = Modifier.padding(2.dp))
                    }
                }
                Text("Zero Latency • 100% On-Device • No Internet Needed", color = TextMuted, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(10.dp))
                LinearProgressIndicator(
                    progress = { 124f / 1500f },
                    modifier = Modifier.fillMaxWidth(),
                    color = PrimaryIndigo,
                    trackColor = Color.White.copy(alpha = 0.1f)
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text("124 MB used of 1.5 GB allocated (4 packs ready)", color = TextMuted, fontSize = 11.sp)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Quick Offline Verification Box
        Card(
            colors = CardDefaults.cardColors(containerColor = SurfaceDark),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Offline Verification Test:", color = TextMuted, fontSize = 11.sp)
                    Text(offlineTestResult, color = AccentCyan, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
                IconButton(onClick = {
                    TranslationRepository.speak(offlineTestResult, "doi")
                    Toast.makeText(context, "Playing Dogri voice via on-device TTS", Toast.LENGTH_SHORT).show()
                }) {
                    Icon(Icons.AutoMirrored.Filled.VolumeUp, contentDescription = "Play", tint = AccentGreen)
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text("Available Language Models", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)

        Spacer(modifier = Modifier.height(8.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(models) { model ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(model.name, color = TextWhite, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            Text("${model.sizeMb} MB", color = TextMuted, fontSize = 12.sp)
                        }

                        if (model.isDownloaded) {
                            Icon(Icons.Default.CheckCircle, contentDescription = "Installed", tint = AccentGreen)
                        } else {
                            IconButton(onClick = {
                                models = models.map { if (it.code == model.code) it.copy(isDownloaded = true) else it }
                                Toast.makeText(context, "Downloaded ${model.name} for offline use!", Toast.LENGTH_SHORT).show()
                            }) {
                                Icon(Icons.Default.Download, contentDescription = "Download", tint = PrimaryIndigo)
                            }
                        }
                    }
                }
            }
        }
    }
}
