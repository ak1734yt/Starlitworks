from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from database import get_db
from auth import get_current_user
import qrcode
import io
import base64
import os
import hashlib
import json
import time

router = APIRouter()

class QRRequest(BaseModel):
    amount: float
    note: str = "SSW Checkout"

@router.post("/payment/qr")
def generate_generic_qr(body: QRRequest, user=Depends(get_current_user)):
    upi_id = os.getenv("MERCHANT_UPI_ID", "Akshat2409@ybl")
    merchant_name = os.getenv("MERCHANT_NAME", "Starlit Siege Works")
    
    upi_url = f"upi://pay?pa={upi_id}&pn={merchant_name}&am={body.amount:.2f}&cu=INR&tn={body.note}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(upi_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    img_bytes = buf.getvalue()
    
    qr_base64 = base64.b64encode(img_bytes).decode()
    
    secret = os.getenv("JWT_SECRET", "b3b985dfebb6061ef6c960d20dbf0cfea3e56a2f34675a0755f32204a37491ca7c69faec1605e42bcafc7d90f91bab7160ce3291bbeef94449155427f695457c")
    checksum_input = f"{qr_base64}{secret}{body.amount}".encode()
    checksum = hashlib.sha256(checksum_input).hexdigest()

    return {
        "qr_base64": qr_base64,
        "checksum": checksum,
        "amount": body.amount,
        "note": body.note
    }

@router.get("/orders/{order_id}/qr")
def generate_secure_qr(order_id: int, user=Depends(get_current_user)):
    db = get_db()
    order = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    db.close()

    if not order:
        raise HTTPException(404, "Order not found")

    # Security check: Only owner or admin/manager can access
    if user["role"] == "client" and order["user_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")

    upi_id = os.getenv("MERCHANT_UPI_ID", "Akshat2409@ybl")
    merchant_name = os.getenv("MERCHANT_NAME", "Starlit Siege Works")
    
    # Calculate amount based on payment plan
    total = order["total_amount"] or 0
    plan = order["payment_plan"] or "full"
    
    amount = total
    if plan == "advance": amount = total / 2
    elif plan == "emi": amount = total / 3

    # Generate UPI URL
    # format: upi://pay?pa={upi_id}&pn={name}&am={amount}&cu=INR&tn={note}
    note = f"SSW Order {order_id}"
    upi_url = f"upi://pay?pa={upi_id}&pn={merchant_name}&am={amount:.2f}&cu=INR&tn={note}"

    # Generate QR Image
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(upi_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save to buffer
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    img_bytes = buf.getvalue()
    
    # Encode to Base64
    qr_base64 = base64.b64encode(img_bytes).decode()
    
    # Generate Integrity Checksum
    secret = os.getenv("JWT_SECRET", "b3b985dfebb6061ef6c960d20dbf0cfea3e56a2f34675a0755f32204a37491ca7c69faec1605e42bcafc7d90f91bab7160ce3291bbeef94449155427f695457c")
    checksum_input = f"{qr_base64}{secret}{amount}".encode()
    checksum = hashlib.sha256(checksum_input).hexdigest()

    return {
        "qr_base64": qr_base64,
        "checksum": checksum,
        "amount": amount,
        "note": note
    }
