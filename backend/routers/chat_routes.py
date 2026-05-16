import os, json, time, base64, secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user, require_admin, send_discord_webhook, log_activity
from database import get_db

router = APIRouter()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

class ChatBody(BaseModel):
    content: str
    message_type: str = "text"
    base64Data: Optional[str] = None

@router.get("/chat/{order_id}")
def get_chat(order_id: int, user=Depends(get_current_user)):
    db = get_db()
    order = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not order: db.close(); raise HTTPException(404, "Order not found")
    if user["role"] == "client" and order["user_id"] != user["id"]:
        db.close(); raise HTTPException(403, "Forbidden")
    messages = db.execute(
        "SELECT c.*, u.name, u.role, u.avatar_url FROM chat_messages c JOIN users u ON c.user_id = u.id WHERE c.order_id = ? ORDER BY c.created_at ASC",
        (order_id,)
    ).fetchall()
    db.close()
    return [dict(m) for m in messages]

@router.post("/chat/{order_id}", status_code=201)
async def send_chat(order_id: int, body: ChatBody, user=Depends(get_current_user)):
    db = get_db()
    order = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not order: db.close(); raise HTTPException(404, "Order not found")
    if user["role"] == "client" and order["user_id"] != user["id"]:
        db.close(); raise HTTPException(403, "Forbidden")

    content = body.content
    if body.message_type in ("media", "voice") and body.base64Data:
        import re
        m = re.match(r"^data:([A-Za-z-+/]+);base64,(.+)$", body.base64Data)
        if m:
            ext = m.group(1).split("/")[-1] or "bin"
            fname = f"chat_{int(time.time())}_{secrets.token_hex(4)}.{ext}"
            with open(os.path.join(UPLOADS_DIR, fname), "wb") as f:
                f.write(base64.b64decode(m.group(2)))
            content = f"/uploads/{fname}"

    result = db.execute(
        "INSERT INTO chat_messages (order_id, user_id, message_type, content) VALUES (?,?,?,?)",
        (order_id, user["id"], body.message_type, content)
    )
    db.commit()
    new_msg = dict(db.execute(
        "SELECT c.*, u.name, u.role, u.avatar_url FROM chat_messages c JOIN users u ON c.user_id = u.id WHERE c.id = ?",
        (result.lastrowid,)
    ).fetchone())
    db.close()

    if user["role"] == "client":
        await send_discord_webhook(os.getenv("DISCORD_WEBHOOK_CHAT"), {"embeds": [{"title": f"New Message (Order #{order_id})", "description": f"**From:** {user['name']} (CLIENT)\n**Message:** {content}", "color": 3447003}]})
    else:
        await send_discord_webhook(os.getenv("DISCORD_WEBHOOK_CHAT"), {"embeds": [{"title": f"Admin Reply (Order #{order_id})", "description": f"**From:** {user['name']} ({user['role'].upper()})\n**Message:** {content}", "color": 16776960}]})

    return new_msg
