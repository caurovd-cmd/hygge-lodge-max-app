// ─── HOTEL REGISTRY ────────────────────────────────────────────────────────────
// Реестр всех зарегистрированных отелей.
// Пароли хранятся ТОЛЬКО в виде SHA-256 хеша — plain-text нигде не сохраняется.
// Hotel record: { id, name, login, passwordHash, createdAt }

import { hashPassword, verifyPassword } from "./crypto.js";

const REGISTRY_KEY = "hygge_hotels_v2";

function _load() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function _save(hotels) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(hotels));
  } catch (e) {
    console.error("Hotel registry persist error:", e);
  }
}

/** Список отелей БЕЗ хешей паролей (безопасно отдавать в UI) */
export function getHotels() {
  return _load().map(({ id, name, login, createdAt }) => ({ id, name, login, createdAt }));
}

/** Все данные включая хеши — только для внутреннего использования */
function _getAll() {
  return _load();
}

/**
 * Регистрирует новый отель. Async — хеширует пароль.
 * @returns {{ id, name, login, email, createdAt }} — без хеша
 */
export async function registerHotel({ name, login, password, email = "" }) {
  if (!name || name.trim().length < 2)
    throw new Error("Название отеля — минимум 2 символа");
  if (!login || login.length < 3)
    throw new Error("Логин — минимум 3 символа");
  if (!/^[a-z0-9_]+$/.test(login))
    throw new Error("Логин: только строчные латинские буквы, цифры и _");
  if (login.length > 20)
    throw new Error("Логин — максимум 20 символов");
  if (!password || password.length < 6)
    throw new Error("Пароль — минимум 6 символов");
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    throw new Error("Некорректный email");

  const hotels = _getAll();
  if (hotels.find(h => h.login === login))
    throw new Error(`Логин «${login}» уже занят`);

  const passwordHash = await hashPassword(password);
  const hotel = {
    id: Date.now().toString(),
    name: name.trim(),
    login: login.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  hotels.push(hotel);
  _save(hotels);
  const { passwordHash: _, ...safe } = hotel;
  return safe;
}

/**
 * Сброс пароля без старого пароля — только после верификации OTP на бэкенде.
 */
export async function resetHotelPassword(login, newPassword) {
  const hotels = _getAll();
  const idx    = hotels.findIndex(h => h.login === login);
  if (idx === -1) throw new Error("Отель не найден");
  if (newPassword.length < 6) throw new Error("Пароль — минимум 6 символов");
  hotels[idx].passwordHash = await hashPassword(newPassword);
  _save(hotels);
}

/**
 * Аутентификация отеля. Async — сравнивает хеши.
 * @returns {{ id, name, login, createdAt }} — без хеша
 */
export async function loginHotel(login, password) {
  const hotels = _getAll();
  const hotel  = hotels.find(h => h.login === login);
  if (!hotel) throw new Error("Логин или пароль неверны");

  const ok = await verifyPassword(password, hotel.passwordHash);
  if (!ok) throw new Error("Логин или пароль неверны");  // одинаковое сообщение — не раскрываем что именно не так

  const { passwordHash: _, ...safe } = hotel;
  return safe;
}

/**
 * Смена пароля отеля (нужен текущий пароль для подтверждения).
 */
export async function changeHotelPassword(hotelId, oldPassword, newPassword) {
  const hotels = _getAll();
  const idx    = hotels.findIndex(h => h.id === hotelId);
  if (idx === -1) throw new Error("Отель не найден");

  const ok = await verifyPassword(oldPassword, hotels[idx].passwordHash);
  if (!ok) throw new Error("Текущий пароль неверен");
  if (newPassword.length < 6) throw new Error("Новый пароль — минимум 6 символов");

  hotels[idx].passwordHash = await hashPassword(newPassword);
  _save(hotels);
}

/** Только для суперадмина: смена пароля без проверки старого */
export async function superChangeHotelPassword(hotelId, newPassword) {
  const hotels = _getAll();
  const idx    = hotels.findIndex(h => h.id === hotelId);
  if (idx === -1) throw new Error("Отель не найден");
  if (newPassword.length < 6) throw new Error("Пароль — минимум 6 символов");
  hotels[idx].passwordHash = await hashPassword(newPassword);
  _save(hotels);
}

export function getHotelById(id) {
  return getHotels().find(h => h.id === id) || null;
}
