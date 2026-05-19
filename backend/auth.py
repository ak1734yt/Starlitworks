import os
import time
import json
import secrets
import httpx
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from database import get_db

JWT_SECRET = os.getenv("JWT_SECRET", "b3b985dfebb6061ef6c960d20dbf0cfea3e56a2f34675a0755f32204a37491ca7c69faec1605e42bcafc7d90f91bab7160ce3291bbeef94449155427f695457c")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

bearer_scheme = HTTPBearer(auto_error=False)

# ── Password Helpers ──────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

# ── JWT ───────────────────────────────────────────────────────────────────────
def make_token(user: dict) -> str:
    payload = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "avatar": user["avatar_url"],
        "two_factor_enabled": bool(user.get("two_factor_enabled")),
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def safe_user(user: dict) -> dict:
    exclude = {"password_hash", "reset_token", "reset_token_expires", "two_factor_secret"}
    return {k: v for k, v in user.items() if k not in exclude}

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

# ── Auth Dependencies ─────────────────────────────────────────────────────────
async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return decode_token(credentials.credentials)

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if not credentials:
        return None
    try:
        return decode_token(credentials.credentials)
    except:
        return None

async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user

async def require_manager(user: dict = Depends(get_current_user)):
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Manager access required.")
    return user

# ── 2FA ───────────────────────────────────────────────────────────────────────
def generate_2fa_secret(email: str):
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=email, issuer_name="StarlitSiegeWorks")
    
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    qr_b64 = "data:image/png;base64," + base64.b64encode(buf.read()).decode()
    return secret, qr_b64

def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)

# ── Discord Webhook ───────────────────────────────────────────────────────────
async def send_discord_webhook(url: Optional[str], payload: dict):
    if not url:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, timeout=5)
    except Exception as e:
        print(f"Webhook failed: {e}")

async def send_modular_webhook(alert_type: str, payload: dict):
    config_path = os.path.join(os.path.dirname(__file__), "data", "webhooks_config.json")
    custom_url = None
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
                custom_url = config.get(alert_type.upper())
        except Exception:
            pass

    if not custom_url:
        env_map = {
            "ORDERS": os.getenv("DISCORD_WEBHOOK_ORDERS"),
            "CHAT": os.getenv("DISCORD_WEBHOOK_CHAT"),
            "PAYMENTS": os.getenv("DISCORD_WEBHOOK_PAYMENT"),
            "LOGS": os.getenv("DISCORD_WEBHOOK_LOGS"),
            "REFERRALS": os.getenv("DISCORD_WEBHOOK_LOGS"),
            "LOGINS": os.getenv("DISCORD_WEBHOOK_LOGS"),
            "TELEMETRY": os.getenv("DISCORD_WEBHOOK_LOGS")
        }
        custom_url = env_map.get(alert_type.upper())

    if custom_url:
        await send_discord_webhook(custom_url, payload)

# ── Activity Logging ──────────────────────────────────────────────────────────
def log_activity(user_id: int, action: str, details: str = ""):
    try:
        db = get_db()
        user = db.execute("SELECT name FROM auth.users WHERE id = ?", (user_id,)).fetchone()
        admin_name = user["name"] if user else "Unknown"
        log_str = f"[{admin_name}] {details}"
        db.execute("INSERT INTO orders.activity_logs (user_id, action, details) VALUES (?, ?, ?)", (user_id, action, log_str))
        db.commit()
        db.close()
        
        # Structured Logging to files
        log_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(log_dir, exist_ok=True)
        
        # Append to NDJSON log file
        json_log_path = os.path.join(log_dir, "activity_logs.json")
        json_entry = {
            "timestamp": int(time.time()),
            "datetime": datetime.utcnow().isoformat() + "Z",
            "user_id": user_id,
            "user_name": admin_name,
            "action": action,
            "details": details,
            "message": log_str
        }
        with open(json_log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(json_entry, ensure_ascii=False) + "\n")
            
        # Append to plaintext log file
        txt_log_path = os.path.join(log_dir, "activity_logs.txt")
        time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        txt_entry = f"[{time_str}] Action: {action} | User: {admin_name} (ID: {user_id}) | Details: {details}\n"
        with open(txt_log_path, "a", encoding="utf-8") as f:
            f.write(txt_entry)
        
        color_map = {
            "BAN_USER": 16711680, "UNBAN_USER": 65280, "CREATE_PRODUCT": 3447003,
            "DELETE_PRODUCT": 16711680, "UPDATE_PRICE": 16776960
        }
        import asyncio
        asyncio.create_task(send_discord_webhook(os.getenv("DISCORD_WEBHOOK_LOGS"), {
            "embeds": [{"title": f"Admin Action: {action}", "description": log_str,
                        "color": color_map.get(action, 3447003), "timestamp": datetime.utcnow().isoformat()}]
        }))
    except Exception as e:
        print(f"Failed to log activity: {e}")

# ── Notification ──────────────────────────────────────────────────────────────
def create_notification(user_id: int, title: str, message: str, type_: str = "info"):
    try:
        db = get_db()
        db.execute("INSERT INTO orders.notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
                   (user_id, title, message, type_))
        db.commit()
        db.close()
    except Exception as e:
        print(f"Failed to create notification: {e}")

# ── Fraud / Risk Score ────────────────────────────────────────────────────────
def calculate_risk_score(data: dict, db) -> tuple[int, list]:
    score = 0
    flags = []

    dc_keywords = ["hosting", "google", "amazon", "cloud", "data center", "ovh", "digitalocean", "proxy", "vpn", "vps"]
    org = (data.get("org") or "").lower()
    if any(k in org for k in dc_keywords):
        score += 40
        flags.append("DATA_CENTER_IP")

    ip = data.get("ip")
    if ip:
        row = db.execute(
            "SELECT COUNT(DISTINCT user_id) as count FROM orders.analytics_logs WHERE ip = ? AND user_id IS NOT NULL", (ip,)
        ).fetchone()
        if row and row["count"] > 1:
            score += 30
            flags.append("MULTI_ACCOUNT_CROSSOVER")

    if not data.get("lat"):
        score += 10
        flags.append("GEOLOCATION_DENIED")

    return score, flags

# ── WhatsApp Notification ─────────────────────────────────────────────────────
async def send_whatsapp(order_id, sender_name: str, content: str, frontend_url: str):
    try:
        db = get_db()
        rows = db.execute(
            "SELECT key, value FROM site_settings WHERE key IN ('whatsapp_enabled','whatsapp_number','whatsapp_api_key')"
        ).fetchall()
        db.close()
        settings = {r["key"]: r["value"] for r in rows}
        if settings.get("whatsapp_enabled") != "true" or not settings.get("whatsapp_number"):
            return
        msg = f"*New Client Message (Order #{order_id})*\nFrom: {sender_name}\nMessage: {content}\n\nReply: {frontend_url}/manager?tab=payments"
        url = f"https://api.callmebot.com/whatsapp.php?phone={settings['whatsapp_number']}&text={msg}&apikey={settings.get('whatsapp_api_key', '')}"
        async with httpx.AsyncClient() as client:
            await client.get(url, timeout=5)
    except Exception as e:
        print(f"WhatsApp failed: {e}")
