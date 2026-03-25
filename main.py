from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json

load_dotenv()

from utils.logger import setup_logger
from utils.email import send_email, make_welcome_email, make_reset_email
from utils.otp_store import generate_otp, verify_otp

app = Flask(__name__)
logger = setup_logger()

# ── CORS: разрешаем запросы только с фронтенда ────────────────────────────────
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:4001")
CORS(app, resources={r"/api/*": {"origins": [
    frontend_origin,
    "http://localhost:4001",
    "http://localhost:3000",
    "http://127.0.0.1:4001",
]}}, supports_credentials=False)


# ── ХРАНИЛИЩЕ EMAILS (JSON файл рядом с main.py) ─────────────────────────────
# Маппинг: login → email (отдельно от localStorage паролей)
EMAILS_FILE = os.path.join(os.path.dirname(__file__), ".hotel_emails.json")

def _load_emails() -> dict:
    try:
        if os.path.exists(EMAILS_FILE):
            with open(EMAILS_FILE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def _save_emails(data: dict):
    try:
        with open(EMAILS_FILE, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Failed to save emails: {e}")

def _get_email(login: str) -> str | None:
    return _load_emails().get(login.lower())

def _set_email(login: str, email: str, hotel_name: str = ""):
    data = _load_emails()
    data[login.lower()] = {"email": email, "name": hotel_name}
    _save_emails(data)

def _find_login_by_email(email: str) -> tuple[str | None, dict | None]:
    """Ищет логин по email. Возвращает (login, record) или (None, None)."""
    email = email.strip().lower()
    for login, record in _load_emails().items():
        rec_email = record["email"] if isinstance(record, dict) else record
        if rec_email.lower() == email:
            return login, record
    return None, None


# ─────────────────────────────────────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "hygge-email"})


@app.route("/api/email/register", methods=["POST"])
def api_register():
    """
    Сохраняет email отеля и отправляет приветственное письмо.
    Body: { login, email, hotelName }
    """
    data = request.get_json(silent=True) or {}
    login      = (data.get("login") or "").strip().lower()
    email      = (data.get("email") or "").strip().lower()
    hotel_name = (data.get("hotelName") or "").strip()

    if not login or not email or not hotel_name:
        return jsonify({"ok": False, "error": "Не переданы обязательные поля"}), 400

    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"ok": False, "error": "Некорректный email"}), 400

    # Сохраняем
    _set_email(login, email, hotel_name)

    # Отправляем приветственное письмо
    result = send_email(
        to_email=email,
        subject=f"Добро пожаловать на Hygge Lodge Platform — {hotel_name}",
        html_body=make_welcome_email(hotel_name, login),
    )
    if not result["ok"]:
        logger.warning(f"Welcome email failed for {login}: {result['error']}")
        # Не возвращаем ошибку — регистрация прошла, письмо вторично
        return jsonify({"ok": True, "emailSent": False, "warn": result["error"]})

    return jsonify({"ok": True, "emailSent": True})


@app.route("/api/email/send-reset", methods=["POST"])
def api_send_reset():
    """
    Отправляет OTP-код по email адресу.
    Body: { email }
    Всегда возвращает ok=True — не раскрываем существует ли такой email.
    """
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email or "@" not in email:
        return jsonify({"ok": False, "error": "Введите корректный email"}), 400

    login, record = _find_login_by_email(email)
    if not login:
        logger.info(f"Reset requested for unknown email: {email}")
        return jsonify({"ok": True})  # намеренно не раскрываем

    hotel_name = record.get("name", login) if isinstance(record, dict) else login

    otp = generate_otp(login)
    if otp is None:
        return jsonify({"ok": False, "error": "Слишком много запросов. Подождите час и попробуйте снова"}), 429

    result = send_email(
        to_email=email,
        subject="Код для сброса пароля — Hygge Lodge",
        html_body=make_reset_email(hotel_name, login, otp),
    )
    if not result["ok"]:
        err = result["error"]
        # Определяем HTTP-статус по типу ошибки
        status = 503 if "настроен" in err or "SMTP" in err else 502
        return jsonify({"ok": False, "error": err}), status

    logger.info(f"Reset OTP sent to {email} (login: {login})")
    return jsonify({"ok": True})


@app.route("/api/email/verify-otp", methods=["POST"])
def api_verify_otp():
    """
    Проверяет OTP. При успехе возвращает логин — фронтенд меняет пароль локально.
    Body: { email, otp }
    """
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp   = (data.get("otp") or "").strip()

    if not email or not otp:
        return jsonify({"ok": False, "error": "Укажите email и код"}), 400

    login, _ = _find_login_by_email(email)
    if not login:
        return jsonify({"ok": False, "error": "Email не найден"}), 400

    ok, reason = verify_otp(login, otp)
    if not ok:
        return jsonify({"ok": False, "error": reason}), 400

    logger.info(f"OTP verified successfully for {login}")
    # Возвращаем логин — фронтенд знает какой аккаунт сбрасывать
    return jsonify({"ok": True, "login": login})


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5001))
    logger.info(f"Email API server started on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
