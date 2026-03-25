// ─── MAX BRIDGE HOOK ─────────────────────────────────────────────────────────
// Подключение к MAX Bridge с fallback для браузерного превью
//
// Документация MAX Bridge: https://dev.max.ru/docs/webapps/bridge
// requestContact() — вызывается без параметров, ответ приходит через событие WebAppRequestPhone
// Формат ответа: { phone: string }

export function createBridge() {
  if (typeof window !== "undefined" && window.WebApp) return window.WebApp;
  return {
    initDataUnsafe: {
      user: { id: 77001, first_name: "Екатерина", last_name: "Лесная", username: "kate_forest" },
    },
    initData: "",
    platform: "web",
    version: "25.9.16",
    ready: () => {},
    close: () => {},
    requestContact: () => {},
    onEvent: (eventName, cb) => {},
    offEvent: (eventName, cb) => {},
    openLink: (url) => window.open(url, "_blank"),
    openMaxLink: (url) => window.open(url, "_blank"),
    shareContent: (text, link) => {},
    HapticFeedback: {
      notificationOccurred: (type) => console.log("[Haptic]", type),
      impactOccurred: (style) => console.log("[Haptic impact]", style),
    },
    BackButton: { show: () => {}, hide: () => {}, onClick: () => {}, offClick: () => {} },
  };
}

export const bridge = createBridge();

// ── Запрос телефона через MAX Bridge ─────────────────────────────────────────
// Вызывает нативный диалог MAX и ждёт ответ через событие WebAppRequestPhone
// callback(phone: string | null) — phone = null если пользователь отказал или таймаут
export function requestPhone(callback, timeoutMs = 30000) {
  if (typeof window === "undefined" || !window.WebApp) {
    callback(null);
    return;
  }

  let done = false;
  let timer = null;

  const handler = (data) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    window.WebApp.offEvent("WebAppRequestPhone", handler);
    callback(data?.phone || null);
  };

  timer = setTimeout(() => {
    if (done) return;
    done = true;
    window.WebApp.offEvent("WebAppRequestPhone", handler);
    callback(null);
  }, timeoutMs);

  window.WebApp.onEvent("WebAppRequestPhone", handler);
  window.WebApp.requestContact();
}

// ── Надёжное открытие ссылок ──────────────────────────────────────────────────
// Внутри настоящего MAX — используем bridge (initData непустой)
// В браузере / превью — window.open
export function openUrl(url) {
  if (!url) return;
  const inMAX = typeof window !== "undefined" &&
    window.WebApp?.openLink &&
    typeof window.WebApp.initData === "string" &&
    window.WebApp.initData.length > 0;
  if (inMAX) {
    window.WebApp.openLink(url);
  } else {
    window.open(url, "_blank");
  }
}

export default bridge;
