package com.lingualive.ai.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.SwapHoriz
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
import kotlinx.coroutines.launch

@Composable
fun QuickTranslateScreen() {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var sourceText by remember { mutableStateOf("hlo") }
    var translatedText by remember { mutableStateOf("नमस्ते") }
    var sourceLang by remember { mutableStateOf("English") }
    var targetLang by remember { mutableStateOf("Hindi") }
    var isTranslating by remember { mutableStateOf(false) }

    val languages = listOf("English", "Hindi", "Dogri", "Punjabi", "Spanish", "French")
    var showSourceMenu by remember { mutableStateOf(false) }
    var showTargetMenu by remember { mutableStateOf(false) }

    fun doTranslate(text: String = sourceText) {
        if (text.isBlank()) return
        isTranslating = true
        coroutineScope.launch {
            try {
                val res = TranslationRepository.translate(text, sourceLang, targetLang)
                translatedText = res
            } catch (e: Exception) {
                translatedText = "Translation error: ${e.message}"
            } finally {
                isTranslating = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Language Switcher Header
        Card(
            colors = CardDefaults.cardColors(containerColor = CardDark),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Source Language Picker
                Box {
                    Text(
                        text = "$sourceLang ▼",
                        color = TextWhite,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        modifier = Modifier.clickable { showSourceMenu = true }
                    )
                    DropdownMenu(
                        expanded = showSourceMenu,
                        onDismissRequest = { showSourceMenu = false }
                    ) {
                        languages.forEach { lang ->
                            DropdownMenuItem(
                                text = { Text(lang) },
                                onClick = {
                                    sourceLang = lang
                                    showSourceMenu = false
                                    doTranslate()
                                }
                            )
                        }
                    }
                }

                // Swap Button
                IconButton(onClick = {
                    val tempL = sourceLang
                    sourceLang = targetLang
                    targetLang = tempL
                    val tempT = sourceText
                    sourceText = translatedText
                    translatedText = tempT
                }) {
                    Icon(Icons.Default.SwapHoriz, contentDescription = "Swap Languages", tint = PrimaryIndigo)
                }

                // Target Language Picker
                Box {
                    Text(
                        text = "$targetLang ▼",
                        color = AccentGreen,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        modifier = Modifier.clickable { showTargetMenu = true }
                    )
                    DropdownMenu(
                        expanded = showTargetMenu,
                        onDismissRequest = { showTargetMenu = false }
                    ) {
                        languages.forEach { lang ->
                            DropdownMenuItem(
                                text = { Text(lang) },
                                onClick = {
                                    targetLang = lang
                                    showTargetMenu = false
                                    doTranslate()
                                }
                            )
                        }
                    }
                }
            }
        }

        // Input Card
        Card(
            colors = CardDefaults.cardColors(containerColor = SurfaceDark),
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
                OutlinedTextField(
                    value = sourceText,
                    onValueChange = { sourceText = it },
                    placeholder = { Text("Enter text to translate (e.g. hlo, how are you)...", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent,
                        focusedTextColor = TextWhite,
                        unfocusedTextColor = TextWhite
                    )
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = {
                        sourceText = "Hello, how are you?"
                        doTranslate("Hello, how are you?")
                    }) {
                        Icon(Icons.Default.Mic, contentDescription = "Dictate Sample", tint = PrimaryIndigo)
                    }

                    Button(
                        onClick = { doTranslate() },
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryIndigo),
                        shape = RoundedCornerShape(12.dp),
                        enabled = !isTranslating
                    ) {
                        if (isTranslating) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text("Translate")
                    }
                }
            }
        }

        // Output Card
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
                Text(
                    text = translatedText,
                    color = AccentGreen,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 30.sp
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    // Copy action
                    IconButton(onClick = {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("Translated Text", translatedText)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "Copied to clipboard!", Toast.LENGTH_SHORT).show()
                    }) {
                        Icon(Icons.Default.ContentCopy, contentDescription = "Copy text", tint = TextMuted)
                    }

                    // TTS Voice synthesis
                    IconButton(onClick = {
                        TranslationRepository.speak(translatedText, targetLang)
                    }) {
                        Icon(Icons.AutoMirrored.Filled.VolumeUp, contentDescription = "Speak translation", tint = AccentGreen)
                    }
                }
            }
        }
    }
}
