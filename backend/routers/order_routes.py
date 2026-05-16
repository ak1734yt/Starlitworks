import os, json, time, base64, secrets
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user, require_admin, send_discord_webhook, log_activity, create_notification, calculate_risk_score
from database import get_db

router = APIRouter()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

class OrderBody(BaseModel):
    service_id: str
    service_name: str
    server_link: str = ""
    description: str = ""
    timeline: str = ""
    discord_username: str = ""
    quoted_price: Optional[float] = None
    tax_rate: float = 0
    cgst: float = 0
    sgst: float = 0
    total_amount: float = 0
    payment_plan: str = "full"

class AdminOrderUpdate(BaseModel):
    status: str
    quoted_price: Optional[float] = None
    admin_notes: str = ""

class NegotiateBody(BaseModel):
    negotiated_price: float
    negotiation_reason: str = ""

class PaymentProofBody(BaseModel):
    transaction_id: str = ""
    base64Screenshot: str = ""
    payment_method: str = "manual"
    payment_plan: Optional[str] = None

class VaultBody(BaseModel):
    vault_data: dict = {}

class VerifyPaymentBody(BaseModel):
    approved: bool

class NegotiationStatusBody(BaseModel):
    negotiation_status: str

# ── Client Order Routes ──────────────────────────────────────────────────────
@router.post("/orders", status_code=201)
async def create_order(body: OrderBody, user=Depends(get_current_user)):
    db = get_db()
    result = db.execute("""
        INSERT INTO orders (user_id, service_id, service_name, server_link, description, timeline,
            discord_username, quoted_price, tax_rate, cgst, sgst, total_amount, payment_plan)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (user["id"], body.service_id, body.service_name, body.server_link, body.description,
          body.timeline, body.discord_username, body.quoted_price, body.tax_rate,
          body.cgst, body.sgst, body.total_amount, body.payment_plan))
    db.commit()
    order_id = result.lastrowid
    db.close()
    await send_discord_webhook(os.getenv("DISCORD_WEBHOOK_ORDERS"), {"embeds": [{"title": f"New Service Request: #{order_id}", "description": f"**Client:** {user['name']}\n**Service:** {body.service_name}\n**Timeline:** {body.timeline or 'Flexible'}", "color": 3447003, "timestamp": __import__("datetime").datetime.utcnow().isoformat()}]})
    return {"success": True, "order_id": order_id}

@router.get("/orders/mine")
def get_my_orders(user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.get("/orders/{order_id}")
def get_order(order_id: int, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    db.close()
    if not row: raise HTTPException(404, "Order not found")
    order = dict(row)
    if user["role"] == "client" and order["user_id"] != user["id"]: raise HTTPException(403, "Forbidden")
    return order

@router.post("/orders/{order_id}/negotiate")
def negotiate_order(order_id: int, body: NegotiateBody, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM orders WHERE id = ? AND user_id = ?", (order_id, user["id"])).fetchone()
    if not row: db.close(); raise HTTPException(404, "Not found")
    db.execute("UPDATE orders SET negotiated_price=?, negotiation_reason=?, negotiation_status='pending', updated_at=? WHERE id=?",
               (body.negotiated_price, body.negotiation_reason, int(time.time()), order_id))
    db.commit(); db.close()
    return {"success": True}

@router.post("/orders/{order_id}/accept")
def accept_order(order_id: int, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM orders WHERE id = ? AND user_id = ?", (order_id, user["id"])).fetchone()
    if not row: db.close(); raise HTTPException(404, "Not found")
    db.execute("UPDATE orders SET status='accepted', updated_at=? WHERE id=?", (int(time.time()), order_id))
    db.commit(); db.close()
    return {"success": True}

@router.post("/orders/{order_id}/payment-proof")
async def submit_payment_proof(order_id: int, body: PaymentProofBody, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM orders WHERE id = ? AND user_id = ?", (order_id, user["id"])).fetchone()
    if not row: db.close(); raise HTTPException(404, "Order not found")
    screenshot_url = ""
    if body.base64Screenshot:
        import re
        m = re.match(r"^data:([A-Za-z-+/]+);base64,(.+)$", body.base64Screenshot)
        if m:
            ext = m.group(1).split("/")[-1] or "png"
            fname = f"payment_{order_id}_{int(time.time())}.{ext}"
            fpath = os.path.join(UPLOADS_DIR, fname)
            with open(fpath, "wb") as f:
                f.write(base64.b64decode(m.group(2)))
            screenshot_url = f"/uploads/{fname}"
    db.execute("""UPDATE orders SET status='payment_pending', payment_status='pending',
        payment_method=?, transaction_id=?, payment_screenshot=?,
        payment_plan=COALESCE(?,payment_plan), payment_proof_submitted_at=?, updated_at=? WHERE id=?""",
        (body.payment_method, body.transaction_id, screenshot_url,
         body.payment_plan, int(time.time()), int(time.time()), order_id))
    db.commit(); db.close()
    await send_discord_webhook(os.getenv("DISCORD_WEBHOOK_PAYMENT"), {"embeds": [{"title": f"Payment Proof for Order #{order_id}", "description": f"**Method:** {body.payment_method}\n**TxID:** {body.transaction_id or 'N/A'}", "color": 65280}]})
    return {"success": True}

# ── Admin Order Routes ────────────────────────────────────────────────────────
@router.get("/admin/orders")
def admin_get_orders(user=Depends(require_admin)):
    db = get_db()
    rows = db.execute("SELECT o.*, u.name AS client_name, u.email AS client_email FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.put("/admin/orders/{order_id}")
async def admin_update_order(order_id: int, body: AdminOrderUpdate, user=Depends(require_admin)):
    valid = ["pending","quoted","accepted","payment_pending","in_progress","rejected","completed"]
    if body.status not in valid: raise HTTPException(400, "Invalid status.")
    accepted_by = user["id"] if body.status in ("accepted","quoted") else None
    db = get_db()
    db.execute("UPDATE orders SET status=?, quoted_price=?, admin_notes=?, accepted_by=COALESCE(?,accepted_by), updated_at=? WHERE id=?",
               (body.status, body.quoted_price, body.admin_notes, accepted_by, int(time.time()), order_id))
    db.commit(); db.close()
    log_activity(user["id"], "UPDATE_ORDER", f"Order {order_id} -> {body.status}")
    await send_discord_webhook(os.getenv("DISCORD_WEBHOOK_ORDERS"), {"embeds": [{"title": f"Order Updated #{order_id}", "description": f"Status: **{body.status}**", "color": 16776960}]})
    return {"success": True}

@router.post("/admin/orders/{order_id}/negotiation")
def admin_update_negotiation(order_id: int, body: NegotiationStatusBody, user=Depends(require_admin)):
    db = get_db()
    db.execute("UPDATE orders SET negotiation_status=?, updated_at=? WHERE id=?", (body.negotiation_status, int(time.time()), order_id))
    db.commit(); db.close()
    return {"success": True}

@router.put("/admin/orders/{order_id}/verify-payment")
def verify_payment(order_id: int, body: VerifyPaymentBody, user=Depends(require_admin)):
    status = "in_progress" if body.approved else "accepted"
    pay_status = "completed" if body.approved else "pending"
    db = get_db()
    db.execute("UPDATE orders SET status=?, payment_status=?, updated_at=? WHERE id=?", (status, pay_status, int(time.time()), order_id))
    db.commit(); db.close()
    log_activity(user["id"], "APPROVE_PAYMENT" if body.approved else "REJECT_PAYMENT", f"Order {order_id}")
    return {"success": True}

@router.put("/admin/orders/{order_id}/vault")
def update_vault(order_id: int, body: VaultBody, user=Depends(require_admin)):
    db = get_db()
    db.execute("UPDATE orders SET vault_data=?, updated_at=? WHERE id=?", (json.dumps(body.vault_data), int(time.time()), order_id))
    db.commit()
    row = db.execute("SELECT user_id FROM orders WHERE id = ?", (order_id,)).fetchone()
    db.close()
    if row: create_notification(row["user_id"], "Vault Updated", f"New assets added to Order #{order_id}", "success")
    return {"success": True}

@router.delete("/admin/orders/{order_id}")
def delete_order(order_id: int, user=Depends(require_admin)):
    db = get_db()
    db.execute("DELETE FROM chat_messages WHERE order_id = ?", (order_id,))
    db.execute("DELETE FROM orders WHERE id = ?", (order_id,))
    db.commit(); db.close()
    log_activity(user["id"], "DELETE_ORDER", f"Deleted order #{order_id}")
    return {"message": "Order deleted successfully"}
