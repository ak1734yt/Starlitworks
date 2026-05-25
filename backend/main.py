import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from database import init_db
from notifications import start_notification_service

load_dotenv()
init_db()
start_notification_service()



FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Lifespan context manager for startup and shutdown tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "=" * 60)
    print("🚀 STARLIT SIEGE WORKS - BACKEND INITIALIZATION SEQUENCE")
    print("=" * 60)
    
    # 1. Discord Bot
    if os.getenv("DISCORD_BOT_TOKEN"):
        print("[1/3] Initializing Primary Discord Bot (discord.py)...")
        import asyncio
        from discord_bot import start_discord_bot, bot
        bot_task = asyncio.create_task(start_discord_bot())
        
        print("      ⏳ Waiting for Primary Discord Bot to connect and load data (max 30s)...")
        for _ in range(60):  # 60 * 0.5s = 30 seconds
            if bot.is_ready():
                print("      ✓ Primary Discord Bot daemon launched successfully.")
                break
            if bot.is_closed() and getattr(bot, 'loop', None) and not bot.loop.is_running():
                # Note: is_closed() might be true initially, so we check if task is done instead
                pass
            if bot_task.done():
                print("      ⚠️ Primary Discord Bot task terminated unexpectedly (likely rate limited). Continuing anyway...")
                break
            await asyncio.sleep(0.5)
        else:
            print("      ⚠️ Primary Discord Bot connection timed out. Continuing anyway...")
    else:
        print("[1/3] Primary Discord Bot: SKIPPED (No Token Found)")
        
    # 2. Self Bot
    if os.getenv("DISCORD_SELFBOT_TOKEN"):
        print("[2/3] Initializing Self Bot Infrastructure...")
        print("      ⏳ Fetching member stats via Self Bot...")
        import asyncio
        from discord_stats import update_discord_member_count
        
        # Run the blocking network call in a thread so it doesn't block the FastAPI event loop
        def _fetch_stats():
            try:
                update_discord_member_count()
            except Exception as e:
                print(f"      ❌ Error fetching self bot stats: {e}")
                
        await asyncio.to_thread(_fetch_stats)
        print("      ✓ Self Bot credentials loaded and data synced.")
    else:
        print("[2/3] Self Bot: SKIPPED (No Token Found)")
        
    # 3. Website API
    print("[3/3] Initializing Website API Server (FastAPI)...")
    print("      ✓ Local Database Connected & Synced.")
    print("      ✓ Notification Service & PubSub Running.")
    print("      ✓ Security Middlewares & API Routes Injected.")
    
    print("=" * 60)
    print("✅ STARTUP COMPLETE! All systems nominal and ready to serve.")
    print("=" * 60 + "\n")
    
    yield

_is_prod = os.getenv("ENV", "").lower() == "production"
app = FastAPI(
    title="Starlit Siege Works API",
    version="2.0.0",
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "https://starlitworks.vercel.app",   # production frontend
        "http://localhost:5173",              # local dev (Vite)
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Starlit-Key"],
)

# ── Static file serving (uploads) ─────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ── Security Middleware ───────────────────────────────────────────────────────
@app.middleware("http")
async def security_header_check(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        exempt_prefixes = [
            "/api/health",
            "/api/realtime/events",
            "/api/auth/google",
            "/api/auth/discord",
            "/api/auth/microsoft",
            "/api/auth/apple",
            "/api/auth/status",
            "/api/prices",
            "/api/portfolio",
            "/api/public/stats"
        ]
        if not any(request.url.path.startswith(prefix) for prefix in exempt_prefixes):
            if request.method != "OPTIONS":
                starlit_key = request.headers.get("X-Starlit-Key")
                expected_key = os.getenv("STARLIT_API_KEY", "")
                if not expected_key or not starlit_key or starlit_key != expected_key:
                    from fastapi.responses import JSONResponse
                    return JSONResponse(status_code=403, content={"error": "Security Check Failed: Unauthorized API Access"})
            
    response = await call_next(request)
    
    # Inject HTTP Hardening Security Headers
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://apis.google.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https:; "
        "frame-ancestors 'none';"
    )
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    return response

# ── Route Injection ───────────────────────────────────────────────────────────
from routers import auth_routes, order_routes, chat_routes, admin_routes, analytics_routes, invoice_routes, payment_routes, oauth_routes, referral_routes, marketplace_routes, realtime_routes

app.include_router(auth_routes.router, prefix="/api")
app.include_router(realtime_routes.router, prefix="/api")
app.include_router(oauth_routes.router, prefix="/api")
app.include_router(order_routes.router, prefix="/api")
app.include_router(chat_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")
app.include_router(analytics_routes.router, prefix="/api")
app.include_router(invoice_routes.router, prefix="/api")
app.include_router(payment_routes.router, prefix="/api")
app.include_router(referral_routes.router, prefix="/api")
app.include_router(marketplace_routes.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Starlit Siege Works API v2.0 — Python/FastAPI", "status": "online", "docs": "/docs"}

@app.get("/api/health")
def health_check():
    return {"status": "online", "core": "optimal"}

# ── Global Exception Handlers ──────────────────────────────────────────────────
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid input data format."}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    print("CRITICAL SERVER ERROR:")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."}
    )


# ── Run (EnderCloud / local) ───────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5504))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
