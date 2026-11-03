import time
from fastapi import APIRouter
from app.config import get_settings
from app.models import ProviderStatusResponse, ProviderStatus, LanguageListResponse, LanguageInfo
from app.services.room_manager import room_manager

router = APIRouter(prefix="/api", tags=["System & Languages"])

SERVER_START_TIME = time.time()

# Comprehensive language matrix: Online STT, Online TTS, Offline ML Kit
SUPPORTED_LANGUAGES = [
    LanguageInfo(
        code="en",
        name="English",
        native_name="English",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=30,
        notes="Universal base language for ML Kit offline pairs"
    ),
    LanguageInfo(
        code="hi",
        name="Hindi",
        native_name="हिन्दी",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=32,
        notes="Full offline support in Google ML Kit (Translate & OCR)"
    ),
    LanguageInfo(
        code="pa",
        name="Punjabi",
        native_name="ਪੰਜਾਬੀ",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=False,
        download_size_mb=None,
        notes="Supported via Online Cloud Engine (Google Cloud/DeepTranslator) and Android Speech Engine"
    ),
    LanguageInfo(
        code="doi",
        name="Dogri",
        native_name="डोगरी",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=False,
        download_size_mb=None,
        notes="Official language of Jammu & Kashmir, written in Devanagari script. Supported via Fast Neural Translation & Devanagari TTS"
    ),
    LanguageInfo(
        code="es",
        name="Spanish",
        native_name="Español",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=28,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="fr",
        name="French",
        native_name="Français",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=29,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="de",
        name="German",
        native_name="Deutsch",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=31,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="ja",
        name="Japanese",
        native_name="日本語",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=34,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="zh-cn",
        name="Chinese (Simplified)",
        native_name="简体中文",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=35,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="ar",
        name="Arabic",
        native_name="العربية",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=31,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="ru",
        name="Russian",
        native_name="Русский",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=32,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="bn",
        name="Bengali",
        native_name="বাংলা",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=33,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="ta",
        name="Tamil",
        native_name="தமிழ்",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=33,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="te",
        name="Telugu",
        native_name="తెలుగు",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=32,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="mr",
        name="Marathi",
        native_name="मराठी",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=31,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="gu",
        name="Gujarati",
        native_name="ગુજરાતી",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=32,
        notes="Full offline support in ML Kit"
    ),
    LanguageInfo(
        code="ur",
        name="Urdu",
        native_name="اردو",
        stt_supported=True,
        tts_supported=True,
        offline_mlkit_supported=True,
        download_size_mb=30,
        notes="Full offline support in ML Kit"
    ),
]


@router.get("/health")
def get_health():
    uptime_sec = round(time.time() - SERVER_START_TIME, 1)
    return {
        "status": "healthy",
        "service": "LinguaLive AI Backend",
        "version": "1.0.0",
        "uptime_seconds": uptime_sec,
        "active_rooms": len(room_manager.rooms),
        "timestamp": time.time()
    }


@router.get("/status", response_model=ProviderStatusResponse)
def get_provider_status():
    settings = get_settings()

    providers = [
        ProviderStatus(
            name="Google Translate (deep-translator)",
            service_type="translation",
            status="active",
            is_cloud=True,
            details="Free real AI cloud translation pipeline, supports 100+ languages including Hindi, English, Punjabi"
        ),
        ProviderStatus(
            name="gTTS (Google Text-To-Speech)",
            service_type="tts",
            status="active",
            is_cloud=True,
            details="Real cloud voice synthesizer generating natural MP3 audio streams"
        ),
        ProviderStatus(
            name="Google Web Speech Recognition (STT)",
            service_type="stt",
            status="active",
            is_cloud=True,
            details="Real speech-to-text recognition API supporting audio streams in multi-language locales"
        ),
        ProviderStatus(
            name="OpenAI GPT-4o / Whisper",
            service_type="translation & stt",
            status="configured" if settings.OPENAI_API_KEY else "unconfigured",
            is_cloud=True,
            details="Optional cloud provider for ultra-low-latency real-time voice & translation"
        ),
        ProviderStatus(
            name="Azure Cognitive Speech",
            service_type="stt & tts",
            status="configured" if settings.AZURE_SPEECH_KEY else "unconfigured",
            is_cloud=True,
            details="Optional neural voice synthesizer and custom acoustics STT"
        ),
        ProviderStatus(
            name="Google ML Kit On-Device (Android Client)",
            service_type="offline translation & ocr",
            status="active",
            is_cloud=False,
            details="100% on-device offline translation and OCR running directly on the Android smartphone"
        )
    ]

    return ProviderStatusResponse(
        providers=providers,
        default_translation_provider="Google Translate (deep-translator)",
        webrtc_stun_configured=bool(settings.STUN_SERVER),
        webrtc_turn_configured=bool(settings.TURN_SERVER)
    )


@router.get("/languages", response_model=LanguageListResponse)
def get_supported_languages():
    return LanguageListResponse(
        languages=SUPPORTED_LANGUAGES,
        total=len(SUPPORTED_LANGUAGES)
    )
