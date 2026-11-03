# LinguaLive AI — Real-Time Voice & Offline Text Translator

> Bidirectional real-time voice translation over WebRTC phone calls, face-to-face split screen conversations, camera OCR translation, and 100% on-device Google ML Kit offline translation.

---

## 🌟 Key Features

1. **Phone-to-Phone WebRTC Voice Call Mode**:
   - P2P audio call with Google STUN server.
   - Real-time speech transcription & automated translated audio synthesis delivered directly into your peer's earpiece in their preferred language.
   - 6-character room codes for instant connections.

2. **Face-to-Face Split Screen Mode**:
   - Dual-person in-person conversation on a single tablet or smartphone.
   - Top screen inverted (180° rotation) so the person sitting across a table reads upright text in their native language with auto-TTS audio playback.

3. **Instant Text & Speech Workspace**:
   - 16+ languages (English, Hindi, Punjabi, Spanish, French, German, Japanese, Chinese, Arabic, Russian, Bengali, Tamil, Telugu, Marathi, Gujarati, Urdu).
   - Real-time microphone dictation, WAV audio upload, and natural voice playback via gTTS.

4. **Camera OCR Vision Translation**:
   - Point your camera at signs, menus, and documents.
   - Instant text extraction and translated overlay.

5. **On-Device Offline Google ML Kit**:
   - Download neural language packs (~28–35MB each) to your device for zero-latency translation without internet access.

---

## 🚀 Quick Start

### 1. Start Backend API
```bash
cd backend
python run.py
```
Backend runs at: `http://localhost:8000` (Swagger docs at `/docs`)

### 2. Start Web Client
```bash
cd web
npm install
npm run dev
```
Web client runs at: `http://localhost:3000`

### 3. Run Test Suite
```bash
python -m pytest tests/test_backend.py
```

---

## 📂 Project Structure
```
livelingo/
├── backend/          # FastAPI REST & WebSocket Signalling Server
│   ├── app/
│   │   ├── routers/  # health, translate, rooms, websocket_room
│   │   ├── services/ # room_manager, translation_service, tts_service, stt_service
│   │   └── models.py # Pydantic data schemas
│   └── run.py        # Entry point for backend
├── web/              # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/ # WebRTCCall, FaceToFace, QuickTranslate, CameraOCR, OfflineManager, SystemDiagnostics
│   │   ├── services/   # api.js, speech.js, webrtc.js
│   │   ├── App.jsx
│   │   └── index.css
│   └── vite.config.js
├── android/          # Native Android App (Jetpack Compose, ML Kit, CameraX)
│   └── app/src/main/java/com/lingualive/ai/
│       ├── ml/       # MlKitTranslator, MlKitOcr
│       ├── network/  # SignalingWebSocket, LinguaLiveApi
│       └── ui/       # Jetpack Compose Screens (Call, Split, Translate, OCR, Offline)
├── docs/             # ARCHITECTURE.md, API_SPEC.md
└── tests/            # Automated test suite (10/10 pytest passing)
```
