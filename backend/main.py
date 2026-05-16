import os
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

app = FastAPI(title="Starlit Siege Works API", version="2.0.0", docs_url="/docs")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file serving (uploads) ─────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ── Route Injection ───────────────────────────────────────────────────────────
from routers import auth_routes, order_routes, chat_routes, admin_routes, analytics_routes, invoice_routes

app.include_router(auth_routes.router, prefix="/api")
app.include_router(order_routes.router, prefix="/api")
app.include_router(chat_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")
app.include_router(analytics_routes.router, prefix="/api")
app.include_router(invoice_routes.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Starlit Siege Works API v2.0 — Python/FastAPI", "status": "online", "docs": "/docs"}

@app.get("/api/health")
def health_check():
    return {"status": "online", "core": "optimal"}

# ── Run (EnderCloud / local) ───────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
