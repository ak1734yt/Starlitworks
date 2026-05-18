import sqlite3
import time
import json
import os
from database import DB_PATH, init_db

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def seed():
    init_db()
    db = get_db()
    
    # 1. Ensure columns exist
    try:
        db.execute("ALTER TABLE products ADD COLUMN min_price REAL DEFAULT 0")
        print("Added min_price column")
    except sqlite3.OperationalError:
        pass
    
    try:
        db.execute("ALTER TABLE products ADD COLUMN show_price_to_admin INTEGER DEFAULT 1")
        print("Added show_price_to_admin column")
    except sqlite3.OperationalError:
        pass

    products = [
        # Decorations via Gift
        {
            "category": "decorations_gift", "product_key": "deco_gift_1", "name": "Decoration via Gift ($4.99)", "price": 150, "min_price": 150, "tag": "$1.79 | ₹150",
            "description": "Discord profile decoration delivered via gift link. [Admin hint: Recommended $1.79 or ₹150]", "features": ["Instant delivery", "Secure link", "47h expiration"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_gift", "product_key": "deco_gift_2", "name": "Decoration via Gift ($5.99)", "price": 180, "min_price": 180, "tag": "$2.05 | ₹180",
            "description": "Discord profile decoration delivered via gift link. [Admin hint: Recommended $2.05 or ₹180]", "features": ["Instant delivery", "Secure link", "47h expiration"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_gift", "product_key": "deco_gift_3", "name": "Decoration via Gift ($6.99)", "price": 225, "min_price": 225, "tag": "$2.49 | ₹225",
            "description": "Discord profile decoration delivered via gift link. [Admin hint: Recommended $2.49 or ₹225]", "features": ["Instant delivery", "Secure link", "47h expiration"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_gift", "product_key": "deco_gift_4", "name": "Decoration via Gift ($7.99)", "price": 265, "min_price": 265, "tag": "$2.90 | ₹265",
            "description": "Discord profile decoration delivered via gift link. [Admin hint: Recommended $2.90 or ₹265]", "features": ["Instant delivery", "Secure link", "47h expiration"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_gift", "product_key": "deco_gift_5", "name": "Decoration via Gift ($8.49)", "price": 285, "min_price": 285, "tag": "$3.20 | ₹285",
            "description": "Discord profile decoration delivered via gift link. [Admin hint: Recommended $3.20 or ₹285]", "features": ["Instant delivery", "Secure link", "47h expiration"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_gift", "product_key": "deco_gift_6", "name": "Decoration via Gift ($9.99)", "price": 340, "min_price": 340, "tag": "$3.70 | ₹340",
            "description": "Discord profile decoration delivered via gift link. [Admin hint: Recommended $3.70 or ₹340]", "features": ["Instant delivery", "Secure link", "47h expiration"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_gift", "product_key": "deco_gift_7", "name": "Decoration via Gift ($11.99)", "price": 370, "min_price": 370, "tag": "$3.90 | ₹370",
            "description": "Discord profile decoration delivered via gift link. [Admin hint: Recommended $3.90 or ₹370]", "features": ["Instant delivery", "Secure link", "47h expiration"], "is_manual_price": 1, "show_price_to_admin": 1
        },

        # Decorations via Login
        {
            "category": "decorations_login", "product_key": "deco_login_1", "name": "Decoration via Login ($4.99)", "price": 100, "min_price": 100, "tag": "$1.10 | ₹100",
            "description": "Decoration applied directly. Requires email/password. [Admin hint: Recommended $1.10 or ₹100]", "features": ["Direct application", "Legally paid"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_login", "product_key": "deco_login_2", "name": "Decoration via Login ($5.99)", "price": 120, "min_price": 120, "tag": "$1.35 | ₹120",
            "description": "Decoration applied directly. Requires email/password. [Admin hint: Recommended $1.35 or ₹120]", "features": ["Direct application", "Legally paid"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_login", "product_key": "deco_login_3", "name": "Decoration via Login ($6.99)", "price": 145, "min_price": 145, "tag": "$1.60 | ₹145",
            "description": "Decoration applied directly. Requires email/password. [Admin hint: Recommended $1.60 or ₹145]", "features": ["Direct application", "Legally paid"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_login", "product_key": "deco_login_4", "name": "Decoration via Login ($7.99)", "price": 180, "min_price": 180, "tag": "$2.05 | ₹180",
            "description": "Decoration applied directly. Requires email/password. [Admin hint: Recommended $2.05 or ₹180]", "features": ["Direct application", "Legally paid"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_login", "product_key": "deco_login_5", "name": "Decoration via Login ($8.49)", "price": 205, "min_price": 205, "tag": "$2.25 | ₹205",
            "description": "Decoration applied directly. Requires email/password. [Admin hint: Recommended $2.25 or ₹205]", "features": ["Direct application", "Legally paid"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_login", "product_key": "deco_login_6", "name": "Decoration via Login ($9.99)", "price": 300, "min_price": 300, "tag": "$3.25 | ₹300",
            "description": "Decoration applied directly. Requires email/password. [Admin hint: Recommended $3.25 or ₹300]", "features": ["Direct application", "Legally paid"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "decorations_login", "product_key": "deco_login_7", "name": "Decoration via Login ($11.99)", "price": 350, "min_price": 350, "tag": "$3.90 | ₹350",
            "description": "Decoration applied directly. Requires email/password. [Admin hint: Recommended $3.90 or ₹350]", "features": ["Direct application", "Legally paid"], "is_manual_price": 1, "show_price_to_admin": 1
        },

        # Nitro Accounts
        {
            "category": "nitro_accounts", "product_key": "nitro_3_4_months", "name": "3-4 Month Nitro Full Access", "price": 600, "min_price": 500, "tag": "Full Access",
            "description": "Freshly claimed Discord Nitro with full access. [Admin hint: Suggest ₹600]", "features": ["Full access", "Mail change allowed", "Password change allowed"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        
        # Server Boosts
        {
            "category": "booster", "product_key": "boost_1m", "name": "14x Server Boosts (1 Month)", "price": 300, "min_price": 250, "tag": "1 Month | 14 Boosts",
            "description": "14x high quality server boosts. Full revoke warranty. [Admin hint: Suggest ₹300]", "features": ["VCC/Login based", "1 Month duration", "Revoke Warranty"], "is_manual_price": 1, "show_price_to_admin": 1
        },
        {
            "category": "booster", "product_key": "boost_3m", "name": "14x Server Boosts (3 Months)", "price": 800, "min_price": 700, "tag": "3 Months | 14 Boosts",
            "description": "14x high quality server boosts. Full revoke warranty. [Admin hint: Suggest ₹800]", "features": ["VCC/Login based", "3 Months duration", "Revoke Warranty"], "is_manual_price": 1, "show_price_to_admin": 1
        }
    ]

    for p in products:
        # Check if exists
        exists = db.execute("SELECT id FROM products WHERE product_key = ?", (p["product_key"],)).fetchone()
        if exists:
            db.execute('''
                UPDATE products 
                SET name=?, category=?, price=?, min_price=?, tag=?, description=?, features=?, is_manual_price=?, show_price_to_admin=?
                WHERE product_key=?
            ''', (p["name"], p["category"], p["price"], p["min_price"], p["tag"], p["description"], json.dumps(p.get("features", [])), p["is_manual_price"], p["show_price_to_admin"], p["product_key"]))
        else:
            db.execute('''
                INSERT INTO products (category, product_key, name, price, min_price, tag, description, features, is_manual_price, show_price_to_admin, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (p["category"], p["product_key"], p["name"], p["price"], p["min_price"], p["tag"], p["description"], json.dumps(p.get("features", [])), p["is_manual_price"], p["show_price_to_admin"], int(time.time())))
            
    db.commit()
    db.close()
    print(f"Successfully seeded {len(products)} products!")

if __name__ == "__main__":
    seed()
