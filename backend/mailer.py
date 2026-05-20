import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

GMAIL_USER = os.getenv("GMAIL_USER", "").strip()
GMAIL_PASS = os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _send_email(to: str, subject: str, html: str) -> bool:
    gmail_user = os.getenv("GMAIL_USER", "").strip()
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", "")
    if not gmail_user or not gmail_pass:
        print(f"[EMAIL SKIP] No Gmail configured. To: {to} | Subject: {subject}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Starlit Siege Works <{gmail_user}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_pass)
            server.sendmail(gmail_user, to, msg.as_string())

        print(f"[EMAIL SENT] To: {to}")
        return True
    except Exception as e:
        print(f"[EMAIL FAILED] {e}")
        return False


def _send_email_with_pdf(to: str, subject: str, html: str, pdf_path: str, pdf_filename: str) -> bool:
    """Send an email with an HTML body and a PDF file attachment."""
    gmail_user = os.getenv("GMAIL_USER", "").strip()
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", "")
    if not gmail_user or not gmail_pass:
        print(f"[EMAIL SKIP] No Gmail configured. To: {to} | Subject: {subject}")
        return False
    try:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = f"Starlit Siege Works <{gmail_user}>"
        msg["To"] = to

        # HTML body
        msg.attach(MIMEText(html, "html"))

        # PDF attachment
        if pdf_path and os.path.exists(pdf_path):
            with open(pdf_path, "rb") as pdf_file:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(pdf_file.read())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{pdf_filename}"')
            msg.attach(part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_pass)
            server.sendmail(gmail_user, to, msg.as_string())

        print(f"[EMAIL+PDF SENT] To: {to}")
        return True
    except Exception as e:
        print(f"[EMAIL+PDF FAILED] {e}")
        return False


def send_password_reset_email(to: str, reset_link: str) -> bool:
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body {{ background: #0a0a0a; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }}
  .container {{ max-width: 560px; margin: 40px auto; background: #111; border: 1px solid #ffffff15; border-radius: 20px; overflow: hidden; }}
  .header {{ background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 40px 32px; text-align: center; }}
  .header h1 {{ margin: 0; font-size: 24px; color: #fff; font-weight: 800; letter-spacing: -0.5px; }}
  .header p {{ margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px; }}
  .body {{ padding: 36px 32px; }}
  .body p {{ color: #9ca3af; line-height: 1.7; font-size: 14px; margin: 0 0 20px; }}
  .btn {{ display: block; width: fit-content; margin: 28px auto; padding: 14px 36px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.3px; }}
  .warning {{ background: #7c3aed10; border: 1px solid #7c3aed30; border-radius: 10px; padding: 14px 18px; margin-top: 24px; }}
  .warning p {{ color: #a78bfa; font-size: 12px; margin: 0; }}
  .footer {{ padding: 20px 32px; border-top: 1px solid #ffffff08; text-align: center; }}
  .footer p {{ color: #4b5563; font-size: 11px; margin: 0; }}
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔑 Reset Your Password — Starlit Siege Works</h1>
    </div>
    <div class="body">
      <p>Hello,</p>
      <p>We received a request to reset the password for your account. Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
      <a href="{reset_link}" class="btn">Reset My Password</a>
      <div class="warning">
        <p>⚠️ If you did not request a password reset, you can safely ignore this email. Your account is secure.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Starlit Siege Works. All rights reserved.</p>
      <p style="margin-top:6px;">This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>"""
    return _send_email(to, "🔑 Reset Your Password — Starlit Siege Works", html)


def send_welcome_email(name: str, to: str) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body {{ background: #0a0a0a; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }}
  .container {{ max-width: 560px; margin: 40px auto; background: #111; border: 1px solid #ffffff15; border-radius: 20px; overflow: hidden; }}
  .header {{ background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 40px 32px; text-align: center; }}
  .header h1 {{ margin: 0; font-size: 24px; color: #fff; font-weight: 800; }}
  .body {{ padding: 36px 32px; }}
  .body p {{ color: #9ca3af; line-height: 1.7; font-size: 14px; margin: 0 0 16px; }}
  .btn {{ display: block; width: fit-content; margin: 28px auto; padding: 14px 36px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; }}
  .footer {{ padding: 20px 32px; border-top: 1px solid #ffffff08; text-align: center; }}
  .footer p {{ color: #4b5563; font-size: 11px; margin: 0; }}
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚔️ Welcome to Starlit Siege Works!</h1>
    </div>
    <div class="body">
      <p>Hey <strong style="color:#a78bfa">{name}</strong>! 👋</p>
      <p>Your account is ready. You can now browse our premium Discord services, place orders, and track everything from your dashboard.</p>
      <a href="{frontend_url}/shop" class="btn">Explore Services →</a>
      <p>If you have any questions, just reply to this email or reach out on Discord.</p>
    </div>
    <div class="footer">
      <p>© 2026 Starlit Siege Works. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""
    return _send_email(to, "🎉 Welcome to Starlit Siege Works!", html)


def send_order_confirm_email(name: str, to: str, order_id: int, service_name: str) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body {{ background: #0a0a0a; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }}
  .container {{ max-width: 560px; margin: 40px auto; background: #111; border: 1px solid #ffffff15; border-radius: 20px; overflow: hidden; }}
  .header {{ background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 40px 32px; text-align: center; }}
  .header h1 {{ margin: 0; font-size: 24px; color: #fff; font-weight: 800; }}
  .body {{ padding: 36px 32px; }}
  .body p {{ color: #9ca3af; line-height: 1.7; font-size: 14px; margin: 0 0 16px; }}
  .btn {{ display: block; width: fit-content; margin: 28px auto; padding: 14px 36px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; }}
  .footer {{ padding: 20px 32px; border-top: 1px solid #ffffff08; text-align: center; }}
  .footer p {{ color: #4b5563; font-size: 11px; margin: 0; }}
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧾 Order Confirmation</h1>
    </div>
    <div class="body">
      <p>Hey <strong style="color:#a78bfa">{name}</strong>! 👋</p>
      <p>We've successfully received your order <strong>#{order_id}</strong> for <strong>{service_name}</strong>.</p>
      <p>Our team is reviewing your request and will provide a quote or update your order status shortly.</p>
      <a href="{frontend_url}/history" class="btn">Track Order Status →</a>
    </div>
    <div class="footer">
      <p>© 2026 Starlit Siege Works. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""
    return _send_email(to, f"🧾 Order Confirmation #{order_id}", html)


def send_invoice_email(name: str, to: str, invoice_id: str, amount: str) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body {{ background: #0a0a0a; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }}
  .container {{ max-width: 560px; margin: 40px auto; background: #111; border: 1px solid #ffffff15; border-radius: 20px; overflow: hidden; }}
  .header {{ background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 40px 32px; text-align: center; }}
  .header h1 {{ margin: 0; font-size: 24px; color: #fff; font-weight: 800; }}
  .body {{ padding: 36px 32px; }}
  .body p {{ color: #9ca3af; line-height: 1.7; font-size: 14px; margin: 0 0 16px; }}
  .btn {{ display: block; width: fit-content; margin: 28px auto; padding: 14px 36px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; }}
  .footer {{ padding: 20px 32px; border-top: 1px solid #ffffff08; text-align: center; }}
  .footer p {{ color: #4b5563; font-size: 11px; margin: 0; }}
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 New Invoice Generated</h1>
    </div>
    <div class="body">
      <p>Hey <strong style="color:#a78bfa">{name}</strong>! 👋</p>
      <p>A new invoice <strong>#{invoice_id}</strong> for <strong>{amount}</strong> has been generated for your account.</p>
      <a href="{frontend_url}/checkout/invoice/{invoice_id}" class="btn">View & Pay Invoice →</a>
    </div>
    <div class="footer">
      <p>© 2026 Starlit Siege Works. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""
    return _send_email(to, f"📄 New Invoice #{invoice_id}", html)


def send_payment_approval_email(name: str, to: str, order_id: int) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body {{ background: #0a0a0a; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }}
  .container {{ max-width: 560px; margin: 40px auto; background: #111; border: 1px solid #ffffff15; border-radius: 20px; overflow: hidden; }}
  .header {{ background: linear-gradient(135deg, #10b981, #059669); padding: 40px 32px; text-align: center; }}
  .header h1 {{ margin: 0; font-size: 24px; color: #fff; font-weight: 800; }}
  .body {{ padding: 36px 32px; }}
  .body p {{ color: #9ca3af; line-height: 1.7; font-size: 14px; margin: 0 0 16px; }}
  .btn {{ display: block; width: fit-content; margin: 28px auto; padding: 14px 36px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; }}
  .footer {{ padding: 20px 32px; border-top: 1px solid #ffffff08; text-align: center; }}
  .footer p {{ color: #4b5563; font-size: 11px; margin: 0; }}
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Payment Approved</h1>
    </div>
    <div class="body">
      <p>Hey <strong style="color:#a78bfa">{name}</strong>! 👋</p>
      <p>Great news! Your payment for order <strong>#{order_id}</strong> has been successfully verified and approved.</p>
      <p>We'll begin processing your service request immediately.</p>
      <a href="{frontend_url}/history" class="btn">View Order Status →</a>
    </div>
    <div class="footer">
      <p>© 2026 Starlit Siege Works. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""
    return _send_email(to, f"✅ Payment Approved for Order #{order_id}", html)


def send_otp_email(name: str, to: str, otp: str) -> bool:
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body {{ background: #0a0a0a; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }}
  .container {{ max-width: 560px; margin: 40px auto; background: #111; border: 1px solid #ffffff15; border-radius: 20px; overflow: hidden; }}
  .header {{ background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 40px 32px; text-align: center; }}
  .header h1 {{ margin: 0; font-size: 24px; color: #fff; font-weight: 800; }}
  .body {{ padding: 36px 32px; }}
  .body p {{ color: #9ca3af; line-height: 1.7; font-size: 14px; margin: 0 0 16px; }}
  .otp-box {{ background: rgba(124,58,237,0.1); border: 2px dashed rgba(124,58,237,0.4); border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0; }}
  .otp-code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #a78bfa; font-family: monospace; }}
  .warning {{ background: #7c3aed10; border: 1px solid #7c3aed30; border-radius: 10px; padding: 14px 18px; margin-top: 24px; }}
  .warning p {{ color: #a78bfa; font-size: 12px; margin: 0; }}
  .footer {{ padding: 20px 32px; border-top: 1px solid #ffffff08; text-align: center; }}
  .footer p {{ color: #4b5563; font-size: 11px; margin: 0; }}
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify Your Email — Starlit Siege Works</h1>
    </div>
    <div class="body">
      <p>Hey <strong style="color:#a78bfa">{name}</strong>!</p>
      <p>Thank you for signing up. Please enter the verification code below to confirm your email address:</p>
      <div class="otp-box">
        <div class="otp-code">{otp}</div>
      </div>
      <p>This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      <div class="warning">
        <p>If you did not create an account on Starlit Siege Works, please ignore this email.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Starlit Siege Works. All rights reserved.</p>
      <p style="margin-top:6px;">This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>"""
    return _send_email(to, "Email Verification Code — Starlit Siege Works", html)


def send_invoice_email_with_pdf(name: str, to: str, invoice_id: str, amount: float, pdf_path: str) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    amount_str = f"Rs. {amount:,.2f}" if not float(amount).is_integer() else f"Rs. {amount:,.0f}"
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body {{ background: #0a0a0a; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }}
  .container {{ max-width: 560px; margin: 40px auto; background: #111; border: 1px solid #ffffff15; border-radius: 20px; overflow: hidden; }}
  .header {{ background: linear-gradient(135deg, #10b981, #059669); padding: 40px 32px; text-align: center; }}
  .header h1 {{ margin: 0; font-size: 24px; color: #fff; font-weight: 800; }}
  .body {{ padding: 36px 32px; }}
  .body p {{ color: #9ca3af; line-height: 1.7; font-size: 14px; margin: 0 0 16px; }}
  .details-box {{ background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.15); border-radius: 12px; padding: 20px; margin: 24px 0; }}
  .details-row {{ display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }}
  .details-row:last-child {{ margin-bottom: 0; }}
  .details-label {{ color: #6b7280; }}
  .details-value {{ color: #e5e7eb; font-weight: 600; }}
  .btn {{ display: block; width: fit-content; margin: 28px auto; padding: 14px 36px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; text-align: center; }}
  .footer {{ padding: 20px 32px; border-top: 1px solid #ffffff08; text-align: center; }}
  .footer p {{ color: #4b5563; font-size: 11px; margin: 0; }}
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧾 Payment Confirmed & Invoice Delivered!</h1>
    </div>
    <div class="body">
      <p>Hey <strong style="color:#10b981">{name}</strong>! 👋</p>
      <p>Thank you for your payment. Your order is officially paid, and your receipt/invoice has been successfully generated and is attached to this email as a PDF.</p>
      
      <div class="details-box">
        <div class="details-row">
          <span class="details-label">Invoice Number:</span>
          <span class="details-value">#{invoice_id}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Amount Paid:</span>
          <span class="details-value">{amount_str}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Status:</span>
          <span class="details-value" style="color: #10b981;">PAID</span>
        </div>
      </div>
      
      <a href="{frontend_url}/history" class="btn">Go to Dashboard →</a>
      
      <p>We have attached the PDF copy of your premium business invoice to this email for your records. If you have any questions or need further support, please don't hesitate to reach out to us!</p>
    </div>
    <div class="footer">
      <p>© 2026 Starlit Siege Works. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""
    return _send_email_with_pdf(to, f"🧾 Payment Confirmed & Invoice #{invoice_id}", html, pdf_path, f"Invoice_{invoice_id}.pdf")


