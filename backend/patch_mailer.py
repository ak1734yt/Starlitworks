import os

new_code = """

def send_order_confirm_email(name: str, to: str, order_id: int, service_name: str) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    html = f'''<!DOCTYPE html>
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
      <p>We\\'ve successfully received your order <strong>#{order_id}</strong> for <strong>{service_name}</strong>.</p>
      <p>Our team is reviewing your request and will provide a quote or update your order status shortly.</p>
      <a href="{frontend_url}/history" class="btn">Track Order Status →</a>
    </div>
    <div class="footer">
      <p>© 2026 Starlit Siege Works. All rights reserved.</p>
    </div>
  </div>
</body>
</html>'''
    return _send_email(to, f"🧾 Order Confirmation #{order_id}", html)

def send_invoice_email(name: str, to: str, invoice_id: str, amount: str) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    html = f'''<!DOCTYPE html>
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
</html>'''
    return _send_email(to, f"📄 New Invoice #{invoice_id}", html)

def send_payment_approval_email(name: str, to: str, order_id: int) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    html = f'''<!DOCTYPE html>
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
      <p>We\\'ll begin processing your service request immediately.</p>
      <a href="{frontend_url}/history" class="btn">View Order Status →</a>
    </div>
    <div class="footer">
      <p>© 2026 Starlit Siege Works. All rights reserved.</p>
    </div>
  </div>
</body>
</html>'''
    return _send_email(to, f"✅ Payment Approved for Order #{order_id}", html)
"""

with open(r'c:\Users\aksha\Desktop\website\freelancing-website\backend\mailer.py', 'a', encoding='utf-8') as f:
    f.write(new_code)
