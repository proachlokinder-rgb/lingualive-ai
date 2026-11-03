package com.lingualive.ai.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lingualive.ai.ui.theme.*

data class CallMessage(
    val id: Long,
    val speaker: String,
    val originalText: String,
    val translatedText: String?,
    val isMe: Boolean
)

@Composable
fun CallScreen() {
    var inCall by remember { mutableStateOf(false) }
    var roomCode by remember { mutableStateOf("7X9K2A") }
    var isMuted by remember { mutableStateOf(false) }
    var messages by remember {
        mutableStateOf(
            listOf(
                CallMessage(1, "Alice", "Hello! Can you hear me clearly?", "नमस्ते! क्या आप मुझे स्पष्ट सुन सकते हैं?", false),
                CallMessage(2, "You", "Yes, I can hear you very well!", "हाँ, मैं आपको बहुत अच्छी तरह सुन सकता हूँ!", true)
            )
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(16.dp)
    ) {
        // Room Status Header
        Card(
            colors = CardDefaults.cardColors(containerColor = CardDark),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("ROOM CODE", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text(roomCode, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                }
                Badge(containerColor = if (inCall) AccentGreen else Color(0xFFF59E0B)) {
                    Text(if (inCall) "Connected" else "Waiting for Peer", color = Color.Black, modifier = Modifier.padding(4.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Subtitles / Translation Feed
        Text("Real-Time Voice Translation Stream", color = TextWhite, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)

        Spacer(modifier = Modifier.height(8.dp))

        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(messages) { msg ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (msg.isMe) PrimaryIndigo.copy(alpha = 0.25f) else SurfaceDark
                    ),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(msg.speaker, color = if (msg.isMe) PrimaryIndigo else AccentCyan, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            IconButton(onClick = { /* Play TTS */ }, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.VolumeUp, contentDescription = "Play voice", tint = AccentGreen, modifier = Modifier.size(16.dp))
                            }
                        }
                        Text(msg.originalText, color = TextWhite, fontSize = 14.sp)
                        if (msg.translatedText != null) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(msg.translatedText, color = AccentGreen, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Call Control Actions
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = { isMuted = !isMuted },
                modifier = Modifier
                    .size(56.dp)
                    .background(if (isMuted) Color(0xFFEF4444) else SurfaceDark, CircleShape)
            ) {
                Icon(if (isMuted) Icons.Default.MicOff else Icons.Default.Mic, contentDescription = "Mute", tint = Color.White)
            }

            IconButton(
                onClick = { inCall = !inCall },
                modifier = Modifier
                    .size(64.dp)
                    .background(if (inCall) Color(0xFFEF4444) else AccentGreen, CircleShape)
            ) {
                Icon(if (inCall) Icons.Default.CallEnd else Icons.Default.Call, contentDescription = "Call toggle", tint = Color.White)
            }
        }
    }
}
