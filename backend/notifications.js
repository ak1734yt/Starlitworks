const { db } = require('./db');

// Frequency: check every hour
const INTERVAL = 60 * 60 * 1000; 

function checkReminders() {
  const now = Math.floor(Date.now() / 1000);
  
  const pendingOrders = db.prepare(`
    SELECT * FROM orders 
    WHERE status = 'payment_pending' 
    AND (last_reminded_at IS NULL OR last_reminded_at < ?)
  `).all(now - 3600); // Only remind once an hour max

  pendingOrders.forEach(order => {
    console.log(`[REMINDER] Automated reminder sent for order ${order.id}`);
    
    db.prepare('UPDATE orders SET last_reminded_at = ? WHERE id = ?').run(now, order.id);
    
    db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)')
      .run(order.user_id, 'PAYMENT_REMINDER', `Automated reminder sent for Order #${order.id}`);
  });
}

function startNotificationService() {
  console.log('Notification service started...');
  setInterval(checkReminders, INTERVAL);
}

module.exports = { startNotificationService };
