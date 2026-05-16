import os, json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user, require_admin, log_activity
from database import get_db

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
    p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(p): raise HTTPException(404, "Invoice not found")
    with open(p) as f: inv = json.load(f)
    if not inv.get("installments") or body.index >= len(inv["installments"]):
        raise HTTPException(400, "Invalid installment index")
    inv["installments"][body.index]["status"] = body.status
    inv["installments"][body.index]["paid"] = (body.status.lower() == "paid")
    with open(p, "w") as f: json.dump(inv, f, indent=2)
    with open(os.path.join(INVOICES_DIR, f"{inv_id}.txt"), "w", encoding="utf-8") as f:
        f.write(format_invoice_txt(inv))
    log_activity(user["id"], "UPDATE_INSTALLMENT", f"Invoice {inv_id} installment {body.index}")
    return {"success": True, "invoice": inv}

@router.delete("/invoices/{inv_id}")
def delete_invoice(inv_id: str, user=Depends(require_admin)):
    for ext in (".json", ".txt"):
        p = os.path.join(INVOICES_DIR, f"{inv_id}{ext}")
        if os.path.exists(p): os.remove(p)
    log_activity(user["id"], "DELETE_INVOICE", f"Invoice {inv_id}")
    return {"success": True}

@router.get("/invoices/{inv_id}/download")
def download_invoice(inv_id: str, user=Depends(get_current_user)):
    txt_p = os.path.join(INVOICES_DIR, f"{inv_id}.txt")
    json_p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(txt_p): raise HTTPException(404, "Invoice not found")
    if user["role"] == "client":
        with open(json_p) as f: inv = json.load(f)
        if str(inv.get("userId")) != str(user["id"]): raise HTTPException(403, "Forbidden")
    return FileResponse(txt_p, filename=f"Invoice_{inv_id}.txt", media_type="text/plain")
