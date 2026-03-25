// ─── SUPER ADMIN ──────────────────────────────────────────────────────────────
// Суперадминистратор может входить в панель любого отеля.
// Хранится отдельно от реестра отелей.
// Пароль — только SHA-256 хеш, plain-text нигде не сохраняется.

import { hashPassword, verifyPassword } from "./crypto.js";

const KEY = "hygge_superadmin_v2";

/** Возвращает данные суперадмина или null если не настроен */
export function getSuperAdmin() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Возвращаем только безопасные поля — хеш не отдаём наружу
    return { exists: true, createdAt: data.createdAt };
  } catch {
    return null;
  }
}

/** Первичная настройка суперадмина (вызывается один раз) */
export async function setupSuperAdmin(password) {
  if (password.length < 8) throw new Error("Пароль суперадмина — минимум 8 символов");
  const h = await hashPassword(password);
  const record = { h, createdAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(record));
}

/** Проверяет пароль суперадмина. Возвращает true или кидает Error. */
export async function loginSuperAdmin(password) {
  const raw = localStorage.getItem(KEY);
  if (!raw) throw new Error("Суперадмин не настроен");
  const { h } = JSON.parse(raw);
  const ok = await verifyPassword(password, h);
  if (!ok) throw new Error("Неверный пароль");
  return true;
}

/** Смена пароля суперадмина */
export async function changeSuperAdminPassword(oldPass, newPass) {
  await loginSuperAdmin(oldPass); // проверит текущий
  if (newPass.length < 8) throw new Error("Новый пароль — минимум 8 символов");
  const h = await hashPassword(newPass);
  const raw = localStorage.getItem(KEY);
  const existing = JSON.parse(raw);
  localStorage.setItem(KEY, JSON.stringify({ ...existing, h }));
}
