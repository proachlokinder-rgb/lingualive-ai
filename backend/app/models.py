from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import time


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to translate")
    source_lang: str = Field(default="auto", description="Source language ISO code (e.g. 'auto', 'en', 'hi')")
    target_lang: str = Field(..., min_length=2, max_length=10, description="Target language ISO code (e.g. 'hi', 'en', 'pa')")
    provider: Optional[str] = Field(default=None, description="Requested provider (e.g. 'google', 'libre')")


class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    detected_source_lang: Optional[str] = None
    provider: str
    latency_ms: float
    status: str = "success"


class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str
    stt_supported: bool
    tts_supported: bool
    offline_mlkit_supported: bool
    download_size_mb: Optional[int] = None
    notes: Optional[str] = None


class LanguageListResponse(BaseModel):
    languages: List[LanguageInfo]
    total: int


class ProviderStatus(BaseModel):
    name: str
    service_type: str  # translation, stt, tts
    status: str        # active, unconfigured, offline
    is_cloud: bool
    details: str


class ProviderStatusResponse(BaseModel):
    providers: List[ProviderStatus]
    default_translation_provider: str
    webrtc_stun_configured: bool
    webrtc_turn_configured: bool


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1500, description="Text to synthesize")
    lang: str = Field(default="en", description="Target voice language code (e.g. 'en', 'hi', 'pa')")
    slow: bool = Field(default=False, description="Whether to speak slowly")


class TTSResponse(BaseModel):
    audio_base64: str
    format: str = "audio/mp3"
    lang: str
    text: str
    duration_estimate_sec: Optional[float] = None


class STTResponse(BaseModel):
    text: str
    language: str
    confidence: Optional[float] = 1.0
    provider: str
    duration_ms: float


class RoomCreateRequest(BaseModel):
    room_name: Optional[str] = Field(default=None, max_length=50)
    host_language: str = Field(default="en", description="Host's spoken language")
    target_language: str = Field(default="en", description="Host's preferred listening language")
    partner_language: Optional[str] = Field(default=None, description="Partner's expected language")


class RoomParticipant(BaseModel):
    client_id: str
    username: str
    spoken_language: str
    target_language: str
    preferred_language: Optional[str] = None
    is_muted: bool = False
    joined_at: float = Field(default_factory=time.time)


class RoomStatusResponse(BaseModel):
    room_id: str
    room_name: Optional[str] = None
    participant_count: int
    max_capacity: int
    participants: List[RoomParticipant]
    created_at: float
    stun_server: str
    turn_server_configured: bool


class SignalingMessage(BaseModel):
    type: str  # "join", "peer_joined", "peer_left", "offer", "answer", "candidate", "transcript", "translation", "mute", "ping", "pong", "error"
    sender_id: Optional[str] = None
    target_id: Optional[str] = None
    room_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)
