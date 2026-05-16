const Database = require('better-sqlite3');
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, 'ssw.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
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
    created_at           INTEGER DEFAULT (strftime('%s','now')),
    last_login           INTEGER
  );

  CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    category     TEXT    NOT NULL,
    product_key  TEXT    UNIQUE NOT NULL,
    name         TEXT    NOT NULL,
    price        REAL    DEFAULT 0,
    tag          TEXT    DEFAULT '',
    description  TEXT    DEFAULT '',
    features     TEXT    DEFAULT '[]',
    is_manual_price INTEGER DEFAULT 0,
    is_recurring    INTEGER DEFAULT 0,
    sort_order   INTEGER DEFAULT 0,
    unit_label   TEXT    DEFAULT '',
    updated_at   INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    service_id   TEXT    NOT NULL,
    service_name TEXT    NOT NULL,
    server_link  TEXT    DEFAULT '',
    description  TEXT    DEFAULT '',
    timeline     TEXT    DEFAULT '',
    status       TEXT    DEFAULT 'pending',
    quoted_price REAL,
    admin_notes  TEXT    DEFAULT '',
    negotiated_price REAL,
    negotiation_reason TEXT DEFAULT '',
    negotiation_status TEXT DEFAULT '',
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT '',
    transaction_id TEXT DEFAULT '',
    payment_screenshot TEXT DEFAULT '',
    payment_proof_submitted_at INTEGER DEFAULT 0,
    created_at   INTEGER DEFAULT (strftime('%s','now')),
    updated_at   INTEGER DEFAULT (strftime('%s','now')),
    accepted_by  INTEGER REFERENCES users(id),
    tax_rate     REAL    DEFAULT 0,
    cgst         REAL    DEFAULT 0,
    sgst         REAL    DEFAULT 0,
    total_amount REAL    DEFAULT 0,
    payment_plan TEXT    DEFAULT 'full',
    vault_data   TEXT    DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    action       TEXT    NOT NULL,
    details      TEXT    DEFAULT '',
    created_at   INTEGER DEFAULT (strftime('%s','now'))
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
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT    UNIQUE NOT NULL,
    discount_type TEXT   DEFAULT 'percentage',
    discount_value REAL  NOT NULL,
    max_uses     INTEGER DEFAULT 1,
    used_count   INTEGER DEFAULT 0,
    expires_at   INTEGER,
    created_by   INTEGER REFERENCES users(id),
    created_at   INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    rating       INTEGER NOT NULL,
    comment      TEXT    DEFAULT '',
    status       TEXT    DEFAULT 'pending',
    created_at   INTEGER DEFAULT (strftime('%s','now'))
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
    key          TEXT    PRIMARY KEY,
    value        TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analytics_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER,
    ip           TEXT,
    city         TEXT,
    region       TEXT,
    country      TEXT,
    org          TEXT,
    browser      TEXT,
    os           TEXT,
    screen       TEXT,
    timezone     TEXT,
    lat          REAL,
    lon          REAL,
    accuracy     REAL,
    risk_score   INTEGER DEFAULT 0,
    risk_flags   TEXT    DEFAULT '[]',
    created_at   INTEGER DEFAULT (strftime('%s','now'))
  );
`);

// ─── Seed Site Settings ──────────────────────────────────────────────────────
const settingsCount = db.prepare('SELECT COUNT(*) AS c FROM site_settings').get().c;
if (settingsCount === 0) {
  const insert = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
  const defaultSettings = [
    ['hero_title', 'Elevate Your <br /> <span class="text-gradient">Discord Experience</span>'],
    ['hero_subtitle', 'Professional Discord services crafted for communities, businesses, and creators. Custom bots, server setup, and ongoing support — all in one premium package.'],
    ['hero_banner', '/banner.png'],
    ['hero_status_text', 'Now Available for Commissions'],
    ['hero_badge_live', 'Live Events'],
    ['hero_badge_secure', 'Secure Hosting'],
    ['about_title', 'The Architect Behind <span class="text-gradient">Premium Communities</span>'],
    ['about_bio', 'I specialize in building high-performance Discord environments that combine security, automation, and engagement. With years of experience in bot development and server architecture, I transform basic channels into thriving professional ecosystems.'],
    ['architect_desc', 'Optimized role hierarchy, security hardening, and engagement systems.'],
    ['dev_desc', 'Custom solutions for economy, moderation, and specialized automation.'],
    ['contact_cta_title', 'Ready to <span class="text-gradient">Transform</span> Your Server?'],
    ['contact_cta_subtext', 'Join hundreds of successful communities using our premium Discord solutions. Let\'s build something amazing together.'],
    ['brand_primary', '#7c3aed'],
    ['brand_secondary', '#4f46e5'],
    ['meta_title', 'Starlit Siege Works | Premium Discord Services'],
    ['meta_description', 'Professional Discord server setup, custom bot development, and community management.'],
    ['footer_text', '© 2026 Starlit Siege Works. All rights reserved.'],
    ['discord_link', 'https://discord.gg/cozyclouds'],
    ['show_stats', 'true'],
    ['show_feedbacks', 'true'],
  ];
  for (const [key, val] of defaultSettings) insert.run(key, val);
  console.log('✅ Site settings seeded.');
}

// Ensure all default settings exist (migration)
const defaultKeys = [
  ['hero_title', 'Elevate Your <br /> <span class="text-gradient">Discord Experience</span>'],
  ['hero_subtitle', 'Professional Discord services crafted for communities, businesses, and creators. Custom bots, server setup, and ongoing support — all in one premium package.'],
  ['hero_banner', '/banner.png'],
  ['hero_status_text', 'Now Available for Commissions'],
  ['hero_badge_live', 'Live Events'],
  ['hero_badge_secure', 'Secure Hosting'],
  ['about_title', 'The Architect Behind <span class="text-gradient">Premium Communities</span>'],
  ['about_bio', 'I specialize in building high-performance Discord environments that combine security, automation, and engagement. With years of experience in bot development and server architecture, I transform basic channels into thriving professional ecosystems.'],
  ['architect_desc', 'Optimized role hierarchy, security hardening, and engagement systems.'],
  ['dev_desc', 'Custom solutions for economy, moderation, and specialized automation.'],
  ['contact_cta_title', 'Ready to <span class="text-gradient">Transform</span> Your Server?'],
  ['contact_cta_subtext', 'Join hundreds of successful communities using our premium Discord solutions. Let\'s build something amazing together.'],
  ['brand_primary', '#7c3aed'],
  ['brand_secondary', '#4f46e5'],
  ['meta_title', 'Starlit Siege Works | Premium Discord Services'],
  ['meta_description', 'Professional Discord server setup, custom bot development, and community management.'],
  ['meta_keywords', 'discord, bot, server setup, community, management, ssw'],
  ['meta_og_image', '/banner.png'],
  ['footer_text', '© 2026 Starlit Siege Works. All rights reserved.'],
  ['discord_link', 'https://discord.gg/cozyclouds'],
  ['show_stats', 'true'],
  ['show_feedbacks', 'true'],
  ['show_pricing', 'true'],
  ['show_portfolio', 'true'],
  ['maintenance_mode', 'false'],
  ['whatsapp_number', '+917392939277'],
  ['whatsapp_api_key', ''],
  ['whatsapp_enabled', 'false'],
];
const upsertSetting = db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)');
defaultKeys.forEach(([k, v]) => upsertSetting.run(k, v));

// Migrations for existing databases
try { db.exec("ALTER TABLE orders ADD COLUMN negotiated_price REAL;"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN negotiation_reason TEXT DEFAULT '';"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN negotiation_status TEXT DEFAULT '';"); } catch(e) {}

// Migration for payment columns
try { db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending';"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT '';"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN transaction_id TEXT DEFAULT '';"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_screenshot TEXT DEFAULT '';"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_proof_submitted_at INTEGER DEFAULT 0;"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN last_reminded_at INTEGER;"); } catch(e) {}

// Finalization Migrations
try { db.exec("ALTER TABLE users ADD COLUMN phone TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0;"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN details TEXT DEFAULT '{}';"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN social_links TEXT DEFAULT '{}';"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN accepted_by INTEGER REFERENCES users(id);"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN tax_rate REAL DEFAULT 0;"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN cgst REAL DEFAULT 0;"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN sgst REAL DEFAULT 0;"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN total_amount REAL DEFAULT 0;"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_plan TEXT DEFAULT 'full';"); } catch(e) {}
try { db.exec("ALTER TABLE coupons ADD COLUMN created_by INTEGER REFERENCES users(id);"); } catch(e) {}

// Gender & Location migrations
try { db.exec("ALTER TABLE users ADD COLUMN gender TEXT DEFAULT '';"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN location TEXT DEFAULT '';"); } catch(e) {}

// 2FA migrations
try { db.exec("ALTER TABLE users ADD COLUMN two_factor_secret TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;"); } catch(e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN vault_data TEXT DEFAULT '{}';"); } catch(e) {}
try { db.exec("ALTER TABLE analytics_logs ADD COLUMN risk_score INTEGER DEFAULT 0;"); } catch(e) {}
try { db.exec("ALTER TABLE analytics_logs ADD COLUMN risk_flags TEXT DEFAULT '[]';"); } catch(e) {}

// Product Unit Label migration
try { db.exec("ALTER TABLE products ADD COLUMN unit_label TEXT DEFAULT '';"); } catch(e) {}
try { db.prepare("DELETE FROM products WHERE product_key = 'joins_panel'").run(); } catch(e) {}


// Set specified user as manager
try {
  db.prepare("UPDATE users SET role = 'manager' WHERE email = 'akshatkumar945296@gmail.com'").run();
} catch(e) { console.error("Failed to set manager role:", e); }

// ─── Seed products if missing ────────────────────────────────────────────────────
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (category, product_key, name, price, tag, description, features, is_manual_price, is_recurring, sort_order, unit_label)
  VALUES (@category, @product_key, @name, @price, @tag, @description, @features, @is_manual_price, @is_recurring, @sort_order, @unit_label)
`);
const seedMany = db.transaction((items) => { 
  for (const item of items) {
    if (item.unit_label === undefined) item.unit_label = '';
    insertProduct.run(item);
  }
});

seedMany([
    // Server Plans
    { category:'server', product_key:'normal', name:'Normal Starter Pack', price:1000, tag:'', description:'Perfect for small communities getting started', features:JSON.stringify(['Role hierarchy','Basic moderation & logs','Standard server security','1–2 Bot Set','Welcome setup','7 days support','2–3 days delivery','Quick Delivery available']), is_manual_price:0, is_recurring:0, sort_order:1 },
    { category:'server', product_key:'pro',    name:'Pro',    price:1500, tag:'Most Sold', description:'Everything you need for a thriving community', features:JSON.stringify(['Advanced + growth roles','Tickets setup','Super Secure','Basic moderation & logs','Welcome setup','14 days support','3–4 days delivery','Backup included','Quick Delivery available']), is_manual_price:0, is_recurring:0, sort_order:2 },
    { category:'server', product_key:'premium',name:'Premium',price:2000, tag:'Best Plan', description:'Go beyond with full branding & automation',    features:JSON.stringify(['Everything in Pro + branding','Extra automation + branding kit','Super Secure+ hardening','Guide for server','Tickets setup','15 days VIP support','3–4 days delivery','Enhanced backup','Quick Delivery available']), is_manual_price:0, is_recurring:0, sort_order:3 },
    { category:'server', product_key:'custom', name:'Custom', price:2500, tag:'Best Reviews', description:'Dedicated solutions for large-scale servers', features:JSON.stringify(['Fully tailored architecture','Extra automation + branding kit','Enterprise Secure+','Guide for server','Olympus bot premium 1 month','1 month no prefix','Tickets setup','1 month management','5–7 days delivery','Enterprise backup','Quick Delivery available']), is_manual_price:0, is_recurring:0, sort_order:4 },
    // Add-ons
    { category:'addon', product_key:'quick_del',    name:'Quick Delivery',         price:99,  tag:'', description:'Faster turnaround on any plan', features:JSON.stringify([]),  is_manual_price:0, is_recurring:0, sort_order:1 },
    { category:'addon', product_key:'sec_hard',     name:'Extra Security Hardening',price:319,tag:'', description:'Monthly security maintenance',  features:JSON.stringify([]),  is_manual_price:0, is_recurring:1, sort_order:2 },
    { category:'addon', product_key:'branding',     name:'Branding Pack',           price:99,  tag:'', description:'Logo, banner, colour scheme',  features:JSON.stringify([]),  is_manual_price:0, is_recurring:0, sort_order:3 },
    { category:'addon', product_key:'vc_tour',      name:'VC Tour Setup',           price:99,  tag:'', description:'Guided voice-channel experience',features:JSON.stringify([]),is_manual_price:0, is_recurring:1, sort_order:4 },
    { category:'addon', product_key:'event_mgr',    name:'Event / Giveaway Manager',price:199, tag:'', description:'Automated events & giveaways',  features:JSON.stringify([]),  is_manual_price:0, is_recurring:1, sort_order:5 },
    { category:'addon', product_key:'priority_sup', name:'Priority Support Extension',price:500,tag:'',description:'Extended VIP support period',  features:JSON.stringify([]),  is_manual_price:0, is_recurring:1, sort_order:6 },
    { category:'addon', product_key:'custom_bot',   name:'Custom Bot',              price:0,   tag:'', description:'Tailored bot — price on request',features:JSON.stringify([]),is_manual_price:1, is_recurring:0, sort_order:7 },
    // Bot Plans
    { category:'bot', product_key:'sec_bot',    name:'Security Bot',      price:7000,  tag:'', description:'Anti-nuke, audit logging, raid protection',         features:JSON.stringify(['Anti-nuke','Audit logging','Raid protection']),              is_manual_price:0, is_recurring:0, sort_order:1 },
    { category:'bot', product_key:'ticket_bot', name:'Ticket Bot',        price:5000,  tag:'', description:'Transcripts, panels, staff roles',                  features:JSON.stringify(['Transcripts','Panel creation','Staff roles']),               is_manual_price:0, is_recurring:0, sort_order:2 },
    { category:'bot', product_key:'util_bot',   name:'Utility Bot',       price:5000,  tag:'', description:'Moderation, info commands, welcome',                features:JSON.stringify(['Moderation','Info commands','Welcome messages']),           is_manual_price:0, is_recurring:0, sort_order:3 },
    { category:'bot', product_key:'adv_util',   name:'Advanced Util Bot', price:10000, tag:'', description:'Economy, leveling, custom commands',                features:JSON.stringify(['Economy','Leveling','Custom commands']),                    is_manual_price:0, is_recurring:0, sort_order:4 },
    { category:'bot', product_key:'music_bot',  name:'Music Bot',         price:3000,  tag:'', description:'High quality audio, playlists, filters',            features:JSON.stringify(['High quality audio','Playlists','Filters']),                is_manual_price:0, is_recurring:0, sort_order:5 },
    { category:'bot', product_key:'full_custom',name:'Fully Custom Bot',  price:0,     tag:'Price on request', description:'Tailored to exact needs',           features:JSON.stringify(['Tailored to exact needs','Dedicated database','Priority support']), is_manual_price:1, is_recurring:0, sort_order:6 },
    // Infrastructure
    { category:'infra', product_key:'hosting',    name:'Hosting Plan',               price:0, tag:'', description:'Managed hosting for your bots',    features:JSON.stringify([]), is_manual_price:1, is_recurring:1, sort_order:1 },
    { category:'infra', product_key:'db_mongo',   name:'Database (MongoDB)',         price:0, tag:'', description:'Cloud MongoDB setup & management',  features:JSON.stringify([]), is_manual_price:1, is_recurring:1, sort_order:2 },
    { category:'infra', product_key:'db_sql',     name:'Database (PostgreSQL/MySQL)',price:0, tag:'', description:'Relational DB setup',               features:JSON.stringify([]), is_manual_price:1, is_recurring:1, sort_order:3 },
    { category:'infra', product_key:'db_supabase',name:'Database (Supabase)',        price:0, tag:'', description:'Supabase backend setup',            features:JSON.stringify([]), is_manual_price:1, is_recurring:1, sort_order:4 },
    { category:'infra', product_key:'lavalink',   name:'Lavalink Server (Music)',    price:0, tag:'', description:'Self-hosted Lavalink instance',     features:JSON.stringify([]), is_manual_price:1, is_recurring:1, sort_order:5 },
    // Custom Scripts
    { category:'scripts', product_key:'vc_joiner',    name:'VC Joiner Script',        price:0, tag:'Custom Quote', description:'Auto-join voice channels on command or schedule', features:JSON.stringify(['Auto VC joining','Schedule support','Configurable delay','Multiple account support']), is_manual_price:1, is_recurring:0, sort_order:1 },
    { category:'scripts', product_key:'msg_sender',   name:'Mass Message Sender',     price:0, tag:'Custom Quote', description:'Automated DM or channel message sending system',  features:JSON.stringify(['Bulk DM support','Channel targeting','Rate-limit safe','Custom messages']), is_manual_price:1, is_recurring:0, sort_order:2 },
    { category:'scripts', product_key:'auto_react',   name:'Auto Reaction Bot',       price:0, tag:'Custom Quote', description:'Automatically react to messages with custom emojis', features:JSON.stringify(['Custom emoji support','Keyword triggers','Multi-server','Configurable speed']), is_manual_price:1, is_recurring:0, sort_order:3 },
    { category:'scripts', product_key:'script_combo', name:'Script Combo Pack',       price:0, tag:'Best Value',   description:'Get VC Joiner + Message Sender + Auto React bundled', features:JSON.stringify(['All 3 scripts included','Priority setup','1 month support','Discounted price']), is_manual_price:1, is_recurring:0, sort_order:4 },
    { category:'scripts', product_key:'script_custom',name:'Custom Script',           price:0, tag:'Custom Quote', description:'Fully custom automation script tailored to your needs', features:JSON.stringify(['Fully custom logic','Source code included','Dedicated support','Unlimited revisions']), is_manual_price:1, is_recurring:0, sort_order:5 },
    // Event Management
    { category:'events', product_key:'event_host',    name:'Event Host Setup',        price:0, tag:'Custom Quote', description:'Complete hosting setup for your Discord events',  features:JSON.stringify(['Stage/VC configuration','Event bot setup','Announcement templates','Countdown timers']), is_manual_price:1, is_recurring:0, sort_order:1 },
    { category:'events', product_key:'event_artist',  name:'Event Artist Booking',    price:0, tag:'Custom Quote', description:'Connect with Discord event artists and performers', features:JSON.stringify(['Artist vetting','Schedule coordination','Performance slots','Post-event recap']), is_manual_price:1, is_recurring:0, sort_order:2 },
    { category:'events', product_key:'event_giveaway',name:'Event Giveaway Management',price:0,tag:'Popular',      description:'Full giveaway setup, management, and winner selection', features:JSON.stringify(['Custom entry requirements','Automated winner picks','Role rewards','Sponsor integration']), is_manual_price:1, is_recurring:0, sort_order:3 },
    { category:'events', product_key:'event_promo',   name:'Event Promo Management',  price:0, tag:'Custom Quote', description:'Promote your event across Discord servers',         features:JSON.stringify(['Cross-server promotion','Graphic design','Announcement copy','Partner outreach']), is_manual_price:1, is_recurring:0, sort_order:4 },
    { category:'events', product_key:'event_full',    name:'Complete Event Package',  price:0, tag:'Best Value',   description:'End-to-end event management from planning to recap', features:JSON.stringify(['Full planning support','Artist + Host','Giveaway + Promo','Post-event report','1 month follow-up']), is_manual_price:1, is_recurring:0, sort_order:5 },
    { category:'events', product_key:'event_custom',  name:'Custom Event Package',    price:0, tag:'Custom Quote', description:'Tailor-made event package for unique requirements',  features:JSON.stringify(['Completely custom','Dedicated event manager','Priority support','Unlimited revisions']), is_manual_price:1, is_recurring:0, sort_order:6 },
    // Joins
    { category:'joins', product_key:'joins_offline',  name:'Offline Members',         price:0, tag:'Custom Quote', description:'Boost your server with offline member joins',       features:JSON.stringify(['Fast delivery','High retention','Safe method','Bulk available']), is_manual_price:1, is_recurring:0, sort_order:1, unit_label:'per 1k' },
    { category:'joins', product_key:'joins_online',   name:'Online Members',          price:0, tag:'Most Popular', description:'Real-looking online members for your server',       features:JSON.stringify(['Appear online','Configurable duration','Gradual drip delivery','Safe and discrete']), is_manual_price:1, is_recurring:0, sort_order:2, unit_label:'per 1k' },
    { category:'joins', product_key:'joins_tokens',   name:'Tokens',                  price:0, tag:'Custom Quote', description:'Discord tokens for automation and testing purposes',features:JSON.stringify(['Verified tokens','Multiple types','Safe sourcing','Replacement guarantee']), is_manual_price:1, is_recurring:0, sort_order:4, unit_label:'per unit' },
]);
console.log('✅ Products synchronized with database.');

// ─── Prepared Statements ──────────────────────────────────────────────────────
const stmts = {
  createUser:      db.prepare(`INSERT INTO users (name, email, password_hash, provider) VALUES (@name, @email, @password_hash, 'local')`),
  upsertOAuthUser: db.prepare(`INSERT INTO users (name, email, provider, provider_id, avatar_url) VALUES (@name, @email, @provider, @provider_id, @avatar_url) ON CONFLICT(email) DO UPDATE SET provider_id=excluded.provider_id, avatar_url=COALESCE(excluded.avatar_url,users.avatar_url), last_login=strftime('%s','now')`),
  findByEmail:     db.prepare(`SELECT * FROM users WHERE email = ?`),
  findById:        db.prepare(`SELECT * FROM users WHERE id = ?`),
  setResetToken:   db.prepare(`UPDATE users SET reset_token=?, reset_token_expires=? WHERE email=?`),
  findByResetToken:db.prepare(`SELECT * FROM users WHERE reset_token=? AND reset_token_expires > strftime('%s','now')`),
  clearResetToken: db.prepare(`UPDATE users SET reset_token=NULL, reset_token_expires=NULL, password_hash=? WHERE id=?`),
  updateLastLogin: db.prepare(`UPDATE users SET last_login=strftime('%s','now') WHERE id=?`),
  listAll:         db.prepare(`SELECT id,name,email,provider,avatar_url,role,phone,is_banned,created_at,last_login FROM users ORDER BY created_at DESC`),
  updateProfile:   db.prepare(`UPDATE users SET name=@name, phone=@phone, avatar_url=@avatar_url, social_links=@social_links WHERE id=@id`),
  setUserStatus:   db.prepare(`UPDATE users SET is_banned=? WHERE id=?`),
};

module.exports = { db, stmts };
