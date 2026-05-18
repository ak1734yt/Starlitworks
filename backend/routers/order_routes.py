import os, json, time, base64, secrets, datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user, require_admin, send_discord_webhook, log_activity, create_notification, calculate_risk_score
from database import get_db

router = APIRouter()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
INVOICES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "invoices")
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(INVOICES_DIR, exist_ok=True)

def auto_generate_invoice(order_id: int):
    db = get_db()
    order = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not order: return
    user = db.execute("SELECT name FROM users WHERE id = ?", (order["user_id"],)).fetchone()
    db.close()
    
    # Check if invoice already exists for this order
    for fname in os.listdir(INVOICES_DIR):
        if not fname.endswith(".json"): continue
        with open(os.path.join(INVOICES_DIR, fname)) as f:
            existing = json.load(f)
            if str(existing.get("orderId")) == str(order_id):
                return # Already generated

    inv_id = f"INV-{order_id}-{int(time.time())}"
    client_name = user["name"] if user else "Client"
    
    amount = float(order["quoted_price"] if order["quoted_price"] else order["total_amount"])
    cgst = float(order["cgst"] or 0)
    sgst = float(order["sgst"] or 0)
    
    inv = {
        "id": inv_id,
        "invoiceNumber": inv_id,
        "orderId": order_id,
        "userId": order["user_id"],
        "invoiceDate": datetime.datetime.now().strftime("%Y-%m-%d"),
        "savedAt": datetime.datetime.utcnow().isoformat(),
        "client": { "name": client_name, "serverName": order["service_name"] },
        "org": {"name": "Starlit Siege Works", "emails": ["support@starlitsiegeworks.com"], "phone": "+91 9876543210"},
        "items": [{
            "id": secrets.token_hex(4),
            "desc": order["service_name"],
            "qty": int(order["quantity"] or 1),
            "rate": amount / float(order["quantity"] or 1),
            "total": amount
        }],
        "subtotal": amount - cgst - sgst,
        "taxTotal": cgst + sgst,
        "grandTotal": amount,
        "currency": "₹",
        "paymentType": order["payment_plan"] or "full",
        "paymentStatus": "pending"
    }

    if inv["paymentType"] == "installment":
        # Generate some default installments for manual tracking
        inv["installments"] = [
            {"month": "Payment 1 (Setup)", "amount": amount * 0.5, "paid": False, "status": "pending"},
            {"month": "Payment 2 (Final)", "amount": amount * 0.5, "paid": False, "status": "pending"}
        ]
        inv["recurringTotal"] = 0

    with open(os.path.join(INVOICES_DIR, f"{inv_id}.json"), "w") as f:
        json.dump(inv, f, indent=2)
    try:
        from routers.invoice_routes import format_invoice_txt
        with open(os.path.join(INVOICES_DIR, f"{inv_id}.txt"), "w", encoding="utf-8") as f:
            f.write(format_invoice_txt(inv))
    except: pass

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
    credits_applied: float = 0
    quantity: int = 1

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
    credits_applied: float = 0

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
            discord_username, quoted_price, tax_rate, cgst, sgst, total_amount, payment_plan, quantity)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (user["id"], body.service_id, body.service_name, body.server_link, body.description,
          body.timeline, body.discord_username, body.quoted_price, body.tax_rate,
          body.cgst, body.sgst, body.total_amount, body.payment_plan, body.quantity))
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
    auto_generate_invoice(order_id)
    return {"success": True}

@router.post("/orders/{order_id}/payment-proof")
async def submit_payment_proof(order_id: str, body: PaymentProofBody, user=Depends(get_current_user)):
    import re
    import time
    import json
    import base64
    
    applied = float(body.credits_applied or 0.0)
    if body.payment_method == "credits":
        body.transaction_id = "CREDIT_PAYMENT"
    else:
        if not re.match(r"^[a-zA-Z0-9_-]{8,30}$", body.transaction_id):
            raise HTTPException(400, "Transaction ID must be 8-30 alphanumeric characters.")

    is_numeric_order = False
    try:
        numeric_order_id = int(order_id)
        is_numeric_order = True
    except ValueError:
        pass

    db = get_db()
    
    # 1. Fetch user details and validate credits
    user_row = db.execute("SELECT details FROM users WHERE id=?", (user["id"],)).fetchone()
    if not user_row:
        db.close()
        raise HTTPException(404, "User not found")
        
    user_details = json.loads(user_row["details"] or "{}")
    user_credits = float(user_details.get("credits", 0.0))
    
    if applied > user_credits:
        db.close()
        raise HTTPException(400, f"Insufficient credits. You have ₹{user_credits}, but tried to apply ₹{applied}.")

    # Deduct credits from user profile immediately
    if applied > 0:
        user_details["credits"] = max(0.0, user_credits - applied)
        db.execute("UPDATE users SET details=? WHERE id=?", (json.dumps(user_details), user["id"]))
        db.commit()
        log_activity(user["id"], "USE_CREDITS", f"Applied ₹{applied} credits to order/invoice {order_id}")

    if is_numeric_order:
        row = db.execute("SELECT * FROM orders WHERE id = ? AND user_id = ?", (numeric_order_id, user["id"])).fetchone()
        if not row: db.close(); raise HTTPException(404, "Order not found")
        
        screenshot_url = ""
        if body.base64Screenshot:
            m = re.match(r"^data:([A-Za-z-+/]+);base64,(.+)$", body.base64Screenshot)
            if m:
                ext = m.group(1).split("/")[-1] or "png"
                fname = f"payment_{numeric_order_id}_{int(time.time())}.{ext}"
                fpath = os.path.join(UPLOADS_DIR, fname)
                with open(fpath, "wb") as f:
                    f.write(base64.b64decode(m.group(2)))
                screenshot_url = f"/uploads/{fname}"
                
        if body.payment_method == "credits":
            # Auto-approve since credit covers it
            db.execute("""UPDATE orders SET status='accepted', payment_status='completed',
                payment_method=?, transaction_id=?, payment_screenshot=?,
                payment_plan=COALESCE(?,payment_plan), payment_proof_submitted_at=?, updated_at=?,
                credits_applied=? WHERE id=?""",
                (body.payment_method, body.transaction_id, screenshot_url,
                 body.payment_plan, int(time.time()), int(time.time()), applied, numeric_order_id))
            db.commit()
            
            # System confirmation chat log
            sys_msg = f"✅ Payment confirmed! Your project is now officially accepted via Starlit Credits (₹{applied} applied). We'll begin work shortly."
            db.execute("INSERT INTO chat_messages (order_id, user_id, message_type, content) VALUES (?,?,?,?)",
                       (numeric_order_id, user["id"], "system", sys_msg))
            db.commit()
            create_notification(user["id"], "Order Paid", sys_msg[:100], "success")
            
            try:
                auto_generate_invoice(numeric_order_id)
            except Exception as e:
                print("Error generating invoice for credit purchase:", e)
        else:
            # Partial or cash payment
            db.execute("""UPDATE orders SET status='payment_pending', payment_status='pending',
                payment_method=?, transaction_id=?, payment_screenshot=?,
                payment_plan=COALESCE(?,payment_plan), payment_proof_submitted_at=?, updated_at=?,
                credits_applied=? WHERE id=?""",
                (body.payment_method, body.transaction_id, screenshot_url,
                 body.payment_plan, int(time.time()), int(time.time()), applied, numeric_order_id))
            db.commit()
            
        db.close()
        await send_discord_webhook(os.getenv("DISCORD_WEBHOOK_PAYMENT"), {"embeds": [{"title": f"Payment Proof Submitted: Order #{numeric_order_id}", "description": f"**Method:** {body.payment_method}\n**Credits Applied:** ₹{applied}\n**TxID:** {body.transaction_id or 'N/A'}", "color": 65280}]})
        return {"success": True}
    else:
        p = os.path.join(INVOICES_DIR, f"{order_id}.json")
        if not os.path.exists(p):
            db.close()
            raise HTTPException(404, "Invoice not found")
        with open(p) as f:
            inv = json.load(f)
        if str(inv.get("userId")) != str(user["id"]):
            db.close()
            raise HTTPException(403, "Forbidden")
            
        screenshot_url = ""
        if body.base64Screenshot:
            m = re.match(r"^data:([A-Za-z-+/]+);base64,(.+)$", body.base64Screenshot)
            if m:
                ext = m.group(1).split("/")[-1] or "png"
                fname = f"invoice_payment_{order_id}_{int(time.time())}.{ext}"
                fpath = os.path.join(UPLOADS_DIR, fname)
                with open(fpath, "wb") as f:
                    f.write(base64.b64decode(m.group(2)))
                screenshot_url = f"/uploads/{fname}"
        
        if body.payment_method == "credits":
            inv["paymentStatus"] = "paid"
        else:
            inv["paymentStatus"] = "payment_pending"
            
        inv["payment_method"] = body.payment_method
        inv["transaction_id"] = body.transaction_id
        inv["payment_screenshot"] = screenshot_url
        inv["payment_proof_submitted_at"] = int(time.time())
        inv["credits_applied"] = applied
        
        with open(p, "w") as f:
            json.dump(inv, f, indent=2)
            
        try:
            from routers.invoice_routes import format_invoice_txt
            txt_path = os.path.join(INVOICES_DIR, f"{order_id}.txt")
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(format_invoice_txt(inv))
        except Exception as e:
            print("Error re-formatting txt invoice:", e)
            
        db.close()
        await send_discord_webhook(os.getenv("DISCORD_WEBHOOK_PAYMENT"), {"embeds": [{"title": f"Payment Proof Submitted: Invoice {order_id}", "description": f"**Method:** {body.payment_method}\n**Credits Applied:** ₹{applied}\n**TxID:** {body.transaction_id or 'N/A'}", "color": 65280}]})
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
    
    row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not row: db.close(); raise HTTPException(404, "Order not found")

    # ── Enforce min_price floor ──────────────────────────────────────────────
    if body.quoted_price is not None and body.quoted_price > 0:
        product_row = db.execute(
            "SELECT min_price FROM products WHERE product_key = ? OR name = ?",
            (row["service_id"], row["service_name"])
        ).fetchone()
        if product_row:
            floor = float(product_row["min_price"] or 0)
            if floor > 0 and body.quoted_price < floor:
                db.close()
                raise HTTPException(400, f"Quoted price ₹{body.quoted_price} is below the minimum allowed price of ₹{floor} set by the Manager.")
    
    db.execute("UPDATE orders SET status=?, quoted_price=?, admin_notes=?, accepted_by=COALESCE(?,accepted_by), updated_at=? WHERE id=?",
               (body.status, body.quoted_price, body.admin_notes, accepted_by, int(time.time()), order_id))
    db.commit()
    db.close()
    db_chat = get_db()
    if body.status == "accepted" and row["status"] != "accepted":
        auto_generate_invoice(order_id)
        
    if body.status != row["status"]:
        auto_responses = {
            "quoted":          "📋 Your service request has been reviewed and a quote has been prepared. Please check the quoted price and click 'Proceed to Payment' when ready.",
            "accepted":        "✅ Payment confirmed! Your project is now officially accepted. We'll begin work shortly and keep you updated via this chat.",
            "in_progress":     "🚀 Great news — work on your project has begun! We'll send updates here as we hit key milestones. Feel free to ask questions anytime.",
            "payment_pending": "⏳ Payment proof received. Our team is reviewing your transaction and will update you within 24 hours.",
            "completed":       "🎉 Your project has been marked as complete! You can access your deliverables in the Vault section. Thank you for choosing Starlit Siege Works!",
            "rejected":        "⚠️ Your order request could not be fulfilled at this time. Please reach out via chat if you have questions or would like to discuss alternatives.",
            "pending":         "🔔 Your order is back in the queue. Our team will review it shortly.",
        }
        sys_msg = auto_responses.get(body.status, f"📌 Order status updated to {body.status.upper().replace('_', ' ')}.")
        db_chat.execute("INSERT INTO chat_messages (order_id, user_id, message_type, content) VALUES (?,?,?,?)",
                   (order_id, user["id"], "system", sys_msg))
        db_chat.commit()
        create_notification(row["user_id"], "Order Update", sys_msg[:100], "info")
    db_chat.close()

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
    db = get_db()
    row = db.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not row: db.close(); raise HTTPException(404, "Order not found")

    if body.approved:
        # Check if this is a credit top-up order
        if str(row["service_id"]) == "credit_topup" or str(row["service_name"]).startswith("Add Credit"):
            status = "completed"
            pay_status = "completed"
            
            # Auto credit user
            user_id = row["user_id"]
            amount_to_add = float(row["total_amount"] or row["quoted_price"] or 0)
            
            user_row = db.execute("SELECT details FROM users WHERE id=?", (user_id,)).fetchone()
            if user_row:
                user_details = json.loads(user_row["details"] or "{}")
                current_credits = float(user_details.get("credits", 0.0))
                new_credits = current_credits + amount_to_add
                user_details["credits"] = new_credits
                
                db.execute("UPDATE users SET details=? WHERE id=?", (json.dumps(user_details), user_id))
        else:
            status = "accepted" 
            pay_status = "completed"
    else:
        status = "payment_pending" 
        pay_status = "pending"
        
        # Refund credits back to the user since proof was rejected
        credits_applied = float(row["credits_applied"] or 0.0)
        if credits_applied > 0:
            user_id = row["user_id"]
            user_row = db.execute("SELECT details FROM users WHERE id=?", (user_id,)).fetchone()
            if user_row:
                user_details = json.loads(user_row["details"] or "{}")
                current_credits = float(user_details.get("credits", 0.0))
                user_details["credits"] = current_credits + credits_applied
                db.execute("UPDATE users SET details=? WHERE id=?", (json.dumps(user_details), user_id))
            # Reset credits_applied on the order to 0 since they've been refunded
            db.execute("UPDATE orders SET credits_applied=0 WHERE id=?", (order_id,))

    db.execute("UPDATE orders SET status=?, payment_status=?, updated_at=? WHERE id=?", (status, pay_status, int(time.time()), order_id))
    db.commit(); db.close()

    log_activity(user["id"], "VERIFY_PAYMENT", f"Order {order_id} Approved={body.approved}")


    # Automatic Invoice Sync
    if body.approved:
        try:
            INVOICES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "invoices")
            if os.path.exists(INVOICES_DIR):
                for fname in os.listdir(INVOICES_DIR):
                    if not fname.endswith(".json"): continue
                    p = os.path.join(INVOICES_DIR, fname)
                    with open(p) as f: inv = json.load(f)
                    
                    if str(inv.get("orderId")) == str(order_id):
                        updated = False
                        if inv.get("paymentType") == "installment":
                            # Mark first pending installment as paid
                            for inst in inv.get("installments", []):
                                if not inst.get("paid"):
                                    inst["paid"] = True
                                    inst["status"] = "paid"
                                    updated = True
                                    break
                        else:
                            # Full payment
                            inv["paymentStatus"] = "paid"
                            updated = True
                        
                        if updated:
                            with open(p, "w") as f: json.dump(inv, f, indent=2)
                            # Also update the TXT version if helper exists
                            try:
                                from routers.invoice_routes import format_invoice_txt
                                with open(os.path.join(INVOICES_DIR, f"{inv['id']}.txt"), "w", encoding="utf-8") as f:
                                    f.write(format_invoice_txt(inv))
                            except: pass
        except Exception as e:
            print(f"Error syncing invoice: {e}")

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
