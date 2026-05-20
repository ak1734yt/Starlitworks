import os, json, datetime, time
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user, require_admin, log_activity, create_notification
from database import get_db
from realtime import pubsub

router = APIRouter()
INVOICES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "invoices")
ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
BANNER_PATH = os.path.join(ASSETS_DIR, "banner.png")
os.makedirs(INVOICES_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

# ── Premium PDF Generation ────────────────────────────────────────────────────
from fpdf import FPDF

def _safe(text) -> str:
    """Encode text safely for fpdf latin-1."""
    return str(text or "").encode("latin-1", "replace").decode("latin-1")

def _currency(value, symbol="Rs. ") -> str:
    try:
        return f"{symbol}{float(value):,.2f}"
    except:
        return f"{symbol}0.00"


def generate_invoice_pdf(inv: dict, filepath: str):
    """Generate a premium, branded Starlit Siege Works invoice PDF."""
    import secrets as _secrets

    currency_raw = inv.get("currency", "Rs.")
    currency = "Rs. " if currency_raw in ("₹", "INR", "Rs.", "Rs") else str(currency_raw)

    org = inv.get("org") or {}
    client = inv.get("client") or {}
    items = inv.get("items") or []
    org_name = org.get("name", "Starlit Siege Works")
    org_email = (org.get("emails") or ["Akshatkumar945296@gmail.com"])[0]
    if org_email == "support@starlitsiege.works":
        org_email = "Akshatkumar945296@gmail.com"
    org_phone = org.get("phone", "+91 7392939277")
    org_country = org.get("country", "India")
    org_domain = org.get("domain", "Server Architecture, Automation, Security & Management")

    client_name = _safe(client.get("name", "Valued Client"))
    server_name = _safe(client.get("serverName", client_name))
    inv_num = _safe(inv.get("invoiceNumber", inv.get("id", "N/A")))
    inv_date = _safe(inv.get("invoiceDate", datetime.datetime.now().strftime("%Y-%m-%d")))
    payment_status = _safe(inv.get("paymentStatus", "UNPAID")).upper()
    payment_method = _safe(inv.get("payment_method", "UPI / Bank Transfer"))
    payment_tx = _safe(inv.get("transaction_id", ""))

    subtotal = float(inv.get("subtotal") or 0)
    discount = float(inv.get("discountAmount") or 0)
    tax_total = float(inv.get("taxTotal") or 0)
    grand_total = float(inv.get("grandTotal") or 0)
    cgst = round(tax_total / 2, 2)
    sgst = round(tax_total / 2, 2)

    # ── Ensure Logo Asset Exists ──────────────────────────────────────────────
    logo_path = os.path.join(ASSETS_DIR, "logo.png")
    if not os.path.exists(logo_path):
        try:
            public_logo = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public", "logo.png")
            if os.path.exists(public_logo):
                import shutil
                shutil.copy(public_logo, logo_path)
        except Exception as e:
            print(f"Could not copy logo: {e}")

    # ── Setup PDF ──────────────────────────────────────────────────────────────
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    W = pdf.w  # 210mm
    M = 14     # left/right margin
    CW = W - 2 * M  # content width

    # ── Helper closures ────────────────────────────────────────────────────────
    def x(): return pdf.get_x()
    def y(): return pdf.get_y()
    def set_y(val): pdf.set_y(val)
    def ln(h=4): pdf.ln(h)

    def cell(w, h, txt, border=0, align="L", fill=False, bold=False, size=10, color=(0,0,0), bg=None):
        if bg: pdf.set_fill_color(*bg)
        pdf.set_text_color(*color)
        pdf.set_font("Helvetica", "B" if bold else "", size)
        pdf.cell(w, h, _safe(txt), border=border, align=align, fill=bool(bg or fill), new_x="RIGHT", new_y="TOP")

    def mcell(w, txt, size=9, color=(60,60,60), bold=False):
        pdf.set_font("Helvetica", "B" if bold else "", size)
        pdf.set_text_color(*color)
        pdf.multi_cell(w, 4.5, _safe(txt), new_x="LMARGIN", new_y="NEXT")

    def hrule(y_pos=None, color=(200,200,200)):
        pdf.set_draw_color(*color)
        py = y_pos if y_pos is not None else y()
        pdf.line(M, py, W - M, py)
        ln(2)

    def section_label(txt, top_margin=4):
        ln(top_margin)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(20, 20, 60)
        pdf.cell(CW, 5, _safe(txt), new_x="LMARGIN", new_y="NEXT")
        hrule(color=(180, 180, 220))

    # ── 1. BANNER ─────────────────────────────────────────────────────────────
    banner_h = 36
    if os.path.exists(BANNER_PATH):
        pdf.image(BANNER_PATH, x=M, y=pdf.get_y(), w=CW, h=banner_h)
        pdf.set_y(pdf.get_y() + banner_h + 4)
    else:
        # Fallback: draw a dark gradient-look header block
        pdf.set_fill_color(10, 15, 40)
        pdf.rect(M, y(), CW, banner_h, style="F")
        pdf.set_xy(M, y() + 10)
        pdf.set_font("Helvetica", "B", 20)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(CW, 10, "Starlit Siege", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(180, 180, 220)
        pdf.cell(CW, 6, "A NIGHT OF DESTINY", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.set_y(pdf.get_y() + 2)

    # ── 2. ORG LOGO-LINE & TITLE ──────────────────────────────────────────────
    ln(3)
    lx = M
    ly = y()
    logo_size = 14
    
    if os.path.exists(logo_path):
        pdf.image(logo_path, x=lx, y=ly, w=logo_size, h=logo_size)
    else:
        # Fallback circle placeholder
        pdf.set_fill_color(20, 20, 80)
        pdf.ellipse(lx, ly, logo_size, logo_size, style="F")
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(lx, ly + 4.5)
        pdf.cell(logo_size, 5, "SSW", align="C", new_x="RIGHT", new_y="TOP")

    pdf.set_xy(M + logo_size + 3, ly)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(15, 15, 50)
    pdf.cell(CW - logo_size - 3, logo_size, "BUSINESS INVOICE & CUSTOM PLAN", align="L", new_x="LMARGIN", new_y="NEXT")

    ln(1)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(30, 80, 180)
    tagline = f"STARLIT SIEGE WORKS  |  {org_domain.upper()}"
    pdf.cell(CW, 5, _safe(tagline), align="C", new_x="LMARGIN", new_y="NEXT")
    ln(4)

    # ── 3. BUSINESS DETAILS + CLIENT DETAILS (two columns) ───────────────────
    col_w = CW / 2 - 2
    top_y = y()

    # Left column – Business Details
    pdf.set_xy(M, top_y)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(15, 15, 50)
    pdf.cell(col_w, 5, "Business Details", new_x="LMARGIN", new_y="NEXT")

    biz_lines = [
        ("Name:", org_name),
        ("Domain:", org_domain),
        ("Country:", org_country),
        ("Contact:", org_email),
        ("WhatsApp:", f"{org_phone} (WhatsApp only)"),
    ]
    for label, val in biz_lines:
        pdf.set_xy(M, y())
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(22, 4.5, _safe(label), new_x="RIGHT", new_y="TOP")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(60, 60, 60)
        pdf.cell(col_w - 22, 4.5, _safe(val), new_x="LMARGIN", new_y="NEXT")

    biz_end_y = y()

    # Right column – Client Details
    pdf.set_xy(M + col_w + 4, top_y)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(15, 15, 50)
    pdf.cell(col_w, 5, "Client Details", new_x="LMARGIN", new_y="NEXT")

    cli_lines = [
        ("Client Name:", client_name),
        ("Server Name:", server_name),
        ("Invoice No:", inv_num),
        ("Invoice Date:", inv_date),
    ]
    for label, val in cli_lines:
        pdf.set_xy(M + col_w + 4, y())
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(26, 4.5, _safe(label), new_x="RIGHT", new_y="TOP")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(60, 60, 60)
        pdf.cell(col_w - 26, 4.5, _safe(val), new_x="LMARGIN", new_y="NEXT")

    cli_end_y = y()
    pdf.set_y(max(biz_end_y, cli_end_y) + 4)

    # ── 4. SELECTED PACKAGE BREAKDOWN ────────────────────────────────────────
    section_label("Selected Package Breakdown")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(30, 30, 30)
    for item in items:
        desc = _safe(item.get("desc") or item.get("description") or "Service")
        # Draw green checkmark vector programmatically
        cy = pdf.get_y() + 1.5
        cx = M + 2
        pdf.set_draw_color(34, 197, 94) # green
        pdf.set_line_width(0.5)
        pdf.line(cx, cy + 1.5, cx + 1, cy + 2.5)
        pdf.line(cx + 1, cy + 2.5, cx + 3, cy + 0.5)
        pdf.set_line_width(0.2) # restore default
        
        pdf.set_xy(M + 7, pdf.get_y())
        pdf.cell(CW - 7, 5, desc, new_x="LMARGIN", new_y="NEXT")

    # ── 5. BILLING SUMMARY TABLE ──────────────────────────────────────────────
    section_label("Billing Summary")

    # Table header
    col_desc = CW * 0.45
    col_qty  = CW * 0.12
    col_rate = CW * 0.21
    col_tot  = CW * 0.22

    pdf.set_draw_color(210, 215, 235)
    pdf.set_fill_color(230, 235, 255)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(20, 20, 80)
    pdf.set_x(M)
    pdf.cell(col_desc, 7, "Description", border=1, fill=True, align="L", new_x="RIGHT", new_y="TOP")
    pdf.cell(col_qty,  7, "Qty",         border=1, fill=True, align="C", new_x="RIGHT", new_y="TOP")
    pdf.cell(col_rate, 7, f"Rate ({currency.strip()})", border=1, fill=True, align="R", new_x="RIGHT", new_y="TOP")
    pdf.cell(col_tot,  7, f"Total ({currency.strip()})", border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(40, 40, 40)
    row_fill = False
    for item in items:
        desc  = _safe(item.get("desc") or item.get("description") or "Service")
        qty   = float(item.get("qty", 1))
        rate  = float(item.get("amount") or item.get("rate") or 0)
        total = float(item.get("total") or (qty * rate))
        if row_fill:
            pdf.set_fill_color(245, 247, 255)
        else:
            pdf.set_fill_color(255, 255, 255)
        pdf.set_x(M)
        pdf.cell(col_desc, 7, desc[:52], border=1, fill=True, align="L", new_x="RIGHT", new_y="TOP")
        pdf.cell(col_qty,  7, str(int(qty)), border=1, fill=True, align="C", new_x="RIGHT", new_y="TOP")
        pdf.cell(col_rate, 7, f"{rate:,.0f}" if rate.is_integer() else f"{rate:,.2f}", border=1, fill=True, align="R", new_x="RIGHT", new_y="TOP")
        pdf.cell(col_tot,  7, f"{total:,.0f}" if total.is_integer() else f"{total:,.2f}", border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")
        row_fill = not row_fill

    ln(2)

    # Summary totals box
    summary_x = M + col_desc + col_qty
    summary_w  = col_rate + col_tot

    def summary_row(label, value, bold=False, color=(40,40,40)):
        pdf.set_x(summary_x)
        pdf.set_font("Helvetica", "B" if bold else "", 8.5)
        pdf.set_text_color(*color)
        pdf.set_fill_color(255, 255, 255)
        pdf.cell(col_rate, 7, _safe(label), border=1, fill=True, align="L", new_x="RIGHT", new_y="TOP")
        pdf.cell(col_tot,  7, _safe(value), border=1, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")

    pdf.set_draw_color(210, 215, 235)
    summary_row("Subtotal:", f"{currency}{subtotal:,.2f}" if not subtotal.is_integer() else f"{currency}{subtotal:,.0f}")
    if discount > 0:
        summary_row("Discount:", f"-{currency}{discount:,.2f}" if not discount.is_integer() else f"-{currency}{discount:,.0f}", color=(180, 30, 30))
    summary_row("CGST:", f"{currency}{cgst:,.2f}" if not cgst.is_integer() else f"{currency}{cgst:,.0f}")
    summary_row("SGST:", f"{currency}{sgst:,.2f}" if not sgst.is_integer() else f"{currency}{sgst:,.0f}")
    summary_row("Grand Total:", f"{currency}{grand_total:,.2f}" if not grand_total.is_integer() else f"{currency}{grand_total:,.0f}", bold=True, color=(10, 10, 80))
    ln(3)

    # ── 6. INSTALLMENT SCHEDULE (if applicable) ────────────────────────────────
    if inv.get("paymentType") == "installment" and inv.get("installments"):
        section_label("Payment Schedule")
        pdf.set_fill_color(230, 235, 255)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(20, 20, 80)
        pdf.set_x(M)
        pdf.cell(CW * 0.5, 6, "Installment", fill=True, align="L", new_x="RIGHT", new_y="TOP")
        pdf.cell(CW * 0.25, 6, "Amount", fill=True, align="R", new_x="RIGHT", new_y="TOP")
        pdf.cell(CW * 0.25, 6, "Status", fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
        hrule(color=(200, 205, 230))
        for i, inst in enumerate(inv["installments"]):
            paid = inst.get("paid", False)
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(40, 40, 40)
            pdf.set_x(M)
            pdf.cell(CW * 0.5, 5.5, _safe(inst.get("month", f"Payment {i+1}")), new_x="RIGHT", new_y="TOP")
            pdf.cell(CW * 0.25, 5.5, f"{currency}{float(inst.get('amount',0)):,.2f}", align="R", new_x="RIGHT", new_y="TOP")
            status_txt = "PAID" if paid else "PENDING"
            pdf.set_text_color(30, 140, 30) if paid else pdf.set_text_color(180, 60, 30)
            pdf.cell(CW * 0.25, 5.5, status_txt, align="C", new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(40, 40, 40)

    # ── 7. PAYMENT DETAILS ─────────────────────────────────────────────────────
    section_label("Payment Details")
    status_color = (30, 140, 30) if payment_status == "PAID" else (180, 60, 30)
    
    pay_lines = [("Status:", payment_status), ("Method:", payment_method)]
    if payment_tx:
        pay_lines.append(("Transaction ID:", payment_tx))

    # UPI details from org
    upi_id  = org.get("upi_id", "Akshat2409@ybl")
    upi_num = org.get("upi_number", "6388228212")
    pay_lines.append(("UPI ID:", upi_id))
    pay_lines.append(("UPI Number:", upi_num))

    for i, (label, val) in enumerate(pay_lines):
        pdf.set_x(M)
        pdf.set_font("Helvetica", "B", 8.5)
        color = status_color if i == 0 else (40, 40, 40)
        pdf.set_text_color(*color)
        pdf.cell(30, 5, _safe(label), new_x="RIGHT", new_y="TOP")
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(*color)
        pdf.cell(CW - 30, 5, _safe(val), new_x="LMARGIN", new_y="NEXT")

    # ── 8. TERMS & CONDITIONS ─────────────────────────────────────────────────
    section_label("Terms & Conditions")
    terms = [
        "50% advance payment is mandatory before project initiation.",
        "Remaining balance must be cleared upon project completion Before Delivery.",
        "No refunds once the setup or deployment process has started.",
        "Delivery timelines depend on selected add-ons and client responsiveness.",
        "Any additional changes beyond scope will be charged separately.",
        "Starlit Siege holds the right to suspend services for misuse or non-payment.",
        "Data security is prioritized; however, third-party outages are not liable.",
        "By signing, the client agrees to all terms mentioned above.",
    ]
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(50, 50, 50)
    for term in terms:
        pdf.set_x(M + 2)
        pdf.cell(4, 4.5, chr(149), new_x="RIGHT", new_y="TOP")  # bullet
        pdf.multi_cell(CW - 6, 4.5, _safe(term), new_x="LMARGIN", new_y="NEXT")

    # ── 9. SIGNATURES ─────────────────────────────────────────────────────────
    ln(6)
    sig_col = CW / 2
    sig_y = y()

    # Left: Client signature
    pdf.set_xy(M, sig_y)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 15, 50)
    pdf.cell(sig_col, 5, "By signing, the client agrees to all terms mentioned above.", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(40, 40, 40)
    pdf.set_x(M)
    pdf.cell(sig_col, 5, f"Client Signature: {client_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(M)
    pdf.cell(sig_col, 5, "Authorized Signature", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(M)
    pdf.cell(sig_col, 5, f"Date: {inv_date}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(M)
    pdf.cell(sig_col, 5, org_name, new_x="LMARGIN", new_y="NEXT")

    # Right: Org e-sign block
    pdf.set_xy(M + sig_col + 4, sig_y)
    stamp_x = M + sig_col + 4
    stamp_y = y()
    stamp_w = 65
    stamp_h = 24
    
    # Soft purple-blue border and filling for premium stamp box
    pdf.set_draw_color(30, 80, 180)
    pdf.set_fill_color(248, 250, 255)
    pdf.rect(stamp_x, stamp_y, stamp_w, stamp_h, style="FD")
    
    pdf.set_xy(stamp_x, stamp_y + 2)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(30, 80, 180)
    pdf.cell(stamp_w, 4.5, "STARLIT SIEGE WORKS", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_xy(stamp_x, stamp_y + 6.5)
    pdf.set_font("Helvetica", "B", 6)
    pdf.set_text_color(34, 197, 94) # Green success text
    pdf.cell(stamp_w, 4.5, "● DIGITALLY SECURED & SIGNED", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_xy(stamp_x, stamp_y + 11)
    pdf.set_font("Helvetica", "BI", 10.5)
    pdf.set_text_color(15, 15, 60)
    pdf.cell(stamp_w, 6, "Starlit Siege Works", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_xy(stamp_x, stamp_y + 18)
    pdf.set_font("Helvetica", "", 6.5)
    pdf.set_text_color(100, 110, 140)
    pdf.cell(stamp_w, 4.5, f"Verified: {inv_date} | SSL-Secured", align="C", new_x="LMARGIN", new_y="NEXT")

    # ── 10. FOOTER ─────────────────────────────────────────────────────────────
    pdf.set_y(-16)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(140, 140, 160)
    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    pdf.cell(CW / 2, 5, f"Generated: {now_str}", align="L", new_x="RIGHT", new_y="TOP")
    pdf.cell(CW / 2, 5, f"Invoice {inv_num}  |  {org_name}", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(180, 180, 220)
    pdf.line(M, pdf.get_y() - 1, W - M, pdf.get_y() - 1)

    pdf.output(filepath)


def format_invoice_txt(inv: dict) -> str:
    """Fallback plain-text invoice format."""
    lines = ["=" * 60, "STARLIT SIEGE WORKS — INVOICE", "=" * 60]
    lines += [
        f"Invoice #: {inv.get('invoiceNumber', inv.get('id', 'N/A'))}",
        f"Date: {inv.get('invoiceDate', 'N/A')}",
        f"Client: {inv.get('client', {}).get('name', 'N/A')}",
        "",
    ]
    for item in (inv.get("items") or []):
        qty = item.get("qty", 1)
        rate = item.get("amount") or item.get("rate") or 0
        total = float(qty) * float(rate)
        lines.append(f"  {item.get('desc','Item')}: {qty} x Rs. {rate} = Rs. {total}")
    lines += [
        "",
        f"Subtotal: Rs. {inv.get('subtotal', 0)}",
        f"Tax: Rs. {inv.get('taxTotal', 0)}",
        f"Grand Total: Rs. {inv.get('grandTotal', 0)}",
        "",
        f"Status: {inv.get('paymentStatus', 'PENDING').upper()}",
        "=" * 60,
    ]
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
class InstallmentBody(BaseModel):
    index: int
    status: str  # 'paid', 'pending', 'due', 'overdue'


@router.post("/admin/invoices/user", status_code=201)
async def create_user_invoice(body: dict, user=Depends(require_admin)):
    inv = dict(body)
    if not inv.get("id"): inv["id"] = f"ADM-{int(time.time())}"
    if not inv.get("invoiceNumber"): inv["invoiceNumber"] = inv["id"]
    if not inv.get("savedAt"): inv["savedAt"] = datetime.datetime.utcnow().isoformat()
    inv["assignedByAdmin"] = True
    if not inv.get("org"):
        inv["org"] = {"name": "Starlit Siege Works", "emails": ["support@starlitsiege.works"], "phone": "+91 7392939277"}
    with open(os.path.join(INVOICES_DIR, f"{inv['id']}.json"), "w") as f:
        json.dump(inv, f, indent=2)
    generate_invoice_pdf(inv, os.path.join(INVOICES_DIR, f"{inv['id']}.pdf"))
    log_activity(user["id"], "CREATE_USER_INVOICE", f"Invoice {inv['id']} for user {inv.get('userId', 'N/A')}")
    pubsub.publish("invoices_update")
    # Notify user
    if inv.get("userId"):
        create_notification(inv["userId"], "📄 New Invoice", f"Invoice {inv['id']} has been generated for you.", "info")
    return {"success": True, "id": inv["id"]}


@router.post("/invoices", status_code=201)
async def create_invoice(body: dict, user=Depends(require_admin)):
    inv = dict(body)
    if not inv.get("id"): inv["id"] = f"INV-{int(time.time())}"
    if not inv.get("invoiceNumber"): inv["invoiceNumber"] = inv["id"]
    if not inv.get("savedAt"): inv["savedAt"] = datetime.datetime.utcnow().isoformat()
    inv["assignedByAdmin"] = True
    if not inv.get("org"):
        inv["org"] = {"name": "Starlit Siege Works", "emails": ["support@starlitsiege.works"], "phone": "+91 7392939277"}
    with open(os.path.join(INVOICES_DIR, f"{inv['id']}.json"), "w") as f:
        json.dump(inv, f, indent=2)
    generate_invoice_pdf(inv, os.path.join(INVOICES_DIR, f"{inv['id']}.pdf"))
    log_activity(user["id"], "CREATE_INVOICE", f"Invoice {inv['id']} created")
    pubsub.publish("invoices_update")
    return {"success": True, "id": inv["id"]}


@router.get("/invoices")
def get_all_invoices(user=Depends(require_admin)):
    invoices = []
    for fname in os.listdir(INVOICES_DIR):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(INVOICES_DIR, fname)) as f:
                    invoices.append(json.load(f))
            except:
                continue
    invoices.sort(key=lambda x: x.get("savedAt", ""), reverse=True)
    return invoices


@router.get("/invoices/user/{uid}")
def get_user_invoices(uid: str, user=Depends(get_current_user)):
    if user["role"] == "client" and str(user["id"]) != uid:
        raise HTTPException(403, "Forbidden")
    invoices = []
    for fname in os.listdir(INVOICES_DIR):
        if not fname.endswith(".json"): continue
        try:
            with open(os.path.join(INVOICES_DIR, fname)) as f:
                inv = json.load(f)
            if str(inv.get("userId")) == str(uid):
                invoices.append(inv)
        except:
            continue
    invoices.sort(key=lambda x: x.get("savedAt", ""), reverse=True)
    return invoices


@router.patch("/invoices/{inv_id}/installment")
def update_installment(inv_id: str, body: InstallmentBody, user=Depends(require_admin)):
    import uuid as _uuid
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
    if not inv.get("payments"): inv["payments"] = []
    if is_now_paid and not was_paid:
        inv["payments"].append({
            "id": str(_uuid.uuid4()),
            "amount": float(inst.get("amount", 0)),
            "date": datetime.datetime.utcnow().strftime("%Y-%m-%d"),
            "note": f"EMI #{body.index + 1} – {inst.get('month', '')} (auto-logged)",
            "installment_index": body.index
        })
    elif not is_now_paid and was_paid:
        inv["payments"] = [p_item for p_item in inv["payments"] if p_item.get("installment_index") != body.index]
    with open(p, "w") as f: json.dump(inv, f, indent=2)
    generate_invoice_pdf(inv, os.path.join(INVOICES_DIR, f"{inv_id}.pdf"))
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
    if not inv.get("payments"): inv["payments"] = []
    payment = {"id": str(_uuid.uuid4()), "amount": float(body.amount), "date": body.date, "note": body.note or ""}
    inv["payments"].append(payment)
    total_paid = sum(float(e.get("amount", 0)) for e in inv["payments"])
    inv["paymentStatus"] = "paid" if total_paid >= float(inv.get("grandTotal", 0)) else "partial"
    with open(p, "w") as f: json.dump(inv, f, indent=2)
    generate_invoice_pdf(inv, os.path.join(INVOICES_DIR, f"{inv_id}.pdf"))
    log_activity(user["id"], "RECORD_PAYMENT", f"Invoice {inv_id}: Rs.{body.amount} on {body.date}")
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
    total_paid = sum(float(e.get("amount", 0)) for e in inv["payments"])
    if total_paid <= 0:
        inv["paymentStatus"] = "pending"
    elif total_paid >= float(inv.get("grandTotal", 0)):
        inv["paymentStatus"] = "paid"
    else:
        inv["paymentStatus"] = "partial"
    with open(p, "w") as f: json.dump(inv, f, indent=2)
    generate_invoice_pdf(inv, os.path.join(INVOICES_DIR, f"{inv_id}.pdf"))
    log_activity(user["id"], "DELETE_PAYMENT", f"Invoice {inv_id}: removed payment {payment_id}")
    pubsub.publish("invoices_update")
    return {"success": True, "invoice": inv}


@router.get("/invoices/{inv_id}")
def get_invoice(inv_id: str, user=Depends(get_current_user)):
    p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(p): raise HTTPException(404, "Invoice not found")
    with open(p) as f: inv = json.load(f)
    if user["role"] == "client" and str(inv.get("userId")) != str(user["id"]):
        raise HTTPException(403, "Forbidden")
    return inv


@router.delete("/invoices/{inv_id}")
def delete_invoice(inv_id: str, user=Depends(require_admin)):
    # Only delete if NOT paid
    p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if os.path.exists(p):
        try:
            with open(p) as f:
                inv = json.load(f)
            # If invoice is paid, don't delete it
            if inv.get("paymentStatus") == "paid":
                raise HTTPException(400, "Cannot delete a paid invoice. It is permanently retained for records.")
        except HTTPException:
            raise
        except:
            pass
    for ext in (".json", ".txt", ".pdf"):
        fp = os.path.join(INVOICES_DIR, f"{inv_id}{ext}")
        if os.path.exists(fp): os.remove(fp)
    log_activity(user["id"], "DELETE_INVOICE", f"Invoice {inv_id}")
    pubsub.publish("invoices_update")
    return {"success": True}


@router.delete("/invoices/{inv_id}/force")
def force_delete_invoice(inv_id: str, user=Depends(require_admin)):
    """Force delete even if paid (manager override)."""
    for ext in (".json", ".txt", ".pdf"):
        fp = os.path.join(INVOICES_DIR, f"{inv_id}{ext}")
        if os.path.exists(fp): os.remove(fp)
    log_activity(user["id"], "FORCE_DELETE_INVOICE", f"Invoice {inv_id}")
    pubsub.publish("invoices_update")
    return {"success": True}


@router.delete("/invoices")
def clear_all_invoices(user=Depends(require_admin)):
    count = 0
    for fname in os.listdir(INVOICES_DIR):
        fp = os.path.join(INVOICES_DIR, fname)
        if os.path.isfile(fp):
            os.remove(fp)
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
    generate_invoice_pdf(inv, os.path.join(INVOICES_DIR, f"{inv_id}.pdf"))
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
    generate_invoice_pdf(inv, os.path.join(INVOICES_DIR, f"{inv_id}.pdf"))
    log_activity(user["id"], "EDIT_INVOICE", f"Edited invoice {inv_id}")
    pubsub.publish("invoices_update")
    return {"success": True, "invoice": inv}


@router.get("/invoices/{inv_id}/download")
def download_invoice(inv_id: str, user=Depends(get_current_user)):
    pdf_p = os.path.join(INVOICES_DIR, f"{inv_id}.pdf")
    json_p = os.path.join(INVOICES_DIR, f"{inv_id}.json")
    if not os.path.exists(pdf_p):
        if not os.path.exists(json_p): raise HTTPException(404, "Invoice not found")
        with open(json_p) as f: inv = json.load(f)
        generate_invoice_pdf(inv, pdf_p)
    if user["role"] == "client":
        if not os.path.exists(json_p): raise HTTPException(404, "Invoice not found")
        with open(json_p) as f: inv = json.load(f)
        if str(inv.get("userId")) != str(user["id"]): raise HTTPException(403, "Forbidden")
    return FileResponse(pdf_p, filename=f"Invoice_{inv_id}.pdf", media_type="application/pdf")
