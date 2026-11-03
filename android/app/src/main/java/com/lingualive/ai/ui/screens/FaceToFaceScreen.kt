package com.lingualive.ai.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lingualive.ai.ml.TranslationRepository
import com.lingualive.ai.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun FaceToFaceScreen() {
    var personBText by remember { mutableStateOf("नमस्ते, केह् हाल-चाल ऐ?") }
    var personAText by remember { mutableStateOf("Hello! How are you doing?") }
    var personBLang by remember { mutableStateOf("Dogri") }
    var personALang by remember { mutableStateOf("English") }
    var activeSpeaker by remember { mutableStateOf<String?>(null) }
    var autoTurnTaking by remember { mutableStateOf(true) }
    var isInverted by remember { mutableStateOf(true) }
    val coroutineScope = rememberCoroutineScope()

    val supportedLanguages = listOf("Dogri", "Hindi", "English", "Punjabi", "Spanish", "French")
    var showMenuB by remember { mutableStateOf(false) }
    var showMenuA by remember { mutableStateOf(false) }

    fun processPersonASpeech(speech: String = personAText) {
        activeSpeaker = "A"
        coroutineScope.launch {
            delay(400)
            val translated = TranslationRepository.translate(speech, personALang, personBLang)
            personBText = translated
            TranslationRepository.speak(translated, personBLang)
            activeSpeaker = null

            if (autoTurnTaking) {
                delay(700)
                activeSpeaker = "B"
            }
        }
    }

    fun processPersonBSpeech(speech: String = personBText) {
        activeSpeaker = "B"
        coroutineScope.launch {
            delay(400)
            val translated = TranslationRepository.translate(speech, personBLang, personALang)
            personAText = translated
            TranslationRepository.speak(translated, personALang)
            activeSpeaker = null

            if (autoTurnTaking) {
                delay(700)
                activeSpeaker = "A"
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(12.dp)
    ) {
        // Control Bar (Auto Turn-Taking & Rotation)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = if (autoTurnTaking) AccentGreen.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.05f),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.clickable { autoTurnTaking = !autoTurnTaking }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        Icons.Default.Sync,
                        contentDescription = "Auto Ping-Pong",
                        tint = if (autoTurnTaking) AccentGreen else TextMuted,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = if (autoTurnTaking) "Auto Turn-Taking: ON" else "Auto Turn-Taking: OFF",
                        color = if (autoTurnTaking) AccentGreen else TextMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            IconButton(onClick = { isInverted = !isInverted }) {
                Icon(
                    Icons.Default.SwapVert,
                    contentDescription = "Invert View",
                    tint = TextMuted,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        // Person B's Card (Top Half: Inverted 180 degrees for opposite viewer across table)
        Card(
            colors = CardDefaults.cardColors(containerColor = CardDark),
            shape = RoundedCornerShape(24.dp),
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .rotate(if (isInverted) 180f else 0f)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box {
                        Text(
                            text = "Person B ($personBLang) ▼",
                            color = AccentCyan,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            modifier = Modifier.clickable { showMenuB = true }
                        )
                        DropdownMenu(expanded = showMenuB, onDismissRequest = { showMenuB = false }) {
                            supportedLanguages.forEach { lang ->
                                DropdownMenuItem(
                                    text = { Text(lang) },
                                    onClick = {
                                        personBLang = lang
                                        showMenuB = false
                                    }
                                )
                            }
                        }
                    }

                    IconButton(onClick = {
                        TranslationRepository.speak(personBText, personBLang)
                    }) {
                        Icon(Icons.AutoMirrored.Filled.VolumeUp, contentDescription = "Listen", tint = TextWhite)
                    }
                }

                Text(
                    text = personBText,
                    color = AccentCyan,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 32.sp
                )

                IconButton(
                    onClick = {
                        if (activeSpeaker == "B") {
                            activeSpeaker = null
                        } else {
                            processPersonBSpeech("आऊं ठीक आं, धन्यवाद!")
                        }
                    },
                    modifier = Modifier
                        .size(68.dp)
                        .align(Alignment.CenterHorizontally)
                        .background(if (activeSpeaker == "B") Color(0xFFEF4444) else AccentCyan, CircleShape)
                ) {
                    Icon(Icons.Default.Mic, contentDescription = "Speak", tint = Color.White, modifier = Modifier.size(32.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Person A's Card (Bottom Half: Normal Orientation)
        Card(
            colors = CardDefaults.cardColors(containerColor = SurfaceDark),
            shape = RoundedCornerShape(24.dp),
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box {
                        Text(
                            text = "Person A ($personALang) ▼",
                            color = PrimaryIndigo,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            modifier = Modifier.clickable { showMenuA = true }
                        )
                        DropdownMenu(expanded = showMenuA, onDismissRequest = { showMenuA = false }) {
                            supportedLanguages.forEach { lang ->
                                DropdownMenuItem(
                                    text = { Text(lang) },
                                    onClick = {
                                        personALang = lang
                                        showMenuA = false
                                    }
                                )
                            }
                        }
                    }

                    IconButton(onClick = {
                        TranslationRepository.speak(personAText, personALang)
                    }) {
                        Icon(Icons.AutoMirrored.Filled.VolumeUp, contentDescription = "Listen", tint = TextWhite)
                    }
                }

                Text(
                    text = personAText,
                    color = PrimaryIndigo,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 32.sp
                )

                IconButton(
                    onClick = {
                        if (activeSpeaker == "A") {
                            activeSpeaker = null
                        } else {
                            processPersonASpeech("Hello! Where are you going?")
                        }
                    },
                    modifier = Modifier
                        .size(68.dp)
                        .align(Alignment.CenterHorizontally)
                        .background(if (activeSpeaker == "A") Color(0xFFEF4444) else PrimaryIndigo, CircleShape)
                ) {
                    Icon(Icons.Default.Mic, contentDescription = "Speak", tint = Color.White, modifier = Modifier.size(32.dp))
                }
            }
        }
    }
}
