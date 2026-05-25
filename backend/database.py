import sqlite3
import os
import time
import shutil

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Decoupled database file paths
DB_USERS = os.path.join(DATA_DIR, "users.db")
DB_SHOP = os.path.join(DATA_DIR, "shop.db")
DB_ORDERS = os.path.join(DATA_DIR, "orders.db")

# Primary router database used only for attaching the physical databases
DB_PATH = os.path.join(DATA_DIR, "ssw.db")
TEMP_DB_PATH = os.path.join(DATA_DIR, "ssw_temp_migration.db")
LEGACY_BACKUP_PATH = os.path.join(DATA_DIR, "ssw_legacy_backup.db")

DEFAULT_SETTINGS = [
    ("hero_title", "Elevate Your <br /> <span class=\"text-gradient\">Discord Experience</span>"),
    ("hero_subtitle", "Professional Discord services crafted for communities, businesses, and creators."),
    ("hero_banner", "/banner.png"),
    ("hero_status_text", "Now Available for Commissions"),
    ("hero_badge_live", "Live Events"),
    ("hero_badge_secure", "Secure Hosting"),
    ("about_title", "The Architect Behind <span class=\"text-gradient\">Premium Communities</span>"),
    ("about_bio", "I specialize in building high-performance Discord environments."),
    ("brand_primary", "#7c3aed"),
    ("brand_secondary", "#4f46e5"),
    ("meta_title", "Starlit Siege Works | Premium Discord Services"),
    ("meta_description", "Professional Discord server setup, custom bot development, and community management."),
    ("footer_text", "© 2026 Starlit Siege Works. All rights reserved."),
    ("discord_link", "https://discord.gg/cozyclouds"),
    ("show_stats", "true"),
    ("show_feedbacks", "true"),
    ("stat_bots_developed", "10"),
    ("stat_dev_servers", "20+"),
    ("stat_projects_developed", "50+"),
    ("stat_client_satisfaction", "100%"),
    ("stat_commands_written", "900+"),
    ("stat_uptime", "99%"),
    ("stat_support", "24/7"),
    ("discord_member_count", "10000")
]

def attach_databases(conn):
    conn.execute(f"ATTACH DATABASE '{DB_USERS}' AS auth")
    conn.execute(f"ATTACH DATABASE '{DB_SHOP}' AS shop")
    conn.execute(f"ATTACH DATABASE '{DB_ORDERS}' AS orders")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=OFF")
    attach_databases(conn)
    
    def update_hook(op, db_name, table_name, row_id):
        try:
            from realtime import pubsub
            if table_name == "user_chats":
                pubsub.publish("chat_update")
            elif table_name == "orders":
                pubsub.publish("orders_update")
            elif table_name == "notifications":
                pubsub.publish("notifications_update")
            elif table_name == "invoices":
                pubsub.publish("invoices_update")
        except Exception:
            pass

    if hasattr(conn, "set_update_hook"):
        conn.set_update_hook(update_hook)
    return conn

def init_db():
    # Clean up any stale migration file from a previous interrupted run
    if os.path.exists(TEMP_DB_PATH):
        try:
            os.remove(TEMP_DB_PATH)
        except Exception:
            pass

    # Check if ssw.db has legacy tables and schemas
    has_legacy = False
    legacy_tables = {}
    
    if os.path.exists(DB_PATH) and os.path.getsize(DB_PATH) > 0:
        # Create a temporary copy of ssw.db to bypass read locks
        temp_db_path = TEMP_DB_PATH
        if os.path.exists(temp_db_path):
            try:
                os.remove(temp_db_path)
            except Exception:
                pass
                
        try:
            shutil.copy2(DB_PATH, temp_db_path)
            conn_temp = sqlite3.connect(temp_db_path)
            rows = conn_temp.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'").fetchall()
            for r in rows:
                legacy_tables[r[0]] = r[1]
            conn_temp.close()
            has_legacy = len(legacy_tables) > 0
        except Exception as e:
            print(f"Error copying legacy database: {e}")
            has_legacy = False
            
    # Helper to execute schema creation
    def create_table_in_db(db_path, table_name, default_sql):
        conn = sqlite3.connect(db_path)
        try:
            # Check if table already exists
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if cursor.fetchone():
                return
                
            # Use the exact legacy schema if present to maintain absolute column and migration alignment
            sql_to_run = legacy_tables.get(table_name, default_sql)
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute(sql_to_run)
            conn.commit()
        except Exception as e:
            print(f"Error creating table '{table_name}' in {os.path.basename(db_path)}: {e}")
        finally:
            conn.close()

    # ── 1. Create separated users database ───────────────────────────────────────
    create_table_in_db(DB_USERS, "users", """
    CREATE TABLE IF NOT EXISTS users (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        name                 TEXT    NOT NULL,
        email                TEXT    UNIQUE NOT NULL,
        password_hash        TEXT,
        provider             TEXT    DEFAULT 'local',
        provider_id          TEXT,
        avatar_url           TEXT,
        role                 TEXT    DEFAULT 'client',
        reset_token          TEXT,
        reset_token_expires  INTEGER,
        phone                TEXT,
        is_banned            INTEGER DEFAULT 0,
        details              TEXT    DEFAULT '{}',
        social_links         TEXT    DEFAULT '{}',
        gender               TEXT    DEFAULT '',
        location             TEXT    DEFAULT '',
        two_factor_secret    TEXT,
        two_factor_enabled   INTEGER DEFAULT 0,
        backup_codes         TEXT    DEFAULT '[]',
        token_version        INTEGER DEFAULT 0,
        email_verified       INTEGER DEFAULT 0,
        created_at           INTEGER DEFAULT (strftime('%s','now')),
        last_login           INTEGER
    );
    """)

    # ── 2. Create separated shop database ────────────────────────────────────────
    create_table_in_db(DB_SHOP, "products", """
    CREATE TABLE IF NOT EXISTS products (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        category             TEXT    NOT NULL,
        product_key          TEXT    UNIQUE NOT NULL,
        name                 TEXT    NOT NULL,
        price                REAL    DEFAULT 0,
        min_price            REAL    DEFAULT 0,
        tag                  TEXT    DEFAULT '',
        description          TEXT    DEFAULT '',
        features             TEXT    DEFAULT '[]',
        is_manual_price      INTEGER DEFAULT 0,
        show_price_to_admin  INTEGER DEFAULT 1,
        is_recurring         INTEGER DEFAULT 0,
        sort_order           INTEGER DEFAULT 0,
        unit_label           TEXT    DEFAULT '',
        updated_at           INTEGER DEFAULT (strftime('%s','now')),
        is_deleted           INTEGER DEFAULT 0
    );
    """)
    create_table_in_db(DB_SHOP, "deleted_product_keys", """
    CREATE TABLE IF NOT EXISTS deleted_product_keys (
        product_key TEXT UNIQUE NOT NULL
    );
    """)
    create_table_in_db(DB_SHOP, "coupons", """
    CREATE TABLE IF NOT EXISTS coupons (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        code           TEXT    UNIQUE NOT NULL,
        discount_type  TEXT    DEFAULT 'percentage',
        discount_value REAL    NOT NULL,
        max_uses       INTEGER DEFAULT 1,
        used_count     INTEGER DEFAULT 0,
        expires_at     INTEGER,
        created_by     INTEGER REFERENCES users(id),
        status         TEXT    DEFAULT 'active',
        is_deleted     INTEGER DEFAULT 0,
        created_at     INTEGER DEFAULT (strftime('%s','now'))
    );
    """)
    create_table_in_db(DB_SHOP, "coupon_uses", """
    CREATE TABLE IF NOT EXISTS coupon_uses (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        coupon_id      INTEGER REFERENCES coupons(id),
        user_id        INTEGER REFERENCES users(id),
        order_id       INTEGER REFERENCES orders(id),
        used_at        INTEGER DEFAULT (strftime('%s','now'))
    );
    """)
    create_table_in_db(DB_SHOP, "feedbacks", """
    CREATE TABLE IF NOT EXISTS feedbacks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        rating     INTEGER NOT NULL,
        comment    TEXT    DEFAULT '',
        status     TEXT    DEFAULT 'pending',
        created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    """)
    create_table_in_db(DB_SHOP, "portfolio", """
    CREATE TABLE IF NOT EXISTS portfolio (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        title        TEXT    NOT NULL,
        description  TEXT    DEFAULT '',
        banner_url   TEXT    DEFAULT '',
        member_count TEXT    DEFAULT '0',
        link         TEXT    DEFAULT '',
        category     TEXT    DEFAULT 'custom',
        custom_fields TEXT   DEFAULT '{}',
        sort_order   INTEGER DEFAULT 0,
        is_visible   INTEGER DEFAULT 1,
        growth_percentage TEXT DEFAULT '',
        created_at   INTEGER DEFAULT (strftime('%s','now'))
    );
    """)
    create_table_in_db(DB_SHOP, "site_settings", """
    CREATE TABLE IF NOT EXISTS site_settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)
    create_table_in_db(DB_SHOP, "templates", """
    CREATE TABLE IF NOT EXISTS templates (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        title         TEXT NOT NULL,
        description   TEXT,
        price         REAL NOT NULL,
        roles_json    TEXT NOT NULL,
        channels_json TEXT NOT NULL,
        template_link TEXT NOT NULL,
        created_at    INTEGER DEFAULT (strftime('%s','now')),
        is_deleted    INTEGER DEFAULT 0
    );
    """)
    create_table_in_db(DB_SHOP, "blogs", """
    CREATE TABLE IF NOT EXISTS blogs (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        title         TEXT NOT NULL,
        slug          TEXT UNIQUE NOT NULL,
        content       TEXT NOT NULL,
        category      TEXT DEFAULT 'General',
        created_at    INTEGER DEFAULT (strftime('%s','now')),
        is_deleted    INTEGER DEFAULT 0
    );
    """)
    
    # Check default settings and handle migrations in shop.db
    conn_shop = sqlite3.connect(DB_SHOP)
    try:
        # Migration for is_deleted
        try:
            conn_shop.execute("ALTER TABLE products ADD COLUMN is_deleted INTEGER DEFAULT 0")
            conn_shop.commit()
        except Exception:
            pass
        # Migration for coupons
        try:
            conn_shop.execute("ALTER TABLE coupons ADD COLUMN status TEXT DEFAULT 'active'")
            conn_shop.execute("ALTER TABLE coupons ADD COLUMN is_deleted INTEGER DEFAULT 0")
            conn_shop.commit()
        except Exception:
            pass

        # Migration for portfolio
        try:
            conn_shop.execute("ALTER TABLE portfolio ADD COLUMN custom_fields TEXT DEFAULT '{}'")
            conn_shop.commit()
        except Exception:
            pass
        try:
            conn_shop.execute("ALTER TABLE portfolio ADD COLUMN is_visible INTEGER DEFAULT 1")
            conn_shop.commit()
        except Exception:
            pass
        try:
            conn_shop.execute("ALTER TABLE portfolio ADD COLUMN growth_percentage TEXT DEFAULT ''")
            conn_shop.commit()
        except Exception:
            pass
        
        conn_shop.executemany("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)", DEFAULT_SETTINGS)
        conn_shop.execute("INSERT OR IGNORE INTO site_settings (key, value) VALUES ('discord_member_count', '10000')")
        conn_shop.commit()
    except Exception as e:
        print(f"Error checking default settings: {e}")
    finally:
        conn_shop.close()

    # ── 3. Create separated orders database ──────────────────────────────────────
    create_table_in_db(DB_ORDERS, "orders", """
    CREATE TABLE IF NOT EXISTS orders (
        id                         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id                    INTEGER NOT NULL REFERENCES users(id),
        service_id                 TEXT    NOT NULL,
        service_name               TEXT    NOT NULL,
        server_link                TEXT    DEFAULT '',
        description                TEXT    DEFAULT '',
        timeline                   TEXT    DEFAULT '',
        discord_username           TEXT    DEFAULT '',
        status                     TEXT    DEFAULT 'pending',
        quoted_price               REAL,
        admin_notes                TEXT    DEFAULT '',
        negotiated_price           REAL,
        negotiation_reason         TEXT    DEFAULT '',
        negotiation_status         TEXT    DEFAULT '',
        payment_status             TEXT    DEFAULT 'pending',
        payment_method             TEXT    DEFAULT '',
        transaction_id             TEXT    DEFAULT '',
        payment_screenshot         TEXT    DEFAULT '',
        payment_proof_submitted_at INTEGER DEFAULT 0,
        created_at                 INTEGER DEFAULT (strftime('%s','now')),
        updated_at                 INTEGER DEFAULT (strftime('%s','now')),
        accepted_by                INTEGER REFERENCES users(id),
        tax_rate                   REAL    DEFAULT 0,
        cgst                       REAL    DEFAULT 0,
        sgst                       REAL    DEFAULT 0,
        total_amount               REAL    DEFAULT 0,
        payment_plan               TEXT    DEFAULT 'full',
        vault_data                 TEXT    DEFAULT '{}',
        credits_applied            REAL    DEFAULT 0,
        quantity                   INTEGER DEFAULT 1,
        payment_verified_by        INTEGER REFERENCES users(id),
        admin_unread_count         INTEGER DEFAULT 0,
        client_unread_count        INTEGER DEFAULT 0
    );
    """)
    create_table_in_db(DB_ORDERS, "chat_messages", """
    CREATE TABLE IF NOT EXISTS chat_messages (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id     INTEGER REFERENCES orders(id),
        user_id      INTEGER NOT NULL REFERENCES users(id),
        message_type TEXT    DEFAULT 'text',
        content      TEXT    NOT NULL,
        created_at   INTEGER DEFAULT (strftime('%s','now'))
    );
    """)
    create_table_in_db(DB_ORDERS, "user_chats", """
    CREATE TABLE IF NOT EXISTS user_chats (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id    INTEGER NOT NULL REFERENCES users(id),
        sender_id    INTEGER NOT NULL REFERENCES users(id),
        message_type TEXT    DEFAULT 'text',
        content      TEXT    NOT NULL,
        created_at   INTEGER DEFAULT (strftime('%s','now'))
    );
    """)
    create_table_in_db(DB_ORDERS, "analytics_logs", """
    CREATE TABLE IF NOT EXISTS analytics_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER REFERENCES users(id),
        ip         TEXT,
        city       TEXT,
        region     TEXT,
        country    TEXT,
        org        TEXT,
        browser    TEXT,
        os         TEXT,
        screen     TEXT,
        timezone   TEXT,
        lat        REAL,
        lon        REAL,
        accuracy   REAL,
        risk_score INTEGER DEFAULT 0,
        risk_flags TEXT    DEFAULT '[]',
        created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    """)
    create_table_in_db(DB_ORDERS, "notifications", """
    CREATE TABLE IF NOT EXISTS notifications (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        title      TEXT    NOT NULL,
        message    TEXT    NOT NULL,
        type       TEXT    DEFAULT 'info',
        is_read    INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    """)
    create_table_in_db(DB_ORDERS, "activity_logs", """
    CREATE TABLE IF NOT EXISTS activity_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        action     TEXT    NOT NULL,
        details    TEXT    DEFAULT '',
        created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    """)

    # Check default settings and handle migrations in orders.db
    conn_orders = sqlite3.connect(DB_ORDERS)
    try:
        # Migration for orders payment_verified_by
        try:
            conn_orders.execute("ALTER TABLE orders ADD COLUMN payment_verified_by INTEGER REFERENCES users(id)")
            conn_orders.commit()
        except Exception:
            pass
    except Exception as e:
        print(f"Error checking orders migrations: {e}")
    finally:
        conn_orders.close()

    # ── Security Migrations (users table) ────────────────────────────────────────
    conn_users_mig = sqlite3.connect(DB_USERS)
    try:
        try:
            conn_users_mig.execute("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0")
            conn_users_mig.commit()
            print("Migration: Added token_version column to users")
        except Exception:
            pass
        try:
            conn_users_mig.execute("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0")
            conn_users_mig.commit()
            print("Migration: Added email_verified column to users")
        except Exception:
            pass
        try:
            conn_users_mig.execute("ALTER TABLE users ADD COLUMN two_factor_secret TEXT")
            conn_users_mig.commit()
            print("Migration: Added two_factor_secret column to users")
        except Exception:
            pass
        try:
            conn_users_mig.execute("ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0")
            conn_users_mig.commit()
            print("Migration: Added two_factor_enabled column to users")
        except Exception:
            pass
        try:
            conn_users_mig.execute("ALTER TABLE users ADD COLUMN backup_codes TEXT DEFAULT '[]'")
            conn_users_mig.commit()
            print("Migration: Added backup_codes column to users")
        except Exception:
            pass
    except Exception as e:
        print(f"Error in security migrations: {e}")
    finally:
        conn_users_mig.close()

    # ── Auto-promote owner to admin ──────────────────────────────────────────────
    conn_users_promo = sqlite3.connect(DB_USERS)
    try:
        conn_users_promo.execute(
            "UPDATE users SET role = 'admin' WHERE email = 'Akshatkumar945296@gmail.com' AND role = 'client'"
        )
        conn_users_promo.commit()
    except Exception as e:
        print(f"Error in auto-promotion: {e}")
    finally:
        conn_users_promo.close()

    # ── 4. Migrate legacy combined data ──────────────────────────────────────────
    if has_legacy:
        # Check if users already has data
        conn_users_check = sqlite3.connect(DB_USERS)
        user_count_target = 0
        try:
            user_count_target = conn_users_check.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        except Exception:
            pass
        finally:
            conn_users_check.close()
            
        if user_count_target == 0:
            print("Beginning decoupled database migration from temporary copy...")
            
            # Map legacy tables to target database files
            mapping = {
                "users": DB_USERS,
                "products": DB_SHOP,
                "coupons": DB_SHOP,
                "feedbacks": DB_SHOP,
                "portfolio": DB_SHOP,
                "site_settings": DB_SHOP,
                "orders": DB_ORDERS,
                "chat_messages": DB_ORDERS,
                "analytics_logs": DB_ORDERS,
                "notifications": DB_ORDERS,
                "activity_logs": DB_ORDERS
            }
            
            temp_db_path = os.path.join(DATA_DIR, "ssw_temp_migration.db")
            conn_temp = sqlite3.connect(temp_db_path)
            conn_temp.row_factory = sqlite3.Row
            
            import re
            for table, target_path in mapping.items():
                if table in legacy_tables:
                    if not re.match(r"^[a-zA-Z0-9_]+$", table):
                        continue
                    conn_target = None
                    try:
                        rows = conn_temp.execute(f"SELECT * FROM {table}").fetchall()
                        if not rows:
                            continue
                            
                        # Fetch column names
                        cursor = conn_temp.execute(f"SELECT * FROM {table} LIMIT 1")
                        cols = [d[0] for d in cursor.description if re.match(r"^[a-zA-Z0-9_]+$", d[0])]
                        
                        placeholders = ", ".join(["?"] * len(cols))
                        col_names = ", ".join(cols)
                        
                        conn_target = sqlite3.connect(target_path)
                        conn_target.execute("PRAGMA foreign_keys=OFF")
                        
                        # Empty target first
                        conn_target.execute(f"DELETE FROM {table}")
                        
                        # Batch insert
                        conn_target.executemany(
                            f"INSERT INTO {table} ({col_names}) VALUES ({placeholders})",
                            [tuple(r) for r in rows]
                        )
                        conn_target.commit()
                        print(f"Successfully migrated table '{table}' -> {os.path.basename(target_path)} ({len(rows)} records)")
                    except Exception as ex:
                        print(f"Failed to migrate table '{table}': {ex}")
                    finally:
                        if conn_target:
                            conn_target.close()
            
            conn_temp.close()
            
        # Backup old ssw.db to ssw_legacy_backup.db
        if os.path.exists(LEGACY_BACKUP_PATH):
            try:
                os.remove(LEGACY_BACKUP_PATH)
            except Exception:
                pass
            
        try:
            shutil.copy2(DB_PATH, LEGACY_BACKUP_PATH)
            print(f"Combined database successfully backed up to {os.path.basename(LEGACY_BACKUP_PATH)}")
            
            # Truncate/Recreate legacy file to make it a blank router connection
            conn_clear = sqlite3.connect(DB_PATH)
            conn_clear.execute("PRAGMA foreign_keys=OFF")
            cursor_clear = conn_clear.cursor()
            cursor_clear.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'")
            tables_to_drop = [row[0] for row in cursor_clear.fetchall()]
            for t in tables_to_drop:
                if re.match(r"^[a-zA-Z0-9_]+$", t):
                    conn_clear.execute(f"DROP TABLE IF EXISTS {t}")
            conn_clear.commit()
            conn_clear.execute("VACUUM")
            conn_clear.close()
            print("Primary connection router cleared successfully.")
        except Exception as e:
            print(f"Failed to clear legacy tables from router database: {e}")
    else:
        # Recreate the router ssw.db as a blank database
        conn_main = sqlite3.connect(DB_PATH)
        conn_main.commit()
        conn_main.close()

    # Clean up any leftover temp migration database
    if os.path.exists(TEMP_DB_PATH):
        try:
            os.remove(TEMP_DB_PATH)
            print("Temporary migration database cleaned up.")
        except Exception:
            pass

if __name__ == "__main__":
    init_db()
