import os, json, secrets, time, random, hashlib
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from auth import (hash_password, verify_password, make_token, make_refresh_token, safe_user,
                  get_current_user, require_admin, require_manager,
                  generate_2fa_secret, verify_totp, log_activity,
                  send_discord_webhook, send_modular_webhook,
                  validate_password_strength, hash_reset_token)
from database import get_db
from mailer import send_welcome_email, send_password_reset_email, send_otp_email

router = APIRouter()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# In-memory rate limiters
login_attempts = {}
MAX_LOGIN_ATTEMPTS = 5
LOGIN_BLOCK_SECONDS = 60

# 2FA rate limiter
twofa_attempts = {}
MAX_2FA_ATTEMPTS = 5
TWOFA_BLOCK_SECONDS = 300

# Pending signup OTP store: email -> {name, password_hash, otp, expires, attempts, referral_code}
pending_signups = {}

class SignupBody(BaseModel):
    name: str
    email: EmailStr
    password: str
    referral_code: str = ""

class VerifyOTPBody(BaseModel):
    email: EmailStr
    otp: str
    referral_code: str = ""

class ResendOTPBody(BaseModel):
    email: EmailStr

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

@router.post("/auth/signup", status_code=200)
def signup(body: SignupBody):
    """Step 1: Validate inputs, send OTP email. Does NOT create user yet."""
    if len(body.name) < 2 or len(body.name) > 80:
        raise HTTPException(400, "Name must be 2-80 characters.")
    validate_password_strength(body.password)
    db = get_db()
    if db.execute("SELECT id FROM auth.users WHERE email = ?", (body.email,)).fetchone():
        db.close(); raise HTTPException(409, "An account with this email already exists.")
    db.close()

    otp = f"{random.randint(100000, 999999)}"
    pending_signups[body.email] = {
        "name": body.name,
        "password_hash": hash_password(body.password),
        "otp": otp,
        "expires": time.time() + 600,
        "attempts": 0,
        "referral_code": body.referral_code or ""
    }

    import threading
    threading.Thread(target=send_otp_email, args=(body.name, body.email, otp), daemon=True).start()

    return {"message": "Verification code sent to your email.", "requires_otp": True}

@router.post("/auth/verify-signup", status_code=201)
def verify_signup(body: VerifyOTPBody):
    """Step 2: Verify OTP and create user."""
    pending = pending_signups.get(body.email)
    if not pending:
        raise HTTPException(400, "No pending signup found. Please sign up again.")
    if time.time() > pending["expires"]:
        del pending_signups[body.email]
        raise HTTPException(400, "Verification code expired. Please sign up again.")
    pending["attempts"] += 1
    if pending["attempts"] > 5:
        del pending_signups[body.email]
        raise HTTPException(429, "Too many attempts. Please sign up again.")
    if body.otp != pending["otp"]:
        raise HTTPException(400, "Invalid verification code.")

    db = get_db()
    if db.execute("SELECT id FROM auth.users WHERE email = ?", (body.email,)).fetchone():
        db.close()
        del pending_signups[body.email]
        raise HTTPException(409, "An account with this email already exists.")
    db.execute("INSERT INTO auth.users (name, email, password_hash, email_verified) VALUES (?,?,?,1)",
               (pending["name"], body.email, pending["password_hash"]))
    db.commit()
    user = dict(db.execute("SELECT * FROM auth.users WHERE email = ?", (body.email,)).fetchone())
    db.execute("UPDATE auth.users SET last_login = ? WHERE id = ?", (int(time.time()), user["id"]))
    db.commit(); db.close()

    referral_code = pending.get("referral_code") or body.referral_code or ""
    del pending_signups[body.email]

    import threading
    threading.Thread(target=send_welcome_email, args=(pending["name"], body.email), daemon=True).start()

    if referral_code and referral_code.strip():
        def _do_referral(uid, code):
            try:
                from routers.referral_routes import process_referral_on_signup
                process_referral_on_signup(uid, code.strip().upper())
            except Exception as e:
                print(f"Referral signup error: {e}")
        threading.Thread(target=_do_referral, args=(user["id"], referral_code), daemon=True).start()

    def _do_signup_webhook():
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(send_modular_webhook("LOGINS", {
                "embeds": [{
                    "title": "🆕 New User Signup!",
                    "description": f"**Name:** {pending['name']}\n**Email:** {body.email}\n**Referral Code:** {referral_code or 'None'}",
                    "color": 65280,
                    "timestamp": __import__("datetime").datetime.utcnow().isoformat()
                }]
            }))
            loop.close()
        except Exception as e:
            print(f"Signup webhook error: {e}")
    threading.Thread(target=_do_signup_webhook, daemon=True).start()

    return {"token": make_token(user), "refresh_token": make_refresh_token(user), "user": safe_user(user)}

@router.post("/auth/resend-otp")
def resend_otp(body: ResendOTPBody):
    """Resend OTP for a pending signup."""
    pending = pending_signups.get(body.email)
    if not pending:
        raise HTTPException(400, "No pending signup found. Please sign up again.")
    if time.time() > pending["expires"]:
        del pending_signups[body.email]
        raise HTTPException(400, "Verification code expired. Please sign up again.")

    otp = f"{random.randint(100000, 999999)}"
    pending["otp"] = otp
    pending["expires"] = time.time() + 600
    pending["attempts"] = 0

    import threading
    threading.Thread(target=send_otp_email, args=(pending["name"], body.email, otp), daemon=True).start()
    return {"message": "New verification code sent."}

@router.post("/auth/login")
def login(body: LoginBody, request: Request):
    client_ip = request.client.host
    now = time.time()
    
    # Rate Limiting Logic
    if client_ip in login_attempts:
        attempts, last_time = login_attempts[client_ip]
        if now - last_time > LOGIN_BLOCK_SECONDS:
            login_attempts[client_ip] = [1, now]
        elif attempts >= MAX_LOGIN_ATTEMPTS:
            raise HTTPException(429, "Too many login attempts. Please try again later.")
        else:
            login_attempts[client_ip] = [attempts + 1, now]
    else:
        login_attempts[client_ip] = [1, now]

    db = get_db()
    row = db.execute("SELECT * FROM auth.users WHERE email = ?", (body.email,)).fetchone()
    if not row: db.close(); raise HTTPException(401, "Invalid email or password")
    user = dict(row)
    if not verify_password(body.password, user.get("password_hash") or ""):
        db.close()
        raise HTTPException(401, "Invalid email or password")
    if user.get("is_banned"): db.close(); raise HTTPException(403, "Your account has been banned.")
    if user.get("two_factor_enabled"):
        db.close()
        return {"two_factor_required": True, "userId": user["id"]}

    # Update last_login
    db.execute("UPDATE auth.users SET last_login = ? WHERE id = ?", (int(time.time()), user["id"]))
    db.commit(); db.close()

    # Clear rate limiter on success
    login_attempts.pop(client_ip, None)

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

    return {"token": make_token(user), "refresh_token": make_refresh_token(user), "user": safe_user(user)}

@router.post("/auth/login/2fa")
def login_2fa(body: TwoFALoginBody, request: Request):
    # Rate limit 2FA attempts per userId
    key = f"2fa_{body.userId}"
    now = time.time()
    if key in twofa_attempts:
        attempts, last_time = twofa_attempts[key]
        if now - last_time > TWOFA_BLOCK_SECONDS:
            twofa_attempts[key] = [1, now]
        elif attempts >= MAX_2FA_ATTEMPTS:
            raise HTTPException(429, "Too many 2FA attempts. Please wait 5 minutes.")
        else:
            twofa_attempts[key] = [attempts + 1, now]
    else:
        twofa_attempts[key] = [1, now]

    db = get_db()
    row = db.execute("SELECT * FROM auth.users WHERE id = ?", (body.userId,)).fetchone()
    if not row: db.close(); raise HTTPException(404, "User not found")
    user = dict(row)
    
    is_valid_totp = verify_totp(user["two_factor_secret"], body.code)
    is_backup_code = False
    
    if not is_valid_totp:
        backup_codes = json.loads(user.get("backup_codes") or "[]")
        if body.code in backup_codes:
            is_backup_code = True
            backup_codes.remove(body.code)
            db.execute("UPDATE auth.users SET backup_codes = ? WHERE id = ?", (json.dumps(backup_codes), user["id"]))
            db.commit()
    
    db.close()
    
    if not is_valid_totp and not is_backup_code:
        raise HTTPException(401, "Invalid 2FA or backup code")

    twofa_attempts.pop(key, None)
    return {"token": make_token(user), "refresh_token": make_refresh_token(user), "user": safe_user(user)}

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
    user = db.execute("SELECT * FROM auth.users WHERE email = ?", (body.email,)).fetchone()
    if user and dict(user).get("provider", "local") == "local":
        token = secrets.token_hex(32)
        token_hash = hash_reset_token(token)
        expires = int(time.time()) + 3600
        db.execute("UPDATE auth.users SET reset_token=?, reset_token_expires=? WHERE email=?", (token_hash, expires, body.email))
        db.commit()
        link = f"{FRONTEND_URL}/reset-password?token={token}"
        import threading
        threading.Thread(target=send_password_reset_email, args=(body.email, link), daemon=True).start()
    db.close()
    return {"message": "If that email exists, a reset link has been sent."}

@router.post("/auth/reset-password")
def reset_password(body: ResetPasswordBody):
    validate_password_strength(body.password)
    db = get_db()
    now = int(time.time())
    token_hash = hash_reset_token(body.token)
    user = db.execute("SELECT * FROM auth.users WHERE reset_token = ? AND reset_token_expires > ?", (token_hash, now)).fetchone()
    if not user: db.close(); raise HTTPException(400, "Token invalid or expired")
    h = hash_password(body.password)
    # Invalidate all existing sessions by incrementing token_version
    db.execute("UPDATE auth.users SET password_hash=?, reset_token=NULL, reset_token_expires=NULL, token_version = COALESCE(token_version, 0) + 1 WHERE id=?", (h, user["id"]))
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
def make_admin(body: MakeAdminBody, caller=Depends(require_manager)):
    """Requires both manager auth AND the admin setup secret."""
    secret = os.getenv("ADMIN_SETUP_SECRET", "")
    if not secret or body.secret != secret:
        raise HTTPException(403, "Invalid secret.")
    db = get_db()
    user = db.execute("SELECT * FROM auth.users WHERE email = ?", (body.email,)).fetchone()
    if not user: db.close(); raise HTTPException(404, "User not found.")
    db.execute("UPDATE auth.users SET role = 'admin' WHERE id = ?", (user["id"],))
    db.commit(); db.close()
    log_activity(caller["id"], "PROMOTE_ADMIN", f"Promoted {body.email} to admin")
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

MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2 MB

@router.post("/upload/avatar")
async def upload_avatar(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, "Unsupported file type. Use JPG, PNG, GIF or WebP.")
    # Read file and check size
    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(400, f"File too large. Maximum size is {MAX_AVATAR_SIZE // (1024*1024)} MB.")
    fname = f"avatar_{user['id']}_{uuid.uuid4().hex[:8]}{ext}"
    dest  = os.path.join(UPLOADS_DIR, fname)
    with open(dest, "wb") as f:
        f.write(content)
    url = f"/uploads/{fname}"
    db = get_db()
    db.execute("UPDATE auth.users SET avatar_url=? WHERE id=?", (url, user["id"]))
    db.commit(); db.close()
    return {"url": url}

class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str

@router.post("/auth/change-password")
def change_password(body: ChangePasswordBody, user=Depends(get_current_user)):
    validate_password_strength(body.new_password)
    db = get_db()
    row = db.execute("SELECT * FROM auth.users WHERE id = ?", (user["id"],)).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "User not found")
    user_data = dict(row)
    if user_data.get("password_hash"):
        if not verify_password(body.current_password, user_data.get("password_hash") or ""):
             db.close()
             raise HTTPException(400, "Invalid email or password")
    
    h = hash_password(body.new_password)
    # Set password and invalidate all existing sessions
    db.execute("UPDATE auth.users SET password_hash = ?, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?", (h, user["id"]))
    db.commit()
    db.close()
    log_activity(user["id"], "CHANGE_PASSWORD", "User successfully changed password")
    return {"success": True, "message": "Password changed successfully. Please log in again."}

