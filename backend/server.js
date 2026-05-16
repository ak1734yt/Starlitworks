require('dotenv').config();
const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const session        = require('express-session');
const passport       = require('passport');
const fs             = require('fs-extra');
const path           = require('path');
const bcrypt         = require('bcryptjs');
const jwt            = require('jsonwebtoken');
const crypto         = require('crypto');
const speakeasy      = require('speakeasy');
const QRCode         = require('qrcode');
const { stmts, db }  = require('./db');
const { startNotificationService } = require('./notifications');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('./mailer');

// ─── OAuth Strategies ─────────────────────────────────────────────────────────
const GOOGLE_OK    = !!(process.env.GOOGLE_CLIENT_ID    && process.env.GOOGLE_CLIENT_SECRET);
const DISCORD_OK   = !!(process.env.DISCORD_CLIENT_ID   && process.env.DISCORD_CLIENT_SECRET);
const MICROSOFT_OK = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
const APPLE_OK     = !!(process.env.APPLE_CLIENT_ID     && process.env.APPLE_TEAM_ID);

const BASE_URL     = `http://localhost:${process.env.PORT || 5000}`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_SECRET   = process.env.JWT_SECRET   || 'ssw_dev_secret_change_me';

function oauthCallback(provider) {
  return (at, rt, profile, done) => {
    try {
      const email  = profile.emails?.[0]?.value || `${profile.id}@${provider}.oauth`;
      const name   = profile.displayName || profile.username || 'User';
      const avatar = profile.photos?.[0]?.value || null;
      stmts.upsertOAuthUser.run({ name, email, provider, provider_id: profile.id, avatar_url: avatar });
      const user = stmts.findByEmail.get(email);
      stmts.updateLastLogin.run(user.id);
      return done(null, user);
    } catch (err) { return done(err); }
  };
}

if (GOOGLE_OK) {
  const S = require('passport-google-oauth20').Strategy;
  passport.use(new S({ clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, callbackURL: `${BASE_URL}/api/auth/google/callback` }, oauthCallback('google')));
}
if (DISCORD_OK) {
  const S = require('passport-discord').Strategy;
  passport.use(new S({ clientID: process.env.DISCORD_CLIENT_ID, clientSecret: process.env.DISCORD_CLIENT_SECRET, callbackURL: `${BASE_URL}/api/auth/discord/callback`, scope: ['identify', 'email'] }, oauthCallback('discord')));
}
if (MICROSOFT_OK) {
  const S = require('passport-microsoft').Strategy;
  passport.use(new S({ clientID: process.env.MICROSOFT_CLIENT_ID, clientSecret: process.env.MICROSOFT_CLIENT_SECRET, callbackURL: `${BASE_URL}/api/auth/microsoft/callback`, scope: ['user.read'] }, oauthCallback('microsoft')));
}
if (APPLE_OK) {
  try {
    const S = require('passport-apple');
    passport.use(new S({ clientID: process.env.APPLE_CLIENT_ID, teamID: process.env.APPLE_TEAM_ID, keyID: process.env.APPLE_KEY_ID, privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH, callbackURL: `${BASE_URL}/api/auth/apple/callback` },
      (at, rt, idToken, profile, done) => {
        const email = idToken?.email || `${idToken?.sub}@apple.oauth`;
        stmts.upsertOAuthUser.run({ name: 'Apple User', email, provider: 'apple', provider_id: idToken?.sub, avatar_url: null });
        const user = stmts.findByEmail.get(email);
        stmts.updateLastLogin.run(user.id);
        done(null, user);
      }));
  } catch (e) { console.warn('⚠️  Apple strategy error:', e.message); }
}

passport.serializeUser((u, done) => done(null, u.id));
passport.deserializeUser((id, done) => done(null, stmts.findById.get(id) || false));

// ─── App ──────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;
const INVOICES_DIR = path.join(__dirname, 'invoices');

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false })); // CSP and CORP off so frontend can call freely in dev
app.use(cors({ origin: [FRONTEND_URL, 'http://127.0.0.1:5173', 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(session({ secret: process.env.SESSION_SECRET || 'ssw_session_dev', resave: false, saveUninitialized: false, cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 } }));
app.use(passport.initialize());
app.use(passport.session());
fs.ensureDirSync(INVOICES_DIR);
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');
fs.ensureDirSync(UPLOADS_DIR);
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Rate Limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, max: 120,
  message: { error: 'Too many requests.' },
});
app.use('/api/auth', authLimiter);
app.use('/api',      generalLimiter);

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar_url, two_factor_enabled: !!user.two_factor_enabled }, JWT_SECRET, { expiresIn: '7d' });
}
function safeUser(u) {
  const { password_hash, reset_token, reset_token_expires, two_factor_secret, ...safe } = u;
  return safe;
}
function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Token invalid or expired' }); }
}
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ error: 'Admin access required.' });
    next();
  });
}
function requireManager(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'manager') return res.status(403).json({ error: 'Manager access required.' });
    next();
  });
}
async function sendDiscordWebhook(url, payload) {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) { console.error('Failed to send Discord webhook', e); }
}

function logActivity(userId, action, details = '') {
  try {
    const user = stmts.findById.get(userId);
    const adminName = user ? user.name : 'Unknown';
    const logStr = `[${adminName}] ${details}`;
    db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(userId, action, logStr);
    
    const colorMap = { BAN_USER: 16711680, UNBAN_USER: 65280, CREATE_PRODUCT: 3447003, DELETE_PRODUCT: 16711680, UPDATE_PRICE: 16776960 };
    sendDiscordWebhook(process.env.DISCORD_WEBHOOK_LOGS, {
      embeds: [{
        title: `Admin Action: ${action}`,
        description: logStr,
        color: colorMap[action] || 3447003,
        timestamp: new Date().toISOString()
      }]
    });
  } catch (e) { console.error('Failed to log activity', e); }
}

function createNotification(userId, title, message, type = 'info') {
  try {
    db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(userId, title, message, type);
  } catch (e) { console.error('Failed to create notification', e); }
}

function calculateRiskScore(data) {
  let score = 0;
  const flags = [];
  
  // 1. Data Center / Proxy Detection (Common strings in 'org')
  const dcKeywords = ['hosting', 'google', 'amazon', 'cloud', 'data center', 'ovh', 'digitalocean', 'proxy', 'vpn', 'vps'];
  const org = (data.org || '').toLowerCase();
  if (dcKeywords.some(k => org.includes(k))) {
    score += 40;
    flags.push('DATA_CENTER_IP');
  }

  // 2. Location Mismatch (Compare IP country with user settings if available)
  // (Simplified: if GPS is denied but IP is from high-risk country, add score)
  
  // 3. Multi-Account Detection
  if (data.ip) {
    const crossover = db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM analytics_logs WHERE ip = ? AND user_id IS NOT NULL').get(data.ip).count;
    if (crossover > 1) {
      score += 30;
      flags.push('MULTI_ACCOUNT_CROSSOVER');
    }
  }

  // 4. GPS Spoofer / Denial
  if (!data.lat) {
    score += 10;
    flags.push('GEOLOCATION_DENIED');
  }

  return { score, flags };
}
async function sendWhatsAppNotification(orderId, senderName, content) {
  try {
    const rows = db.prepare('SELECT * FROM site_settings WHERE key IN (\'whatsapp_enabled\', \'whatsapp_number\', \'whatsapp_api_key\')').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);

    if (settings.whatsapp_enabled !== 'true' || !settings.whatsapp_number || !settings.whatsapp_api_key) return;

    const message = `*New Client Message (Order #${orderId})*\nFrom: ${senderName}\nMessage: ${content}\n\nReply here: ${FRONTEND_URL}/manager?tab=payments`;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${settings.whatsapp_number}&text=${encodeURIComponent(message)}&apikey=${settings.whatsapp_api_key}`;
    
    await fetch(url);
    console.log(`WhatsApp notification sent to ${settings.whatsapp_number}`);
  } catch (e) {
    console.error('Failed to send WhatsApp notification', e);
  }
}

function validate(req, res, next) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
  next();
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/signup',
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters.'),
  validate,
  async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (stmts.findByEmail.get(email)) return res.status(409).json({ error: 'An account with this email already exists.' });
      const hash = await bcrypt.hash(password, 12);
      stmts.createUser.run({ name, email, password_hash: hash });
      const user = stmts.findByEmail.get(email);
      stmts.updateLastLogin.run(user.id);
      sendWelcomeEmail(name, email).catch(console.error);
      res.status(201).json({ token: makeToken(user), user: safeUser(user) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
  }
);

app.post('/api/auth/login',
  body('email').isEmail().normalizeEmail().withMessage('Invalid email.'),
  body('password').notEmpty().withMessage('Password required.'),
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = stmts.findByEmail.get(email);
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      if (user.is_banned) return res.status(403).json({ error: 'Your account has been banned.' });

      // 2FA Check
      if (user.two_factor_enabled) {
        return res.json({ 
          two_factor_required: true, 
          userId: user.id,
          message: 'Two-factor authentication required' 
        });
      }

      const token = makeToken(user);
      res.json({ token, user: safeUser(user) });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

app.post('/api/auth/login/2fa', authLimiter, async (req, res) => {
  const { userId, code } = req.body;
  try {
    const user = stmts.findById.get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code
    });

    if (!verified) return res.status(401).json({ error: 'Invalid 2FA code' });

    const token = makeToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/2fa/setup', requireAuth, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `StarlitSiegeWorks (${req.user.email})` });
    db.prepare('UPDATE users SET two_factor_secret = ? WHERE id = ?').run(secret.base32, req.user.id);
    
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qrCodeUrl, secret: secret.base32 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/2fa/verify', requireAuth, async (req, res) => {
  const { code } = req.body;
  try {
    const user = stmts.findById.get(req.user.id);
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code
    });

    if (verified) {
      db.prepare('UPDATE users SET two_factor_enabled = 1 WHERE id = ?').run(req.user.id);
      logActivity(req.user.id, 'ENABLE_2FA', 'User enabled 2FA');
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid verification code' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/2fa/disable', requireAuth, async (req, res) => {
  const { code } = req.body;
  try {
    const user = stmts.findById.get(req.user.id);
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code
    });

    if (verified) {
      db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?').run(req.user.id);
      logActivity(req.user.id, 'DISABLE_2FA', 'User disabled 2FA');
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid verification code' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/forgot-password',
  body('email').isEmail().normalizeEmail().withMessage('Invalid email.'),
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = stmts.findByEmail.get(email);
      if (user && user.provider === 'local') {
        const token   = crypto.randomBytes(32).toString('hex');
        const expires = Math.floor(Date.now() / 1000) + 3600;
        stmts.setResetToken.run(token, expires, email);
        const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
        console.log(`🔑 Reset link: ${resetLink}`);
        await sendPasswordResetEmail(email, resetLink);
      }
      res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
  }
);

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = stmts.findById.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: safeUser(user) });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ google: GOOGLE_OK, discord: DISCORD_OK, microsoft: MICROSOFT_OK, apple: APPLE_OK });
});

// OAuth routes
if (GOOGLE_OK) {
  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/api/auth/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }), (req, res) => res.redirect(`${FRONTEND_URL}/login?token=${makeToken(req.user)}`));
}
if (DISCORD_OK) {
  app.get('/api/auth/discord', passport.authenticate('discord'));
  app.get('/api/auth/discord/callback', passport.authenticate('discord', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }), (req, res) => res.redirect(`${FRONTEND_URL}/login?token=${makeToken(req.user)}`));
}
if (MICROSOFT_OK) {
  app.get('/api/auth/microsoft', passport.authenticate('microsoft'));
  app.get('/api/auth/microsoft/callback', passport.authenticate('microsoft', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }), (req, res) => res.redirect(`${FRONTEND_URL}/login?token=${makeToken(req.user)}`));
}
if (APPLE_OK) {
  app.get('/api/auth/apple', passport.authenticate('apple'));
  app.get('/api/auth/apple/callback', passport.authenticate('apple', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }), (req, res) => res.redirect(`${FRONTEND_URL}/login?token=${makeToken(req.user)}`));
}

// ─── Admin — Promote first user helper ────────────────────────────────────────
app.post('/api/auth/make-admin',
  body('secret').equals(process.env.ADMIN_SETUP_SECRET || 'ssw_admin_setup').withMessage('Invalid secret.'),
  body('email').isEmail().normalizeEmail(),
  validate,
  (req, res) => {
    const user = stmts.findByEmail.get(req.body.email);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
    res.json({ message: `${user.name} is now an admin.` });
  }
);

// ─── Admin API ────────────────────────────────────────────────────────────────
app.get('/api/admin/clients', requireAdmin, (_req, res) => res.json(stmts.listAll.all()));

// ─── Manager API ──────────────────────────────────────────────────────────────
app.get('/api/manager/logs', requireManager, (_req, res) => {
  const rows = db.prepare('SELECT l.*, u.name as user_name FROM activity_logs l JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC').all();
  res.json(rows);
});
app.get('/api/manager/users', requireManager, (_req, res) => res.json(stmts.listAll.all()));
app.put('/api/manager/users/:id/role', requireManager, 
  body('role').isIn(['client', 'admin', 'manager']), validate,
  (req, res) => {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(req.body.role, req.params.id);
    logActivity(req.user.id, 'CHANGE_ROLE', `Changed user ${req.params.id} role to ${req.body.role}`);
    res.json({ success: true });
});
app.get('/api/manager/prices', requireManager, (_req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY category, sort_order').all();
  res.json(rows);
});
app.post('/api/manager/prices', requireManager,
  body('name').notEmpty(),
  body('category').notEmpty(),
  body('price').isFloat({ min: 0 }),
  validate,
  (req, res) => {
    const { name, category, price, tag, description, features, is_manual_price, is_recurring, unit_label } = req.body;
    const product_key = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    db.prepare('INSERT INTO products (category, product_key, name, price, tag, description, features, is_manual_price, is_recurring, unit_label) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
      category, product_key, name, price, tag || '', description || '', JSON.stringify(features || []), is_manual_price ? 1 : 0, is_recurring ? 1 : 0, unit_label || ''
    );
    logActivity(req.user.id, 'CREATE_PRODUCT', `Created product ${name}`);
    res.status(201).json({ success: true });
  }
);
app.delete('/api/manager/prices/:id', requireManager, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'DELETE_PRODUCT', `Deleted product ID ${req.params.id}`);
  res.json({ success: true });
});
app.put('/api/manager/prices/:id', requireManager,
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  validate,
  (req, res) => {
    const { price, tag, description, is_manual_price, unit_label } = req.body;
    db.prepare('UPDATE products SET price = ?, tag = ?, description = ?, is_manual_price = ?, unit_label = ?, updated_at = strftime(\'%s\',\'now\') WHERE id = ?').run(price, tag || '', description || '', is_manual_price ? 1 : 0, unit_label || '', req.params.id);
    logActivity(req.user.id, 'UPDATE_PRICE', `Updated product ${req.params.id} price`);
    res.json({ success: true });
  }
);

app.get('/api/site/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM site_settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.post('/api/site/settings', requireManager, (req, res) => {
  const settings = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) {
      upsert.run(key, value);
    }
  });
  transaction(settings);
  logActivity(req.user.id, 'UPDATE_SITE_SETTINGS', 'Updated website content');
  res.json({ success: true });
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT o.*, u.name AS client_name, u.email AS client_email FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC').all();
  res.json(rows);
});
app.put('/api/admin/orders/:id', requireAdmin,
  body('status').isIn(['pending','quoted','accepted','payment_pending','in_progress','rejected','completed']).withMessage('Invalid status.'),
  validate,
  (req, res) => {
    const { status, quoted_price, admin_notes } = req.body;
    const accepted_by = (status === 'accepted' || status === 'quoted') ? req.user.id : null;
    db.prepare('UPDATE orders SET status = ?, quoted_price = ?, admin_notes = ?, accepted_by = COALESCE(?, accepted_by), updated_at = strftime(\'%s\',\'now\') WHERE id = ?').run(status, quoted_price ?? null, admin_notes || '', accepted_by, req.params.id);
    logActivity(req.user.id, 'UPDATE_ORDER', `Updated order ${req.params.id} to status ${status}`);
    sendDiscordWebhook(process.env.DISCORD_WEBHOOK_ORDERS, {
      embeds: [{
        title: `Order Status Updated: #${req.params.id}`,
        description: `Status changed to: **${status}**\nNotes: ${admin_notes || 'None'}`,
        color: 16776960,
        timestamp: new Date().toISOString()
      }]
    });
    res.json({ success: true });
  }
);
app.post('/api/admin/orders/:id/negotiation', requireAdmin, validate, (req, res) => {
  const { negotiation_status } = req.body;
  // If admin accepts/rejects negotiation
  db.prepare('UPDATE orders SET negotiation_status = ?, updated_at = strftime(\'%s\',\'now\') WHERE id = ?').run(negotiation_status, req.params.id);
  res.json({ success: true });
});

// ─── Orders (client-facing) ───────────────────────────────────────────────────
app.post('/api/orders', requireAuth,
  body('service_id').notEmpty().withMessage('Service ID required.'),
  body('service_name').trim().isLength({ min: 2 }).withMessage('Service name required.'),
  validate,
  (req, res) => {
    const { 
      service_id, service_name, server_link, description, timeline, discord_username,
      quoted_price, tax_rate, cgst, sgst, total_amount, payment_plan 
    } = req.body;
    
    const result = db.prepare(`
      INSERT INTO orders (
        user_id, service_id, service_name, server_link, description, timeline, discord_username,
        quoted_price, tax_rate, cgst, sgst, total_amount, payment_plan
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      req.user.id, service_id, service_name, server_link || '', description || '', timeline || '', discord_username || '',
      quoted_price || null, tax_rate || 0, cgst || 0, sgst || 0, total_amount || 0, payment_plan || 'full'
    );
    const orderId = result.lastInsertRowid;
    sendDiscordWebhook(process.env.DISCORD_WEBHOOK_ORDERS, {
      embeds: [{
        title: `New Service Request: #${orderId}`,
        description: `**Client ID:** ${req.user.id}\n**Discord Username:** ${discord_username || 'N/A'}\n**Service:** ${service_name}\n**Timeline:** ${timeline || 'Flexible'}\n**Description:** ${description || 'N/A'}`,
        color: 3447003,
        timestamp: new Date().toISOString()
      }]
    });
    res.status(201).json({ success: true, order_id: orderId });
  }
);
app.get('/api/orders/mine', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(rows);
});
app.get('/api/orders/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role === 'client' && order.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json(order);
});
app.post('/api/orders/:id/negotiate', requireAuth, validate, (req, res) => {
  const { negotiated_price, negotiation_reason } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE orders SET negotiated_price = ?, negotiation_reason = ?, negotiation_status = ?, updated_at = strftime(\'%s\',\'now\') WHERE id = ?').run(negotiated_price, negotiation_reason, 'pending', req.params.id);
  res.json({ success: true });
});
app.post('/api/orders/:id/accept', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE orders SET status = ?, updated_at = strftime(\'%s\',\'now\') WHERE id = ?').run('accepted', req.params.id);
  res.json({ success: true });
});

app.post('/api/orders/:id/payment-proof', requireAuth, (req, res) => {
  const { transaction_id, base64Screenshot, payment_method } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  let screenshotUrl = '';
  if (base64Screenshot) {
    const match = base64Screenshot.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (match) {
      const ext = match[1].split('/')[1] || 'png';
      const filename = `payment_${req.params.id}_${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(match[2], 'base64'));
      screenshotUrl = `/uploads/${filename}`;
    }
  }

  db.prepare(`
    UPDATE orders 
    SET status = 'payment_pending', 
        payment_status = 'pending',
        payment_method = ?,
        transaction_id = ?,
        payment_screenshot = ?,
        payment_plan = COALESCE(?, payment_plan),
        payment_proof_submitted_at = strftime('%s','now'),
        updated_at = strftime('%s','now')
    WHERE id = ?
  `).run(payment_method || 'manual', transaction_id || '', screenshotUrl, req.body.payment_plan || null, req.params.id);

  sendDiscordWebhook(process.env.DISCORD_WEBHOOK_PAYMENT, {
    embeds: [{
      title: `Payment Proof Submitted for Order #${req.params.id}`,
      description: `**Method:** ${payment_method}\n**Transaction ID:** ${transaction_id || 'N/A'}\n**Screenshot:** ${screenshotUrl ? `${FRONTEND_URL}${screenshotUrl}` : 'None'}`,
      color: 65280,
      timestamp: new Date().toISOString()
    }]
  });

  res.json({ success: true });
});

app.put('/api/admin/orders/:id/verify-payment', requireAdmin, (req, res) => {
  const { approved } = req.body;
  const status = approved ? 'in_progress' : 'accepted';
  const payment_status = approved ? 'completed' : 'pending';
  
  db.prepare(`
    UPDATE orders 
    SET status = ?, 
        payment_status = ?,
        updated_at = strftime('%s','now')
    WHERE id = ?
  `).run(status, payment_status, req.params.id);

  logActivity(req.user.id, approved ? 'APPROVE_PAYMENT' : 'REJECT_PAYMENT', `Order ${req.params.id}`);
  res.json({ success: true });
});

app.put('/api/admin/orders/:id/vault', requireAdmin, (req, res) => {
  const { vault_data } = req.body;
  db.prepare('UPDATE orders SET vault_data = ?, updated_at = strftime(\'%s\',\'now\') WHERE id = ?').run(JSON.stringify(vault_data || {}), req.params.id);
  const order = db.prepare('SELECT user_id FROM orders WHERE id = ?').get(req.params.id);
  if (order) createNotification(order.user_id, 'Vault Updated', `New assets have been added to Order #${req.params.id}`, 'success');
  res.json({ success: true });
});

app.get('/api/notifications', requireAuth, (req, res) => {
  const notes = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json(notes);
});

app.put('/api/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', timestamp: Date.now() });
});

// ─── Prices (public — no price tags for clients, just feature lists) ──────────
app.get('/api/prices', (_req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY category, sort_order").all();
  // Parse features JSON
  res.json(rows.map(r => ({ ...r, features: JSON.parse(r.features || '[]') })));
});

// ─── Chat ─────────────────────────────────────────────────────────────────────
app.get('/api/chat/:orderId', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role === 'client' && order.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  
  const messages = db.prepare('SELECT c.*, u.name, u.role, u.avatar_url FROM chat_messages c JOIN users u ON c.user_id = u.id WHERE c.order_id = ? ORDER BY c.created_at ASC').all(req.params.orderId);
  res.json(messages);
});
app.post('/api/chat/:orderId', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role === 'client' && order.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  
  let { content, message_type } = req.body;
  if (!message_type) message_type = 'text';

  if ((message_type === 'media' || message_type === 'voice') && req.body.base64Data) {
    // Process base64 file
    const match = req.body.base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (match) {
      const ext = match[1].split('/')[1] || 'bin';
      const filename = `chat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(match[2], 'base64'));
      content = `/uploads/${filename}`;
    }
  }

  const result = db.prepare('INSERT INTO chat_messages (order_id, user_id, message_type, content) VALUES (?, ?, ?, ?)').run(req.params.orderId, req.user.id, message_type, content);
  const newMessage = db.prepare('SELECT c.*, u.name, u.role, u.avatar_url FROM chat_messages c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(result.lastInsertRowid);
  
  if (req.user.role === 'client') {
    sendDiscordWebhook(process.env.DISCORD_WEBHOOK_CHAT, {
      embeds: [{
        title: `New Chat Message (Order #${req.params.orderId})`,
        description: `**From:** ${req.user.name} (CLIENT)\n**Message:** ${content}`,
        color: 3447003,
        timestamp: new Date().toISOString()
      }]
    });
    sendWhatsAppNotification(req.params.orderId, req.user.name, content);
  } else {
    sendDiscordWebhook(process.env.DISCORD_WEBHOOK_CHAT, {
      embeds: [{
        title: `New Admin Reply (Order #${req.params.orderId})`,
        description: `**From:** ${req.user.name} (${req.user.role.toUpperCase()})\n**Message:** ${content}`,
        color: 16776960,
        timestamp: new Date().toISOString()
      }]
    });
  }

  res.status(201).json(newMessage);
});

// ─── Coupons ──────────────────────────────────────────────────────────────────
app.get('/api/coupons/:code', requireAuth, (req, res) => {
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE').get(req.params.code);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  if (coupon.used_count >= coupon.max_uses) return res.status(400).json({ error: 'Coupon usage limit reached' });
  if (coupon.expires_at && coupon.expires_at < Math.floor(Date.now() / 1000)) return res.status(400).json({ error: 'Coupon expired' });
  res.json(coupon);
});
app.post('/api/manager/coupons', requireManager, validate, (req, res) => {
  let { code, discount_type, discount_value, max_uses, expires_at } = req.body;
  if (!code) {
    code = 'STYLIT_' + crypto.randomBytes(4).toString('hex').toUpperCase();
  } else if (!code.startsWith('STYLIT_')) {
    code = 'STYLIT_' + code.toUpperCase();
  }
  db.prepare('INSERT INTO coupons (code, discount_type, discount_value, max_uses, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(code, discount_type, discount_value, max_uses, expires_at || null, req.user.id);
  logActivity(req.user.id, 'CREATE_COUPON', `Created coupon ${code}`);
  res.status(201).json({ success: true, code });
});

// ─── Stats & Graphs ───────────────────────────────────────────────────────────
app.get('/api/manager/stats/activity', requireManager, (req, res) => {
  const rows = db.prepare(`
    SELECT date(created_at, 'unixepoch') as date, COUNT(*) as count 
    FROM activity_logs 
    GROUP BY date 
    ORDER BY date DESC LIMIT 30
  `).all();
  res.json(rows);
});
app.get('/api/public/stats', (req, res) => {
  const feedbackCount = db.prepare("SELECT COUNT(*) as c FROM feedbacks WHERE status = 'approved'").get().c;
  const orderCount = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'completed'").get().c;
  res.json({ 
    total_clients: 20 + feedbackCount, // Initial 20 + real
    rating: 4.9,
    completed_projects: 50 + orderCount
  });
});

// ─── Profile & User Management ────────────────────────────────────────────────
app.put('/api/auth/profile', requireAuth, (req, res) => {
  const { name, phone, avatar_url, social_links, gender, location } = req.body;
  try {
    db.prepare('UPDATE users SET name=?, phone=?, avatar_url=?, social_links=?, gender=?, location=? WHERE id=?')
      .run(name, phone, avatar_url, JSON.stringify(social_links || {}), gender || '', location || '', req.user.id);
    const updated = stmts.findById.get(req.user.id);
    res.json({ success: true, user: safeUser(updated) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/manager/users/:id', requireManager, (req, res) => {
  const user = stmts.findById.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ?').all(req.params.id);
  const activity = db.prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...safeUser(user), orders, activity });
});
app.put('/api/manager/users/:id/status', requireManager, (req, res) => {
  const { is_banned } = req.body;
  stmts.setUserStatus.run(is_banned ? 1 : 0, req.params.id);
  logActivity(req.user.id, is_banned ? 'BAN_USER' : 'UNBAN_USER', `User ID ${req.params.id}`);
  res.json({ success: true });
});

app.post('/api/analytics/track', (req, res) => {
  try {
    const { ip, city, region, country, org, userAgent, platform, screen, timezone, lat, lon, accuracy } = req.body;
    let userId = null;
    let userName = 'Anonymous';
    
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) {
      try { 
        const u = jwt.verify(h.slice(7), JWT_SECRET); 
        userId = u.id;
        const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
        if (user) userName = user.name;
      } catch(e) {}
    }

    // 1. Calculate Fraud Score
    const { score, flags } = calculateRiskScore(req.body);

    // 2. Store in Database
    db.prepare(`
      INSERT INTO analytics_logs 
      (user_id, ip, city, region, country, org, browser, os, screen, timezone, lat, lon, accuracy, risk_score, risk_flags) 
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(userId, ip, city, region, country, org, userAgent, platform, screen, timezone, lat, lon, accuracy, score, JSON.stringify(flags));

    // 2. Physical Log File (Vaibhav Log Storage)
    const logEntry = JSON.stringify({ 
      timestamp: new Date().toISOString(), 
      user: userName, userId, ip, city, region, country, 
      coords: lat ? { lat, lon, accuracy } : 'Denied',
      device: { os: platform, browser: userAgent, screen }
    }) + '\n';
    
    const LOG_FILE = path.join(DATA_DIR, 'v_logs.jsonl');
    fs.appendFile(LOG_FILE, logEntry).catch(e => console.error("File log failed:", e));

    // 3. Secretly shift to Discord via Webhook (Vaibhav Configuration)
    const logWebhook = process.env.DISCORD_WEBHOOK_VAIBHAV || process.env.DISCORD_WEBHOOK_LOGS;
    if (logWebhook) {
      const embed = {
        title: `📍 New User Pulse: ${userName}`,
        color: 0x7c3aed,
        fields: [
          { name: "👤 User", value: userName, inline: true },
          { name: "🌐 IP", value: ip || 'N/A', inline: true },
          { name: "🌍 Location", value: `${city}, ${region}, ${country}`, inline: false },
          { name: "📡 GPS", value: lat ? `[${lat}, ${lon}] (±${accuracy}m)` : "Denied", inline: true },
          { name: "💻 OS", value: platform || 'N/A', inline: true },
          { name: "🖥️ Screen", value: screen || 'N/A', inline: true },
        ],
        footer: { text: `System Pulse | Timezone: ${timezone}` },
        timestamp: new Date().toISOString()
      };
      
      fetch(logWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      }).catch(e => console.error("Webhook failed:", e));
    }

    res.json({ success: true, risk_score: score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics', requireAdmin, (req, res) => {
  try {
    const logs = db.prepare('SELECT a.*, u.name as user_name FROM analytics_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 500').all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Portfolio CRUD ───────────────────────────────────────────────────────────
app.get('/api/portfolio', (req, res) => {
  res.json(db.prepare('SELECT * FROM portfolio ORDER BY sort_order ASC').all());
});
app.post('/api/manager/portfolio', requireManager, (req, res) => {
  const { title, description, banner_url, member_count, link, category } = req.body;
  db.prepare('INSERT INTO portfolio (title, description, banner_url, member_count, link, category) VALUES (?,?,?,?,?,?)').run(title, description || '', banner_url || '', member_count || '0', link || '', category || 'custom');
  res.status(201).json({ success: true });
});
app.delete('/api/manager/portfolio/:id', requireManager, (req, res) => {
  db.prepare('DELETE FROM portfolio WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Admin Invoice Management ─────────────────────────────────────────────────
app.post('/api/admin/invoices/user', requireAdmin, async (req, res) => {
  try {
    const inv = { ...req.body, savedAt: new Date().toISOString(), assignedByAdmin: true };
    if (!inv.id) inv.id = `ADM-${Date.now()}`;
    if (!inv.invoiceNumber) inv.invoiceNumber = inv.id;
    
    // Default organization info if missing
    if (!inv.org) {
      inv.org = {
        name: 'Starlit Siege Works',
        emails: ['support@starlitsiegeworks.com'],
        phone: '+91 9876543210'
      };
    }

    await fs.writeJson(path.join(INVOICES_DIR, `${inv.id}.json`), inv, { spaces: 2 });
    await fs.writeFile(path.join(INVOICES_DIR, `${inv.id}.txt`), formatInvoiceTxt(inv), 'utf8');
    logActivity(req.user.id, 'CREATE_USER_INVOICE', `Invoice ${inv.id} for user ${inv.userId || 'N/A'}`);
    res.status(201).json({ success: true, id: inv.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/invoices/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.role === 'client' && req.user.id !== parseInt(userId)) return res.status(403).json({ error: 'Forbidden' });
    const files = await fs.readdir(INVOICES_DIR);
    const invoices = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const inv = await fs.readJson(path.join(INVOICES_DIR, f));
      if (inv.userId === userId || inv.userId === parseInt(userId)) invoices.push(inv);
    }
    invoices.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    res.json(invoices);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/invoices', requireAdmin, async (req, res) => {
  try {
    const files = await fs.readdir(INVOICES_DIR);
    const invoices = [];
    for (const f of files) {
      if (f.endsWith('.json')) {
        invoices.push(await fs.readJson(path.join(INVOICES_DIR, f)));
      }
    }
    invoices.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    res.json(invoices);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


app.patch('/api/invoices/:id/installment', requireAdmin, async (req, res) => {
  try {
    const { index, paid } = req.body;
    const p = path.join(INVOICES_DIR, `${req.params.id}.json`);
    if (!await fs.pathExists(p)) return res.status(404).json({ error: 'Invoice not found' });
    
    const inv = await fs.readJson(p);
    if (!inv.installments || !inv.installments[index]) return res.status(400).json({ error: 'Invalid installment index' });
    
    inv.installments[index].paid = paid;
    await fs.writeJson(p, inv, { spaces: 2 });
    await fs.writeFile(path.join(INVOICES_DIR, `${inv.id}.txt`), formatInvoiceTxt(inv), 'utf8');
    
    logActivity(req.user.id, 'UPDATE_INSTALLMENT', `Invoice ${inv.id} installment ${index} set to ${paid}`);
    res.json({ success: true, invoice: inv });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/invoices/:id', requireAdmin, async (req, res) => {
  try {
    const jsonP = path.join(INVOICES_DIR, `${req.params.id}.json`);
    const txtP = path.join(INVOICES_DIR, `${req.params.id}.txt`);
    if (await fs.pathExists(jsonP)) await fs.remove(jsonP);
    if (await fs.pathExists(txtP)) await fs.remove(txtP);
    logActivity(req.user.id, 'DELETE_INVOICE', `Invoice ${req.params.id}`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/invoices/:id/download', requireAuth, async (req, res) => {
  try {
    const p = path.join(INVOICES_DIR, `${req.params.id}.txt`);
    if (!await fs.pathExists(p)) return res.status(404).json({ error: 'Invoice text file not found' });
    
    // Security check: if client, they can only download their own invoice
    const invData = await fs.readJson(path.join(INVOICES_DIR, `${req.params.id}.json`));
    if (req.user.role === 'client' && invData.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.download(p, `Invoice_${req.params.id}.txt`);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Feedbacks ────────────────────────────────────────────────────────────────
app.get('/api/feedbacks', (req, res) => {
  const rows = db.prepare('SELECT f.*, u.name, u.avatar_url FROM feedbacks f JOIN users u ON f.user_id = u.id WHERE f.status = ? ORDER BY f.created_at DESC').all('approved');
  res.json(rows);
});
app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
  try {
    const orderId = req.params.id;
    // Delete related messages first
    db.prepare('DELETE FROM chat_messages WHERE order_id = ?').run(orderId);
    // Delete the order
    db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
    
    logActivity(req.user.id, 'DELETE_ORDER', `Deleted order #${orderId}`);
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/admin/feedbacks', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT f.*, u.name FROM feedbacks f JOIN users u ON f.user_id = u.id ORDER BY f.created_at DESC').all();
  res.json(rows);
});
app.post('/api/feedbacks', requireAuth, validate, (req, res) => {
  const { rating, comment } = req.body;
  db.prepare('INSERT INTO feedbacks (user_id, rating, comment) VALUES (?, ?, ?)').run(req.user.id, rating, comment || '');
  res.status(201).json({ success: true });
});
app.put('/api/admin/feedbacks/:id', requireAdmin, validate, (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'
  db.prepare('UPDATE feedbacks SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// ─── Invoice helpers ──────────────────────────────────────────────────────────
function formatInvoiceTxt(inv) {
  const sep = '='.repeat(70), line = '-'.repeat(70);
  const currency = inv.currency || '₹';
  let t = `${sep}\n                    STARLIT SIEGE WORKS - INVOICE\n${sep}\n`;
  t += `Invoice No   : ${inv.invoiceNumber || inv.id}\nDate         : ${inv.invoiceDate}\nPayment Type : ${inv.paymentType === 'installment' ? 'Monthly Installments' : 'One-Time Payment'}\n${line}\n`;
  
  const org = inv.org || { name: 'Starlit Siege Works', emails: ['support@starlitsiegeworks.com'], phone: '+91 0000000000' };
  t += `FROM:\n  ${org.name} | ${org.emails?.[0] || 'N/A'} | ${org.phone || 'N/A'}\n${line}\n`;
  
  const client = inv.client || { name: 'Valued Client' };
  t += `TO:\n  ${client.name} | ${client.serverName || 'N/A'} | GSTIN: ${client.gstin || 'N/A'}\n${line}\n`;
  
  t += `LINE ITEMS:\n${'Description'.padEnd(40)} ${'Qty'.padStart(5)} ${'Rate'.padStart(12)} ${'Total'.padStart(12)}\n${'-'.repeat(72)}\n`;
  inv.items?.forEach(i => { 
    const qty = i.qty || 1;
    const rate = i.amount || i.rate || 0;
    const total = qty * rate;
    t += `${(i.desc || i.description || 'Item').padEnd(40)} ${String(qty).padStart(5)} ${String(rate).padStart(12)} ${(currency + total).padStart(12)}\n`; 
  });
  
  t += `${line}\n${'Subtotal'.padEnd(58)} ${(currency + (inv.subtotal || 0)).padStart(12)}\n`;
  if (inv.discountAmount > 0) t += `${'Discount'.padEnd(58)} ${('-' + currency + inv.discountAmount).padStart(12)}\n`;
  if (inv.taxTotal > 0) t += `${'Tax'.padEnd(58)} ${(currency + inv.taxTotal).padStart(12)}\n`;
  t += `${'GRAND TOTAL'.padEnd(58)} ${(currency + (inv.grandTotal || 0)).padStart(12)}\n${sep}\n`;
  
  if (inv.paymentType === 'installment' && inv.installments) {
    t += `PAYMENT SCHEDULE:\n${'Month'.padEnd(20)} ${'Amount'.padEnd(20)} Status\n${'-'.repeat(52)}\n`;
    inv.installments.forEach(i => { t += `${i.month.padEnd(20)} ${(currency + i.amount.toFixed(2)).padEnd(20)} ${i.paid ? 'PAID' : 'PENDING'}\n`; });
    t += `${sep}\n`;
  }
  if (inv.notes) t += `NOTES:\n${inv.notes}\n${sep}\n`;
  t += `Generated on: ${new Date().toLocaleString('en-IN')}\n${sep}\n`;
  return t;
}

app.get('/api/admin/stats/activity', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50').all();
  res.json(rows);
});

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startNotificationService();
    console.log(`   OAuth: ${[GOOGLE_OK&&'Google',DISCORD_OK&&'Discord',MICROSOFT_OK&&'Microsoft',APPLE_OK&&'Apple'].filter(Boolean).join(', ')||'none'}`);
    console.log(`   Security: Helmet ✓  Rate-limiting ✓  Input validation ✓`);

    // WhatsApp startup notification
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const startupMsg = `🚀 *Starlit Siege Works* server is ONLINE!\n⏰ Time: ${now} IST\n🔗 Port: ${PORT}\n✅ Status: All systems operational`;
    sendWhatsAppNotification('SYSTEM', 'Server', startupMsg).catch(console.error);
  });
}

module.exports = app;
