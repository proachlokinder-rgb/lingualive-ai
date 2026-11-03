import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "LinguaLive AI" in data["project"]
    assert "/api/health" in data["endpoints"]["health"]


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "LinguaLive AI Backend"
    assert "uptime_seconds" in data


def test_status_endpoint():
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    assert len(data["providers"]) > 0
    names = [p["name"] for p in data["providers"]]
    assert any("Google Translate" in name for name in names)
    assert any("gTTS" in name for name in names)
    assert any("ML Kit" in name for name in names)


def test_supported_languages():
    response = client.get("/api/languages")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 10
    codes = [l["code"] for l in data["languages"]]
    assert "en" in codes
    assert "hi" in codes
    assert "pa" in codes
    assert "es" in codes
    assert "fr" in codes


def test_translate_english_to_hindi():
    payload = {
        "text": "Hello",
        "source_lang": "en",
        "target_lang": "hi"
    }
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["original_text"] == "Hello"
    assert len(data["translated_text"]) > 0
    assert "provider" in data
    assert data["latency_ms"] >= 0


def test_translate_validation_error():
    # Empty text
    response = client.post("/api/translate", json={"text": "", "target_lang": "hi"})
    assert response.status_code == 422

    # Missing target_lang
    response = client.post("/api/translate", json={"text": "Hello"})
    assert response.status_code == 422


def test_tts_synthesis():
    payload = {
        "text": "Welcome to LinguaLive AI",
        "lang": "en",
        "slow": False
    }
    response = client.post("/api/tts", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["format"] == "audio/mp3"
    assert len(data["audio_base64"]) > 50
    assert data["duration_estimate_sec"] > 0


def test_tts_validation_error():
    # Empty text
    response = client.post("/api/tts", json={"text": "", "lang": "en"})
    assert response.status_code == 422


def test_room_lifecycle():
    # 1. Create a room
    create_res = client.post("/api/rooms/create", json={"room_name": "Test Room"})
    assert create_res.status_code == 200
    room_data = create_res.json()
    room_id = room_data["room_id"]
    assert len(room_id) == 6
    assert room_data["participant_count"] == 0

    # 2. Get status of existing room
    status_res = client.get(f"/api/rooms/{room_id}/status")
    assert status_res.status_code == 200
    assert status_res.json()["room_id"] == room_id

    # 3. Non-existent room returns 404
    non_existent = client.get("/api/rooms/NONEX1/status")
    assert non_existent.status_code == 404


def test_websocket_signalling_and_translation():
    # Create room
    create_res = client.post("/api/rooms/create", json={"room_name": "WebRTC Test"})
    room_id = create_res.json()["room_id"]

    # Connect peer 1
    with client.websocket_connect(
        f"/ws/room/{room_id}?client_id=alice_1&username=Alice&spoken_lang=en&target_lang=hi"
    ) as ws1:
        join_msg1 = ws1.receive_json()
        assert join_msg1["type"] == "room_joined"
        assert join_msg1["payload"]["client_id"] == "alice_1"

        # Connect peer 2
        with client.websocket_connect(
            f"/ws/room/{room_id}?client_id=bob_2&username=Bob&spoken_lang=hi&target_lang=en"
        ) as ws2:
            join_msg2 = ws2.receive_json()
            assert join_msg2["type"] == "room_joined"

            # Peer 1 receives notification that Bob joined
            peer_joined_msg = ws1.receive_json()
            assert peer_joined_msg["type"] == "peer_joined"
            assert peer_joined_msg["sender_id"] == "bob_2"

            # Alice sends WebRTC Offer
            ws1.send_json({
                "type": "offer",
                "payload": {"sdp": "v=0\r\no=alice 1234 5678 IN IP4 127.0.0.1\r\ns=-\r\n"}
            })

            # Bob receives WebRTC Offer
            offer_received = ws2.receive_json()
            assert offer_received["type"] == "offer"
            assert offer_received["sender_id"] == "alice_1"

            # Bob sends WebRTC Answer
            ws2.send_json({
                "type": "answer",
                "payload": {"sdp": "v=0\r\no=bob 8765 4321 IN IP4 127.0.0.1\r\ns=-\r\n"}
            })

            # Alice receives WebRTC Answer
            answer_received = ws1.receive_json()
            assert answer_received["type"] == "answer"
            assert answer_received["sender_id"] == "bob_2"

            # Alice speaks: sends transcript "Hello"
            ws1.send_json({
                "type": "transcript",
                "payload": {
                    "text": "Hello",
                    "source_lang": "en",
                    "speaker_name": "Alice"
                }
            })

            # Alice gets transcript echo
            echo_msg = ws1.receive_json()
            assert echo_msg["type"] == "transcript_echo"
            assert echo_msg["payload"]["text"] == "Hello"

            # Bob receives real-time translated message
            translated_msg = ws2.receive_json()
            assert translated_msg["type"] == "translated_message"
            assert translated_msg["sender_id"] == "alice_1"
            assert translated_msg["payload"]["original_text"] == "Hello"
            assert len(translated_msg["payload"]["translated_text"]) > 0

            # Bob updates target language dynamically to Dogri ('doi')
            ws2.send_json({
                "type": "update_languages",
                "payload": {"target_lang": "doi"}
            })
            ack = ws2.receive_json()
            assert ack["type"] == "languages_updated"
            assert ack["payload"]["target_language"] == "doi"

            # Alice receives notification about Bob's language change
            peer_lang_update = ws1.receive_json()
            assert peer_lang_update["type"] == "peer_languages_changed"
            assert peer_lang_update["payload"]["target_language"] == "doi"


def test_translate_english_to_dogri():
    payload = {
        "text": "Hello, how are you?",
        "source_lang": "en",
        "target_lang": "doi"
    }
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["translated_text"]) > 0
    assert data["latency_ms"] >= 0


def test_hindi_speaker_translated_to_english_listener():
    """
    Verifies that when Participant 1 speaks in Hindi and Participant 2 selected English,
    Participant 2 receives and hears the audio translated into English.
    """
    create_res = client.post("/api/rooms/create", json={"room_name": "Hindi-English Call"})
    room_id = create_res.json()["room_id"]

    # Participant 1 (speaks Hindi, preferred Hindi)
    with client.websocket_connect(
        f"/ws/room/{room_id}?client_id=rahul_1&username=Rahul&preferred_lang=hi&spoken_lang=hi&target_lang=hi"
    ) as ws1:
        join1 = ws1.receive_json()
        assert join1["type"] == "room_joined"

        # Participant 2 (speaks English, preferred English)
        with client.websocket_connect(
            f"/ws/room/{room_id}?client_id=john_2&username=John&preferred_lang=en&spoken_lang=en&target_lang=en"
        ) as ws2:
            join2 = ws2.receive_json()
            assert join2["type"] == "room_joined"

            # Rahul gets peer_joined for John
            peer_joined = ws1.receive_json()
            assert peer_joined["type"] == "peer_joined"

            # Rahul speaks in Hindi: "नमस्ते आप कैसे हैं?"
            ws1.send_json({
                "type": "transcript",
                "payload": {
                    "text": "नमस्ते आप कैसे हैं?",
                    "source_lang": "hi",
                    "speaker_name": "Rahul"
                }
            })

            # Rahul receives his own echo
            echo = ws1.receive_json()
            assert echo["type"] == "transcript_echo"
            assert echo["payload"]["text"] == "नमस्ते आप कैसे हैं?"

            # John receives the translated message in English!
            translated_for_john = ws2.receive_json()
            assert translated_for_john["type"] == "translated_message"
            assert translated_for_john["payload"]["target_lang"] == "en"
            assert translated_for_john["payload"]["original_text"] == "नमस्ते आप कैसे हैं?"
            # Translated text must be in English
            assert "how are you" in translated_for_john["payload"]["translated_text"].lower() or "hello" in translated_for_john["payload"]["translated_text"].lower()

            # Now John speaks in English: "I am fine, thank you"
            ws2.send_json({
                "type": "transcript",
                "payload": {
                    "text": "I am fine, thank you",
                    "source_lang": "en",
                    "speaker_name": "John"
                }
            })

            echo_john = ws2.receive_json()
            assert echo_john["type"] == "transcript_echo"

            # Rahul receives the translated message in Hindi!
            translated_for_rahul = ws1.receive_json()
            assert translated_for_rahul["type"] == "translated_message"
            assert translated_for_rahul["payload"]["target_lang"] == "hi"
            assert len(translated_for_rahul["payload"]["translated_text"]) > 0


