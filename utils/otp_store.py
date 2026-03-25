"""
Хранилище OTP-кодов для сброса пароля.
In-memory хранение с TTL и защитой от перебора.
"""
import random
import string
import time
import threading

# TTL кода (секунды)
OTP_TTL        = 15 * 60   # 15 минут
MAX_ATTEMPTS   = 5          # макс. попыток ввода кода
MAX_REQUESTS   = 3          # макс. запросов OTP в час на один логин
COOLDOWN       = 3600       # окно ограничения запросов (1 час)

_lock  = threading.Lock()
_store: dict[str, dict] = {}   # login → { otp, expires_at, attempts, requests, window_start }


def _clean():
    """Удаляет просроченные записи."""
    now = time.time()
    expired = [k for k, v in _store.items() if v["expires_at"] < now]
    for k in expired:
        del _store[k]


def generate_otp(login: str) -> str | None:
    """
    Генерирует 6-значный OTP для логина.
    Возвращает OTP или None если превышен лимит запросов.
    """
    now = time.time()
    with _lock:
        _clean()
        rec = _store.get(login)

        # Проверяем лимит запросов
        if rec:
            # Сбрасываем окно если прошёл час
            if now - rec.get("window_start", 0) > COOLDOWN:
                rec["requests"]     = 0
                rec["window_start"] = now
            if rec["requests"] >= MAX_REQUESTS:
                return None  # слишком много запросов

        otp = "".join(random.choices(string.digits, k=6))
        _store[login] = {
            "otp":          otp,
            "expires_at":   now + OTP_TTL,
            "attempts":     0,
            "requests":     (rec["requests"] + 1) if rec else 1,
            "window_start": (rec.get("window_start", now)) if rec else now,
        }
        return otp


def verify_otp(login: str, otp: str) -> tuple[bool, str]:
    """
    Проверяет OTP.
    Возвращает (True, "") или (False, "причина").
    """
    now = time.time()
    with _lock:
        rec = _store.get(login)
        if not rec:
            return False, "Код не найден или уже использован"
        if now > rec["expires_at"]:
            del _store[login]
            return False, "Код истёк. Запросите новый"
        if rec["attempts"] >= MAX_ATTEMPTS:
            del _store[login]
            return False, "Превышено число попыток. Запросите новый код"

        rec["attempts"] += 1

        # Сравнение без утечки по времени
        if not _safe_compare(otp.strip(), rec["otp"]):
            return False, "Неверный код"

        # Код верный — удаляем (одноразовый)
        del _store[login]
        return True, ""


def _safe_compare(a: str, b: str) -> bool:
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)
    return result == 0
