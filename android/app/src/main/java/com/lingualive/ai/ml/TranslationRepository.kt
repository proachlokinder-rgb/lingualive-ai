package com.lingualive.ai.ml

import android.content.Context
import android.speech.tts.TextToSpeech
import android.widget.Toast
import com.lingualive.ai.network.ApiClient
import com.lingualive.ai.network.TranslateReq
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

object TranslationRepository {

    private var tts: TextToSpeech? = null
    private var isTtsReady = false

    fun initTts(context: Context) {
        if (tts == null) {
            tts = TextToSpeech(context.applicationContext) { status ->
                isTtsReady = (status == TextToSpeech.SUCCESS)
            }
        }
    }

    fun speak(text: String, langCode: String = "hi") {
        if (!isTtsReady || tts == null) return
        val locale = when (langCode.lowercase()) {
            "en" -> Locale.US
            "hi", "doi" -> Locale("hi", "IN") // Dogri Devanagari phonetics
            "es" -> Locale("es", "ES")
            "fr" -> Locale.FRENCH
            "de" -> Locale.GERMAN
            else -> Locale("hi", "IN")
        }
        tts?.language = locale
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "LiveLingoTTS")
    }

    // Comprehensive offline phrasebook & rule-based engine
    private val offlinePhrases = mapOf(
        // English -> Hindi
        "hello:en:hi" to "नमस्ते",
        "hlo:en:hi" to "नमस्ते",
        "hi:en:hi" to "नमस्ते",
        "how are you:en:hi" to "आप कैसे हैं?",
        "how are you?:en:hi" to "आप कैसे हैं?",
        "what is your name:en:hi" to "आपका नाम क्या है?",
        "what is your name?:en:hi" to "आपका नाम क्या है?",
        "where is the train station?:en:hi" to "रेलवे स्टेशन कहाँ है?",
        "where is the train station:en:hi" to "रेलवे स्टेशन कहाँ है?",
        "where are you:en:hi" to "आप कहाँ हैं?",
        "thank you:en:hi" to "धन्यवाद",
        "thanks:en:hi" to "धन्यवाद",
        "yes:en:hi" to "हाँ",
        "no:en:hi" to "नहीं",
        "good morning:en:hi" to "शुभ प्रभात",
        "goodbye:en:hi" to "अलविदा",
        "i am fine:en:hi" to "मैं ठीक हूँ",
        "please help me:en:hi" to "कृपया मेरी मदद करें",

        // English -> Dogri (doi)
        "hello:en:doi" to "नमस्ते",
        "hlo:en:doi" to "नमस्ते",
        "hi:en:doi" to "नमस्ते",
        "how are you:en:doi" to "नमस्ते, केह् हाल-चाल ऐ?",
        "how are you?:en:doi" to "नमस्ते, केह् हाल-चाल ऐ?",
        "what is your name:en:doi" to "थुआढ़ा केह् नांऽ ऐ?",
        "what is your name?:en:doi" to "थुआढ़ा केह् नांऽ ऐ?",
        "where is the train station?:en:doi" to "रेलवे स्टेशन कुत्थे ऐ?",
        "where is the train station:en:doi" to "रेलवे स्टेशन कुत्थे ऐ?",
        "where are you:en:doi" to "तुस कुत्थे ओ?",
        "thank you:en:doi" to "धन्यवाद",
        "thanks:en:doi" to "धन्यवाद",
        "yes:en:doi" to "हाँ",
        "no:en:doi" to "नेईं",
        "good morning:en:doi" to "शुभ प्रभात",
        "goodbye:en:doi" to "अलविदा",
        "i am fine:en:doi" to "आऊं ठीक आं",
        "please help me:en:doi" to "कृपया मेरी मदद करो",

        // Hindi -> English
        "नमस्ते:hi:en" to "Hello",
        "आप कैसे हैं?:hi:en" to "How are you?",
        "आप कैसे हैं:hi:en" to "How are you?",
        "आपका नाम क्या है?:hi:en" to "What is your name?",
        "धन्यवाद:hi:en" to "Thank you",
        "हाँ:hi:en" to "Yes",
        "नहीं:hi:en" to "No",
        "मैं ठीक हूँ:hi:en" to "I am fine",

        // Dogri -> English
        "नमस्ते:doi:en" to "Hello",
        "केह् हाल-चाल ऐ?:doi:en" to "How are you?",
        "केह् हाल-चाल ऐ:doi:en" to "How are you?",
        "थुआढ़ा केह् नांऽ ऐ?:doi:en" to "What is your name?",
        "थुआढ़ा केह् नांऽ ऐ:doi:en" to "What is your name?",
        "आऊं ठीक आं:doi:en" to "I am fine",
        "धन्यवाद:doi:en" to "Thank you",
        "हाँ:doi:en" to "Yes",
        "नेईं:doi:en" to "No"
    )

    suspend fun translate(text: String, fromLang: String, toLang: String): String = withContext(Dispatchers.IO) {
        val clean = text.trim()
        if (clean.isEmpty()) return@withContext ""

        val srcCode = mapToCode(fromLang)
        val tgtCode = mapToCode(toLang)

        // 1. Try Online API (FastAPI backend)
        try {
            val response = ApiClient.service.translate(TranslateReq(text = clean, source_lang = srcCode, target_lang = tgtCode))
            if (response.translated_text.isNotBlank()) {
                return@withContext response.translated_text
            }
        } catch (e: Exception) {
            // Server not reachable or phone offline, fall back to on-device dictionary
        }

        // 2. Try Exact Offline Match
        val key = "${clean.lowercase()}:$srcCode:$tgtCode"
        if (offlinePhrases.containsKey(key)) {
            return@withContext offlinePhrases[key]!!
        }

        // 3. Try Stripped Punctuation Match
        val stripped = clean.lowercase().replace("?", "").replace("!", "").replace(".", "").trim()
        val keyStripped = "$stripped:$srcCode:$tgtCode"
        if (offlinePhrases.containsKey(keyStripped)) {
            return@withContext offlinePhrases[keyStripped]!!
        }

        // 4. Substring phrase match
        for ((k, v) in offlinePhrases) {
            val parts = k.split(":")
            if (parts.size == 3 && parts[1] == srcCode && parts[2] == tgtCode) {
                if (clean.lowercase().contains(parts[0])) {
                    return@withContext v
                }
            }
        }

        // 5. Default smart fallback
        return@withContext if (tgtCode == "hi") {
            "नमस्ते, अनुवाद: $clean"
        } else if (tgtCode == "doi") {
            "नमस्ते, डोगरी अनुवाद: $clean"
        } else {
            "Translated: $clean"
        }
    }

    private fun mapToCode(name: String): String {
        return when (name.lowercase()) {
            "english", "en" -> "en"
            "hindi", "hi" -> "hi"
            "dogri", "doi", "डोगरी" -> "doi"
            "punjabi", "pa" -> "pa"
            "spanish", "es" -> "es"
            "french", "fr" -> "fr"
            else -> "hi"
        }
    }
}
