import logging
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.room_manager import room_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebRTC Signalling WebSocket"])


@router.websocket("/ws/room/{room_id}")
async def websocket_room_endpoint(
    websocket: WebSocket,
    room_id: str,
    client_id: str = Query(default=None),
    username: str = Query(default="Guest"),
    spoken_lang: str = Query(default=None),
    target_lang: str = Query(default=None),
    preferred_lang: str = Query(default=None)
):
    await websocket.accept()

    # Normalize room code to uppercase
    normalized_room_id = room_id.upper().strip()
    active_client_id = client_id or f"user_{uuid.uuid4().hex[:6]}"

    # Resolve languages dynamically:
    # If preferred_lang is specified, default both spoken and target to it
    eff_spoken = spoken_lang or preferred_lang or "en"
    eff_target = target_lang or preferred_lang or eff_spoken

    logger.info(f"Incoming WebSocket connection: room={normalized_room_id}, client={active_client_id}, spoken={eff_spoken}, target={eff_target}")

    connected = await room_manager.connect_client(
        room_id=normalized_room_id,
        client_id=active_client_id,
        websocket=websocket,
        username=username,
        spoken_lang=eff_spoken,
        target_lang=eff_target,
        preferred_lang=preferred_lang or eff_spoken
    )

    if not connected:
        await websocket.close(code=1008)
        return

    try:
        while True:
            data = await websocket.receive_json()
            await room_manager.handle_message(
                room_id=normalized_room_id,
                sender_id=active_client_id,
                message=data
            )
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected normally: {active_client_id}")
        await room_manager.disconnect_client(normalized_room_id, active_client_id)
    except Exception as e:
        logger.error(f"WebSocket error for client {active_client_id}: {e}")
        await room_manager.disconnect_client(normalized_room_id, active_client_id)
        try:
            await websocket.close()
        except Exception:
            pass
