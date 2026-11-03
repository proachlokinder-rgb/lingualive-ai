# LinguaLive AI — REST & WebSocket API Specification

## Base URL
- Local: `http://127.0.0.1:8000`
- WebSocket: `ws://127.0.0.1:8000`

---

## REST Endpoints

### 1. Health Check
- **`GET /api/health`**
- **Response**:
```json
{
  "status": "healthy",
  "service": "LinguaLive AI Backend",
  "version": "1.0.0",
  "uptime_seconds": 342.5,
  "active_rooms": 2,
  "timestamp": 1729618000.0
}
```

### 2. Provider Status
- **`GET /api/status`**
- Returns engine availability for Google Translate, gTTS, Google STT, OpenAI Whisper, and ML Kit.

### 3. Translate Text
- **`POST /api/translate`**
- **Payload**:
```json
{
  "text": "Where is the train station?",
  "source_lang": "en",
  "target_lang": "hi",
  "provider": "google"
}
```
- **Response**:
```json
{
  "original_text": "Where is the train station?",
  "translated_text": "रेलवे स्टेशन कहाँ है?",
  "source_lang": "en",
  "target_lang": "hi",
  "detected_source_lang": "en",
  "provider": "Google Translate (deep-translator)",
  "latency_ms": 142.5,
  "status": "success"
}
```

### 4. Text to Speech (TTS)
- **`POST /api/tts`**
- **Payload**:
```json
{
  "text": "नमस्ते! आप कैसे हैं?",
  "lang": "hi",
  "slow": false
}
```
- **Response**:
```json
{
  "audio_base64": "SUQzBAAAAAAAI1RTU0UAAAA...",
  "format": "audio/mp3",
  "lang": "hi",
  "text": "नमस्ते! आप कैसे हैं?",
  "duration_estimate_sec": 1.8
}
```

### 5. Speech to Text (STT)
- **`POST /api/stt`** (Multipart Form Data)
- **Fields**: `audio_file` (WAV/PCM/AIFF), `language` (e.g. `en`, `hi`, `pa`)
- **Response**:
```json
{
  "text": "Where is the train station",
  "language": "en",
  "confidence": 1.0,
  "provider": "Google Web Speech Recognition",
  "duration_ms": 320.0
}
```

### 6. Create Room
- **`POST /api/rooms/create`**
- **Payload**:
```json
{
  "room_name": "Call Room Alpha",
  "host_language": "en",
  "target_language": "hi"
}
```
- **Response**:
```json
{
  "room_id": "7X9K2A",
  "room_name": "Call Room Alpha",
  "participant_count": 0,
  "max_capacity": 2,
  "created_at": 1729618000.0,
  "stun_server": "stun:stun.l.google.com:19302"
}
```

---

## WebSocket Endpoint

### Real-Time Call & Signalling
- **`ws://127.0.0.1:8000/ws/room/{room_id}?client_id={id}&username={name}&spoken_lang={code}&target_lang={code}`**

#### Message Types Sent by Client:
1. **WebRTC Signalling**: `{ "type": "offer" | "answer" | "candidate", "payload": { ... } }`
2. **Speech Transcript**:
```json
{
  "type": "transcript",
  "payload": {
    "text": "Hello there",
    "source_lang": "en",
    "speaker_name": "Alice"
  }
}
```
3. **Mute State**: `{ "type": "mute_toggle", "payload": { "is_muted": true } }`

#### Message Types Received by Client:
1. **Room State**: `{ "type": "room_joined", "payload": { "client_id": "...", "participants": [...] } }`
2. **Peer Joined / Left**: `{ "type": "peer_joined" | "peer_left", "sender_id": "...", "payload": { ... } }`
3. **Transcript Echo**: `{ "type": "transcript_echo", "payload": { "text": "Hello there" } }`
4. **Translated Message Relay**:
```json
{
  "type": "translated_message",
  "sender_id": "alice_1",
  "payload": {
    "original_text": "Hello there",
    "translated_text": "नमस्ते वहाँ",
    "source_lang": "en",
    "target_lang": "hi",
    "speaker_name": "Alice",
    "latency_ms": 110.2
  }
}
```
