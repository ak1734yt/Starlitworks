import sqlite3, json
db = sqlite3.connect('backend/data/shop.db')
products = [
    {"category": "subscriptions", "product_key": "sub_bot_1m", "name": "Premium Bot Subscription (1 Month)", "price": 999, "min_price": 999, "tag": "1 Month | ₹999", "description": "High-speed private support ticket and utility bot hosted on our ultra-low latency server for 1 month.", "features": ["Full custom ticketer system", "Active anti-abuse algorithms", "24/7 dedicated hosting uptime", "1 Month Access"], "is_manual_price": 0, "show_price_to_admin": 1},
    {"category": "subscriptions", "product_key": "sub_bot_3m", "name": "Premium Bot Subscription (3 Months)", "price": 2799, "min_price": 2799, "tag": "3 Months | ₹2799", "description": "High-speed private support ticket and utility bot hosted on our ultra-low latency server for 3 months.", "features": ["Full custom ticketer system", "Active anti-abuse algorithms", "24/7 dedicated hosting uptime", "3 Months Access"], "is_manual_price": 0, "show_price_to_admin": 1},
    {"category": "subscriptions", "product_key": "sub_bot_6m", "name": "Premium Bot Subscription (6 Months)", "price": 5499, "min_price": 5499, "tag": "6 Months | ₹5499", "description": "High-speed private support ticket and utility bot hosted on our ultra-low latency server for 6 months.", "features": ["Full custom ticketer system", "Active anti-abuse algorithms", "24/7 dedicated hosting uptime", "6 Months Access"], "is_manual_price": 0, "show_price_to_admin": 1},
    {"category": "subscriptions", "product_key": "sub_bot_12m", "name": "Premium Bot Subscription (12 Months)", "price": 9999, "min_price": 9999, "tag": "12 Months | ₹9999", "description": "High-speed private support ticket and utility bot hosted on our ultra-low latency server for 12 months.", "features": ["Full custom ticketer system", "Active anti-abuse algorithms", "24/7 dedicated hosting uptime", "12 Months Access"], "is_manual_price": 0, "show_price_to_admin": 1}
]
db.execute("DELETE FROM products WHERE category = 'subscriptions'")
for p in products:
    db.execute('''INSERT OR IGNORE INTO products 
       (category, product_key, name, price, min_price, tag, description, features, is_manual_price, show_price_to_admin) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
    (p['category'], p['product_key'], p['name'], p['price'], p['min_price'], p['tag'], p['description'], json.dumps(p['features']), p['is_manual_price'], p['show_price_to_admin']))
db.commit()
db.close()
print('Seeded promo products')
