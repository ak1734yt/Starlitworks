import os, json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user, require_admin, log_activity, create_notification
from database import get_db
from realtime import pubsub

router = APIRouter()
INVOICES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "invoices")
os.makedirs(INVOICES_DIR, exist_ok=True)

def format_invoice_txt(inv: dict) -> str:
    sep = "=" * 70; line = "-" * 70
    currency = inv.get("currency", "₹")
    t = f"{sep}\n                    STARLIT SIEGE WORKS - INVOICE\n{sep}\n"
    t += f"Invoice No   : {inv.get('invoiceNumber', inv.get('id', 'N/A'))}\nDate         : {inv.get('invoiceDate', 'N/A')}\nPayment Type : {'Monthly Installments' if inv.get('paymentType') == 'installment' else 'One-Time Payment'}\n{line}\n"
    org = inv.get("org", {"name": "Starlit Siege Works", "emails": ["support@starlitsiegeworks.com"], "phone": "+91 9876543210"})
    t += f"FROM:\n  {org.get('name')} | {org.get('emails', ['N/A'])[0]} | {org.get('phone', 'N/A')}\n{line}\n"
    client = inv.get("client", {"name": "Valued Client"})
    t += f"TO:\n  {client.get('name', 'N/A')} | {client.get('serverName', 'N/A')} | GSTIN: {client.get('gstin', 'N/A')}\n{line}\n"
    t += f"LINE ITEMS:\n{'Description':<40} {'Qty':>5} {'Rate':>12} {'Total':>12}\n{'-'*72}\n"
    for i in (inv.get("items") or []):
        qty = i.get("qty", 1); rate = i.get("amount", i.get("rate", 0)); total = qty * rate
        t += f"{(i.get('desc') or i.get('description') or 'Item'):<40} {str(qty):>5} {str(rate):>12} {(currency + str(total)):>12}\n"
    t += f"{line}\n{'Subtotal':<58} {(currency + str(inv.get('subtotal', 0))):>12}\n"
    if inv.get("discountAmount", 0) > 0: t += f"{'Discount':<58} {('-' + currency + str(inv['discountAmount'])):>12}\n"
    if inv.get("taxTotal", 0) > 0: t += f"{'Tax':<58} {(currency + str(inv['taxTotal'])):>12}\n"
    t += f"{'GRAND TOTAL':<58} {(currency + str(inv.get('grandTotal', 0))):>12}\n{sep}\n"
    if inv.get("paymentType") == "installment" and inv.get("installments"):
        t += f"PAYMENT SCHEDULE:\n{'Month':<20} {'Amount':<20} Status\n{'-'*52}\n"
        for i in inv["installments"]:
            t += f"{i['month']:<20} {(currency + str(round(i['amount'], 2))):<20} {'PAID' if i.get('paid') else 'PENDING'}\n"
        t += f"{sep}\n"
    if inv.get("payments"):
        t += f"RECEIVED PAYMENTS LEDGER:\n{'Date':<12} {'Amount':<12} {'Note'}\n{'-'*52}\n"
        for p_item in inv["payments"]:
            t += f"{p_item.get('date', 'N/A'):<12} {(currency + str(round(p_item.get('amount', 0), 2))):<12} {p_item.get('note', '')}\n"
        total_paid = sum(float(p_item.get('amount', 0)) for p_item in inv["payments"])
        outstanding = float(inv.get("grandTotal", 0)) - total_paid
        t += f"{line}\n{'Total Paid':<40} {(currency + str(round(total_paid, 2))):>12}\n{'Outstanding':<40} {(currency + str(round(outstanding, 2))):>12}\n"
        t += f"{sep}\n"
    if inv.get("notes"): t += f"NOTES:\n{inv['notes']}\n{sep}\n"
    import datetime
    t += f"Generated on: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n{sep}\n"
    return t

class InstallmentBody(BaseModel):
    index: int
    status: str  # 'paid', 'pending', 'due', 'overdue'

@router.post("/admin/invoices/user", status_code=201)
async def create_user_invoice(body: dict, user=Depends(require_admin)):
    inv = dict(body)
    import time, datetime
    if not inv.get("id"): inv["id"] = f"ADM-{int(time.time())}"
    if not inv.get("invoiceNumber"): inv["invoiceNumber"] = inv["id"]
    if not inv.get("savedAt"): inv["savedAt"] = datetime.datetime.utcnow().isoformat()
    inv["assignedByAdmin"] = True
    if not inv.get("org"):
        inv["org"] = {"name": "Starlit Siege Works", "emails": ["support@starlitsiegeworks.com"], "phone": "+91 9876543210"}
    with open(os.path.join(INVOICES_DIR, f"{inv['id']}.json"), "w") as f:
        json.dump(inv, f, indent=2)
    with open(os.path.join(INVOICES_DIR, f"{inv['id']}.txt"), "w", encoding="utf-8") as f:
        f.write(format_invoice_txt(inv))
    log_activity(user["id"], "CREATE_USER_INVOICE", f"Invoice {inv['id']} for user {inv.get('userId', 'N/A')}")
    pubsub.publish("invoices_update")
    return {"success": True, "id": inv["id"]}

@router.post("/invoices", status_code=201)
async def create_invoice(body: dict, user=Depends(require_admin)):
    inv = dict(body)
    import time, datetime
    if not inv.get("id"): inv["id"] = f"INV-{int(time.time())}"
    if not inv.get("invoiceNumber"): inv["invoiceNumber"] = inv["id"]
    if not inv.get("savedAt"): inv["savedAt"] = datetime.datetime.utcnow().isoformat()
    inv["assignedByAdmin"] = True
    if not inv.get("org"):
        inv["org"] = {"name": "Starlit Siege Works", "emails": ["support@starlitsiegeworks.com"], "phone": "+91 9876543210"}
    with open(os.path.join(INVOICES_DIR, f"{inv['id']}.json"), "w") as f:
        json.dump(inv, f, indent=2)
    with open(os.path.join(INVOICES_DIR, f"{inv['id']}.txt"), "w", encoding="utf-8") as f:
        f.write(format_invoice_txt(inv))
    log_activity(user["id"], "CREATE_INVOICE", f"Invoice {inv['id']} created")
    pubsub.publish("invoices_update")
    return {"success": True, "id": inv["id"]}


@router.get("/invoices")
def get_all_invoices(user=Depends(require_admin)):
    invoices = []
    for fname in os.listdir(INVOICES_DIR):
        if fname.endswith(".json"):
            with open(os.path.join(INVOICES_DIR, fname)) as f:
                invoices.append(json.load(f))
    invoices.sort(key=lambda x: x.get("savedAt", ""), reverse=True)
    return invoices

@router.get("/invoices/user/{uid}")
def get_user_invoices(uid: str, user=Depends(get_current_user)):
    if user["role"] == "client" and str(user["id"]) != uid:
        raise HTTPException(403, "Forbidden")
    invoices = []
    for fname in os.listdir(INVOICES_DIR):
        if not fname.endswith(".json"): continue
        with open(os.path.join(INVOICES_DIR, fname)) as f:
            inv = json.load(f)
        if str(inv.get("userId")) == str(uid):
            invoices.append(inv)
    invoices.sort(key=lambda x: x.get("savedAt", ""), reverse=True)
    return invoices

@router.patch("/invoices/{inv_id}/installment")
def update_installment(inv_id: str, body: InstallmentBody, user=Depends(require_admin)):
    import datetime, uuid as _uuid
    p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(p): raise HTTPException(404, "Invoice not found")
    with open(p) as f: inv = json.load(f)
    if not inv.get("installments") or body.index >= len(inv["installments"]):
        raise HTTPException(400, "Invalid installment index")
    inst = inv["installments"][body.index]
    was_paid = inst.get("paid", False)
    is_now_paid = body.status.lower() == "paid"
    inst["status"] = body.status
    inst["paid"] = is_now_paid
    # Sync payments ledger: auto-add an entry when marking paid, remove when reverting
    if not inv.get("payments"):
        inv["payments"] = []
    if is_now_paid and not was_paid:
        # Add a ledger entry for this installment payment
        inv["payments"].append({
            "id": str(_uuid.uuid4()),
            "amount": float(inst.get("amount", 0)),
            "date": datetime.datetime.utcnow().strftime("%Y-%m-%d"),
            "note": f"EMI #{body.index + 1} – {inst.get('month', '')} (auto-logged)",
            "installment_index": body.index
        })
    elif not is_now_paid and was_paid:
        # Remove any ledger entry that was auto-created for this installment
        inv["payments"] = [
            p_item for p_item in inv["payments"]
            if p_item.get("installment_index") != body.index
        ]
    with open(p, "w") as f: json.dump(inv, f, indent=2)
    with open(os.path.join(INVOICES_DIR, f"{inv_id}.txt"), "w", encoding="utf-8") as f:
        f.write(format_invoice_txt(inv))
    log_activity(user["id"], "UPDATE_INSTALLMENT", f"Invoice {inv_id} installment {body.index}")
    pubsub.publish("invoices_update")
    return {"success": True, "invoice": inv}


class PaymentBody(BaseModel):
    amount: float
    date: str
    note: Optional[str] = ""

@router.post("/invoices/{inv_id}/payments", status_code=201)
def record_payment(inv_id: str, body: PaymentBody, user=Depends(require_admin)):
    import uuid as _uuid
    p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(p): raise HTTPException(404, "Invoice not found")
    with open(p) as f: inv = json.load(f)
    if not inv.get("payments"):
        inv["payments"] = []
    payment = {
        "id": str(_uuid.uuid4()),
        "amount": float(body.amount),
        "date": body.date,
        "note": body.note or ""
    }
    inv["payments"].append(payment)
    # Auto-update paymentStatus if fully paid
    total_paid = sum(float(e.get("amount", 0)) for e in inv["payments"])
    if total_paid >= float(inv.get("grandTotal", 0)):
        inv["paymentStatus"] = "paid"
    else:
        inv["paymentStatus"] = "partial"
    with open(p, "w") as f: json.dump(inv, f, indent=2)
    with open(os.path.join(INVOICES_DIR, f"{inv_id}.txt"), "w", encoding="utf-8") as f:
        f.write(format_invoice_txt(inv))
    log_activity(user["id"], "RECORD_PAYMENT", f"Invoice {inv_id}: ₹{body.amount} on {body.date}")
    pubsub.publish("invoices_update")
    return {"success": True, "payment": payment, "invoice": inv}

@router.delete("/invoices/{inv_id}/payments/{payment_id}")
def delete_payment(inv_id: str, payment_id: str, user=Depends(require_admin)):
    p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(p): raise HTTPException(404, "Invoice not found")
    with open(p) as f: inv = json.load(f)
    orig_len = len(inv.get("payments", []))
    inv["payments"] = [e for e in inv.get("payments", []) if e.get("id") != payment_id]
    if len(inv["payments"]) == orig_len:
        raise HTTPException(404, "Payment entry not found")
    # Recalculate status
    total_paid = sum(float(e.get("amount", 0)) for e in inv["payments"])
    if total_paid <= 0:
        inv["paymentStatus"] = "pending"
    elif total_paid >= float(inv.get("grandTotal", 0)):
        inv["paymentStatus"] = "paid"
    else:
        inv["paymentStatus"] = "partial"
    with open(p, "w") as f: json.dump(inv, f, indent=2)
    with open(os.path.join(INVOICES_DIR, f"{inv_id}.txt"), "w", encoding="utf-8") as f:
        f.write(format_invoice_txt(inv))
    log_activity(user["id"], "DELETE_PAYMENT", f"Invoice {inv_id}: removed payment {payment_id}")
    pubsub.publish("invoices_update")
    return {"success": True, "invoice": inv}

@router.delete("/invoices/{inv_id}")
def delete_invoice(inv_id: str, user=Depends(require_admin)):
    for ext in (".json", ".txt"):
        p = os.path.join(INVOICES_DIR, f"{inv_id}{ext}")
        if os.path.exists(p): os.remove(p)
    log_activity(user["id"], "DELETE_INVOICE", f"Invoice {inv_id}")
    pubsub.publish("invoices_update")
    return {"success": True}

@router.delete("/invoices")
def clear_all_invoices(user=Depends(require_admin)):
    count = 0
    for fname in os.listdir(INVOICES_DIR):
        p = os.path.join(INVOICES_DIR, fname)
        if os.path.isfile(p):
            os.remove(p)
            count += 1
    log_activity(user["id"], "CLEAR_ALL_INVOICES", f"Deleted {count} files")
    pubsub.publish("invoices_update")
    return {"success": True, "deleted": count}

class InvoiceStatusBody(BaseModel):
    status: str

@router.put("/invoices/{inv_id}/status")
def update_invoice_status(inv_id: str, body: InvoiceStatusBody, user=Depends(require_admin)):
    p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(p): raise HTTPException(404, "Invoice not found")
    with open(p) as f: inv = json.load(f)
    inv["paymentStatus"] = body.status
    with open(p, "w") as f: json.dump(inv, f, indent=2)
    with open(os.path.join(INVOICES_DIR, f"{inv_id}.txt"), "w", encoding="utf-8") as f:
        f.write(format_invoice_txt(inv))
    log_activity(user["id"], "UPDATE_INVOICE_STATUS", f"Invoice {inv_id} -> {body.status}")
    pubsub.publish("invoices_update")
    return {"success": True, "invoice": inv}

@router.post("/invoices/{inv_id}/notify")
def notify_invoice_user(inv_id: str, user=Depends(require_admin)):
    p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(p): raise HTTPException(404, "Invoice not found")
    with open(p) as f: inv = json.load(f)
    uid = inv.get("userId")
    if uid:
        create_notification(uid, "Invoice Update", f"Your invoice {inv.get('invoiceNumber', inv_id)} has an update.", "info")
        log_activity(user["id"], "NOTIFY_INVOICE", f"Notified user {uid} for Invoice {inv_id}")
    return {"success": True}

@router.put("/invoices/{inv_id}")
def edit_invoice(inv_id: str, body: dict, user=Depends(require_admin)):
    p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(p): raise HTTPException(404, "Invoice not found")
    with open(p) as f: inv = json.load(f)
    inv.update(body)
    with open(p, "w") as f: json.dump(inv, f, indent=2)
    with open(os.path.join(INVOICES_DIR, f"{inv_id}.txt"), "w", encoding="utf-8") as f:
        f.write(format_invoice_txt(inv))
    log_activity(user["id"], "EDIT_INVOICE", f"Edited invoice {inv_id}")
    pubsub.publish("invoices_update")
    return {"success": True, "invoice": inv}

@router.get("/invoices/{inv_id}/download")
def download_invoice(inv_id: str, user=Depends(get_current_user)):
    txt_p = os.path.join(INVOICES_DIR, f"{inv_id}.txt")
    json_p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(txt_p): raise HTTPException(404, "Invoice not found")
    if user["role"] == "client":
        with open(json_p) as f: inv = json.load(f)
        if str(inv.get("userId")) != str(user["id"]): raise HTTPException(403, "Forbidden")
    return FileResponse(txt_p, filename=f"Invoice_{inv_id}.txt", media_type="text/plain")
