package com.lingualive.ai.ml

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Google ML Kit On-Device Neural Machine Translator
 * Performs 100% offline text translation directly on the mobile device.
 */
class MlKitTranslator {

    private val activeTranslators = mutableMapOf<String, Translator>()

    private fun getLanguageKey(sourceLang: String, targetLang: String) = "$sourceLang-$targetLang"

    private fun mapIsoToMlKit(code: String): String {
        return when (code.lowercase()) {
            "en" -> TranslateLanguage.ENGLISH
            "hi" -> TranslateLanguage.HINDI
            "doi" -> TranslateLanguage.HINDI // Dogri uses Devanagari script model
            "pa" -> TranslateLanguage.HINDI // Punjabi Devanagari/Hindi fallback for ML Kit
            "es" -> TranslateLanguage.SPANISH
            "fr" -> TranslateLanguage.FRENCH
            "de" -> TranslateLanguage.GERMAN
            "ja" -> TranslateLanguage.JAPANESE
            "zh-cn", "zh" -> TranslateLanguage.CHINESE
            "ar" -> TranslateLanguage.ARABIC
            "ru" -> TranslateLanguage.RUSSIAN
            "bn" -> TranslateLanguage.BENGALI
            "ta" -> TranslateLanguage.TAMIL
            "te" -> TranslateLanguage.TELUGU
            "mr" -> TranslateLanguage.MARATHI
            "gu" -> TranslateLanguage.GUJARATI
            "ur" -> TranslateLanguage.URDU
            else -> TranslateLanguage.ENGLISH
        }
    }

    suspend fun prepareModel(sourceLang: String, targetLang: String): Boolean {
        return suspendCancellableCoroutine { continuation ->
            val src = mapIsoToMlKit(sourceLang)
            val tgt = mapIsoToMlKit(targetLang)

            val options = TranslatorOptions.Builder()
                .setSourceLanguage(src)
                .setTargetLanguage(tgt)
                .build()

            val translator = Translation.getClient(options)
            val conditions = DownloadConditions.Builder()
                .build()

            translator.downloadModelIfNeeded(conditions)
                .addOnSuccessListener {
                    val key = getLanguageKey(sourceLang, targetLang)
                    activeTranslators[key] = translator
                    continuation.resume(true)
                }
                .addOnFailureListener { e ->
                    continuation.resumeWithException(e)
                }
        }
    }

    suspend fun translate(text: String, sourceLang: String, targetLang: String): String {
        val key = getLanguageKey(sourceLang, targetLang)
        var translator = activeTranslators[key]

        if (translator == null) {
            val src = mapIsoToMlKit(sourceLang)
            val tgt = mapIsoToMlKit(targetLang)

            val options = TranslatorOptions.Builder()
                .setSourceLanguage(src)
                .setTargetLanguage(tgt)
                .build()

            translator = Translation.getClient(options)
            activeTranslators[key] = translator
        }

        return suspendCancellableCoroutine { continuation ->
            translator.translate(text)
                .addOnSuccessListener { result ->
                    continuation.resume(result)
                }
                .addOnFailureListener { exception ->
                    continuation.resumeWithException(exception)
                }
        }
    }

    fun close() {
        activeTranslators.values.forEach { it.close() }
        activeTranslators.clear()
    }
}
