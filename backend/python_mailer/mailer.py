#!/usr/bin/env python3
"""
QuickPrint Python SMTP Email Engine
Uses Python's standard library `smtplib`, `ssl`, and `email.mime` to deliver
order-related notifications and authentication emails.
"""

import os
import sys
import json
import ssl
import smtplib
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid

# Attempt to load .env from backend/.env or parent directories
try:
    from dotenv import load_dotenv

    env_paths = [
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent / ".env",
        Path.cwd() / ".env",
    ]
    for env_path in env_paths:
        if env_path.is_file():
            load_dotenv(dotenv_path=env_path)
            break
except ImportError:
    pass

# Import template builders
try:
    from templates import (
        get_password_reset_template,
        get_order_confirmation_template,
        get_order_status_update_template,
        get_order_picked_up_template,
        get_order_cancellation_template,
        get_vendor_new_order_template,
        get_test_email_template,
    )
except ImportError:
    from .templates import (
        get_password_reset_template,
        get_order_confirmation_template,
        get_order_status_update_template,
        get_order_picked_up_template,
        get_order_cancellation_template,
        get_vendor_new_order_template,
        get_test_email_template,
    )


def get_smtp_config() -> dict:
    """
    Normalizes SMTP configuration from environment variables.
    Supports EMAIL_* and SMTP_* naming conventions.
    """
    host = os.getenv("SMTP_HOST") or os.getenv("EMAIL_HOST") or "smtp.gmail.com"
    port_str = os.getenv("SMTP_PORT") or os.getenv("EMAIL_PORT") or "587"
    try:
        port = int(port_str)
    except ValueError:
        port = 587

    user = os.getenv("SMTP_USER") or os.getenv("EMAIL_USER") or os.getenv("SMTP_USERNAME") or ""
    password = os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_PASSWORD") or ""

    secure_env = os.getenv("SMTP_SECURE") or os.getenv("EMAIL_SECURE")
    if secure_env is not None:
        secure = secure_env.lower() in ("true", "1", "yes")
    else:
        secure = port == 465

    default_from = f"QuickPrint Notifications <{user}>" if user else "QuickPrint Notifications <no-reply@quickprint.com>"
    from_addr = os.getenv("SMTP_FROM") or os.getenv("EMAIL_FROM") or default_from

    is_configured = bool(host and user and password)

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "secure": secure,
        "from": from_addr,
        "is_configured": is_configured,
    }


def verify_connection() -> dict:
    """
    Connects to SMTP host and verifies authentication without sending an email.
    """
    cfg = get_smtp_config()
    if not cfg["is_configured"]:
        return {
            "success": False,
            "configured": False,
            "message": "SMTP credentials (EMAIL_USER / EMAIL_PASSWORD) not configured in .env",
        }

    try:
        context = ssl.create_default_context()
        if cfg["secure"]:
            with smtplib.SMTP_SSL(cfg["host"], cfg["port"], context=context, timeout=10) as server:
                server.login(cfg["user"], cfg["password"])
        else:
            with smtplib.SMTP(cfg["host"], cfg["port"], timeout=10) as server:
                server.starttls(context=context)
                server.login(cfg["user"], cfg["password"])

        return {
            "success": True,
            "configured": True,
            "host": cfg["host"],
            "port": cfg["port"],
            "user": cfg["user"],
            "message": f"Verified SMTP connection to {cfg['host']}:{cfg['port']}",
        }
    except Exception as exc:
        return {
            "success": False,
            "configured": True,
            "error": str(exc),
            "message": f"SMTP connection failed: {exc}",
        }


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None) -> dict:
    """
    Dispatches an email via Python's `smtplib`.
    In dev mode (when credentials are unset in .env), prints a clean preview to console.
    """
    if not to_email:
        return {"success": False, "error": "No recipient email provided"}

    cfg = get_smtp_config()

    # Development Preview Mode when credentials are not configured
    if not cfg["is_configured"]:
        print("\n" + "=" * 66, file=sys.stderr)
        print("📨 [PYTHON SMTP ENGINE: DEV PREVIEW (CREDENTIALS NOT SET)]", file=sys.stderr)
        print(f"To:      {to_email}", file=sys.stderr)
        print(f"From:    {cfg['from']}", file=sys.stderr)
        print(f"Subject: {subject}", file=sys.stderr)
        if text_body:
            print(f"Body (Text Preview):\n{text_body}", file=sys.stderr)
        print("Tip: Add EMAIL_USER & EMAIL_PASSWORD to backend/.env for real SMTP dispatch.", file=sys.stderr)
        print("=" * 66 + "\n", file=sys.stderr)
        return {
            "success": True,
            "mocked": True,
            "message": "Previewed in console (SMTP credentials unset)",
        }

    msg = MIMEMultipart("alternative")
    msg["From"] = cfg["from"]
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="quickprint.local")

    part_text = MIMEText(text_body or subject, "plain", "utf-8")
    part_html = MIMEText(html_body, "html", "utf-8")
    msg.attach(part_text)
    msg.attach(part_html)

    try:
        context = ssl.create_default_context()
        if cfg["secure"]:
            with smtplib.SMTP_SSL(cfg["host"], cfg["port"], context=context, timeout=15) as server:
                server.login(cfg["user"], cfg["password"])
                server.sendmail(cfg["from"], [to_email], msg.as_string())
        else:
            with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
                server.starttls(context=context)
                server.login(cfg["user"], cfg["password"])
                server.sendmail(cfg["from"], [to_email], msg.as_string())

        print(f"✉️ [Python SMTP] Email delivered to {to_email}. Subject: {subject}", file=sys.stderr)
        return {"success": True, "recipient": to_email, "subject": subject}
    except Exception as exc:
        print(f"⚠️ [Python SMTP] Dispatch error: {exc}", file=sys.stderr)
        return {"success": False, "error": str(exc)}


# Convenience dispatchers
def send_password_reset(to_email: str, reset_url: str, account_type: str = "CUSTOMER") -> dict:
    subject, html_content, text_content = get_password_reset_template(to_email, reset_url, account_type)
    return send_email(to_email, subject, html_content, text_content)


def send_order_confirmation(order: dict, user_email: str = None) -> dict:
    recipient = user_email or order.get("userEmail")
    subject, html_content, text_content = get_order_confirmation_template(order, recipient)
    return send_email(recipient, subject, html_content, text_content)


def send_order_status_update(order: dict, user_email: str = None) -> dict:
    recipient = user_email or order.get("userEmail")
    subject, html_content, text_content = get_order_status_update_template(order, recipient)
    return send_email(recipient, subject, html_content, text_content)


def send_order_picked_up(order: dict, user_email: str = None) -> dict:
    recipient = user_email or order.get("userEmail")
    subject, html_content, text_content = get_order_picked_up_template(order, recipient)
    return send_email(recipient, subject, html_content, text_content)


def send_order_cancellation(order: dict, user_email: str = None, refund_info: dict = None) -> dict:
    recipient = user_email or order.get("userEmail")
    subject, html_content, text_content = get_order_cancellation_template(order, recipient, refund_info)
    return send_email(recipient, subject, html_content, text_content)


def send_vendor_new_order_alert(order: dict, vendor_email: str) -> dict:
    subject, html_content, text_content = get_vendor_new_order_template(order, vendor_email)
    return send_email(vendor_email, subject, html_content, text_content)


def send_test_email(to_email: str) -> dict:
    subject, html_content, text_content = get_test_email_template(to_email)
    return send_email(to_email, subject, html_content, text_content)


# JSON IPC Dispatcher for Node.js / CLI invocation
def handle_action(action: str, payload: dict) -> dict:
    if action == "verify":
        return verify_connection()
    elif action == "test_email":
        return send_test_email(payload.get("to"))
    elif action == "password_reset":
        return send_password_reset(
            to_email=payload.get("to"),
            reset_url=payload.get("resetUrl"),
            account_type=payload.get("accountType", "CUSTOMER"),
        )
    elif action == "order_confirmation":
        return send_order_confirmation(
            order=payload.get("order", {}),
            user_email=payload.get("userEmail"),
        )
    elif action == "order_status_update":
        return send_order_status_update(
            order=payload.get("order", {}),
            user_email=payload.get("userEmail"),
        )
    elif action == "order_picked_up":
        return send_order_picked_up(
            order=payload.get("order", {}),
            user_email=payload.get("userEmail"),
        )
    elif action == "order_cancellation":
        return send_order_cancellation(
            order=payload.get("order", {}),
            user_email=payload.get("userEmail"),
            refund_info=payload.get("refundInfo"),
        )
    elif action == "vendor_new_order":
        return send_vendor_new_order_alert(
            order=payload.get("order", {}),
            vendor_email=payload.get("vendorEmail"),
        )
    elif action == "generic_email":
        return send_email(
            to_email=payload.get("to"),
            subject=payload.get("subject"),
            html_body=payload.get("html"),
            text_body=payload.get("text"),
        )
    else:
        return {"success": False, "error": f"Unknown action: {action}"}


def main():
    """
    CLI / Stdin Runner.
    Accepts JSON from stdin or command-line args.
    """
    if len(sys.argv) > 1 and sys.argv[1] == "--verify":
        res = verify_connection()
        print(json.dumps(res, indent=2))
        return

    if len(sys.argv) > 2 and sys.argv[1] == "--test":
        target = sys.argv[2]
        res = send_test_email(target)
        print(json.dumps(res, indent=2))
        return

    # Check for stdin payload
    if not sys.stdin.isatty():
        try:
            raw_input = sys.stdin.read().strip()
            if raw_input:
                req = json.loads(raw_input)
                action = req.get("action", "")
                payload = req.get("payload", {})
                res = handle_action(action, payload)
                print(json.dumps(res))
                return
        except Exception as exc:
            print(json.dumps({"success": False, "error": str(exc)}))
            sys.exit(1)

    print("QuickPrint Python SMTP Mailer CLI")
    print("Usage:")
    print("  python mailer.py --verify")
    print("  python mailer.py --test <email@domain.com>")
    print("  echo '{\"action\":\"test_email\",\"payload\":{\"to\":\"user@example.com\"}}' | python mailer.py")


if __name__ == "__main__":
    main()
