import asyncio
import json
from fastapi import APIRouter, Request, Query, HTTPException
from fastapi.responses import StreamingResponse
from auth import decode_token
from realtime import pubsub

router = APIRouter()

async def event_generator(request: Request, user_id: int, user_role: str):
    q = pubsub.register()
    try:
        # Send initial connected message
        yield "data: {\"type\": \"connected\"}\n\n"
        while True:
            if await request.is_disconnected():
                break
            try:
                payload = await asyncio.wait_for(q.get(), timeout=15.0)
                parsed = json.loads(payload)
                ev_type = parsed.get("type", "")
                
                # Check authorization for the event
                is_authorized = False
                if ev_type == "health":
                    is_authorized = True
                elif ev_type.startswith("chat_"):
                    parts = ev_type.split("_")
                    target_id = parts[1]
                    if target_id == "admin":
                        is_authorized = (user_role in ["admin", "manager"])
                    else:
                        is_authorized = (str(user_id) == target_id or user_role in ["admin", "manager"])
                elif ev_type.startswith("notifications_"):
                    target_id = ev_type.split("_")[1]
                    is_authorized = (str(user_id) == target_id)
                elif ev_type in ["admin_update"]:
                    is_authorized = (user_role in ["admin", "manager"])
                elif ev_type in ["orders_update", "invoices_update"]:
                    is_authorized = True
                elif ev_type == f"orders_{user_id}":
                    is_authorized = True
                else:
                    is_authorized = True
                
                if is_authorized:
                    yield f"data: {payload}\n\n"
            except asyncio.TimeoutError:
                yield ": keep-alive\n\n"
    finally:
        pubsub.unregister(q)

@router.get("/realtime/events")
async def realtime_events(request: Request, token: str = Query(...)):
    try:
        payload = decode_token(token)
        user_id = payload["id"]
        user_role = payload.get("role", "regular_client")
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    return StreamingResponse(
        event_generator(request, user_id, user_role),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
