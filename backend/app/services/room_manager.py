import asyncio
import logging
import random
import string
import time
from typing import Dict, List, Optional
from fastapi import WebSocket
from app.models import RoomParticipant, RoomStatusResponse
from app.config import get_settings
from app.services.translation_service import translation_service

logger = logging.getLogger(__name__)


class RoomSession:
    def __init__(self, room_id: str, room_name: Optional[str] = None):
        self.room_id = room_id
        self.room_name = room_name or f"Room {room_id}"
        self.created_at = time.time()
        self.participants: Dict[str, RoomParticipant] = {}
        self.sockets: Dict[str, WebSocket] = {}

    @property
    def participant_count(self) -> int:
        return len(self.participants)

    def is_full(self, max_capacity: int = 2) -> bool:
        return len(self.participants) >= max_capacity

    def add_participant(
        self,
        client_id: str,
        socket: WebSocket,
        username: str,
        spoken_lang: str,
        target_lang: str,
        preferred_lang: Optional[str] = None
    ) -> RoomParticipant:
        participant = RoomParticipant(
            client_id=client_id,
            username=username,
            spoken_language=spoken_lang,
            target_language=target_lang,
            preferred_language=preferred_lang,
            is_muted=False,
            joined_at=time.time()
        )
        self.participants[client_id] = participant
        self.sockets[client_id] = socket
        return participant

    def remove_participant(self, client_id: str) -> Optional[RoomParticipant]:
        self.sockets.pop(client_id, None)
        return self.participants.pop(client_id, None)

    def get_peer_id(self, client_id: str) -> Optional[str]:
        for pid in self.participants:
            if pid != client_id:
                return pid
        return None


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, RoomSession] = {}
        self.settings = get_settings()

    def generate_room_code(self) -> str:
        """Generates a memorable 6-character room code."""
        while True:
            code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if code not in self.rooms:
                return code

    def create_room(self, room_name: Optional[str] = None) -> str:
        room_id = self.generate_room_code()
        self.rooms[room_id] = RoomSession(room_id=room_id, room_name=room_name)
        logger.info(f"Created conversation room: {room_id}")
        return room_id

    def get_room(self, room_id: str) -> Optional[RoomSession]:
        return self.rooms.get(room_id)

    def get_room_status(self, room_id: str) -> Optional[RoomStatusResponse]:
        room = self.get_room(room_id)
        if not room:
            return None
        return RoomStatusResponse(
            room_id=room.room_id,
            room_name=room.room_name,
            participant_count=room.participant_count,
            max_capacity=self.settings.MAX_ROOM_CAPACITY,
            participants=list(room.participants.values()),
            created_at=room.created_at,
            stun_server=self.settings.STUN_SERVER,
            turn_server_configured=bool(self.settings.TURN_SERVER)
        )

    async def connect_client(
        self,
        room_id: str,
        client_id: str,
        websocket: WebSocket,
        username: str,
        spoken_lang: str,
        target_lang: str,
        preferred_lang: Optional[str] = None
    ) -> bool:
        room = self.rooms.get(room_id)
        if not room:
            room = RoomSession(room_id=room_id)
            self.rooms[room_id] = room

        if room.is_full(self.settings.MAX_ROOM_CAPACITY):
            await websocket.send_json({
                "type": "error",
                "payload": {"message": f"Room {room_id} is already full (max {self.settings.MAX_ROOM_CAPACITY} participants)"}
            })
            return False

        participant = room.add_participant(client_id, websocket, username, spoken_lang, target_lang, preferred_lang)

        # Notify joining participant of current room state
        await websocket.send_json({
            "type": "room_joined",
            "sender_id": "server",
            "room_id": room_id,
            "payload": {
                "client_id": client_id,
                "room_name": room.room_name,
                "participants": [p.model_dump() for p in room.participants.values()],
                "stun_server": self.settings.STUN_SERVER,
                "turn_server": self.settings.TURN_SERVER or None
            }
        })

        # Notify existing peers that a new peer joined
        for pid, sock in room.sockets.items():
            if pid != client_id:
                try:
                    await sock.send_json({
                        "type": "peer_joined",
                        "sender_id": client_id,
                        "room_id": room_id,
                        "payload": participant.model_dump()
                    })
                except Exception as e:
                    logger.warning(f"Failed to notify peer {pid}: {e}")

        logger.info(f"Client {client_id} joined room {room_id} ({room.participant_count}/{self.settings.MAX_ROOM_CAPACITY})")
        return True

    async def disconnect_client(self, room_id: str, client_id: str):
        room = self.rooms.get(room_id)
        if not room:
            return

        removed = room.remove_participant(client_id)
        if removed:
            logger.info(f"Client {client_id} disconnected from room {room_id}")
            # Notify remaining peer
            for pid, sock in room.sockets.items():
                try:
                    await sock.send_json({
                        "type": "peer_left",
                        "sender_id": client_id,
                        "room_id": room_id,
                        "payload": {"client_id": client_id, "username": removed.username}
                    })
                except Exception as e:
                    logger.warning(f"Failed to notify peer {pid} of disconnect: {e}")

        # Clean up empty room
        if room.participant_count == 0:
            self.rooms.pop(room_id, None)
            logger.info(f"Room {room_id} closed as all participants departed.")

    async def handle_message(self, room_id: str, sender_id: str, message: dict):
        room = self.rooms.get(room_id)
        if not room:
            return

        msg_type = message.get("type")
        payload = message.get("payload", {})

        # 1. WebRTC Signalling (offer, answer, candidate)
        if msg_type in ["offer", "answer", "candidate"]:
            peer_id = room.get_peer_id(sender_id)
            if peer_id and peer_id in room.sockets:
                try:
                    await room.sockets[peer_id].send_json({
                        "type": msg_type,
                        "sender_id": sender_id,
                        "room_id": room_id,
                        "payload": payload,
                        "timestamp": time.time()
                    })
                except Exception as e:
                    logger.warning(f"Signalling forward failed: {e}")

        # 2. Live Transcript & Real-Time Translation
        elif msg_type == "transcript":
            text = payload.get("text", "").strip()
            source_lang = payload.get("source_lang", "auto")
            speaker_name = payload.get("speaker_name", "User")
            explicit_target_lang = payload.get("target_lang")

            sender_participant = room.participants.get(sender_id)
            if sender_participant and (not source_lang or source_lang == "auto"):
                source_lang = sender_participant.spoken_language or "auto"

            # Broadcast original transcript to sender
            sender_sock = room.sockets.get(sender_id)
            if sender_sock:
                try:
                    await sender_sock.send_json({
                        "type": "transcript_echo",
                        "sender_id": sender_id,
                        "payload": {
                            "text": text,
                            "source_lang": source_lang,
                            "speaker_name": speaker_name,
                            "timestamp": time.time()
                        }
                    })
                except Exception as e:
                    logger.warning(f"Transcript echo error: {e}")

            # Translate for peer in peer's desired target language
            peer_id = room.get_peer_id(sender_id)
            if peer_id and peer_id in room.sockets:
                peer_participant = room.participants.get(peer_id)
                # Determine target language for listener:
                # 1. Peer participant's selected target (listening) language
                # 2. Explicit target requested by sender
                # 3. Default to English ("en")
                if peer_participant and peer_participant.target_language:
                    target_lang = peer_participant.target_language
                elif explicit_target_lang:
                    target_lang = explicit_target_lang
                else:
                    target_lang = "en"

                try:
                    translated, detected, provider, latency = translation_service.translate(
                        text=text,
                        source_lang=source_lang,
                        target_lang=target_lang
                    )
                except Exception as trans_err:
                    logger.error(f"Translation relay error: {trans_err}")
                    translated = f"[Translation Error: {trans_err}]"
                    provider = "Error"
                    latency = 0.0

                try:
                    await room.sockets[peer_id].send_json({
                        "type": "translated_message",
                        "sender_id": sender_id,
                        "payload": {
                            "original_text": text,
                            "translated_text": translated,
                            "source_lang": source_lang,
                            "target_lang": target_lang,
                            "speaker_name": speaker_name,
                            "provider": provider,
                            "latency_ms": latency,
                            "timestamp": time.time()
                        }
                    })
                except Exception as e:
                    logger.warning(f"Translation relay failed to peer {peer_id}: {e}")

        # 3. Dynamic language settings update during active call
        elif msg_type == "update_languages":
            spoken = payload.get("spoken_lang")
            target = payload.get("target_lang")
            preferred = payload.get("preferred_lang")
            peer_target = payload.get("peer_target_lang")

            if sender_id in room.participants:
                if preferred:
                    room.participants[sender_id].spoken_language = spoken or preferred
                    room.participants[sender_id].target_language = target or preferred
                    room.participants[sender_id].preferred_language = preferred
                else:
                    if spoken:
                        room.participants[sender_id].spoken_language = spoken
                    if target:
                        room.participants[sender_id].target_language = target

                peer_id = room.get_peer_id(sender_id)

                # If sender requested updating the peer's listening language directly
                if peer_target and peer_id and peer_id in room.participants:
                    room.participants[peer_id].target_language = peer_target
                    peer_sock = room.sockets.get(peer_id)
                    if peer_sock:
                        try:
                            await peer_sock.send_json({
                                "type": "languages_updated",
                                "sender_id": "server",
                                "payload": {
                                    "spoken_language": room.participants[peer_id].spoken_language,
                                    "target_language": room.participants[peer_id].target_language,
                                    "updated_by": room.participants[sender_id].username
                                }
                            })
                        except Exception as e:
                            logger.warning(f"Failed to notify peer of updated target: {e}")

                # Notify sender
                sock = room.sockets.get(sender_id)
                if sock:
                    await sock.send_json({
                        "type": "languages_updated",
                        "sender_id": sender_id,
                        "payload": {
                            "spoken_language": room.participants[sender_id].spoken_language,
                            "target_language": room.participants[sender_id].target_language
                        }
                    })

                # Notify peer about sender's updated languages
                if peer_id and peer_id in room.sockets:
                    await room.sockets[peer_id].send_json({
                        "type": "peer_languages_changed",
                        "sender_id": sender_id,
                        "payload": {
                            "client_id": sender_id,
                            "username": room.participants[sender_id].username,
                            "spoken_language": room.participants[sender_id].spoken_language,
                            "target_language": room.participants[sender_id].target_language
                        }
                    })

        # 4. Mute state update
        elif msg_type == "mute_toggle":
            is_muted = payload.get("is_muted", False)
            if sender_id in room.participants:
                room.participants[sender_id].is_muted = is_muted
                peer_id = room.get_peer_id(sender_id)
                if peer_id and peer_id in room.sockets:
                    await room.sockets[peer_id].send_json({
                        "type": "peer_mute_changed",
                        "sender_id": sender_id,
                        "payload": {"is_muted": is_muted}
                    })

        # 5. Ping/Heartbeat
        elif msg_type == "ping":
            sock = room.sockets.get(sender_id)
            if sock:
                await sock.send_json({"type": "pong", "timestamp": time.time()})


room_manager = RoomManager()
