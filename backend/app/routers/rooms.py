from fastapi import APIRouter, HTTPException
from app.models import RoomCreateRequest, RoomStatusResponse
from app.services.room_manager import room_manager

router = APIRouter(prefix="/api/rooms", tags=["Conversation Rooms"])


@router.post("/create", response_model=RoomStatusResponse)
def create_conversation_room(req: RoomCreateRequest):
    """
    Creates a new conversation room and returns the 6-character room code.
    """
    room_id = room_manager.create_room(room_name=req.room_name)
    status = room_manager.get_room_status(room_id)
    if not status:
        raise HTTPException(status_code=500, detail="Failed to initialize room session.")
    return status


@router.get("/{room_id}/status", response_model=RoomStatusResponse)
def get_room_status(room_id: str):
    """
    Returns current participants and connectivity details for a room.
    """
    code = room_id.upper().strip()
    status = room_manager.get_room_status(code)
    if not status:
        raise HTTPException(status_code=404, detail=f"Room '{code}' not found or has expired.")
    return status
