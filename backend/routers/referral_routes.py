"""
Referral Engine — Starlit Siege Works
Handles all referral logic: tracking, reward processing, settings management.
"""
import os, json, time, secrets, random, sqlite3
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from auth import get_current_user, require_manager, log_activity, create_notification, send_modular_webhook
from database import get_db, DB_ORDERS, DB_USERS, DB_SHOP

router = APIRouter()

# ── Referral Tables Setup ──────────────────────────────────────────────────────
def _ensure_referral_tables():
    conn = sqlite3.connect(DB_ORDERS)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS referrals (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            referrer_id      INTEGER NOT NULL,
            referred_id      INTEGER NOT NULL,
            referral_code    TEXT    NOT NULL,
            status           TEXT    DEFAULT 'active',
            invite_rewarded  INTEGER DEFAULT 0,
            join_rewarded    INTEGER DEFAULT 0,
            first_order_id   INTEGER,
            created_at       INTEGER DEFAULT (strftime('%s','now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS referral_transactions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            source_type   TEXT    NOT NULL,
            source_id     INTEGER,
            amount        REAL    NOT NULL,
            description   TEXT    DEFAULT '',
            created_at    INTEGER DEFAULT (strftime('%s','now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS referral_withdrawals (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL,
            amount       REAL NOT NULL,
            status       TEXT DEFAULT 'pending',
            payment_info TEXT NOT NULL,
            note         TEXT DEFAULT '',
            created_at   INTEGER DEFAULT (strftime('%s','now')),
            processed_at INTEGER
        )
    """)
    conn.commit()
    conn.close()

_ensure_referral_tables()

# ── Default Referral Settings ──────────────────────────────────────────────────
REFERRAL_DEFAULTS = {
    "referral_invite_reward": "50",
    "referral_first_purchase_bonus": "25",
    "referral_cashback_pct": "5",
    "referral_join_bonus": "20",
    "referral_referred_cashback_pct": "5",
    "referral_use_random": "false",
    "referral_random_min": "30",
    "referral_random_max": "70",
    "referral_tiers": json.dumps([
        {"count": 3, "bonus": 40},
        {"count": 5, "bonus": 80},
        {"count": 10, "bonus": 200}
    ]),
    "referral_enabled": "true",
}

def _get_referral_settings():
    conn = sqlite3.connect(DB_SHOP)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT key, value FROM site_settings WHERE key LIKE 'referral_%'").fetchall()
    conn.close()
    settings = dict(REFERRAL_DEFAULTS)
    for r in rows:
        settings[r["key"]] = r["value"]
    return settings

def _save_referral_setting(key: str, value: str):
    conn = sqlite3.connect(DB_SHOP)
    conn.execute("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def _get_reward_amount(settings: dict) -> float:
    """Calculate invite reward - fixed or random based on settings."""
    use_random = settings.get("referral_use_random", "false").lower() == "true"
    if use_random:
        min_r = float(settings.get("referral_random_min", 30))
        max_r = float(settings.get("referral_random_max", 70))
        return round(random.uniform(min_r, max_r), 2)
    return float(settings.get("referral_invite_reward", 50))

def _add_credits(user_id: int, amount: float, description: str):
    """Add credits to user account and log the transaction."""
    db = get_db()
    row = db.execute("SELECT details FROM auth.users WHERE id = ?", (user_id,)).fetchone()
    if row:
        try:
            details = json.loads(row["details"] or "{}")
        except:
            details = {}
        details["credits"] = round(details.get("credits", 0.0) + amount, 2)
        db.execute("UPDATE auth.users SET details = ? WHERE id = ?", (json.dumps(details), user_id))
        db.commit()
    db.close()
    # Log referral transaction
    conn = sqlite3.connect(DB_ORDERS)
    conn.execute(
        "INSERT INTO referral_transactions (user_id, source_type, amount, description) VALUES (?, 'credit', ?, ?)",
        (user_id, amount, description)
    )
    conn.commit()
    conn.close()

def _add_referral_balance(user_id: int, amount: float, description: str):
    """Add referral balance to user account (separate from credits) and log the transaction."""
    db = get_db()
    row = db.execute("SELECT details FROM auth.users WHERE id = ?", (user_id,)).fetchone()
    if row:
        try:
            details = json.loads(row["details"] or "{}")
        except:
            details = {}
        details["referral_balance"] = round(details.get("referral_balance", 0.0) + amount, 2)
        db.execute("UPDATE auth.users SET details = ? WHERE id = ?", (json.dumps(details), user_id))
        db.commit()
    db.close()
    # Log referral transaction
    conn = sqlite3.connect(DB_ORDERS)
    conn.execute(
        "INSERT INTO referral_transactions (user_id, source_type, amount, description) VALUES (?, 'referral_bonus', ?, ?)",
        (user_id, amount, description)
    )
    conn.commit()
    conn.close()

def _add_ripple_points(user_id: int, points: int, description: str):
    """Add ripple points to user account and log the transaction."""
    db = get_db()
    row = db.execute("SELECT details FROM auth.users WHERE id = ?", (user_id,)).fetchone()
    if row:
        try:
            details = json.loads(row["details"] or "{}")
        except:
            details = {}
        details["ripple_points"] = int(details.get("ripple_points", 0) + points)
        db.execute("UPDATE auth.users SET details = ? WHERE id = ?", (json.dumps(details), user_id))
        db.commit()
    db.close()
    # Log referral transaction
    conn = sqlite3.connect(DB_ORDERS)
    conn.execute(
        "INSERT INTO referral_transactions (user_id, source_type, amount, description) VALUES (?, 'ripple_points', ?, ?)",
        (user_id, float(points), description)
    )
    conn.commit()
    conn.close()

def _get_promoter_tier(referral_count: int) -> dict:
    """Return active rank name, cashback percentage, and next milestone details based on referral count."""
    if referral_count < 5:
        return {
            "rank": "Starlit Promoter",
            "cashback_pct": 5,
            "next_milestone": 5,
            "next_rank": "Starlit Envoy"
        }
    elif referral_count < 10:
        return {
            "rank": "Starlit Envoy",
            "cashback_pct": 5,
            "next_milestone": 10,
            "next_rank": "Siege Vanguard"
        }
    elif referral_count < 20:
        return {
            "rank": "Siege Vanguard",
            "cashback_pct": 8,
            "next_milestone": 20,
            "next_rank": "Aether Commander"
        }
    elif referral_count < 50:
        return {
            "rank": "Aether Commander",
            "cashback_pct": 12,
            "next_milestone": 50,
            "next_rank": "Celestial Paragon"
        }
    elif referral_count < 100:
        return {
            "rank": "Celestial Paragon",
            "cashback_pct": 16,
            "next_milestone": 100,
            "next_rank": "Void Overlord"
        }
    else:
        return {
            "rank": "Void Overlord",
            "cashback_pct": 20,
            "next_milestone": None,
            "next_rank": None
        }

def _log_referral_transaction(user_id: int, source_type: str, source_id: Optional[int], amount: float, description: str):
    conn = sqlite3.connect(DB_ORDERS)
    conn.execute(
        "INSERT INTO referral_transactions (user_id, source_type, source_id, amount, description) VALUES (?, ?, ?, ?, ?)",
        (user_id, source_type, source_id, amount, description)
    )
    conn.commit()
    conn.close()

def _check_milestone_rewards(referrer_id: int, settings: dict):
    """Check and pay out milestone bonuses if newly crossed."""
    conn = sqlite3.connect(DB_ORDERS)
    conn.row_factory = sqlite3.Row
    count = conn.execute(
        "SELECT COUNT(*) as c FROM referrals WHERE referrer_id = ? AND invite_rewarded = 1",
        (referrer_id,)
    ).fetchone()["c"]
    conn.close()

    try:
        tiers = json.loads(settings.get("referral_tiers", "[]"))
    except:
        tiers = []

    for tier in tiers:
        tier_count = int(tier.get("count", 0))
        tier_bonus = float(tier.get("bonus", 0))
        if count == tier_count:  # Exactly hit this milestone
            # Check if already rewarded for this tier
            conn2 = sqlite3.connect(DB_ORDERS)
            already = conn2.execute(
                "SELECT id FROM referral_transactions WHERE user_id = ? AND source_type = 'milestone' AND description LIKE ?",
                (referrer_id, f"%milestone_{tier_count}%")
            ).fetchone()
            conn2.close()
            if not already:
                _add_referral_balance(referrer_id, tier_bonus, f"Milestone bonus: {tier_count} referrals")
                _log_referral_transaction(referrer_id, "milestone", None, tier_bonus, f"milestone_{tier_count}: Reached {tier_count} referrals")
                create_notification(
                    referrer_id,
                    f"🎉 Milestone Reached: {tier_count} Referrals!",
                    f"You've earned ₹{tier_bonus} milestone bonus for reaching {tier_count} referrals!",
                    "success"
                )
                import threading
                def _do_milestone_webhook():
                    try:
                        import asyncio
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        loop.run_until_complete(send_modular_webhook("REFERRALS", {
                            "embeds": [{
                                "title": "🎉 Promoter Milestone Reached!",
                                "description": f"Referrer ID **#{referrer_id}** hit the **{tier_count} referrals** milestone!\nEarned a bonus of **₹{tier_bonus}**.",
                                "color": 16776960,
                                "timestamp": __import__("datetime").datetime.utcnow().isoformat()
                            }]
                        }))
                        loop.close()
                    except Exception as e:
                        print(f"Milestone webhook error: {e}")
                threading.Thread(target=_do_milestone_webhook, daemon=True).start()

# ── Core Referral Processing (called from order routes) ────────────────────────
def process_referral_on_order_complete(order_id: int, user_id: int, order_amount: float):
    """Called when an order is marked completed. Processes all referral cashback and points."""
    settings = _get_referral_settings()
    if settings.get("referral_enabled", "true").lower() != "true":
        return

    # Unique Logic: Minimum order amount of ₹500 required to generate referral points
    if order_amount < 500:
        return

    conn = sqlite3.connect(DB_ORDERS)
    conn.row_factory = sqlite3.Row

    # Check if this user was referred by someone
    ref = conn.execute(
        "SELECT * FROM referrals WHERE referred_id = ?", (user_id,)
    ).fetchone()

    if not ref:
        conn.close()
        return

    ref = dict(ref)
    referrer_id = ref["referrer_id"]
    referred_cashback_pct = float(settings.get("referral_referred_cashback_pct", 5)) / 100

    # Fetch referrer's details to get their active referral_count
    db_u = get_db()
    referrer_row = db_u.execute("SELECT details FROM auth.users WHERE id = ?", (referrer_id,)).fetchone()
    db_u.close()
    
    ref_count = 0
    if referrer_row:
        try:
            d = json.loads(referrer_row["details"] or "{}")
            ref_count = int(d.get("referral_count", 0))
        except:
            pass

    # Determine rank & cashback tier
    tier_info = _get_promoter_tier(ref_count)
    active_cashback_pct = tier_info["cashback_pct"] # e.g. 5, 8, 12, 16, 20
    rank_name = tier_info["rank"]

    # Unique Logic: Award Ripple Points proportional to active promoter rank cashback
    # Base: 5% cashback yields 25 points per ₹500
    # Tier 2: 8% cashback yields 40 points per ₹500
    # Tier 3: 12% cashback yields 60 points per ₹500
    # Tier 4: 16% cashback yields 80 points per ₹500
    # Tier 5: 20% cashback yields 100 points per ₹500
    points_per_500 = int(25 * (active_cashback_pct / 5.0))
    points_to_award = int(order_amount // 500) * points_per_500

    # Is this their FIRST order?
    is_first_order = ref["first_order_id"] is None

    if is_first_order:
        # Mark first order
        conn.execute("UPDATE referrals SET first_order_id = ? WHERE id = ?", (order_id, ref["id"]))
        conn.commit()
        
        # Award scaled Ripple Points to the referrer
        if points_to_award > 0:
            _add_ripple_points(referrer_id, points_to_award, f"First purchase points ({rank_name}): referred user placed order #{order_id}")
            create_notification(
                referrer_id,
                "💰 Referral Ripple Points!",
                f"Your referral placed their first order! You earned {points_to_award} Ripple Points (Rank: {rank_name}, {active_cashback_pct}% cashback).",
                "success"
            )

        # Pay first purchase bonus to referrer
        first_purchase_bonus = float(settings.get("referral_first_purchase_bonus", 25.0))
        if first_purchase_bonus > 0:
            _add_credits(referrer_id, first_purchase_bonus, f"First purchase bonus (referred user order #{order_id})")
            _add_referral_balance(referrer_id, first_purchase_bonus, f"First purchase bonus from order #{order_id}")
            _log_referral_transaction(referrer_id, "first_purchase_bonus", order_id, first_purchase_bonus,
                                      f"First purchase bonus on referred user order #{order_id}")
            create_notification(referrer_id, "🎁 First Purchase Bonus!", f"+₹{first_purchase_bonus} first purchase bonus credited.", "success")

        # Also give referred user a cashback on their first order
        referred_cashback = round(order_amount * referred_cashback_pct, 2)
        if referred_cashback > 0:
            _add_credits(user_id, referred_cashback, f"5% cashback on your order (referral benefit)")
            _log_referral_transaction(user_id, "referred_cashback", order_id, referred_cashback,
                                      f"Referral cashback on order #{order_id}")
            create_notification(user_id, "🎁 Referral Cashback!", f"+₹{referred_cashback} cashback credited from your referral benefit.", "success")
    else:
        # Subsequent orders — referrer gets Ripple Points!
        if points_to_award > 0:
            _add_ripple_points(referrer_id, points_to_award, f"Order points ({rank_name}): referred user purchased order #{order_id}")
            create_notification(
                referrer_id,
                "💸 Referral Ripple Points!",
                f"You earned {points_to_award} Ripple Points (Rank: {rank_name}, {active_cashback_pct}% cashback) from your referral's order #{order_id}!",
                "success"
            )

        # Referred user also gets cashback on all their orders
        referred_cashback = round(order_amount * referred_cashback_pct, 2)
        if referred_cashback > 0:
            _add_credits(user_id, referred_cashback, f"Cashback benefit (referred user)")
            _log_referral_transaction(user_id, "referred_cashback", order_id, referred_cashback,
                                      f"Referral cashback on order #{order_id}")

    # Pay promoter rank tier cashback (e.g. 5% - 20%) to referrer
    referrer_cashback = round(order_amount * (active_cashback_pct / 100), 2)
    if referrer_cashback > 0:
        _add_credits(referrer_id, referrer_cashback, f"Referral cashback ({active_cashback_pct}% rank cashback on order #{order_id})")
        _add_referral_balance(referrer_id, referrer_cashback, f"Cashback from referred user order #{order_id}")
        _log_referral_transaction(referrer_id, "cashback", order_id, referrer_cashback,
                                  f"Referrer cashback on order #{order_id}")
        create_notification(referrer_id, "💰 Referral Cashback!", f"+₹{referrer_cashback} cashback credited from referred user's purchase.", "success")

    # Webhook Notification for points awarded
    if points_to_award > 0:
        import threading
        def _do_points_webhook():
            try:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(send_modular_webhook("REFERRALS", {
                    "embeds": [{
                        "title": "💸 Referral Ripple Points Awarded!",
                        "description": f"Referrer ID **#{referrer_id}** earned **{points_to_award} Ripple Points**!\n**Rank:** {rank_name}\n**Referred Order:** #{order_id} (Amount: ₹{order_amount})",
                        "color": 3447003,
                        "timestamp": __import__("datetime").datetime.utcnow().isoformat()
                    }]
                }))
                loop.close()
            except Exception as e:
                print(f"Points webhook error: {e}")
        threading.Thread(target=_do_points_webhook, daemon=True).start()

    conn.close()

def process_referral_on_signup(new_user_id: int, referral_code: str) -> bool:
    """Called on signup when referral code provided. Returns True if valid."""
    settings = _get_referral_settings()
    if settings.get("referral_enabled", "true").lower() != "true":
        return False

    # Find referrer by their referral_code (stored in details JSON)
    db = get_db()
    all_users = db.execute("SELECT id, details, name FROM auth.users WHERE details LIKE ?", (f'%{referral_code}%',)).fetchall()
    referrer = None
    for u in all_users:
        try:
            d = json.loads(u["details"] or "{}")
            if d.get("referral_code") == referral_code:
                referrer = dict(u)
                break
        except:
            continue

    if not referrer or referrer["id"] == new_user_id:
        db.close()
        return False

    # Check this user isn't already linked
    conn = sqlite3.connect(DB_ORDERS)
    existing = conn.execute("SELECT id FROM referrals WHERE referred_id = ?", (new_user_id,)).fetchone()
    if existing:
        conn.close(); db.close()
        return False

    referrer_id = referrer["id"]

    # Create referral record
    conn.execute(
        "INSERT INTO referrals (referrer_id, referred_id, referral_code, invite_rewarded, join_rewarded) VALUES (?, ?, ?, 0, 0)",
        (referrer_id, new_user_id, referral_code)
    )
    conn.commit()

    # Compute invite reward (fixed or random)
    invite_reward = _get_reward_amount(settings)
    
    # Per-user custom override
    try:
        ref_details = json.loads(referrer["details"] or "{}")
        custom = ref_details.get("referral_custom_reward")
        if custom is not None:
            invite_reward = float(custom)
    except:
        pass

    # Pay invite reward to referrer (both referral balance and spendable wallet credits)
    _add_referral_balance(referrer_id, invite_reward, f"Invite bonus: new user signed up with your referral code")
    _add_credits(referrer_id, invite_reward, f"Referral invite reward (cashback)")
    _log_referral_transaction(referrer_id, "invite", new_user_id, invite_reward,
                              f"Invited user #{new_user_id} successfully joined")
    
    # Update referrer's referral count
    try:
        ref_details = json.loads(referrer["details"] or "{}")
    except:
        ref_details = {}
    ref_details["referral_count"] = ref_details.get("referral_count", 0) + 1
    db.execute("UPDATE auth.users SET details = ? WHERE id = ?", (json.dumps(ref_details), referrer_id))

    # Mark invite_rewarded in referrals
    conn.execute("UPDATE referrals SET invite_rewarded = 1 WHERE referred_id = ?", (new_user_id,))

    # Pay join bonus to new user: Award 2,500 Ripple Points (equivalent to ₹500 INR)
    new_user_row = db.execute("SELECT details FROM auth.users WHERE id = ?", (new_user_id,)).fetchone()
    try:
        new_details = json.loads(new_user_row["details"] or "{}")
    except:
        new_details = {}
    new_details["ripple_points"] = int(new_details.get("ripple_points", 0) + 2500)
    new_details["referred_by"] = referral_code
    db.execute("UPDATE auth.users SET details = ? WHERE id = ?", (json.dumps(new_details), new_user_id))
    conn.execute("UPDATE referrals SET join_rewarded = 1 WHERE referred_id = ?", (new_user_id,))

    # Pay join bonus config amount to new user as direct spendable credits
    join_bonus = float(settings.get("referral_join_bonus", 20.0))
    if join_bonus > 0:
        _add_credits(new_user_id, join_bonus, f"Welcome join bonus (referral benefit)")
    
    # 2500 Ripple Points logged as the joining welcome bonus transaction
    conn.execute(
        "INSERT INTO referral_transactions (user_id, source_type, amount, description) VALUES (?, 'ripple_points', 2500.0, 'Welcome join bonus: signed up using referral code')",
        (new_user_id,)
    )
    create_notification(
        new_user_id,
        "🎉 Welcome Points Bonus!",
        "You've received 2,500 Ripple Points (equivalent to ₹500 store credit) as a welcome bonus! Convert them inside your Referral Hub.",
        "success"
    )

    conn.commit(); conn.close()
    db.commit(); db.close()

    # Check milestone rewards for referrer
    _check_milestone_rewards(referrer_id, settings)

    create_notification(referrer_id, "👥 New Referral!", f"Someone just joined using your referral code! +₹{invite_reward} added.", "success")
    log_activity(referrer_id, "REFERRAL_INVITE", f"User #{new_user_id} signed up via referral")

    # Webhook signup log
    def _do_referral_signup_webhook():
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(send_modular_webhook("REFERRALS", {
                "embeds": [{
                    "title": "👥 New Referral Signup!",
                    "description": f"Referrer ID **#{referrer_id}** invited **#{new_user_id}**!\n**Referral Code:** {referral_code}\n**Referrer Reward:** ₹{invite_reward}\n**Joined Welcome Bonus:** 2,500 Ripple Points (₹500 INR value)",
                    "color": 65280,
                    "timestamp": __import__("datetime").datetime.utcnow().isoformat()
                }]
            }))
            loop.close()
        except Exception as e:
            print(f"Referral signup webhook error: {e}")
    import threading
    threading.Thread(target=_do_referral_signup_webhook, daemon=True).start()

    return True

# ── API Endpoints ──────────────────────────────────────────────────────────────

# Client: Get own referral info + stats
@router.get("/auth/referral")
def get_referral_info(user=Depends(get_current_user)):
    settings = _get_referral_settings()

    db = get_db()
    row = db.execute("SELECT details, name FROM auth.users WHERE id = ?", (user["id"],)).fetchone()
    db.close()
    try:
        details = json.loads(row["details"] or "{}")
    except:
        details = {}

    referred_by = details.get("referred_by", "")
    referred_by_name = ""
    if referred_by:
        db_ref = get_db()
        all_users = db_ref.execute("SELECT name, details FROM auth.users WHERE details LIKE ?", (f'%{referred_by}%',)).fetchall()
        db_ref.close()
        for u in all_users:
            try:
                ud = json.loads(u["details"] or "{}")
                if ud.get("referral_code") == referred_by:
                    referred_by_name = u["name"]
                    break
            except:
                continue

    # Generate referral code if not set
    referral_code = details.get("referral_code", "")
    if not referral_code:
        referral_code = "REF" + secrets.token_hex(4).upper()
        details["referral_code"] = referral_code
        db2 = get_db()
        db2.execute("UPDATE auth.users SET details = ? WHERE id = ?", (json.dumps(details), user["id"]))
        db2.commit(); db2.close()

    # Get all referrals made by this user
    conn = sqlite3.connect(DB_ORDERS)
    conn.row_factory = sqlite3.Row
    my_referrals = conn.execute(
        "SELECT * FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC", (user["id"],)
    ).fetchall()

    # Get referral transactions
    transactions = conn.execute(
        "SELECT * FROM referral_transactions WHERE user_id = ? ORDER BY created_at DESC",
        (user["id"],)
    ).fetchall()
    conn.close()

    # Get user withdrawals
    conn_w = sqlite3.connect(DB_ORDERS)
    conn_w.row_factory = sqlite3.Row
    withdrawals = conn_w.execute(
        "SELECT * FROM referral_withdrawals WHERE user_id = ? ORDER BY created_at DESC",
        (user["id"],)
    ).fetchall()
    conn_w.close()

    total_earned = sum(t["amount"] for t in transactions if t["amount"] > 0)
    referral_count = len(my_referrals)

    # Referred user details
    db3 = get_db()
    referral_list = []
    for r in my_referrals:
        ref_user = db3.execute("SELECT name, email FROM auth.users WHERE id = ?", (r["referred_id"],)).fetchone()
        referral_list.append({
            **dict(r),
            "referred_name": ref_user["name"] if ref_user else "Unknown",
            "referred_email": (ref_user["email"][:3] + "***" if ref_user and ref_user["email"] else "***")
        })
    db3.close()

    # Tier progress
    try:
        tiers = json.loads(settings.get("referral_tiers", "[]"))
    except:
        tiers = []
    next_tier = next((t for t in sorted(tiers, key=lambda x: x["count"]) if t["count"] > referral_count), None)

    # Promoter Rank Tiers dynamic gamification
    rank_info = _get_promoter_tier(referral_count)

    return {
        "referral_code": referral_code,
        "referral_link": f"https://starlitsiege.works/signup?ref={referral_code}",
        "referral_count": referral_count,
        "total_earned": total_earned,
        "referral_balance": float(details.get("referral_balance", 0.0)),
        "ripple_points": int(details.get("ripple_points", 0)),
        "referred_by": referred_by,
        "referred_by_name": referred_by_name,
        "referrals": referral_list,
        "transactions": [dict(t) for t in transactions],
        "withdrawals": [dict(w) for w in withdrawals],
        "next_tier": next_tier,
        "tiers": tiers,
        "active_rank": rank_info["rank"],
        "cashback_pct": rank_info["cashback_pct"],
        "next_milestone": rank_info["next_milestone"],
        "next_rank": rank_info["next_rank"],
        "settings": {
            "invite_reward": _get_reward_amount(settings) if settings.get("referral_use_random") == "true" else float(settings.get("referral_invite_reward", 50)),
            "join_bonus": float(settings.get("referral_join_bonus", 20)),
            "cashback_pct": float(settings.get("referral_cashback_pct", 5)),
            "first_purchase_bonus": float(settings.get("referral_first_purchase_bonus", 25)),
            "use_random": settings.get("referral_use_random", "false") == "true",
        }
    }

class LinkReferralBody(BaseModel):
    referral_code: str

@router.post("/referral/link")
def link_referral_code(body: LinkReferralBody, user=Depends(get_current_user)):
    code = body.referral_code.strip().upper()
    if not code:
        raise HTTPException(400, "Referral code cannot be empty.")
        
    # Check if this user is already referred
    conn = sqlite3.connect(DB_ORDERS)
    existing = conn.execute("SELECT id FROM referrals WHERE referred_id = ?", (user["id"],)).fetchone()
    conn.close()
    
    db = get_db()
    usr_row = db.execute("SELECT details FROM auth.users WHERE id = ?", (user["id"],)).fetchone()
    db.close()
    
    already_referred = False
    if existing:
        already_referred = True
    if usr_row:
        try:
            d = json.loads(usr_row["details"] or "{}")
            if d.get("referred_by"):
                already_referred = True
        except:
            pass
            
    if already_referred:
        raise HTTPException(400, "Your account is already linked to a referrer.")
        
    success = process_referral_on_signup(user["id"], code)
    if not success:
        raise HTTPException(400, "Invalid or expired referral code, or you cannot refer yourself.")
        
    return {"success": True, "message": "Referral code successfully linked!"}

@router.get("/referral/lookup/{code}")
def lookup_referral_code(code: str, user=Depends(get_current_user)):
    code = code.strip().upper()
    if not code:
        raise HTTPException(400, "Referral code cannot be empty.")
        
    db = get_db()
    all_users = db.execute("SELECT id, name, details FROM auth.users WHERE details LIKE ?", (f'%{code}%',)).fetchall()
    db.close()
    
    referrer = None
    for u in all_users:
        try:
            d = json.loads(u["details"] or "{}")
            if d.get("referral_code") == code:
                referrer = u
                break
        except:
            continue
            
    if not referrer:
        raise HTTPException(404, "Invalid referral code.")
        
    if referrer["id"] == user["id"]:
        raise HTTPException(400, "You cannot refer yourself.")
        
    return {
        "success": True,
        "name": referrer["name"],
        "code": code
    }

class ConvertPointsBody(BaseModel):
    points: int

@router.post("/referral/convert-points")
def convert_referral_points(body: ConvertPointsBody, user=Depends(get_current_user)):
    if body.points <= 0:
        raise HTTPException(400, "Points amount must be positive")
        
    db = get_db()
    row = db.execute("SELECT details FROM auth.users WHERE id = ?", (user["id"],)).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "User details not found")
        
    try:
        details = json.loads(row["details"] or "{}")
    except:
        details = {}
        
    current_points = int(details.get("ripple_points", 0))
    if current_points < body.points:
        db.close()
        raise HTTPException(400, f"Insufficient points. You only have {current_points} points.")
        
    # Convert points: 5 points = 1 INR
    inr_credits = round(body.points / 5.0, 2)
    
    # Deduct points, add credits
    details["ripple_points"] = current_points - body.points
    details["credits"] = round(details.get("credits", 0.0) + inr_credits, 2)
    
    db.execute("UPDATE auth.users SET details = ? WHERE id = ?", (json.dumps(details), user["id"]))
    db.commit()
    db.close()
    
    # Log transactions
    _log_referral_transaction(user["id"], "convert_points", None, -float(body.points), f"Converted {body.points} points to ₹{inr_credits} credits")
    
    log_activity(user["id"], "CONVERT_POINTS", f"Converted {body.points} Ripple Points to ₹{inr_credits} credits")
    
    create_notification(
        user["id"],
        "💫 Ripple Points Converted!",
        f"Successfully converted {body.points} Ripple Points into ₹{inr_credits} store credit!",
        "success"
    )
    
    return {
        "success": True,
        "message": f"Successfully converted {body.points} Ripple Points into ₹{inr_credits} credits",
        "new_points": details["ripple_points"],
        "new_credits": details["credits"]
    }

# Manager: Get all referrals platform-wide
@router.get("/manager/referrals")
def get_all_referrals(user=Depends(require_manager)):
    conn = sqlite3.connect(DB_ORDERS)
    conn.row_factory = sqlite3.Row
    referrals = conn.execute(
        "SELECT * FROM referrals ORDER BY created_at DESC"
    ).fetchall()
    transactions = conn.execute(
        "SELECT * FROM referral_transactions ORDER BY created_at DESC LIMIT 200"
    ).fetchall()
    conn.close()

    db = get_db()
    ref_list = []
    for r in referrals:
        referrer = db.execute("SELECT name, email FROM auth.users WHERE id = ?", (r["referrer_id"],)).fetchone()
        referred = db.execute("SELECT name, email FROM auth.users WHERE id = ?", (r["referred_id"],)).fetchone()
        ref_list.append({
            **dict(r),
            "referrer_name": referrer["name"] if referrer else "Unknown",
            "referrer_email": referrer["email"] if referrer else "",
            "referred_name": referred["name"] if referred else "Unknown",
            "referred_email": referred["email"] if referred else "",
        })
    db.close()

    # Aggregate stats per referrer
    stats = {}
    for r in ref_list:
        rid = r["referrer_id"]
        if rid not in stats:
            stats[rid] = {"name": r["referrer_name"], "email": r["referrer_email"],
                          "referral_count": 0, "total_cashback_paid": 0.0}
        stats[rid]["referral_count"] += 1

    for t in transactions:
        uid = t["user_id"]
        if uid in stats and t["source_type"] in ("cashback", "first_purchase", "invite"):
            stats[uid]["total_cashback_paid"] += t["amount"]

    return {
        "referrals": ref_list,
        "transactions": [dict(t) for t in transactions],
        "stats": list(stats.values()),
        "totals": {
            "total_referrals": len(ref_list),
            "total_transactions": len(transactions),
            "total_paid_out": sum(t["amount"] for t in transactions)
        }
    }

# Manager: Get referral settings
@router.get("/manager/referral-settings")
def get_referral_settings_api(user=Depends(require_manager)):
    return _get_referral_settings()

# Manager: Update referral settings
class ReferralSettingsBody(BaseModel):
    class Config:
        extra = "allow"

@router.put("/manager/referral-settings")
def update_referral_settings(body: dict, user=Depends(require_manager)):
    allowed_keys = set(REFERRAL_DEFAULTS.keys())
    conn = sqlite3.connect(DB_SHOP)
    for key, value in body.items():
        if key in allowed_keys:
            conn.execute("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()
    log_activity(user["id"], "UPDATE_REFERRAL_SETTINGS", "Updated referral reward configuration")
    return {"success": True}

# Manager: Update milestone tiers
class TiersBody(BaseModel):
    tiers: list

@router.put("/manager/referral-tiers")
def update_referral_tiers(body: TiersBody, user=Depends(require_manager)):
    _save_referral_setting("referral_tiers", json.dumps(body.tiers))
    log_activity(user["id"], "UPDATE_REFERRAL_TIERS", f"Updated {len(body.tiers)} milestone tiers")
    return {"success": True}

# Manager: Per-user custom reward override
class UserReferralOverrideBody(BaseModel):
    custom_reward: Optional[float] = None  # None = remove override

@router.put("/manager/users/{uid}/referral-override")
def set_user_referral_override(uid: int, body: UserReferralOverrideBody, user=Depends(require_manager)):
    db = get_db()
    row = db.execute("SELECT details FROM auth.users WHERE id = ?", (uid,)).fetchone()
    if not row:
        db.close(); raise HTTPException(404, "User not found")
    try:
        details = json.loads(row["details"] or "{}")
    except:
        details = {}
    if body.custom_reward is None:
        details.pop("referral_custom_reward", None)
    else:
        details["referral_custom_reward"] = body.custom_reward
    db.execute("UPDATE auth.users SET details = ? WHERE id = ?", (json.dumps(details), uid))
    db.commit(); db.close()
    log_activity(user["id"], "SET_REFERRAL_OVERRIDE", f"Set custom referral reward for user {uid}: {body.custom_reward}")
    return {"success": True}

# Manager: Manual join bonus grant
class ManualBonusBody(BaseModel):
    amount: float
    note: str = "Manual bonus from manager"

@router.post("/manager/users/{uid}/manual-bonus")
def grant_manual_bonus(uid: int, body: ManualBonusBody, user=Depends(require_manager)):
    _add_credits(uid, body.amount, body.note)
    _log_referral_transaction(uid, "manual", None, body.amount, body.note)
    create_notification(uid, "🎁 Bonus Credited!", f"₹{body.amount} bonus has been added to your account. {body.note}", "success")
    log_activity(user["id"], "MANUAL_BONUS", f"Granted ₹{body.amount} bonus to user {uid}: {body.note}")
    return {"success": True}

# Admin: View single user's referral stats
@router.get("/manager/users/{uid}/referrals")
def get_user_referrals(uid: int, user=Depends(require_manager)):
    conn = sqlite3.connect(DB_ORDERS)
    conn.row_factory = sqlite3.Row
    referrals = conn.execute("SELECT * FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC", (uid,)).fetchall()
    transactions = conn.execute("SELECT * FROM referral_transactions WHERE user_id = ? ORDER BY created_at DESC", (uid,)).fetchall()
    conn.close()
    db = get_db()
    ref_list = []
    for r in referrals:
        referred = db.execute("SELECT name FROM auth.users WHERE id = ?", (r["referred_id"],)).fetchone()
        ref_list.append({**dict(r), "referred_name": referred["name"] if referred else "Unknown"})
    db.close()
    return {
        "referrals": ref_list,
        "transactions": [dict(t) for t in transactions],
        "total_earned": sum(t["amount"] for t in transactions if t["amount"] > 0)
    }

class WithdrawRequest(BaseModel):
    amount: float
    payment_info: str

@router.post("/referral/withdraw")
def request_referral_withdrawal(body: WithdrawRequest, user=Depends(get_current_user)):
    if body.amount < 1000.0:
        raise HTTPException(400, "Minimum withdrawal amount is ₹1000")
        
    db = get_db()
    row = db.execute("SELECT details FROM auth.users WHERE id = ?", (user["id"],)).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "User not found")
        
    try:
        details = json.loads(row["details"] or "{}")
    except:
        details = {}
        
    balance = float(details.get("referral_balance", 0.0))
    if balance < body.amount:
        db.close()
        raise HTTPException(400, f"Insufficient referral balance. Available: ₹{balance}")
        
    details["referral_balance"] = round(balance - body.amount, 2)
    db.execute("UPDATE auth.users SET details = ? WHERE id = ?", (json.dumps(details), user["id"]))
    db.commit()
    db.close()
    
    conn = sqlite3.connect(DB_ORDERS)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO referral_withdrawals (user_id, amount, payment_info, status, note) VALUES (?, ?, ?, 'pending', '')",
        (user["id"], body.amount, body.payment_info)
    )
    wid = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Log referral transaction
    _log_referral_transaction(user["id"], "withdrawal", wid, -body.amount, f"Withdrawal request for ₹{body.amount} ({body.payment_info})")
    
    create_notification(
        user["id"],
        "💸 Withdrawal Requested",
        f"Your request to withdraw ₹{body.amount} has been submitted for manager approval.",
        "info"
    )
    return {"success": True, "withdrawal_id": wid}

@router.get("/manager/withdrawals")
def get_manager_withdrawals(user=Depends(require_manager)):
    conn = sqlite3.connect(DB_ORDERS)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM referral_withdrawals ORDER BY created_at DESC").fetchall()
    conn.close()
    
    db = get_db()
    withdrawals_list = []
    for r in rows:
        u = db.execute("SELECT name, email FROM auth.users WHERE id = ?", (r["user_id"],)).fetchone()
        withdrawals_list.append({
            **dict(r),
            "user_name": u["name"] if u else "Unknown",
            "user_email": u["email"] if u else ""
        })
    db.close()
    return withdrawals_list

class WithdrawStatusBody(BaseModel):
    status: str
    note: Optional[str] = ""

@router.put("/manager/withdrawals/{wid}")
def update_withdrawal_status(wid: int, body: WithdrawStatusBody, user=Depends(require_manager)):
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "Invalid status. Must be approved or rejected")
        
    conn = sqlite3.connect(DB_ORDERS)
    conn.row_factory = sqlite3.Row
    w = conn.execute("SELECT * FROM referral_withdrawals WHERE id = ?", (wid,)).fetchone()
    if not w:
        conn.close()
        raise HTTPException(404, "Withdrawal request not found")
        
    w = dict(w)
    if w["status"] != "pending":
        conn.close()
        raise HTTPException(400, f"Withdrawal request is already {w['status']}")
        
    conn.execute(
        "UPDATE referral_withdrawals SET status = ?, note = ?, processed_at = ? WHERE id = ?",
        (body.status, body.note or "", int(time.time()), wid)
    )
    conn.commit()
    conn.close()
    
    # If rejected, refund the amount
    if body.status == "rejected":
        db = get_db()
        row = db.execute("SELECT details FROM auth.users WHERE id = ?", (w["user_id"],)).fetchone()
        if row:
            try:
                details = json.loads(row["details"] or "{}")
            except:
                details = {}
            details["referral_balance"] = round(details.get("referral_balance", 0.0) + w["amount"], 2)
            db.execute("UPDATE auth.users SET details = ? WHERE id = ?", (json.dumps(details), w["user_id"]))
            db.commit()
        db.close()
        
        # Log refund
        _log_referral_transaction(w["user_id"], "withdrawal_refund", wid, w["amount"], f"Refund of rejected withdrawal #{wid}")
        create_notification(
            w["user_id"],
            "❌ Withdrawal Rejected",
            f"Your withdrawal request for ₹{w['amount']} was rejected: {body.note or 'No reason provided'}. Funds have been refunded.",
            "error"
        )
    else:
        create_notification(
            w["user_id"],
            "✅ Withdrawal Approved",
            f"Your withdrawal request for ₹{w['amount']} has been approved and disbursed! {body.note or ''}",
            "success"
        )
        
    log_activity(user["id"], "UPDATE_WITHDRAWAL", f"Updated withdrawal #{wid} to {body.status}")
    return {"success": True}

@router.get("/manager/referral-tree")
def get_referral_tree(user=Depends(require_manager)):
    conn = sqlite3.connect(DB_ORDERS)
    conn.row_factory = sqlite3.Row
    referrals = conn.execute("SELECT referrer_id, referred_id FROM referrals").fetchall()
    
    # Get total earnings per user
    transactions = conn.execute("SELECT user_id, amount FROM referral_transactions WHERE amount > 0").fetchall()
    conn.close()

    earnings = {}
    for t in transactions:
        uid = t["user_id"]
        earnings[uid] = earnings.get(uid, 0.0) + t["amount"]

    db = get_db()
    users = db.execute("SELECT id, name, email, details FROM auth.users").fetchall()
    db.close()

    user_map = {}
    for u in users:
        try:
            d = json.loads(u["details"] or "{}")
        except:
            d = {}
        user_map[u["id"]] = {
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "referral_code": d.get("referral_code", ""),
            "children": [],
            "total_earned": round(earnings.get(u["id"], 0.0), 2),
            "referral_count": 0
        }

    children_map = {}
    all_referred = set()
    for r in referrals:
        rid = r["referrer_id"]
        cid = r["referred_id"]
        if rid not in children_map:
            children_map[rid] = []
        children_map[rid].append(cid)
        all_referred.add(cid)
        if rid in user_map:
            user_map[rid]["referral_count"] += 1

    # Roots: users who have referred others but weren't referred themselves
    roots = [uid for uid in user_map.keys() if uid not in all_referred and uid in children_map]

    def build_tree(uid, level=0):
        # Stop at arbitrary depth to prevent infinite loops just in case
        if level > 10:
            return None
        node = user_map.get(uid, {"id": uid, "name": f"Unknown #{uid}", "children": [], "total_earned": 0.0, "referral_count": 0}).copy()
        
        children = []
        for child_id in children_map.get(uid, []):
            child_node = build_tree(child_id, level + 1)
            if child_node:
                children.append(child_node)
        
        node["children"] = children
        return node

    tree = [build_tree(root_id) for root_id in roots]
    return tree
