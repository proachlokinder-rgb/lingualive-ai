import io
import base64
import logging
from gtts import gTTS
from typing import Tuple

logger = logging.getLogger(__name__)

# gTTS supported language code map
GTTS_LANG_MAP = {
    "en": "en",
    "hi": "hi",
    "doi": "hi",  # Dogri uses Devanagari script, phonetically rendered via Hindi TTS
    "pa": "pa",
    "es": "es",
    "fr": "fr",
    "de": "de",
    "it": "it",
    "ja": "ja",
    "ko": "ko",
    "zh": "zh-CN",
    "zh-cn": "zh-CN",
    "ar": "ar",
    "ru": "ru",
    "pt": "pt",
    "bn": "bn",
    "ta": "ta",
    "te": "te",
    "gu": "gu",
    "mr": "mr",
    "ur": "ur",
}


class TTSService:
    def synthesize_to_base64(self, text: str, lang: str = "en", slow: bool = False) -> Tuple[str, float]:
        """
        Converts text to MP3 audio using gTTS and returns (base64_audio_string, duration_sec_estimate).
        """
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Text cannot be empty for TTS synthesis")

        target_lang = GTTS_LANG_MAP.get(lang.lower(), "en")

        try:
            tts = gTTS(text=clean_text, lang=target_lang, slow=slow)
            audio_fp = io.BytesIO()
            tts.write_to_fp(audio_fp)
            audio_fp.seek(0)
            audio_bytes = audio_fp.read()
            b64_str = base64.b64encode(audio_bytes).decode("utf-8")

            # Word-based estimate of duration (~140 wpm = ~2.3 words/sec)
            words = len(clean_text.split())
            duration_est = round(max(1.0, words / 2.3), 1)

            logger.info(f"Synthesized TTS for '{clean_text[:20]}...' [lang={target_lang}, bytes={len(audio_bytes)}]")
            return b64_str, duration_est

        except Exception as e:
            logger.error(f"TTS synthesis error for lang={lang}: {e}")
            # If specified regional language fails, try English fallback
            if target_lang != "en":
                try:
                    logger.info("Attempting TTS fallback with 'en' locale")
                    tts = gTTS(text=clean_text, lang="en", slow=slow)
                    audio_fp = io.BytesIO()
                    tts.write_to_fp(audio_fp)
                    audio_fp.seek(0)
                    b64_str = base64.b64encode(audio_fp.read()).decode("utf-8")
                    return b64_str, 2.0
                except Exception as inner_e:
                    raise RuntimeError(f"TTS fallback failed: {inner_e}")
            raise RuntimeError(f"TTS generation failed: {str(e)}")


tts_service = TTSService()
