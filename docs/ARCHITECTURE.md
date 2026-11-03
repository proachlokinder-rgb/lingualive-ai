# LinguaLive AI — Architecture & Engineering Specification

## 1. System Overview

**LinguaLive AI** is a real-time, bidirectional voice translation and offline text translation platform designed for:
1. **Phone-to-Phone WebRTC Voice Calls**: Remote peer-to-peer audio calls with real-time speech transcription and automated translated voice synthesis relayed to the peer.
2. **Face-to-Face Dual Conversation**: Split-screen in-person mode with an inverted top display (180° rotation) for conversation partners sitting across a table.
3. **Instant Speech & Text Translation**: Multilingual workspace supporting English, Hindi, Punjabi, Spanish, French, German, Japanese, and 10+ regional Indian and global languages.
4. **Camera Vision OCR**: Real-time sign, document, and menu text recognition and translation.
5. **Offline Google ML Kit**: 100% on-device neural translation without cellular or Wi-Fi connectivity.

```mermaid
graph TD
    subgraph Client Surfaces
        AndroidApp[Android Jetpack Compose Native App]
        WebApp[Web Client: React 18 + Vite]
    end

    subgraph Backend Core [FastAPI Gateway :8000]
        WSHandler[WebRTC Signaling & Live Relay WebSocket /ws/room]
        TransRouter[Translation API /api/translate]
        TTSRouter[Speech Synthesis /api/tts]
        STTRouter[Speech Recognition /api/stt]
        RoomMgr[Room Session Manager]
    end

    subgraph AI Engines
        GoogleTrans[Google Translate Engine]
        GTTS[gTTS Voice Synthesizer]
        MLKit[Google ML Kit On-Device]
        CloudSTT[Google Web Speech API]
    end

    AndroidApp -->|WebRTC P2P Audio| WebApp
    AndroidApp -->|WebSocket Signaling| WSHandler
    WebApp -->|WebSocket Signaling| WSHandler
    WebApp -->|REST API| TransRouter
    WebApp -->|REST API| TTSRouter
    TransRouter --> GoogleTrans
    TTSRouter --> GTTS
    STTRouter --> CloudSTT
    AndroidApp -.->|100% Offline Mode| MLKit
```

---

## 2. WebRTC Real-Time Voice Translation Flow

When Caller A (speaking English) and Caller B (listening in Hindi) enter a room:

```mermaid
sequenceDiagram
    autonumber
    participant A as Caller A (en)
    participant WS as FastAPI WebSocket /ws/room
    participant Trans as Translation Service
    participant TTS as Speech Synthesizer
    participant B as Caller B (hi)

    A->>WS: Connect WebSocket (spoken=en, target=hi)
    B->>WS: Connect WebSocket (spoken=hi, target=en)
    WS-->>A: peer_joined (Caller B)
    WS-->>B: peer_joined (Caller A)

    Note over A,B: WebRTC P2P Audio Stream Established via STUN

    A->>A: Speaks "Where is the nearest hospital?"
    A->>WS: send { type: "transcript", text: "Where is the nearest hospital?" }
    WS-->>A: transcript_echo (confirm transcript)
    WS->>Trans: translate("Where is the nearest hospital?", en -> hi)
    Trans-->>WS: "निकटतम अस्पताल कहाँ है?"
    WS->>B: { type: "translated_message", original_text: "...", translated_text: "निकटतम अस्पताल कहाँ है?" }
    B->>TTS: Synthesize Audio ("निकटतम अस्पताल कहाँ है?", lang=hi)
    TTS-->>B: Audio Stream MP3 / Web Speech
    B->>B: Auto-plays translated Hindi voice in earpiece
```

---

## 3. Supported Languages & Offline Matrix

| Language | Code | Online STT | Online TTS | Offline ML Kit | On-Device Model Size |
|---|---|:---:|:---:|:---:|:---:|
| **English** | `en` | ✅ | ✅ | ✅ | ~30 MB |
| **Hindi** | `hi` | ✅ | ✅ | ✅ | ~32 MB |
| **Punjabi** | `pa` | ✅ | ✅ | Cloud Pair | Online Engine |
| **Spanish** | `es` | ✅ | ✅ | ✅ | ~28 MB |
| **French** | `fr` | ✅ | ✅ | ✅ | ~29 MB |
| **German** | `de` | ✅ | ✅ | ✅ | ~31 MB |
| **Japanese** | `ja` | ✅ | ✅ | ✅ | ~34 MB |
| **Chinese (Simplified)** | `zh-cn` | ✅ | ✅ | ✅ | ~35 MB |
| **Arabic** | `ar` | ✅ | ✅ | ✅ | ~31 MB |
| **Russian** | `ru` | ✅ | ✅ | ✅ | ~32 MB |
| **Bengali** | `bn` | ✅ | ✅ | ✅ | ~33 MB |
| **Tamil** | `ta` | ✅ | ✅ | ✅ | ~33 MB |
| **Telugu** | `te` | ✅ | ✅ | ✅ | ~32 MB |
| **Marathi** | `mr` | ✅ | ✅ | ✅ | ~31 MB |
| **Gujarati** | `gu` | ✅ | ✅ | ✅ | ~32 MB |
| **Urdu** | `ur` | ✅ | ✅ | ✅ | ~30 MB |

---

## 4. Development & Deployment

### Backend
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Web Application
```bash
cd web
npm run dev
```

### Automated Tests
```bash
python -m pytest tests/test_backend.py
```
