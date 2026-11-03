import io
import time
import logging
from typing import Tuple
import speech_recognition as sr

logger = logging.getLogger(__name__)

# Map standard language codes to Google STT locale tags
STT_LOCALE_MAP = {
    "en": "en-US",
    "hi": "hi-IN",
    "pa": "pa-IN",
    "es": "es-ES",
    "fr": "fr-FR",
    "de": "de-DE",
    "ja": "ja-JP",
    "zh": "zh-CN",
    "ar": "ar-SA",
    "ru": "ru-RU",
    "bn": "bn-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "ur": "ur-PK"
}


class STTService:
    def __init__(self):
        self.recognizer = sr.Recognizer()

    def transcribe_audio_bytes(self, audio_bytes: bytes, language: str = "en") -> Tuple[str, float, str]:
        """
        Transcribes WAV/AIFF audio bytes using SpeechRecognition.
        Returns: (transcribed_text, latency_ms, provider)
        """
        start_time = time.time()
        locale = STT_LOCALE_MAP.get(language.lower(), "en-US")
        provider = "Google Web Speech API (STT)"

        try:
            audio_file = io.BytesIO(audio_bytes)
            with sr.AudioFile(audio_file) as source:
                audio_data = self.recognizer.record(source)
                text = self.recognizer.recognize_google(audio_data, language=locale)
                latency = round((time.time() - start_time) * 1000, 2)
                logger.info(f"STT transcribed {len(text)} chars in {latency}ms [locale={locale}]")
                return text, latency, provider

        except sr.UnknownValueError:
            latency = round((time.time() - start_time) * 1000, 2)
            logger.info("STT: Audio uninterpretable / silent")
            return "", latency, provider

        except sr.RequestError as e:
            latency = round((time.time() - start_time) * 1000, 2)
            logger.error(f"STT network error: {e}")
            raise RuntimeError(f"Speech recognition service error: {str(e)}")

        except Exception as e:
            latency = round((time.time() - start_time) * 1000, 2)
            logger.error(f"Audio processing error: {e}")
            raise ValueError(f"Could not parse audio format (ensure WAV/PCM format): {str(e)}")


stt_service = STTService()
