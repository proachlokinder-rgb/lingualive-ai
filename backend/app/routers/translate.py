import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.models import TranslateRequest, TranslateResponse, TTSRequest, TTSResponse, STTResponse
from app.services.translation_service import translation_service
from app.services.tts_service import tts_service
from app.services.stt_service import stt_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Translation & Speech"])


@router.post("/translate", response_model=TranslateResponse)
def translate_text(req: TranslateRequest):
    """
    Translates input text into target language using real AI translation engine.
    """
    try:
        translated, detected, provider, latency = translation_service.translate(
            text=req.text,
            source_lang=req.source_lang,
            target_lang=req.target_lang,
            requested_provider=req.provider
        )
        return TranslateResponse(
            original_text=req.text,
            translated_text=translated,
            source_lang=req.source_lang,
            target_lang=req.target_lang,
            detected_source_lang=detected,
            provider=provider,
            latency_ms=latency,
            status="success"
        )
    except Exception as e:
        logger.error(f"Translation endpoint failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tts", response_model=TTSResponse)
def text_to_speech(req: TTSRequest):
    """
    Synthesizes speech audio from text using real gTTS engine.
    Returns base64 encoded MP3 audio stream.
    """
    try:
        b64_audio, duration = tts_service.synthesize_to_base64(
            text=req.text,
            lang=req.lang,
            slow=req.slow
        )
        return TTSResponse(
            audio_base64=b64_audio,
            format="audio/mp3",
            lang=req.lang,
            text=req.text,
            duration_estimate_sec=duration
        )
    except Exception as e:
        logger.error(f"TTS endpoint failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(
    audio_file: UploadFile = File(..., description="Audio file in WAV, AIFF, or PCM format"),
    language: str = Form(default="en", description="Spoken language code (e.g. 'en', 'hi', 'pa')")
):
    """
    Transcribes audio into text using Google Speech Recognition API.
    """
    try:
        audio_bytes = await audio_file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Uploaded audio file was empty.")

        text, duration_ms, provider = stt_service.transcribe_audio_bytes(
            audio_bytes=audio_bytes,
            language=language
        )

        return STTResponse(
            text=text,
            language=language,
            confidence=1.0 if text else 0.0,
            provider=provider,
            duration_ms=duration_ms
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT endpoint failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))
