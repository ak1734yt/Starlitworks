import os, json, time, secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user, require_admin, require_manager, log_activity, create_notification
from database import get_db

router = APIRouter()

class RoleBody(BaseModel):
    role: str

class ProductBody(BaseModel):
    name: str
    category: str
    price: float
    min_price: float = 0
    tag: str = ""
    description: str = ""
    features: list = []
    is_manual_price: bool = False
    show_price_to_admin: bool = True
    is_recurring: bool = False
    unit_label: str = ""

class PriceUpdateBody(BaseModel):
    price: float
    min_price: float = 0
    tag: str = ""
    description: str = ""
    is_manual_price: bool = False
    show_price_to_admin: bool = True
    unit_label: str = ""

class CouponBody(BaseModel):
    code: Optional[str] = None
    discount_type: str = "percentage"
    discount_value: float
    max_uses: int = 1
    expires_at: Optional[int] = None

class BanBody(BaseModel):
    is_banned: bool

class SiteSettingsBody(BaseModel):
    class Config:
        extra = "allow"

class PortfolioBody(BaseModel):
    title: str
    description: str = ""
    banner_url: str = ""
    member_count: str = "0"
    link: str = ""
    category: str = "custom"

class FeedbackBody(BaseModel):
    rating: int
    comment: str = ""

class FeedbackStatusBody(BaseModel):
    status: str

# ── Admin ────────────────────────────────────────────────────────────────────
@router.get("/admin/clients")
def get_clients(user=Depends(require_manager)):
    db = get_db()
    rows = db.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.get("/admin/analytics")
def get_analytics(user=Depends(require_manager)):
    db = get_db()
    rows = db.execute("SELECT a.*, u.name as user_name FROM analytics_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 500").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.get("/admin/stats/activity")
def admin_stats(user=Depends(require_manager)):
    db = get_db()
    rows = db.execute("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.get("/admin/feedbacks")
def admin_feedbacks(user=Depends(require_admin)):
    db = get_db()
    rows = db.execute("SELECT f.*, u.name FROM feedbacks f JOIN users u ON f.user_id = u.id ORDER BY f.created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.put("/admin/feedbacks/{fid}")
def update_feedback(fid: int, body: FeedbackStatusBody, user=Depends(require_admin)):
    db = get_db()
    db.execute("UPDATE feedbacks SET status = ? WHERE id = ?", (body.status, fid))
    db.commit(); db.close()
    return {"success": True}

class CreditBody(BaseModel):
    amount: float

@router.post("/admin/users/{uid}/credits")
def add_user_credits(uid: int, body: CreditBody, user=Depends(require_manager)):
    db = get_db()
    row = db.execute("SELECT details FROM users WHERE id = ?", (uid,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "User not found")
    try:
        details = json.loads(row["details"] or "{}")
    except:
        details = {}
    details["credits"] = details.get("credits", 0.0) + body.amount
    db.execute("UPDATE users SET details = ? WHERE id = ?", (json.dumps(details), uid))
    db.commit()
    db.close()
    create_notification(uid, "Credits Added", f"An admin has added ₹{body.amount} credits to your account.", "info")
    log_activity(user["id"], "ADD_CREDITS", f"Added ₹{body.amount} credits to user {uid}")
    return {"success": True, "new_balance": details["credits"]}

# ── Manager ───────────────────────────────────────────────────────────────────
@router.get("/manager/logs")
def manager_logs(user=Depends(require_manager)):
    db = get_db()
    rows = db.execute("SELECT l.*, u.name as user_name FROM activity_logs l JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.get("/manager/users")
def manager_users(user=Depends(require_manager)):
    db = get_db()
    rows = db.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.get("/manager/users/{uid}")
def manager_user_detail(uid: int, user=Depends(require_manager)):
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    if not row: db.close(); raise HTTPException(404, "User not found")
    orders = db.execute("SELECT * FROM orders WHERE user_id = ?", (uid,)).fetchall()
    activity = db.execute("SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC", (uid,)).fetchall()
    db.close()
    from auth import safe_user
    return {**safe_user(dict(row)), "orders": [dict(o) for o in orders], "activity": [dict(a) for a in activity]}

@router.put("/manager/users/{uid}/role")
def update_role(uid: int, body: RoleBody, user=Depends(require_manager)):
    if body.role not in ("client","admin","manager"): raise HTTPException(400, "Invalid role")
    db = get_db()
    db.execute("UPDATE users SET role = ? WHERE id = ?", (body.role, uid))
    db.commit(); db.close()
    log_activity(user["id"], "CHANGE_ROLE", f"Changed user {uid} role to {body.role}")
    return {"success": True}

@router.put("/manager/users/{uid}/status")
def set_user_status(uid: int, body: BanBody, user=Depends(require_manager)):
    db = get_db()
    db.execute("UPDATE users SET is_banned = ? WHERE id = ?", (1 if body.is_banned else 0, uid))
    db.commit(); db.close()
    log_activity(user["id"], "BAN_USER" if body.is_banned else "UNBAN_USER", f"User ID {uid}")
    return {"success": True}

@router.get("/manager/prices")
def manager_prices(user=Depends(require_manager)):
    db = get_db()
    rows = db.execute("SELECT * FROM products ORDER BY category, sort_order").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.post("/manager/prices", status_code=201)
def create_product(body: ProductBody, user=Depends(require_manager)):
    product_key = body.name.lower().replace(" ", "_") + "_" + str(int(time.time()))
    db = get_db()
    db.execute(
        """INSERT INTO products
           (category, product_key, name, price, min_price, tag, description, features,
            is_manual_price, show_price_to_admin, is_recurring, unit_label)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (body.category, product_key, body.name, body.price, body.min_price, body.tag,
         body.description, json.dumps(body.features),
         1 if body.is_manual_price else 0,
         1 if body.show_price_to_admin else 0,
         1 if body.is_recurring else 0, body.unit_label)
    )
    db.commit(); db.close()
    log_activity(user["id"], "CREATE_PRODUCT", f"Created product {body.name}")
    return {"success": True}

@router.put("/manager/prices/{pid}")
def update_price(pid: int, body: PriceUpdateBody, user=Depends(require_manager)):
    db = get_db()
    db.execute(
        """UPDATE products
           SET price=?, min_price=?, tag=?, description=?, is_manual_price=?,
               show_price_to_admin=?, unit_label=?, updated_at=?
           WHERE id=?""",
        (body.price, body.min_price, body.tag, body.description,
         1 if body.is_manual_price else 0,
         1 if body.show_price_to_admin else 0,
         body.unit_label, int(time.time()), pid)
    )
    db.commit(); db.close()
    log_activity(user["id"], "UPDATE_PRICE", f"Updated product {pid}")
    return {"success": True}

@router.delete("/manager/prices/{pid}")
def delete_product(pid: int, user=Depends(require_manager)):
    db = get_db()
    db.execute("DELETE FROM products WHERE id = ?", (pid,))
    db.commit(); db.close()
    log_activity(user["id"], "DELETE_PRODUCT", f"Deleted product {pid}")
    return {"success": True}

@router.post("/manager/coupons", status_code=201)
def create_coupon(body: CouponBody, user=Depends(require_manager)):
    code = body.code or ""
    if not code:
        code = "STYLIT_" + secrets.token_hex(4).upper()
    elif not code.startswith("STYLIT_"):
        code = "STYLIT_" + code.upper()
    db = get_db()
    db.execute("INSERT INTO coupons (code, discount_type, discount_value, max_uses, expires_at, created_by) VALUES (?,?,?,?,?,?)",
               (code, body.discount_type, body.discount_value, body.max_uses, body.expires_at, user["id"]))
    db.commit(); db.close()
    log_activity(user["id"], "CREATE_COUPON", f"Created coupon {code}")
    return {"success": True, "code": code}

@router.get("/manager/coupons")
def manager_coupons(user=Depends(require_manager)):
    db = get_db()
    rows = db.execute("SELECT * FROM coupons ORDER BY created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.get("/manager/stats/activity")
def manager_stats(user=Depends(require_manager)):
    db = get_db()
    rows = db.execute("SELECT date(created_at,'unixepoch') as date, COUNT(*) as count FROM activity_logs GROUP BY date ORDER BY date DESC LIMIT 30").fetchall()
    db.close()
    return [dict(r) for r in rows]

# ── Portfolio ─────────────────────────────────────────────────────────────────
@router.get("/portfolio")
def get_portfolio():
    db = get_db()
    rows = db.execute("SELECT * FROM portfolio ORDER BY sort_order ASC").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.post("/manager/portfolio", status_code=201)
def add_portfolio(body: PortfolioBody, user=Depends(require_manager)):
    db = get_db()
    db.execute("INSERT INTO portfolio (title, description, banner_url, member_count, link, category) VALUES (?,?,?,?,?,?)",
               (body.title, body.description, body.banner_url, body.member_count, body.link, body.category))
    db.commit(); db.close()
    return {"success": True}

@router.delete("/manager/portfolio/{pid}")
def delete_portfolio(pid: int, user=Depends(require_manager)):
    db = get_db()
    db.execute("DELETE FROM portfolio WHERE id = ?", (pid,))
    db.commit(); db.close()
    return {"success": True}

# ── Site Settings ─────────────────────────────────────────────────────────────
@router.get("/site/settings")
def get_settings():
    db = get_db()
    rows = db.execute("SELECT * FROM site_settings").fetchall()
    db.close()
    return {r["key"]: r["value"] for r in rows}

@router.post("/site/settings")
def update_settings(request_body: dict, user=Depends(require_manager)):
    db = get_db()
    for key, value in request_body.items():
        db.execute("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?,?)", (key, value))
    db.commit(); db.close()
    log_activity(user["id"], "UPDATE_SITE_SETTINGS", "Updated website content")
    return {"success": True}

# ── Public Routes ─────────────────────────────────────────────────────────────
@router.get("/prices")
def get_prices():
    db = get_db()
    rows = db.execute("SELECT * FROM products ORDER BY category, sort_order").fetchall()
    db.close()
    result = []
    for r in rows:
        d = dict(r)
        d["features"] = json.loads(d.get("features") or "[]")
        result.append(d)
    return result

@router.get("/coupons/{code}")
def get_coupon(code: str, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM coupons WHERE LOWER(code) = LOWER(?)", (code,)).fetchone()
    db.close()
    if not row: raise HTTPException(404, "Coupon not found")
    c = dict(row)
    if c["used_count"] >= c["max_uses"]: raise HTTPException(400, "Coupon usage limit reached")
    if c["expires_at"] and c["expires_at"] < int(time.time()): raise HTTPException(400, "Coupon expired")
    return c

@router.get("/feedbacks")
def get_feedbacks():
    db = get_db()
    rows = db.execute("SELECT f.*, u.name, u.avatar_url FROM feedbacks f JOIN users u ON f.user_id = u.id WHERE f.status = 'approved' ORDER BY f.created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]

@router.post("/feedbacks", status_code=201)
def submit_feedback(body: FeedbackBody, user=Depends(get_current_user)):
    db = get_db()
    db.execute("INSERT INTO feedbacks (user_id, rating, comment) VALUES (?,?,?)", (user["id"], body.rating, body.comment))
    db.commit(); db.close()
    return {"success": True}

@router.get("/public/stats")
def public_stats():
    db = get_db()
    feedbacks = db.execute("SELECT COUNT(*) as c FROM feedbacks WHERE status = 'approved'").fetchone()["c"]
    orders = db.execute("SELECT COUNT(*) as c FROM orders WHERE status = 'completed'").fetchone()["c"]
    db.close()
    return {"total_clients": 20 + feedbacks, "rating": 4.9, "completed_projects": 50 + orders}
