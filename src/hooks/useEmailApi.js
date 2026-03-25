// ── EMAIL API ──────────────────────────────────────────────────────────────────
// Работает с Flask-бэкендом на порту 5001.

const BASE = import.meta.env.VITE_EMAIL_API || "http://localhost:5001";

async function _post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Ошибка сервера");
  return json;
}

/**
 * Регистрирует email отеля и отправляет приветственное письмо.
 * Не бросает ошибку если письмо не ушло (регистрация важнее).
 */
export async function registerEmail(login, email, hotelName) {
  try {
    return await _post("/api/email/register", { login, email, hotelName });
  } catch (e) {
    console.warn("Email registration warning:", e.message);
    return { ok: false, warn: e.message };
  }
}

/**
 * Отправляет OTP-код на указанный email.
 * Всегда возвращает ok=true (сервер скрывает факт отсутствия email).
 */
export async function sendResetOtp(email) {
  return _post("/api/email/send-reset", { email });
}

/**
 * Проверяет OTP-код по email.
 * При успехе возвращает { ok: true, login } — логин нужен для смены пароля локально.
 */
export async function verifyOtp(email, otp) {
  return _post("/api/email/verify-otp", { email, otp });
}

/**
 * Проверяет доступность бэкенда.
 */
export async function checkApiHealth() {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
