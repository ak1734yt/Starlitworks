import os, json, secrets, time
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from auth import (hash_password, verify_password, make_token, safe_user,
                  get_current_user, require_admin, require_manager,
                  generate_2fa_secret, verify_totp, log_activity,
                  send_discord_webhook)
from database import get_db
from mailer import send_welcome_email, send_password_reset_email

router = APIRouter()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

class SignupBody(BaseModel):
    name: str
    email: EmailStr
    password: str

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
    return {"token": make_token(user), "user": safe_user(user)}

@router.post("/auth/login")
def login(body: LoginBody):
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
    return {"token": make_token(user), "user": safe_user(user)}

@router.post("/auth/login/2fa")
def login_2fa(body: TwoFALoginBody):
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (body.userId,)).fetchone()
    db.close()
    if not row: raise HTTPException(404, "User not found")
    user = dict(row)
    if not verify_totp(user["two_factor_secret"], body.code):
        raise HTTPException(401, "Invalid 2FA code")
    return {"token": make_token(user), "user": safe_user(user)}

@router.post("/auth/2fa/setup")
def setup_2fa(user=Depends(get_current_user)):
    secret, qr = generate_2fa_secret(user["email"])
    db = get_db()
    db.execute("UPDATE users SET two_factor_secret = ? WHERE id = ?", (secret, user["id"]))
    db.commit(); db.close()
    return {"qrCodeUrl": qr, "secret": secret}

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
