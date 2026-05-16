import time
import threading
from database import get_db

INTERVAL_SECONDS = 60 * 60  # Check every hour


def check_reminders():
    """Automated background job: sends payment reminders for pending orders."""
    try:
        now = int(time.time())
        db = get_db()

        pending_orders = db.execute("""
            SELECT * FROM orders
            WHERE status = 'payment_pending'
            AND (last_reminded_at IS NULL OR last_reminded_at < ?)
        """, (now - 3600,)).fetchall()

        for order in pending_orders:
            order = dict(order)
            print(f"[REMINDER] Automated reminder sent for order {order['id']}")

            # Update last reminded timestamp
            try:
                db.execute("UPDATE orders SET last_reminded_at = ? WHERE id = ?", (now, order["id"]))
            except Exception:
                # Column may not exist yet; safe to skip
                pass

            # Log the reminder
            db.execute(
                "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
                (order["user_id"], "PAYMENT_REMINDER", f"Automated reminder sent for Order #{order['id']}")
            )

            # Create in-app notification for the client
            try:
                db.execute(
                    "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
                    (order["user_id"],
                     "Payment Reminder",
                     f"Your payment for Order #{order['id']} is still pending. Please complete it to proceed.",
                     "warning")
                )
            except Exception as e:
                print(f"[REMINDER] Notification insert failed: {e}")

        db.commit()
        db.close()

    except Exception as e:
        print(f"[NOTIFICATION SERVICE ERROR] {e}")


def _run_loop():
    """Internal loop that fires check_reminders every INTERVAL_SECONDS."""
    while True:
        time.sleep(INTERVAL_SECONDS)
        check_reminders()


def start_notification_service():
    """
    Starts the background notification / reminder service as a daemon thread.
    Call this once from main.py on application startup.
    """
    print("[Notification Service] Started — checking every hour for payment reminders.")
    thread = threading.Thread(target=_run_loop, daemon=True)
    thread.start()
