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

    # Reset unread counts
    if user["role"] == "client":
        db.execute("UPDATE orders SET client_unread_count = 0 WHERE id = ?", (order_id,))
    else:
        db.execute("UPDATE orders SET admin_unread_count = 0 WHERE id = ?", (order_id,))
    
    db.commit()
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

    cursor = db.execute(
        "INSERT INTO chat_messages (order_id, user_id, message_type, content) VALUES (?,?,?,?)",
        (order_id, user["id"], body.message_type, content)
    )
    last_id = cursor.lastrowid

    # Increment unread counts
    if user["role"] == "client":
        db.execute("UPDATE orders SET admin_unread_count = admin_unread_count + 1 WHERE id = ?", (order_id,))
    else:
        db.execute("UPDATE orders SET client_unread_count = client_unread_count + 1 WHERE id = ?", (order_id,))

    db.commit()
    new_msg = dict(db.execute(
        "SELECT c.*, u.name, u.role, u.avatar_url FROM chat_messages c JOIN users u ON c.user_id = u.id WHERE c.id = ?",
        (last_id,)
    ).fetchone())
    db.close()

    if user["role"] == "client":
        await send_discord_webhook(os.getenv("DISCORD_WEBHOOK_CHAT"), {"embeds": [{"title": f"New Message (Order #{order_id})", "description": f"**From:** {user['name']} (CLIENT)\n**Message:** {content}", "color": 3447003}]})
    else:
        await send_discord_webhook(os.getenv("DISCORD_WEBHOOK_CHAT"), {"embeds": [{"title": f"Admin Reply (Order #{order_id})", "description": f"**From:** {user['name']} ({user['role'].upper()})\n**Message:** {content}", "color": 16776960}]})

    # ── Keyword Auto-Responder (client messages only) ──────────────────────────
    if user["role"] == "client" and body.message_type == "text":
        msg_lower = content.lower().strip()

        AUTO_REPLIES = [
            # Greetings
            (["hi", "hello", "hey", "good morning", "good evening", "good afternoon", "howdy", "sup"],
             "👋 Hey there! Thanks for reaching out to **Starlit Siege Works**. Our team will be with you shortly. In the meantime, feel free to share more details about your project!"),
            # Pricing questions
            (["price", "cost", "how much", "rate", "pricing", "budget", "charge", "fee", "quote"],
             "💰 Pricing varies based on your project scope. You can view our standard packages on the Shop page, or our team will provide a custom quote once we review your requirements. Typically we respond within a few hours!"),
            # Timeline questions
            (["timeline", "how long", "deadline", "delivery", "eta", "when", "time frame", "duration"],
             "📅 Project timelines depend on the scope of work. Most projects are completed within 3–14 days. Your admin will specify an estimated timeline after reviewing your request."),
            # Status questions
            (["status", "update", "progress", "what's happening", "any news", "started", "when will"],
             "🔄 You can track your project status in real-time using the progress bar on your **My Services** tab. Our team will also post updates here as work progresses!"),
            # Payment questions
            (["payment", "pay", "upi", "transaction", "invoice", "receipt", "paid", "billing"],
             "💳 Once your quote is ready, click **'Proceed to Payment'** on your order to complete payment via UPI. After submitting proof, our team will verify it within 24 hours."),
            # Support / contact
            (["support", "help", "contact", "stuck", "issue", "problem", "not working", "error"],
             "🛠️ Our team is here to help! Please describe your issue in detail and we'll resolve it as quickly as possible. For urgent matters, you can also reach us on our Discord server."),
            # Thank you
            (["thank", "thanks", "ty", "appreciated", "great work", "good job", "awesome"],
             "🙏 Thank you so much! It's a pleasure working with you. Don't hesitate to reach out for any future projects or upgrades!"),
            # Cancellation
            (["cancel", "refund", "stop", "end", "terminate", "withdraw"],
             "⚠️ We're sorry to hear that! If you'd like to cancel or request a refund, please describe your concern and our team will review it according to our refund policy."),
        ]

        bot_reply = None
        for keywords, reply in AUTO_REPLIES:
            if any(kw in msg_lower for kw in keywords):
                bot_reply = reply
                break

        if bot_reply:
            import time as _time
            bot_db = get_db()
            # Use admin user ID if available, otherwise use a system fallback
            admin_row = bot_db.execute("SELECT id FROM users WHERE role='admin' LIMIT 1").fetchone()
            bot_user_id = admin_row["id"] if admin_row else user["id"]
            bot_db.execute(
                "INSERT INTO chat_messages (order_id, user_id, message_type, content) VALUES (?,?,?,?)",
                (order_id, bot_user_id, "system", bot_reply)
            )
            bot_db.commit()
            bot_db.close()

    return new_msg
