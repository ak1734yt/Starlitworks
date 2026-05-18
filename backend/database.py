import sqlite3
import os
import time

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "ssw.db")

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

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
    created_at           INTEGER DEFAULT (strftime('%s','now')),
    last_login           INTEGER
);

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
    updated_at           INTEGER DEFAULT (strftime('%s','now'))
);

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
    quantity                   INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    action     TEXT    NOT NULL,
    details    TEXT    DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER REFERENCES orders(id),
    user_id      INTEGER NOT NULL REFERENCES users(id),
    message_type TEXT    DEFAULT 'text',
    content      TEXT    NOT NULL,
    created_at   INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS coupons (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    code           TEXT    UNIQUE NOT NULL,
    discount_type  TEXT    DEFAULT 'percentage',
    discount_value REAL    NOT NULL,
    max_uses       INTEGER DEFAULT 1,
    used_count     INTEGER DEFAULT 0,
    expires_at     INTEGER,
    created_by     INTEGER REFERENCES users(id),
    created_at     INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS feedbacks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    rating     INTEGER NOT NULL,
    comment    TEXT    DEFAULT '',
    status     TEXT    DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS portfolio (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    description  TEXT    DEFAULT '',
    banner_url   TEXT    DEFAULT '',
    member_count TEXT    DEFAULT '0',
    link         TEXT    DEFAULT '',
    category     TEXT    DEFAULT 'custom',
    sort_order   INTEGER DEFAULT 0,
    created_at   INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS site_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
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

CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    title      TEXT    NOT NULL,
    message    TEXT    NOT NULL,
    type       TEXT    DEFAULT 'info',
    is_read    INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
);
"""

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
]


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript(SCHEMA)
    # Seed default settings
    count = conn.execute("SELECT COUNT(*) FROM site_settings").fetchone()[0]
    if count == 0:
        conn.executemany("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)", DEFAULT_SETTINGS)
    
    # Safe migrations for chat unread counts and 2FA backup codes
    try:
        conn.execute("ALTER TABLE orders ADD COLUMN admin_unread_count INTEGER DEFAULT 0")
        conn.execute("ALTER TABLE orders ADD COLUMN client_unread_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass # Columns already exist
        
    try:
        conn.execute("ALTER TABLE users ADD COLUMN backup_codes TEXT DEFAULT '[]'")
    except sqlite3.OperationalError:
        pass # Columns already exist

    try:
        conn.execute("ALTER TABLE orders ADD COLUMN credits_applied REAL DEFAULT 0")
    except sqlite3.OperationalError:
        pass # Column already exists

    try:
        conn.execute("ALTER TABLE orders ADD COLUMN quantity INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass # Column already exists

    try:
        conn.execute("ALTER TABLE products ADD COLUMN min_price REAL DEFAULT 0")
    except sqlite3.OperationalError:
        pass # Column already exists

    try:
        conn.execute("ALTER TABLE products ADD COLUMN show_price_to_admin INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass # Column already exists

    conn.commit()
    conn.close()
