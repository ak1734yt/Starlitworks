const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const transporter = GMAIL_USER && GMAIL_PASS
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    })
  : null;

async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.log(`[EMAIL SKIP] No Gmail configured. To: ${to} | Subject: ${subject}`);
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"Starlit Siege Works" <${GMAIL_USER}>`,
      to, subject, html,
    });
    console.log(`[EMAIL SENT] To: ${to}`);
    return true;
  } catch (e) {
    console.error('[EMAIL FAILED]', e.message);
    return false;
  }
}

async function sendPasswordResetEmail(to, resetLink) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><style>
      body { background: #0a0a0a; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
      .container { max-width: 560px; margin: 40px auto; background: #111; border: 1px solid #ffffff15; border-radius: 20px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 40px 32px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; color: #fff; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px; }
      .body { padding: 36px 32px; }
      .body p { color: #9ca3af; line-height: 1.7; font-size: 14px; margin: 0 0 20px; }
      .btn { display: block; width: fit-content; margin: 28px auto; padding: 14px 36px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.3px; }
      .warning { background: #7c3aed10; border: 1px solid #7c3aed30; border-radius: 10px; padding: 14px 18px; margin-top: 24px; }
      .warning p { color: #a78bfa; font-size: 12px; margin: 0; }
      .footer { padding: 20px 32px; border-top: 1px solid #ffffff08; text-align: center; }
      .footer p { color: #4b5563; font-size: 11px; margin: 0; }
    </style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚔️ Starlit Siege Works</h1>
          <p>Premium Discord Services</p>
        </div>
        <div class="body">
          <p>Hello,</p>
          <p>We received a request to reset the password for your account. Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
          <a href="${resetLink}" class="btn">Reset My Password</a>
          <div class="warning">
            <p>⚠️ If you did not request a password reset, you can safely ignore this email. Your account is secure.</p>
          </div>
        </div>
        <div class="footer">
          <p>© 2026 Starlit Siege Works. All rights reserved.</p>
          <p style="margin-top:6px;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to, subject: '🔑 Reset Your Password — Starlit Siege Works', html });
}

async function sendWelcomeEmail(name, to) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><style>
      body { background: #0a0a0a; color: #e5e7eb; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
      .container { max-width: 560px; margin: 40px auto; background: #111; border: 1px solid #ffffff15; border-radius: 20px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 40px 32px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; color: #fff; font-weight: 800; }
      .body { padding: 36px 32px; }
      .body p { color: #9ca3af; line-height: 1.7; font-size: 14px; margin: 0 0 16px; }
      .btn { display: block; width: fit-content; margin: 28px auto; padding: 14px 36px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; }
      .footer { padding: 20px 32px; border-top: 1px solid #ffffff08; text-align: center; }
      .footer p { color: #4b5563; font-size: 11px; margin: 0; }
    </style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚔️ Welcome to Starlit Siege Works!</h1>
        </div>
        <div class="body">
          <p>Hey <strong style="color:#a78bfa">${name}</strong>! 👋</p>
          <p>Your account is ready. You can now browse our premium Discord services, place orders, and track everything from your dashboard.</p>
          <a href="${FRONTEND_URL}/shop" class="btn">Explore Services →</a>
          <p>If you have any questions, just reply to this email or reach out on Discord.</p>
        </div>
        <div class="footer">
          <p>© 2026 Starlit Siege Works. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to, subject: '🎉 Welcome to Starlit Siege Works!', html });
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail };
