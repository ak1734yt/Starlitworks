import os, json, time, base64, secrets, datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user, require_admin, send_discord_webhook, send_modular_webhook, log_activity, create_notification, calculate_risk_score
from mailer import send_order_confirm_email, send_invoice_email, send_payment_approval_email, send_quote_email
from database import get_db
from realtime import pubsub

router = APIRouter()

# Import referral processing (lazy to avoid circular imports)
def _trigger_referral_completion(order_id, user_id, order_amount):
    try:
        from routers.referral_routes import process_referral_on_order_complete
        process_referral_on_order_complete(order_id, user_id, order_amount)
    except Exception as e:
        print(f"Referral processing error: {e}")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
INVOICES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "invoices")
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(INVOICES_DIR, exist_ok=True)

def auto_generate_invoice(order_id: int):
    db = get_db()
    order = db.execute("SELECT * FROM orders.orders WHERE id = ?", (order_id,)).fetchone()
    if not order: return
    order = dict(order)
    user = db.execute("SELECT name FROM auth.users WHERE id = ?", (order["user_id"],)).fetchone()
    db.close()
    
    amount = float(order.get("total_amount") or order.get("quoted_price") or 0)
    cgst = float(order.get("cgst") or 0)
    sgst = float(order.get("sgst") or 0)
    
    # Check if invoice already exists for this order
    existing_path = None
    existing_inv = None
    for fname in os.listdir(INVOICES_DIR):
        if not fname.endswith(".json"): continue
        fpath = os.path.join(INVOICES_DIR, fname)
        try:
            with open(fpath) as f:
                existing = json.load(f)
                if str(existing.get("orderId")) == str(order_id):
                    existing_path = fpath
                    existing_inv = existing
                    break
        except:
            continue

    if existing_inv and existing_path:
        # Update the existing invoice
        existing_inv["grandTotal"] = amount
        existing_inv["subtotal"] = amount - cgst - sgst
        existing_inv["taxTotal"] = cgst + sgst
        if order["payment_status"] == "completed":
            existing_inv["paymentStatus"] = "paid"
            if existing_inv.get("paymentType") == "installment" and existing_inv.get("installments"):
                for i in range(len(existing_inv["installments"])):
                    existing_inv["installments"][i]["paid"] = True
                    existing_inv["installments"][i]["status"] = "paid"
        if existing_inv.get("items"):
            existing_inv["items"][0]["rate"] = amount / float(order["quantity"] or 1)
            existing_inv["items"][0]["total"] = amount
            existing_inv["items"][0]["desc"] = order["service_name"]
            existing_inv["items"][0]["qty"] = int(order["quantity"] or 1)
        
        # If installment plan and has installments, update installment amounts proportionately
        if existing_inv.get("paymentType") == "installment" and existing_inv.get("installments"):
            total_inst = len(existing_inv["installments"])
            if total_inst > 0:
                for i in range(total_inst):
                    existing_inv["installments"][i]["amount"] = amount / total_inst
                    
        with open(existing_path, "w") as f:
            json.dump(existing_inv, f, indent=2)
        try:
            from routers.invoice_routes import generate_invoice_pdf
            generate_invoice_pdf(existing_inv, existing_path.replace(".json", ".pdf"))
        except Exception as e:
            print("Failed to pre-generate invoice pdf for existing invoice:", e)
        try: pubsub.publish("invoices_update")
        except: pass
        return

    # If it doesn't exist, create a new one
    inv_id = f"INV-{order_id}-{int(time.time())}"
    client_name = user["name"] if user else "Client"
    is_paid = order["payment_status"] == "completed"
    
    inv = {
        "id": inv_id,
        "invoiceNumber": inv_id,
        "orderId": order_id,
        "userId": order["user_id"],
        "invoiceDate": datetime.datetime.now().strftime("%Y-%m-%d"),
        "savedAt": datetime.datetime.utcnow().isoformat(),
        "client": { "name": client_name, "serverName": order["service_name"] },
        "org": {"name": "Starlit Siege Works", "emails": ["Akshatkumar945296@gmail.com"], "phone": "+91 7392939277"},
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
        "paymentStatus": "paid" if is_paid else "pending"
    }

    if inv["paymentType"] == "installment":
        inv["installments"] = [
            {"month": "Payment 1 (Setup)", "amount": amount * 0.5, "paid": is_paid, "status": "paid" if is_paid else "pending"},
            {"month": "Payment 2 (Final)", "amount": amount * 0.5, "paid": is_paid, "status": "paid" if is_paid else "pending"}
        ]
        inv["recurringTotal"] = 0

    with open(os.path.join(INVOICES_DIR, f"{inv_id}.json"), "w") as f:
        json.dump(inv, f, indent=2)

    try:
        from routers.invoice_routes import generate_invoice_pdf
        generate_invoice_pdf(inv, os.path.join(INVOICES_DIR, f"{inv_id}.pdf"))
    except Exception as e:
        print("Failed to pre-generate invoice pdf for new invoice:", e)

    try:
        user_row = get_db().execute("SELECT email FROM auth.users WHERE id=?", (order["user_id"],)).fetchone()
        if user_row and user_row["email"]:
            send_invoice_email(client_name, user_row["email"], inv_id, f"₹{amount}")
    except Exception as e:
        print(f"Failed to send invoice email: {e}")
    try:
        from routers.invoice_routes import format_invoice_txt
        with open(os.path.join(INVOICES_DIR, f"{inv_id}.txt"), "w", encoding="utf-8") as f:
            f.write(format_invoice_txt(inv))
    except: pass
    try: pubsub.publish("invoices_update")
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
    coupon_code: Optional[str] = None
    discount_amount: Optional[float] = None
    subtotal: Optional[float] = None
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    grand_total: Optional[float] = None

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
    
    # Apply Role-based Discounts
    client_role = user.get("role", "client")
    discount_multiplier = 1.0
    if client_role == "regular_client":
        discount_multiplier = 0.95
    elif client_role == "vip_client":
        discount_multiplier = 0.92
        
    body.total_amount = round(body.total_amount * discount_multiplier, 2)
    if body.quoted_price:
        body.quoted_price = round(body.quoted_price * discount_multiplier, 2)
        
    result = db.execute("""
        INSERT INTO orders.orders (user_id, service_id, service_name, server_link, description, timeline,
            discord_username, quoted_price, tax_rate, cgst, sgst, total_amount, payment_plan, quantity)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (user["id"], body.service_id, body.service_name, body.server_link, body.description,
          body.timeline, body.discord_username, body.quoted_price, body.tax_rate,
          body.cgst, body.sgst, body.total_amount, body.payment_plan, body.quantity))
    db.commit()
    order_id = result.lastrowid
    db.close()
    await send_modular_webhook("ORDERS", {"embeds": [{"title": f"New Service Request: #{order_id}", "description": f"**Client:** {user['name']}\n**Service:** {body.service_name}\n**Timeline:** {body.timeline or 'Flexible'}", "color": 3447003, "timestamp": __import__("datetime").datetime.utcnow().isoformat()}]})
    
    try:
        user_row = get_db().execute("SELECT email FROM auth.users WHERE id=?", (user["id"],)).fetchone()
        if user_row and user_row["email"]:
            send_order_confirm_email(user["name"], user_row["email"], order_id, body.service_name)
    except Exception as e:
        print(f"Failed to send order email: {e}")
        
    try:
        pubsub.publish("orders_update")
        pubsub.publish(f"orders_{user['id']}")
    except: pass
    return {"success": True, "order_id": order_id}

@router.get("/orders/mine")
def get_my_orders(user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM orders.orders WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.get("/orders/{order_id}")
def get_order(order_id: int, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM orders.orders WHERE id = ?", (order_id,)).fetchone()
    db.close()
    if not row: raise HTTPException(404, "Order not found")
    order = dict(row)
    if user["role"] == "client" and order["user_id"] != user["id"]: raise HTTPException(403, "Forbidden")
    return order

@router.post("/orders/{order_id}/negotiate")
def negotiate_order(order_id: int, body: NegotiateBody, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM orders.orders WHERE id = ? AND user_id = ?", (order_id, user["id"])).fetchone()
    if not row: db.close(); raise HTTPException(404, "Not found")
    db.execute("UPDATE orders.orders SET negotiated_price=?, negotiation_reason=?, negotiation_status='pending', updated_at=? WHERE id=?",
               (body.negotiated_price, body.negotiation_reason, int(time.time()), order_id))
    db.commit(); db.close()
    try:
        pubsub.publish("orders_update")
        pubsub.publish(f"orders_{user['id']}")
    except: pass
    return {"success": True}

@router.post("/orders/{order_id}/accept")
def accept_order(order_id: int, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM orders.orders WHERE id = ? AND user_id = ?", (order_id, user["id"])).fetchone()
    if not row: db.close(); raise HTTPException(404, "Not found")
    db.execute("UPDATE orders.orders SET status='accepted', updated_at=? WHERE id=?", (int(time.time()), order_id))
    db.commit(); db.close()
    auto_generate_invoice(order_id)
    try:
        pubsub.publish("orders_update")
        pubsub.publish(f"orders_{user['id']}")
    except: pass
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
    
    # Process coupon usage increment
    if body.coupon_code:
        coupon_row = db.execute("SELECT id FROM shop.coupons WHERE LOWER(code) = LOWER(?)", (body.coupon_code,)).fetchone()
        if coupon_row:
            db.execute("UPDATE shop.coupons SET used_count = used_count + 1 WHERE id = ?", (coupon_row["id"],))
            
            # Record performance tracking
            actual_order_id = numeric_order_id if is_numeric_order else None
            if not actual_order_id and str(order_id).startswith("INV-"):
                try:
                    actual_order_id = int(str(order_id).split("-")[1])
                except: pass
                
            db.execute("INSERT INTO shop.coupon_uses (coupon_id, user_id, order_id) VALUES (?,?,?)", 
                       (coupon_row["id"], user["id"], actual_order_id))
            db.commit()
    
    # 1. Fetch user details and validate credits
    user_row = db.execute("SELECT details FROM auth.users WHERE id=?", (user["id"],)).fetchone()
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
        db.execute("UPDATE auth.users SET details=? WHERE id=?", (json.dumps(user_details), user["id"]))
        db.commit()
        log_activity(user["id"], "USE_CREDITS", f"Applied ₹{applied} credits to order/invoice {order_id}")

    if is_numeric_order:
        row = db.execute("SELECT * FROM orders.orders WHERE id = ? AND user_id = ?", (numeric_order_id, user["id"])).fetchone()
        if not row: db.close(); raise HTTPException(404, "Order not found")
        
        # If we have updated pricing (e.g. from coupon), update order pricing columns
        if body.grand_total is not None:
            db.execute("""UPDATE orders.orders SET total_amount = ?, cgst = ?, sgst = ? WHERE id = ?""",
                       (body.grand_total, body.cgst or 0.0, body.sgst or 0.0, numeric_order_id))
            db.commit()
        
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
            db.execute("""UPDATE orders.orders SET status='accepted', payment_status='completed',
                payment_method=?, transaction_id=?, payment_screenshot=?,
                payment_plan=COALESCE(?,payment_plan), payment_proof_submitted_at=?, updated_at=?,
                credits_applied=? WHERE id=?""",
                (body.payment_method, body.transaction_id, screenshot_url,
                 body.payment_plan, int(time.time()), int(time.time()), applied, numeric_order_id))
            db.commit()
            
            # System confirmation chat log
            sys_msg = f"✅ Payment confirmed! Your project is now officially accepted via Starlit Credits (₹{applied} applied). We'll begin work shortly."
            db.execute("INSERT INTO orders.chat_messages (order_id, user_id, message_type, content) VALUES (?,?,?,?)",
                       (numeric_order_id, user["id"], "system", sys_msg))
            db.commit()
            create_notification(user["id"], "Order Paid", sys_msg[:100], "success")
            
            try:
                auto_generate_invoice(numeric_order_id)
                inv_id = None
                inv_total = 0.0
                for fname in os.listdir(INVOICES_DIR):
                    if not fname.endswith(".json"): continue
                    fpath = os.path.join(INVOICES_DIR, fname)
                    with open(fpath) as f_inv:
                        existing = json.load(f_inv)
                        if str(existing.get("orderId")) == str(numeric_order_id):
                            inv_id = existing["id"]
                            inv_total = existing.get("grandTotal", 0.0)
                            break
                if inv_id:
                    db_user = get_db()
                    u_info = db_user.execute("SELECT name, email FROM auth.users WHERE id=?", (user["id"],)).fetchone()
                    db_user.close()
                    if u_info and u_info["email"]:
                        from mailer import send_invoice_email_with_pdf
                        send_invoice_email_with_pdf(u_info["name"], u_info["email"], inv_id, inv_total, os.path.join(INVOICES_DIR, f"{inv_id}.pdf"))
            except Exception as e:
                print("Error generating invoice or sending receipt email for credit purchase:", e)
        else:
            # Partial or cash payment
            db.execute("""UPDATE orders.orders SET status='payment_pending', payment_status='pending',
                payment_method=?, transaction_id=?, payment_screenshot=?,
                payment_plan=COALESCE(?,payment_plan), payment_proof_submitted_at=?, updated_at=?,
                credits_applied=? WHERE id=?""",
                (body.payment_method, body.transaction_id, screenshot_url,
                 body.payment_plan, int(time.time()), int(time.time()), applied, numeric_order_id))
            db.commit()
            
        db.close()
        await send_modular_webhook("PAYMENTS", {"embeds": [{"title": f"Payment Proof Submitted: Order #{numeric_order_id}", "description": f"**Method:** {body.payment_method}\n**Credits Applied:** ₹{applied}\n**TxID:** {body.transaction_id or 'N/A'}", "color": 65280}]})
        try:
            pubsub.publish("orders_update")
            pubsub.publish(f"orders_{user['id']}")
            pubsub.publish("invoices_update")
        except: pass
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

        # Apply coupon and updated totals to the invoice JSON if provided
        if body.grand_total is not None:
            inv["grandTotal"] = body.grand_total
            inv["subtotal"] = body.subtotal if body.subtotal is not None else inv.get("subtotal", 0.0)
            inv["taxTotal"] = (body.cgst or 0.0) + (body.sgst or 0.0)
            inv["discountAmount"] = (inv.get("discountAmount") or 0.0) + (body.discount_amount or 0.0)
            if body.coupon_code:
                inv["couponCode"] = body.coupon_code
                
            # Also update items rate/total
            if inv.get("items"):
                qty = inv["items"][0].get("qty") or 1
                inv["items"][0]["rate"] = body.grand_total / float(qty)
                inv["items"][0]["total"] = body.grand_total
                
            # If installment plan and has installments, update installment amounts proportionately
            if inv.get("paymentType") == "installment" and inv.get("installments"):
                total_inst = len(inv["installments"])
                if total_inst > 0:
                    for i in range(total_inst):
                        inv["installments"][i]["amount"] = body.grand_total / total_inst
        
        with open(p, "w") as f:
            json.dump(inv, f, indent=2)
            
        try:
            from routers.invoice_routes import format_invoice_txt, generate_invoice_pdf
            txt_path = os.path.join(INVOICES_DIR, f"{order_id}.txt")
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(format_invoice_txt(inv))
                
            pdf_path = os.path.join(INVOICES_DIR, f"{order_id}.pdf")
            generate_invoice_pdf(inv, pdf_path)
            
            if body.payment_method == "credits":
                db_user = get_db()
                u_info = db_user.execute("SELECT name, email FROM auth.users WHERE id=?", (user["id"],)).fetchone()
                db_user.close()
                if u_info and u_info["email"]:
                    from mailer import send_invoice_email_with_pdf
                    send_invoice_email_with_pdf(u_info["name"], u_info["email"], order_id, inv["grandTotal"], pdf_path)
        except Exception as e:
            print("Error re-formatting txt/pdf or sending receipt email for direct invoice payment:", e)
            
        db.close()
        await send_modular_webhook("PAYMENTS", {"embeds": [{"title": f"Payment Proof Submitted: Invoice {order_id}", "description": f"**Method:** {body.payment_method}\n**Credits Applied:** ₹{applied}\n**TxID:** {body.transaction_id or 'N/A'}", "color": 65280}]})
        try:
            pubsub.publish("orders_update")
            pubsub.publish(f"orders_{user['id']}")
            pubsub.publish("invoices_update")
        except: pass
        return {"success": True}

# ── Admin Order Routes ────────────────────────────────────────────────────────
@router.get("/admin/orders")
def admin_get_orders(user=Depends(require_admin)):
    db = get_db()
    rows = db.execute("SELECT o.*, u.name AS client_name, u.email AS client_email FROM orders.orders o LEFT JOIN auth.users u ON o.user_id = u.id ORDER BY o.created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.put("/admin/orders/{order_id}")
async def admin_update_order(order_id: int, body: AdminOrderUpdate, user=Depends(require_admin)):
    valid = ["pending","quoted","accepted","payment_pending","in_progress","rejected","completed"]
    if body.status not in valid: raise HTTPException(400, "Invalid status.")
    accepted_by = user["id"] if body.status in ("accepted","quoted") else None
    db = get_db()
    
    row = db.execute("SELECT * FROM orders.orders WHERE id = ?", (order_id,)).fetchone()
    if not row: db.close(); raise HTTPException(404, "Order not found")

    # Fetch client's role to apply automatic discount if admin updates quoted price
    client_row = db.execute("SELECT role FROM auth.users WHERE id = ?", (row["user_id"],)).fetchone()
    client_role = client_row["role"] if client_row else "client"
    
    if body.quoted_price is not None and body.quoted_price > 0:
        # Enforce min_price floor before discount
        product_row = db.execute(
            "SELECT min_price FROM shop.products WHERE (product_key = ? OR name = ?) AND is_deleted = 0",
            (row["service_id"], row["service_name"])
        ).fetchone()
        if product_row:
            floor = float(product_row["min_price"] or 0)
            if floor > 0 and body.quoted_price < floor:
                db.close()
                raise HTTPException(400, f"Quoted price ₹{body.quoted_price} is below the minimum allowed price of ₹{floor} set by the Manager.")
                
        # Apply role-based discount to quoted_price
        discount_multiplier = 1.0
        if client_role == "regular_client":
            discount_multiplier = 0.95
        elif client_role == "vip_client":
            discount_multiplier = 0.92
        body.quoted_price = round(body.quoted_price * discount_multiplier, 2)
    
    if body.quoted_price is not None and body.quoted_price > 0:
        cgst = round(body.quoted_price * 0.09, 2)
        sgst = round(body.quoted_price * 0.09, 2)
        total_amount = round(body.quoted_price + cgst + sgst, 2)
        db.execute("""
            UPDATE orders.orders 
            SET status=?, quoted_price=?, total_amount=?, cgst=?, sgst=?, tax_rate=18.0, 
                admin_notes=?, accepted_by=COALESCE(?,accepted_by), updated_at=? 
            WHERE id=?
        """, (body.status, body.quoted_price, total_amount, cgst, sgst, body.admin_notes, accepted_by, int(time.time()), order_id))
    else:
        db.execute("""
            UPDATE orders.orders 
            SET status=?, admin_notes=?, accepted_by=COALESCE(?,accepted_by), updated_at=? 
            WHERE id=?
        """, (body.status, body.admin_notes, accepted_by, int(time.time()), order_id))
        
    db.commit()
    db.close()
    db_chat = get_db()
    if body.status in ("quoted", "accepted"):
        auto_generate_invoice(order_id)
        if body.status == "quoted":
            try:
                db_conn = get_db()
                user_row_q = db_conn.execute("SELECT name, email FROM auth.users WHERE id=?", (row["user_id"],)).fetchone()
                if user_row_q and user_row_q["email"]:
                    send_quote_email(user_row_q["name"], user_row_q["email"], order_id, row["service_name"], body.quoted_price or row["quoted_price"] or 0.0)
                db_conn.close()
            except Exception as e:
                print(f"Failed to send quote email: {e}")
    elif body.status == "rejected":
        try:
            for fname in os.listdir(INVOICES_DIR):
                if not fname.endswith(".json"): continue
                p_inv = os.path.join(INVOICES_DIR, fname)
                with open(p_inv) as f_inv:
                    inv = json.load(f_inv)
                if str(inv.get("orderId")) == str(order_id):
                    if inv.get("paymentStatus") != "paid":
                        inv_id = inv["id"]
                        for ext in (".json", ".txt", ".pdf"):
                            fp = os.path.join(INVOICES_DIR, f"{inv_id}{ext}")
                            if os.path.exists(fp):
                                os.remove(fp)
                        print(f"[REJECT CLEANUP] Deleted unpaid invoice {inv_id} because order #{order_id} was rejected.")
        except Exception as e:
            print(f"Error cleaning up unpaid invoice on order rejection: {e}")

    # ── Referral: trigger cashback on completion ──────────────────────────────
    if body.status == "completed" and row["status"] != "completed":
        order_amount = float(row["total_amount"] or row["quoted_price"] or 0)
        import threading
        threading.Thread(
            target=_trigger_referral_completion,
            args=(order_id, row["user_id"], order_amount),
            daemon=True
        ).start()

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
        db_chat.execute("INSERT INTO orders.chat_messages (order_id, user_id, message_type, content) VALUES (?,?,?,?)",
                   (order_id, user["id"], "system", sys_msg))
        db_chat.commit()
        create_notification(row["user_id"], "Order Update", sys_msg[:100], "info")
    db_chat.close()

    log_activity(user["id"], "UPDATE_ORDER", f"Order {order_id} -> {body.status}")
    await send_modular_webhook("ORDERS", {"embeds": [{"title": f"Order Updated #{order_id}", "description": f"Status: **{body.status}**", "color": 16776960}]})
    return {"success": True}

@router.post("/admin/orders/{order_id}/negotiation")
def admin_update_negotiation(order_id: int, body: NegotiationStatusBody, user=Depends(require_admin)):
    db = get_db()
    db.execute("UPDATE orders.orders SET negotiation_status=?, updated_at=? WHERE id=?", (body.negotiation_status, int(time.time()), order_id))
    db.commit(); db.close()
    return {"success": True}

@router.put("/admin/orders/{order_id}/verify-payment")
def verify_payment(order_id: int, body: VerifyPaymentBody, user=Depends(require_admin)):
    db = get_db()
    row = db.execute("SELECT * FROM orders.orders WHERE id=?", (order_id,)).fetchone()
    if not row: db.close(); raise HTTPException(404, "Order not found")

    if body.approved:
        # Check if this is a credit top-up order or template purchase
        if str(row["service_id"]) == "credit_topup" or str(row["service_name"]).startswith("Add Credit") or str(row["service_id"]).startswith("template_"):
            status = "completed"
            pay_status = "completed"
            
            # Auto credit user
            user_id = row["user_id"]
            amount_to_add = float(row["total_amount"] or row["quoted_price"] or 0)
            
            user_row = db.execute("SELECT details FROM auth.users WHERE id=?", (user_id,)).fetchone()
            if user_row:
                user_details = json.loads(user_row["details"] or "{}")
                current_credits = float(user_details.get("credits", 0.0))
                new_credits = current_credits + amount_to_add
                user_details["credits"] = new_credits
                
                db.execute("UPDATE auth.users SET details=? WHERE id=?", (json.dumps(user_details), user_id))
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
            user_row = db.execute("SELECT details FROM auth.users WHERE id=?", (user_id,)).fetchone()
            if user_row:
                user_details = json.loads(user_row["details"] or "{}")
                current_credits = float(user_details.get("credits", 0.0))
                user_details["credits"] = current_credits + credits_applied
                db.execute("UPDATE auth.users SET details=? WHERE id=?", (json.dumps(user_details), user_id))
            db.execute("UPDATE orders.orders SET credits_applied=0 WHERE id=?", (order_id,))

    db.execute("UPDATE orders.orders SET status=?, payment_status=?, payment_verified_by=?, updated_at=? WHERE id=?", (status, pay_status, user["id"], int(time.time()), order_id))
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
                            try:
                                from routers.invoice_routes import format_invoice_txt, generate_invoice_pdf
                                with open(os.path.join(INVOICES_DIR, f"{inv['id']}.txt"), "w", encoding="utf-8") as f:
                                    f.write(format_invoice_txt(inv))
                                generate_invoice_pdf(inv, os.path.join(INVOICES_DIR, f"{inv['id']}.pdf"))
                            except Exception as e:
                                print(f"Error updating TXT/PDF invoice during admin verification: {e}")
        except Exception as e:
            print(f"Error syncing invoice: {e}")

    if body.approved:
        try:
            db_conn = get_db()
            user_id = row["user_id"]
            user_row = db_conn.execute("SELECT name, email FROM auth.users WHERE id=?", (user_id,)).fetchone()
            if user_row and user_row["email"]:
                send_payment_approval_email(user_row["name"], user_row["email"], order_id)
                
                # Also send the paid invoice email with the PDF attached
                try:
                    inv_id = None
                    inv_total = 0.0
                    for fname in os.listdir(INVOICES_DIR):
                        if not fname.endswith(".json"): continue
                        fpath = os.path.join(INVOICES_DIR, fname)
                        with open(fpath) as f_inv:
                            existing = json.load(f_inv)
                            if str(existing.get("orderId")) == str(order_id):
                                inv_id = existing["id"]
                                inv_total = existing.get("grandTotal", 0.0)
                                break
                    if inv_id:
                        pdf_path = os.path.join(INVOICES_DIR, f"{inv_id}.pdf")
                        from mailer import send_invoice_email_with_pdf
                        send_invoice_email_with_pdf(user_row["name"], user_row["email"], inv_id, inv_total, pdf_path)
                except Exception as email_err:
                    print(f"Error sending automated invoice receipt email: {email_err}")
            db_conn.close()
        except Exception as e:
            print(f"Failed to send payment approval or invoice receipt email: {e}")
            
    log_activity(user["id"], "APPROVE_PAYMENT" if body.approved else "REJECT_PAYMENT", f"Order {order_id}")
    try:
        pubsub.publish("orders_update")
        pubsub.publish(f"orders_{row['user_id']}")
        pubsub.publish("invoices_update")
    except: pass
    return {"success": True}
@router.put("/admin/orders/{order_id}/vault")
def update_vault(order_id: int, body: VaultBody, user=Depends(require_admin)):
    db = get_db()
    db.execute("UPDATE orders.orders SET vault_data=?, updated_at=? WHERE id=?", (json.dumps(body.vault_data), int(time.time()), order_id))
    db.commit()
    row = db.execute("SELECT user_id FROM orders.orders WHERE id = ?", (order_id,)).fetchone()
    db.close()
    if row: create_notification(row["user_id"], "Vault Updated", f"New assets added to Order #{order_id}", "success")
    try:
        pubsub.publish("orders_update")
        if row:
            pubsub.publish(f"orders_{row['user_id']}")
    except: pass
    return {"success": True}

@router.delete("/admin/orders/{order_id}")
def delete_order(order_id: int, user=Depends(require_admin)):
    try:
        for fname in os.listdir(INVOICES_DIR):
            if not fname.endswith(".json"): continue
            p_inv = os.path.join(INVOICES_DIR, fname)
            with open(p_inv) as f_inv:
                inv = json.load(f_inv)
            if str(inv.get("orderId")) == str(order_id):
                if inv.get("paymentStatus") != "paid":
                    inv_id = inv["id"]
                    for ext in (".json", ".txt", ".pdf"):
                        fp = os.path.join(INVOICES_DIR, f"{inv_id}{ext}")
                        if os.path.exists(fp):
                            os.remove(fp)
                    print(f"[DELETE CLEANUP] Deleted unpaid invoice {inv_id} because order #{order_id} was deleted.")
    except Exception as e:
        print(f"Error cleaning up unpaid invoice on order deletion: {e}")

    db = get_db()
    db.execute("DELETE FROM orders.chat_messages WHERE order_id = ?", (order_id,))
    db.execute("DELETE FROM orders.orders WHERE id = ?", (order_id,))
    db.commit(); db.close()
    log_activity(user["id"], "DELETE_ORDER", f"Deleted order #{order_id}")
    try:
        pubsub.publish("orders_update")
    except: pass
    return {"message": "Order deleted successfully"}
