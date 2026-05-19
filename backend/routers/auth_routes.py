import os, json, secrets, time
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from auth import (hash_password, verify_password, make_token, safe_user,
                  get_current_user, require_admin, require_manager,
                  generate_2fa_secret, verify_totp, log_activity,
                  send_discord_webhook, send_modular_webhook)
from database import get_db
from mailer import send_welcome_email, send_password_reset_email

router = APIRouter()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Simple in-memory rate limiter for login
login_attempts = {}
MAX_LOGIN_ATTEMPTS = 5
LOGIN_BLOCK_SECONDS = 60

class SignupBody(BaseModel):
    name: str
    email: EmailStr
    password: str
    referral_code: str = ""

class LoginBody(BaseModel):
    email: EmailStr
    password: str

class TwoFALoginBody(BaseModel):
    userId: int
    code: str

class TwoFACodeBody(BaseModel):
    code: str

class ForgotBody(BaseModel):
    email: EmailStr

class MakeAdminBody(BaseModel):
    secret: str
    email: EmailStr

class ProfileBody(BaseModel):
    name: str = None
    phone: str = None
    avatar_url: str = None
    social_links: dict = {}
    gender: str = ""
    location: str = ""

class ResetPasswordBody(BaseModel):
    token: str
    password: str

@router.post("/auth/signup", status_code=201)
def signup(body: SignupBody):
    if len(body.name) < 2 or len(body.name) > 80:
        raise HTTPException(400, "Name must be 2-80 characters.")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be 8+ characters.")
    db = get_db()
    if db.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone():
        db.close(); raise HTTPException(409, "An account with this email already exists.")
    h = hash_password(body.password)
    db.execute("INSERT INTO users (name, email, password_hash) VALUES (?,?,?)", (body.name, body.email, h))
    db.commit()
    user = dict(db.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone())
    db.execute("UPDATE users SET last_login = ? WHERE id = ?", (int(time.time()), user["id"]))
    db.commit(); db.close()
    # Send welcome email in background (non-blocking)
    import threading
    threading.Thread(target=send_welcome_email, args=(body.name, body.email), daemon=True).start()
    # Process referral if code provided
    if body.referral_code and body.referral_code.strip():
        def _do_referral(uid, code):
            try:
                from routers.referral_routes import process_referral_on_signup
                process_referral_on_signup(uid, code.strip().upper())
            except Exception as e:
                print(f"Referral signup error: {e}")
        threading.Thread(target=_do_referral, args=(user["id"], body.referral_code), daemon=True).start()

    # Modular Webhook Notification
    def _do_signup_webhook():
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(send_modular_webhook("LOGINS", {
                "embeds": [{
                    "title": "🆕 New User Signup!",
                    "description": f"**Name:** {body.name}\n**Email:** {body.email}\n**Referral Code:** {body.referral_code or 'None'}",
                    "color": 65280,
                    "timestamp": __import__("datetime").datetime.utcnow().isoformat()
                }]
            }))
            loop.close()
        except Exception as e:
            print(f"Signup webhook error: {e}")
    threading.Thread(target=_do_signup_webhook, daemon=True).start()

    return {"token": make_token(user), "user": safe_user(user)}

@router.post("/auth/login")
def login(body: LoginBody, request: Request):
    client_ip = request.client.host
    now = time.time()
    
    # Rate Limiting Logic
    if client_ip in login_attempts:
        attempts, last_time = login_attempts[client_ip]
        if now - last_time > LOGIN_BLOCK_SECONDS:
            login_attempts[client_ip] = [1, now] # Reset
        elif attempts >= MAX_LOGIN_ATTEMPTS:
            raise HTTPException(429, "Too many login attempts. Please try again later.")
        else:
            login_attempts[client_ip] = [attempts + 1, now]
    else:
        login_attempts[client_ip] = [1, now]

    db = get_db()
    row = db.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    db.close()
    if not row: raise HTTPException(401, "Invalid email or password")
    user = dict(row)
    if not verify_password(body.password, user.get("password_hash") or ""):
        raise HTTPException(401, "Invalid email or password")
    if user.get("is_banned"): raise HTTPException(403, "Your account has been banned.")
    if user.get("two_factor_enabled"):
        return {"two_factor_required": True, "userId": user["id"]}

    # Modular Webhook Notification
    def _do_login_webhook():
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(send_modular_webhook("LOGINS", {
                "embeds": [{
                    "title": "🔐 Account Login Event",
                    "description": f"**User:** {user['name']}\n**Email:** {user['email']}\n**IP:** {client_ip}",
                    "color": 3447003,
                    "timestamp": __import__("datetime").datetime.utcnow().isoformat()
                }]
            }))
            loop.close()
        except Exception as e:
            print(f"Login webhook error: {e}")
    import threading
    threading.Thread(target=_do_login_webhook, daemon=True).start()

    return {"token": make_token(user), "user": safe_user(user)}

@router.post("/auth/login/2fa")
def login_2fa(body: TwoFALoginBody):
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (body.userId,)).fetchone()
    if not row: db.close(); raise HTTPException(404, "User not found")
    user = dict(row)
    
    is_valid_totp = verify_totp(user["two_factor_secret"], body.code)
    is_backup_code = False
    
    if not is_valid_totp:
        # Check if code is a backup code
        backup_codes = json.loads(user.get("backup_codes") or "[]")
        if body.code in backup_codes:
            is_backup_code = True
            backup_codes.remove(body.code)
            db.execute("UPDATE users SET backup_codes = ? WHERE id = ?", (json.dumps(backup_codes), user["id"]))
            db.commit()
    
    db.close()
    
    if not is_valid_totp and not is_backup_code:
        raise HTTPException(401, "Invalid 2FA or backup code")
        
    return {"token": make_token(user), "user": safe_user(user)}

@router.post("/auth/2fa/setup")
def setup_2fa(user=Depends(get_current_user)):
    secret, qr = generate_2fa_secret(user["email"])
    backup_codes = [secrets.token_hex(4).upper() for _ in range(5)]
    db = get_db()
    db.execute("UPDATE users SET two_factor_secret = ?, backup_codes = ? WHERE id = ?", (secret, json.dumps(backup_codes), user["id"]))
    db.commit(); db.close()
    return {"qrCodeUrl": qr, "secret": secret, "backup_codes": backup_codes}

@router.post("/auth/2fa/verify")
def verify_2fa(body: TwoFACodeBody, user=Depends(get_current_user)):
    db = get_db()
    row = dict(db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone())
    if not verify_totp(row["two_factor_secret"], body.code):
        db.close(); raise HTTPException(400, "Invalid verification code")
    db.execute("UPDATE users SET two_factor_enabled = 1 WHERE id = ?", (user["id"],))
    db.commit(); db.close()
    log_activity(user["id"], "ENABLE_2FA", "User enabled 2FA")
    return {"success": True}

@router.post("/auth/2fa/disable")
def disable_2fa(body: TwoFACodeBody, user=Depends(get_current_user)):
    db = get_db()
    row = dict(db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone())
    if not verify_totp(row["two_factor_secret"], body.code):
        db.close(); raise HTTPException(400, "Invalid verification code")
    db.execute("UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?", (user["id"],))
    db.commit(); db.close()
    log_activity(user["id"], "DISABLE_2FA", "User disabled 2FA")
    return {"success": True}

@router.post("/auth/forgot-password")
def forgot_password(body: ForgotBody):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    if user and dict(user).get("provider", "local") == "local":
        token = secrets.token_hex(32)
        expires = int(time.time()) + 3600
        db.execute("UPDATE users SET reset_token=?, reset_token_expires=? WHERE email=?", (token, expires, body.email))
        db.commit()
        link = f"{FRONTEND_URL}/reset-password?token={token}"
        print(f"Reset link: {link}")
        # Send email in background (non-blocking)
        import threading
        threading.Thread(target=send_password_reset_email, args=(body.email, link), daemon=True).start()
    db.close()
    return {"message": "If that email exists, a reset link has been sent."}

@router.post("/auth/reset-password")
def reset_password(body: ResetPasswordBody):
    db = get_db()
    now = int(time.time())
    user = db.execute("SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?", (body.token, now)).fetchone()
    if not user: db.close(); raise HTTPException(400, "Token invalid or expired")
    h = hash_password(body.password)
    db.execute("UPDATE users SET password_hash=?, reset_token=NULL, reset_token_expires=NULL WHERE id=?", (h, user["id"]))
    db.commit(); db.close()
    return {"success": True}

@router.get("/auth/me")
def get_me(user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    db.close()
    if not row: raise HTTPException(404, "User not found.")
    return {"user": safe_user(dict(row))}

@router.get("/auth/status")
def auth_status():
    return {
        "google": bool(os.getenv("GOOGLE_CLIENT_ID")),
        "discord": bool(os.getenv("DISCORD_CLIENT_ID")),
        "microsoft": bool(os.getenv("MICROSOFT_CLIENT_ID")),
        "apple": bool(os.getenv("APPLE_CLIENT_ID"))
    }

@router.post("/auth/make-admin")
def make_admin(body: MakeAdminBody):
    secret = os.getenv("ADMIN_SETUP_SECRET", "ssw_admin_setup")
    if body.secret != secret: raise HTTPException(403, "Invalid secret.")
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    if not user: db.close(); raise HTTPException(404, "User not found.")
    db.execute("UPDATE users SET role = 'admin' WHERE id = ?", (user["id"],))
    db.commit(); db.close()
    return {"message": f"{user['name']} is now an admin."}

@router.put("/auth/profile")
def update_profile(body: ProfileBody, user=Depends(get_current_user)):
    db = get_db()
    db.execute("UPDATE users SET name=?,phone=?,avatar_url=?,social_links=?,gender=?,location=? WHERE id=?",
               (body.name, body.phone, body.avatar_url, json.dumps(body.social_links), body.gender, body.location, user["id"]))
    db.commit()
    row = dict(db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone())
    db.close()
    return {"success": True, "user": safe_user(row)}

# ─── Avatar Upload ────────────────────────────────────────────────────────────
import shutil, uuid
from fastapi import UploadFile, File

DATA_DIR    = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

@router.post("/upload/avatar")
async def upload_avatar(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, "Unsupported file type. Use JPG, PNG, GIF or WebP.")
    fname = f"avatar_{user['id']}_{uuid.uuid4().hex[:8]}{ext}"
    dest  = os.path.join(UPLOADS_DIR, fname)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    url = f"/uploads/{fname}"
    # Update avatar in DB immediately
    db = get_db()
    db.execute("UPDATE users SET avatar_url=? WHERE id=?", (url, user["id"]))
    db.commit(); db.close()
    return {"url": url}

class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str

@router.post("/auth/change-password")
def change_password(body: ChangePasswordBody, user=Depends(get_current_user)):
    if len(body.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "User not found")
    user_data = dict(row)
    if user_data.get("provider", "local") != "local":
         db.close()
         raise HTTPException(400, "Social login accounts cannot change password directly.")
    if not verify_password(body.current_password, user_data.get("password_hash") or ""):
         db.close()
         raise HTTPException(400, "Incorrect current password.")
    
    h = hash_password(body.new_password)
    db.execute("UPDATE users SET password_hash = ? WHERE id = ?", (h, user["id"]))
    db.commit()
    db.close()
    log_activity(user["id"], "CHANGE_PASSWORD", "User successfully changed password")
    return {"success": True, "message": "Password changed successfully."}

