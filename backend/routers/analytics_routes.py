import os, json, time
from fastapi import APIRouter, Depends, HTTPException, Request
from auth import get_optional_user, require_admin, calculate_risk_score, send_discord_webhook, create_notification
from database import get_db

router = APIRouter()
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)

@router.post("/analytics/track")
async def track(request: Request, user=Depends(get_optional_user)):
    try:
        body = await request.json()
        ip = body.get("ip"); city = body.get("city"); region = body.get("region")
        country = body.get("country"); org = body.get("org"); user_agent = body.get("userAgent")
        platform = body.get("platform"); screen = body.get("screen"); timezone = body.get("timezone")
        lat = body.get("lat"); lon = body.get("lon"); accuracy = body.get("accuracy")

        user_id = user["id"] if user else None
        user_name = user["name"] if user else "Anonymous"

        db = get_db()
        score, flags = calculate_risk_score(body, db)

        db.execute("""INSERT INTO analytics_logs
            (user_id, ip, city, region, country, org, browser, os, screen, timezone, lat, lon, accuracy, risk_score, risk_flags)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (user_id, ip, city, region, country, org, user_agent, platform, screen,
             timezone, lat, lon, accuracy, score, json.dumps(flags)))
        db.commit(); db.close()

        log_entry = json.dumps({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "user": user_name, "userId": user_id, "ip": ip,
            "city": city, "region": region, "country": country,
            "coords": {"lat": lat, "lon": lon, "accuracy": accuracy} if lat else "Denied",
            "device": {"os": platform, "browser": user_agent, "screen": screen}
        }) + "\n"
        log_file = os.path.join(DATA_DIR, "v_logs.jsonl")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_entry)

        vaibhav_url = os.getenv("DISCORD_WEBHOOK_VAIBHAV") or os.getenv("DISCORD_WEBHOOK_LOGS")
        if vaibhav_url:
            await send_discord_webhook(vaibhav_url, {"embeds": [{"title": f"📍 New Pulse: {user_name}", "color": 0x7c3aed,
                "fields": [
                    {"name": "👤 User", "value": user_name, "inline": True},
                    {"name": "🌐 IP", "value": ip or "N/A", "inline": True},
                    {"name": "🌍 Location", "value": f"{city}, {region}, {country}", "inline": False},
                    {"name": "📡 GPS", "value": f"[{lat}, {lon}] (±{accuracy}m)" if lat else "Denied", "inline": True},
                    {"name": "💻 OS", "value": platform or "N/A", "inline": True},
                    {"name": "🖥️ Screen", "value": screen or "N/A", "inline": True},
                ],
                "footer": {"text": f"Timezone: {timezone}"},
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }]})

        return {"success": True, "risk_score": score}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/admin/analytics")
def get_analytics(user=Depends(require_admin)):
    db = get_db()
    rows = db.execute("SELECT a.*, u.name as user_name FROM analytics_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 500").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.get("/notifications")
def get_notifications(user=Depends(get_optional_user)):
    if not user: raise HTTPException(401, "Unauthorized")
    db = get_db()
    rows = db.execute("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", (user["id"],)).fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.put("/notifications/read")
def mark_read(user=Depends(get_optional_user)):
    if not user: raise HTTPException(401, "Unauthorized")
    db = get_db()
    db.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user["id"],))
    db.commit(); db.close()
    return {"success": True}

@router.get("/health")
def health():
    return {"status": "online", "timestamp": int(time.time() * 1000)}
