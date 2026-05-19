import os
import sys
from dotenv import load_dotenv

# Ensure we are in the backend directory context
sys.path.append(os.path.dirname(__file__))

load_dotenv()

print("GMAIL_USER:", os.getenv("GMAIL_USER"))
print("GMAIL_APP_PASSWORD (raw):", os.getenv("GMAIL_APP_PASSWORD"))

# Import mailer
from mailer import send_welcome_email

# Send a test welcome email to the configured GMAIL_USER to test loopback delivery
recipient = os.getenv("GMAIL_USER")
if recipient:
    print(f"Attempting to send email to {recipient}...")
    success = send_welcome_email("Tester", recipient)
    print("Success:", success)
else:
    print("No GMAIL_USER configured in environment.")
