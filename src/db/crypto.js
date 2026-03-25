// ─── PASSWORD HASHING ──────────────────────────────────────────────────────────
// SHA-256 через Web Crypto API (встроен в браузер, нет зависимостей)
// Пароль никогда не хранится в открытом виде — только хеш.

const SALT = "hygge_platform_salt_v2_!k9#Xm";

/**
 * Хеширует пароль: SHA-256(SALT + password).
 * Возвращает hex-строку 64 символа.
 */
export async function hashPassword(plain) {
  const data = new TextEncoder().encode(SALT + plain);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Сравнивает plain-пароль с сохранённым хешем.
 * Возвращает true/false.
 */
export async function verifyPassword(plain, hash) {
  const computed = await hashPassword(plain);
  // Constant-time comparison (защита от timing attacks)
  if (computed.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}
