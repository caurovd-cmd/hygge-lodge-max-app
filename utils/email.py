"""
SMTP email helper для Hygge Lodge Platform.
Отправляет HTML-письма через любой SMTP-сервер.
"""
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from utils.logger import setup_logger

logger = setup_logger()


def _get_smtp_config():
    return {
        "host":      os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "port":      int(os.getenv("SMTP_PORT", 587)),
        "user":      os.getenv("SMTP_USER", ""),
        "password":  os.getenv("SMTP_PASS", ""),
        "from_name": os.getenv("SMTP_FROM_NAME", "Hygge Lodge Platform"),
    }


def send_email(to_email: str, subject: str, html_body: str) -> dict:
    """
    Отправляет HTML-письмо.
    Возвращает {"ok": True} или {"ok": False, "error": "..."}
    """
    cfg = _get_smtp_config()

    if not cfg["user"] or not cfg["password"]:
        logger.error("SMTP credentials not configured")
        return {"ok": False, "error": "SMTP не настроен. Заполните .env"}

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = formataddr((cfg["from_name"], cfg["user"]))
    msg["To"]      = to_email

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["user"], [to_email], msg.as_string())
        logger.info(f"Email sent to {to_email}: {subject}")
        return {"ok": True}
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP auth failed")
        return {"ok": False, "error": "Ошибка авторизации SMTP. Проверьте логин/пароль в .env"}
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error: {e}")
        return {"ok": False, "error": f"Ошибка SMTP: {str(e)}"}
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return {"ok": False, "error": str(e)}


# ── HTML ШАБЛОНЫ ПИСЕМ ────────────────────────────────────────────────────────

BASE_STYLE = """
<style>
  body { margin:0; padding:0; background:#f4f6f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrap { max-width:520px; margin:32px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .header { background:linear-gradient(135deg,#1a2f1a,#2a4a25); padding:32px 32px 24px; text-align:center; }
  .header h1 { margin:0 0 6px; color:#fff; font-size:22px; font-weight:800; }
  .header p  { margin:0; color:rgba(255,255,255,.6); font-size:13px; }
  .body { padding:28px 32px; }
  .body h2 { margin:0 0 12px; color:#1a2f1a; font-size:18px; }
  .body p  { margin:0 0 14px; color:#444; font-size:14px; line-height:1.6; }
  .code-box { background:#f0f5ee; border:2px dashed #5ab446; border-radius:12px; padding:20px; text-align:center; margin:20px 0; }
  .code { font-size:36px; font-weight:800; color:#2a4a25; letter-spacing:8px; font-family:monospace; }
  .code-hint { font-size:12px; color:#888; margin-top:8px; }
  .btn { display:inline-block; padding:13px 28px; background:linear-gradient(135deg,#5ab446,#3d8a2e); color:#fff; text-decoration:none; border-radius:10px; font-weight:700; font-size:14px; margin:10px 0; }
  .footer { background:#f9fafb; padding:16px 32px; text-align:center; font-size:12px; color:#aaa; border-top:1px solid #eee; }
  .warn { background:#fff8e6; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:6px; font-size:13px; color:#92400e; margin:14px 0; }
  .info-row { display:flex; gap:8px; align-items:center; padding:10px 0; border-bottom:1px solid #f0f0f0; font-size:14px; }
  .info-label { color:#888; min-width:120px; }
  .info-val { color:#222; font-weight:600; }
</style>
"""

def make_welcome_email(hotel_name: str, login: str) -> str:
    return f"""<!DOCTYPE html><html><head>{BASE_STYLE}</head><body>
<div class="wrap">
  <div class="header">
    <h1>🌿 Hygge Lodge Platform</h1>
    <p>Панель управления эко-отелями</p>
  </div>
  <div class="body">
    <h2>Добро пожаловать, {hotel_name}! 🏕️</h2>
    <p>Ваш эко-отель успешно зарегистрирован на платформе Hygge Lodge. Теперь вы можете управлять домиками, услугами, акциями и гостями через личную панель администратора.</p>
    <div style="margin:20px 0">
      <div class="info-row"><span class="info-label">Название:</span><span class="info-val">{hotel_name}</span></div>
      <div class="info-row"><span class="info-label">Логин:</span><span class="info-val">{login}</span></div>
    </div>
    <div class="warn">🔑 Сохраните логин и пароль в надёжном месте. При необходимости вы можете восстановить пароль через эту почту.</div>
    <p style="margin-top:20px">Если вы не регистрировали этот отель — проигнорируйте письмо.</p>
  </div>
  <div class="footer">Hygge Lodge Platform · Письмо отправлено автоматически</div>
</div></body></html>"""


def make_reset_email(hotel_name: str, login: str, otp: str) -> str:
    return f"""<!DOCTYPE html><html><head>{BASE_STYLE}</head><body>
<div class="wrap">
  <div class="header">
    <h1>🌿 Hygge Lodge Platform</h1>
    <p>Восстановление пароля</p>
  </div>
  <div class="body">
    <h2>Код для сброса пароля</h2>
    <p>Для аккаунта <b>{hotel_name}</b> (логин: <b>{login}</b>) запрошен сброс пароля.</p>
    <div class="code-box">
      <div class="code">{otp}</div>
      <div class="code-hint">Код действителен 15 минут · Одноразовый</div>
    </div>
    <div class="warn">⚠️ Никому не сообщайте этот код. Сотрудники платформы никогда не запрашивают коды.</div>
    <p>Если вы не запрашивали сброс пароля — проигнорируйте это письмо. Ваш пароль останется прежним.</p>
  </div>
  <div class="footer">Hygge Lodge Platform · Письмо отправлено автоматически</div>
</div></body></html>"""
