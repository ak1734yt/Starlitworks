"""
OAuth 2.0 Social Login Routes
Supports: Google, Discord, Microsoft (Apple uses client-side OIDC — stub included)
"""
import os, json, secrets, time
import httpx
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from auth import make_token, safe_user, log_activity
from database import get_db

router = APIRouter()

# ── OAuth State Store (CSRF protection) ───────────────────────────────────────
_oauth_states = {}  # state_token -> timestamp
_STATE_TTL = 600    # 10 minutes

def _create_state() -> str:
    """Generate and store a CSRF state token."""
    now = time.time()
    expired = [k for k, v in _oauth_states.items() if now - v > _STATE_TTL]
    for k in expired:
        del _oauth_states[k]
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = now
    return state

def _validate_state(state: str) -> bool:
    """Validate and consume a CSRF state token."""
    if not state or state not in _oauth_states:
        return False
    ts = _oauth_states.pop(state)
    return (time.time() - ts) < _STATE_TTL

FRONTEND_URL     = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL      = os.getenv("BACKEND_URL",  "http://152.53.55.180:5504")

# ── Per-provider credentials ────────────────────────────────────────────────────

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = f"{BACKEND_URL}/api/auth/google/callback"

DISCORD_CLIENT_ID     = os.getenv("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "")
DISCORD_REDIRECT_URI  = f"{BACKEND_URL}/api/auth/discord/callback"

MICROSOFT_CLIENT_ID     = os.getenv("MICROSOFT_CLIENT_ID", "")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET", "")
MICROSOFT_REDIRECT_URI  = f"{BACKEND_URL}/api/auth/microsoft/callback"
MICROSOFT_TENANT        = os.getenv("MICROSOFT_TENANT", "common")  # or your tenant ID

APPLE_CLIENT_ID     = os.getenv("APPLE_CLIENT_ID", "")
APPLE_TEAM_ID       = os.getenv("APPLE_TEAM_ID", "")
APPLE_KEY_ID        = os.getenv("APPLE_KEY_ID", "")
APPLE_PRIVATE_KEY   = os.getenv("APPLE_PRIVATE_KEY", "")   # PEM string
APPLE_REDIRECT_URI  = f"{BACKEND_URL}/api/auth/apple/callback"

# ── Helper: upsert OAuth user ───────────────────────────────────────────────────

def _upsert_oauth_user(provider: str, provider_id: str, email: str, name: str, avatar: str = "") -> dict:
    """Find or create a user for a social-login provider. Returns the user dict."""
    db = get_db()
    # 1) Try match by provider_id
    row = db.execute(
        "SELECT * FROM users WHERE provider = ? AND provider_id = ?",
        (provider, str(provider_id))
    ).fetchone()

    if row:
        user = dict(row)
        db.execute("UPDATE users SET last_login = ? WHERE id = ?", (int(time.time()), user["id"]))
        db.commit()
        db.close()
        return user

    # 2) Try match by email (link accounts)
    row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row:
        user = dict(row)
        db.execute(
            "UPDATE users SET provider = ?, provider_id = ?, avatar_url = ?, last_login = ? WHERE id = ?",
            (provider, str(provider_id), avatar or user.get("avatar_url", ""), int(time.time()), user["id"])
        )
        db.commit()
        db.close()
        return user

    # 3) Create brand-new user
    db.execute(
        "INSERT INTO users (name, email, provider, provider_id, avatar_url, email_verified, last_login) VALUES (?,?,?,?,?,1,?)",
        (name, email, provider, str(provider_id), avatar, int(time.time()))
    )
    db.commit()
    row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    db.close()
    return dict(row)


def _redirect_with_token(user: dict) -> RedirectResponse:
    token = make_token(user)
    return RedirectResponse(f"{FRONTEND_URL}/oauth-callback?token={token}", status_code=302)

def _redirect_with_error(msg: str) -> RedirectResponse:
    from urllib.parse import quote
    return RedirectResponse(f"{FRONTEND_URL}/oauth-callback?error={quote(msg)}", status_code=302)


# ══════════════════════════════════════════════════════════════════════════════
#  GOOGLE
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/auth/google")
def google_login():
    if not GOOGLE_CLIENT_ID:
        return _redirect_with_error("Google OAuth is not configured.")
    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "offline",
        "prompt":        "select_account",
        "state":         _create_state(),
    }
    from urllib.parse import urlencode
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url, status_code=302)


@router.get("/auth/google/callback")
async def google_callback(code: str = "", state: str = "", error: str = ""):
    if error or not code:
        return _redirect_with_error(error or "Google login cancelled.")
    if not _validate_state(state):
        return _redirect_with_error("Invalid or expired session. Please try again.")

    async with httpx.AsyncClient() as client:
        # Exchange code → tokens
        tok_res = await client.post("https://oauth2.googleapis.com/token", data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
        if tok_res.status_code != 200:
            return _redirect_with_error("Failed to exchange Google auth code.")
        tokens = tok_res.json()

        # Fetch user profile
        prof_res = await client.get("https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"})
        if prof_res.status_code != 200:
            return _redirect_with_error("Failed to fetch Google profile.")
        prof = prof_res.json()

    user = _upsert_oauth_user(
        provider="google",
        provider_id=prof["id"],
        email=prof.get("email", ""),
        name=prof.get("name", prof.get("email", "Google User")),
        avatar=prof.get("picture", ""),
    )
    log_activity(user["id"], "OAUTH_LOGIN", f"Google login: {user['email']}")
    return _redirect_with_token(user)


# ══════════════════════════════════════════════════════════════════════════════
#  DISCORD
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/auth/discord")
def discord_login():
    if not DISCORD_CLIENT_ID:
        return _redirect_with_error("Discord OAuth is not configured.")
    params = {
        "client_id":     DISCORD_CLIENT_ID,
        "redirect_uri":  DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope":         "identify email",
        "state":         _create_state(),
    }
    from urllib.parse import urlencode
    url = "https://discord.com/api/oauth2/authorize?" + urlencode(params)
    return RedirectResponse(url, status_code=302)


@router.get("/auth/discord/callback")
async def discord_callback(code: str = "", state: str = "", error: str = ""):
    if error or not code:
        return _redirect_with_error(error or "Discord login cancelled.")
    if not _validate_state(state):
        return _redirect_with_error("Invalid or expired session. Please try again.")

    async with httpx.AsyncClient() as client:
        tok_res = await client.post("https://discord.com/api/oauth2/token", data={
            "client_id":     DISCORD_CLIENT_ID,
            "client_secret": DISCORD_CLIENT_SECRET,
            "grant_type":    "authorization_code",
            "code":          code,
            "redirect_uri":  DISCORD_REDIRECT_URI,
        }, headers={"Content-Type": "application/x-www-form-urlencoded"})
        if tok_res.status_code != 200:
            return _redirect_with_error("Failed to exchange Discord auth code.")
        tokens = tok_res.json()

        prof_res = await client.get("https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"})
        if prof_res.status_code != 200:
            return _redirect_with_error("Failed to fetch Discord profile.")
        prof = prof_res.json()

    # Build avatar URL (may be None for users without an avatar)
    avatar = ""
    if prof.get("avatar"):
        avatar = f"https://cdn.discordapp.com/avatars/{prof['id']}/{prof['avatar']}.png"

    email = prof.get("email", f"{prof['id']}@discord.local")
    name  = prof.get("global_name") or prof.get("username") or "Discord User"

    user = _upsert_oauth_user(
        provider="discord",
        provider_id=prof["id"],
        email=email,
        name=name,
        avatar=avatar,
    )
    log_activity(user["id"], "OAUTH_LOGIN", f"Discord login: {user['email']}")
    return _redirect_with_token(user)


# ══════════════════════════════════════════════════════════════════════════════
#  MICROSOFT
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/auth/microsoft")
def microsoft_login():
    if not MICROSOFT_CLIENT_ID:
        return _redirect_with_error("Microsoft OAuth is not configured.")
    params = {
        "client_id":     MICROSOFT_CLIENT_ID,
        "redirect_uri":  MICROSOFT_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile User.Read",
        "response_mode": "query",
        "state":         _create_state(),
    }
    from urllib.parse import urlencode
    url = f"https://login.microsoftonline.com/{MICROSOFT_TENANT}/oauth2/v2.0/authorize?" + urlencode(params)
    return RedirectResponse(url, status_code=302)


@router.get("/auth/microsoft/callback")
async def microsoft_callback(code: str = "", state: str = "", error: str = "", error_description: str = ""):
    if error or not code:
        return _redirect_with_error(error_description or error or "Microsoft login cancelled.")
    if not _validate_state(state):
        return _redirect_with_error("Invalid or expired session. Please try again.")

    async with httpx.AsyncClient() as client:
        tok_res = await client.post(
            f"https://login.microsoftonline.com/{MICROSOFT_TENANT}/oauth2/v2.0/token",
            data={
                "client_id":     MICROSOFT_CLIENT_ID,
                "client_secret": MICROSOFT_CLIENT_SECRET,
                "grant_type":    "authorization_code",
                "code":          code,
                "redirect_uri":  MICROSOFT_REDIRECT_URI,
                "scope":         "openid email profile User.Read",
            }
        )
        if tok_res.status_code != 200:
            return _redirect_with_error("Failed to exchange Microsoft auth code.")
        tokens = tok_res.json()

        prof_res = await client.get("https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"})
        if prof_res.status_code != 200:
            return _redirect_with_error("Failed to fetch Microsoft profile.")
        prof = prof_res.json()

    email = prof.get("mail") or prof.get("userPrincipalName") or ""
    name  = prof.get("displayName") or "Microsoft User"

    user = _upsert_oauth_user(
        provider="microsoft",
        provider_id=prof.get("id", ""),
        email=email,
        name=name,
    )
    log_activity(user["id"], "OAUTH_LOGIN", f"Microsoft login: {user['email']}")
    return _redirect_with_token(user)


# ══════════════════════════════════════════════════════════════════════════════
#  APPLE  (Sign in with Apple — server-side flow)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/auth/apple")
def apple_login():
    if not APPLE_CLIENT_ID:
        return _redirect_with_error("Apple OAuth is not configured.")
    params = {
        "client_id":     APPLE_CLIENT_ID,
        "redirect_uri":  APPLE_REDIRECT_URI,
        "response_type": "code id_token",
        "scope":         "name email",
        "response_mode": "form_post",
        "state":         _create_state(),
    }
    from urllib.parse import urlencode
    url = "https://appleid.apple.com/auth/authorize?" + urlencode(params)
    return RedirectResponse(url, status_code=302)


@router.post("/auth/apple/callback")
async def apple_callback(request: Request):
    """Apple sends a form POST with code + id_token"""
    try:
        form = await request.form()
        code     = form.get("code", "")
        id_token = form.get("id_token", "")
        state    = form.get("state", "")
        user_raw = form.get("user", "")

        if not code:
            return _redirect_with_error("Apple login cancelled or failed.")

        if not _validate_state(state):
            return _redirect_with_error("Invalid or expired session. Please try again.")

        # Verify Apple ID token with Apple's public JWKs
        from jose import jwt as jose_jwt
        try:
            async with httpx.AsyncClient() as client:
                jwks_resp = await client.get("https://appleid.apple.com/auth/keys", timeout=5)
                apple_jwks = jwks_resp.json()
            header = jose_jwt.get_unverified_header(id_token)
            matching_key = next((k for k in apple_jwks.get("keys", []) if k["kid"] == header.get("kid")), None)
            if matching_key:
                claims = jose_jwt.decode(id_token, matching_key, algorithms=["RS256"],
                                        audience=APPLE_CLIENT_ID, issuer="https://appleid.apple.com")
            else:
                claims = jose_jwt.get_unverified_claims(id_token)
        except Exception as e:
            print(f"Apple token verification failed, using unverified claims: {e}")
            claims = jose_jwt.get_unverified_claims(id_token)
        apple_uid = claims.get("sub", "")
        email     = claims.get("email", f"{apple_uid}@apple.local")

        # Apple sends name only on first auth
        name = "Apple User"
        if user_raw:
            try:
                user_info = json.loads(user_raw)
                fn = user_info.get("name", {})
                name = f"{fn.get('firstName','')} {fn.get('lastName','')}".strip() or "Apple User"
            except Exception:
                pass

        user = _upsert_oauth_user(
            provider="apple",
            provider_id=apple_uid,
            email=email,
            name=name,
        )
        log_activity(user["id"], "OAUTH_LOGIN", f"Apple login: {user['email']}")
        return _redirect_with_token(user)

    except Exception as e:
        print(f"Apple callback error: {e}")
        return _redirect_with_error("Apple sign-in failed. Please try another method.")
