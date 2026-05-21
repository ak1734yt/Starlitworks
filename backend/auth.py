import os
import re
import time
import json
import hashlib
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

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("FATAL: JWT_SECRET environment variable is not set.")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 30
STARLIT_API_KEY = os.getenv("STARLIT_API_KEY", "")

bearer_scheme = HTTPBearer(auto_error=False)

# ── Password Helpers ──────────────────────────────────────────────────────────
def sanitize_password(password: str) -> str:
    return password.strip()

def get_peppered_password(password: str) -> bytes:
    sanitized = sanitize_password(password)
    pepper = JWT_SECRET or "default_starlit_pepper_constant"
    hasher = hashlib.sha256()
    hasher.update(sanitized.encode('utf-8'))
    hasher.update(pepper.encode('utf-8'))
    return hasher.hexdigest().encode('utf-8')

def hash_password(password: str) -> str:
    peppered = get_peppered_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(peppered, salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        # Try new peppered verification
        peppered = get_peppered_password(plain)
        if bcrypt.checkpw(peppered, hashed.encode('utf-8')):
            return True
        # Fallback to legacy plain-text verification
        sanitized = sanitize_password(plain)
        if bcrypt.checkpw(sanitized.encode('utf-8'), hashed.encode('utf-8')):
            return True
        return False
    except Exception:
        return False

# ── JWT ───────────────────────────────────────────────────────────────────────
def make_token(user: dict) -> str:
    payload = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "avatar": user.get("avatar_url", ""),
        "two_factor_enabled": bool(user.get("two_factor_enabled")),
        "ver": user.get("token_version", 0),
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def make_refresh_token(user: dict) -> str:
    payload = {
        "id": user["id"],
        "type": "refresh",
        "ver": user.get("token_version", 0),
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def encrypt_val(text: str, key: str) -> str:
    if not text:
        return ""
    text_bytes = text.encode("utf-8")
    key_bytes = key.encode("utf-8")
    result_bytes = bytearray(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(text_bytes))
    return base64.b64encode(result_bytes).decode("utf-8")

def safe_user(user: dict) -> dict:
    exclude = {"password_hash", "reset_token", "reset_token_expires", "two_factor_secret"}
    res = {k: v for k, v in user.items() if k not in exclude}
    if "details" in res:
        details_val = res["details"] or "{}"
        if not isinstance(details_val, str):
            details_val = json.dumps(details_val)
        key = os.getenv("STARLIT_API_KEY", "")
        if key:
            res["details"] = encrypt_val(details_val, key)
            res["details_enc"] = True
    return res

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

# ── Auth Dependencies ─────────────────────────────────────────────────────────
async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Unauthorized")
    payload = decode_token(credentials.credentials)
    # Verify user exists, is not banned, and token version matches
    db = get_db()
    row = db.execute("SELECT is_banned, token_version FROM auth.users WHERE id = ?", (payload["id"],)).fetchone()
    db.close()
    if not row:
        raise HTTPException(status_code=401, detail="User no longer exists")
    if row["is_banned"]:
        raise HTTPException(status_code=403, detail="Account has been banned")
    if row["token_version"] != payload.get("ver", 0):
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return payload

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        db = get_db()
        row = db.execute("SELECT is_banned, token_version FROM auth.users WHERE id = ?", (payload["id"],)).fetchone()
        db.close()
        if not row or row["is_banned"] or row["token_version"] != payload.get("ver", 0):
            return None
        return payload
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

# ── Password Strength ─────────────────────────────────────────────────────────
def validate_password_strength(password: str):
    """Enforce password complexity: 8+ chars, upper, lower, digit."""
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(400, "Password must contain at least one uppercase letter.")
    if not re.search(r'[a-z]', password):
        raise HTTPException(400, "Password must contain at least one lowercase letter.")
    if not re.search(r'[0-9]', password):
        raise HTTPException(400, "Password must contain at least one number.")

# ── Reset Token Hashing ───────────────────────────────────────────────────────
def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

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
        
        from realtime import pubsub
        pubsub.publish(f"notifications_{user_id}", {"title": title, "message": message, "type": type_})
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
