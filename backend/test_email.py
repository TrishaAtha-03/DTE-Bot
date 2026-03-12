import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

to_email = "trisha221403@gmail.com"
token = "123456"

body = f"""Hello,
You requested a password reset for your DTE Rajasthan Admin account.
Your OTP for password reset is: {token}
"""
msg = MIMEText(body)
msg['Subject'] = 'Test Email - DTE Rajasthan'
msg['From'] = os.getenv("SMTP_FROM", "test@test.com")
msg['To'] = to_email

print(f"Attempting to connect to {os.getenv('SMTP_HOST')}:{os.getenv('SMTP_PORT')}")
print(f"Authenticating as {os.getenv('SMTP_USER')}")
try:
    with smtplib.SMTP(os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT", 587))) as s:
        s.starttls()
        s.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
        s.sendmail(msg['From'], [to_email], msg.as_string())
        print("Success! Email sent.")
except Exception as e:
    print(f"FAILED to send email: {e}")
