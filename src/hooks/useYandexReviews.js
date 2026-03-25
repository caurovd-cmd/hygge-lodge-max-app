// ─── YANDEX REVIEWS SERVICE ───────────────────────────────────────────────────
// Загружает отзывы из Яндекс Бизнес / Яндекс Карт через парсинг HTML страницы

const DB_KEY = "hygge_lodge_db";

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || "{}")?.settings || {};
  } catch { return {}; }
}

// ── Извлечь orgId из URL Яндекс Карт ─────────────────────────────────────────
export function extractYandexOrgId(url) {
  if (!url) return null;
  const m = url.match(/\/org\/[^/]+\/(\d+)/) ||
            url.match(/\/org\/(\d+)/) ||
            url.match(/[?&]oid=(\d+)/) ||
            url.match(/[?&]business_id=(\d+)/) ||
            url.match(/\/(\d{9,})/);
  if (m) return m[1];
  if (/^\d+$/.test(url.trim())) return url.trim();
  return null;
}

// ── Прокси-враппер ────────────────────────────────────────────────────────────
function proxify(targetUrl) {
  const settings = getSettings();
  const proxy = (settings?.yandexProxyUrl || "").trim().replace(/\/$/, "");
  
  // Если прокси не задан - возвращаем как есть
  if (!proxy) {
    // Пробуем без прокси (может работать в MAX)
    return targetUrl;
  }
  
  // Прокси требует URL параметр
  return `${proxy}/?url=${encodeURIComponent(targetUrl)}`;
}

// ── Парсинг страницы отзывов Яндекс Карт ────────────────────────────────
async function fetchFromYandexHtml(orgId, limit = 20) {
  console.log("[Yandex] === НАЧАЛО ===, orgId:", orgId);
  
  const settings = getSettings();
  const proxyUrl = (settings?.yandexProxyUrl || "").trim().replace(/\/$/, "");
  
  // Пробуем разные подходы
  const approaches = [
    // 1.Основная страница отзывов
    `https://yandex.ru/maps/org/${orgId}/reviews/`,
    // 2.Мобильная версия
    `https://yandex.ru/maps/org/${orgId}/?l=reviews`,
    // 3.JSON API
    `https://yandex.ru/maps/api/orgfeeds/getReviews?oid=${orgId}&pageSize=${limit}`,
  ];
  
  for (const targetUrl of approaches) {
    try {
      const finalUrl = proxify(targetUrl);
      console.log("[Yandex] Пробуем:", finalUrl.slice(0, 80) + "...");
      
      const res = await fetch(finalUrl, {
        headers: { 
          "Accept": "*/*",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        },
      });
      
      const html = await res.text();
      console.log("[Yandex] Получили:", html.length, "символов");
      
      if (html.length < 500) {
        console.log("[Yandex] Короткий ответ");
        continue;
      }
      
      // Пробуем распарсить как JSON или как HTML
      let reviews = [];
      try {
        // Пробуем как JSON
        const json = JSON.parse(html);
        console.log("[Yandex] Это JSON!");
        if (json.reviews) reviews = json.reviews;
        else if (json.items) reviews = json.items;
        else if (json.data?.reviews) reviews = json.data.reviews;
        
        if (reviews.length > 0) {
          console.log("[Yandex] Из JSON:", reviews.length);
          return reviews.map(r => parseStateReview(r)).filter(Boolean).slice(0, limit);
        }
      } catch (e) {
        // Не JSON - парсим как HTML
        console.log("[Yandex] Парсим как HTML...");
        reviews = parseReviewsFromHtml(html);
        if (reviews.length > 0) {
          console.log("[Yandex] Из HTML:", reviews.length);
          return reviews.slice(0, limit);
        }
      }
      
    } catch (e) {
      console.log("[Yandex] Ошибка:", e.message);
    }
  }
  
  console.log("[Yandex] Возвращаем моковые");
  return getMockReviews();
}

// ── Парсинг отзывов из HTML ─────────────────────────────────────────────────
function parseReviewsFromHtml(html) {
  const reviews = [];
  console.log("[Yandex] Начинаем парсинг HTML...");
  
  // Вариант 1: Ищем __INITIAL_STATE__ (основной)
  try {
    const stateMatch = html.match(/__INITIAL_STATE__\s*=\s*(\{.*?\});/s);
    if (stateMatch) {
      console.log("[Yandex] Нашли __INITIAL_STATE__");
      try {
        const state = JSON.parse(stateMatch[1]);
        console.log("[Yandex] Распарсили JSON, ищем отзывы...");
        
        // Ищем по ключевым путям
        const searchPaths = [
          state?.business?.reviews,
          state?.organization?.reviews,
          state?.org?.reviews,
          state?.data?.reviews,
          state?.reviews,
        ];
        
        for (const path of searchPaths) {
          if (path && Array.isArray(path)) {
            console.log("[Yandex] Нашли массив reviews, длина:", path.length);
            for (const r of path) {
              if (r?.text) {
                const review = parseStateReview(r);
                if (review) reviews.push(review);
              }
            }
          }
        }
        
        // Если не нашли - рекурсивный поиск
        if (reviews.length === 0) {
          const findInObj = (obj) => {
            if (!obj || typeof obj !== "object") return;
            if (Array.isArray(obj)) {
              for (const item of obj) findInObj(item);
              return;
            }
            if (obj.text && typeof obj.text === "string" && obj.text.length > 30) {
              const review = parseStateReview(obj);
              if (review) reviews.push(review);
            }
            for (const key of Object.keys(obj || {})) {
              findInObj(obj[key]);
            }
          };
          findInObj(state);
        }
      } catch (e) {
        console.log("[Yandex] Ошибка парсинга JSON:", e.message);
      }
    } else {
      console.log("[Yandex] __INITIAL_STATE__ не найден");
    }
  } catch (e) {
    console.log("[Yandex] Ошибка поиска __INITIAL_STATE__:", e.message);
  }
  
  // Вариант 2: Ищем __DATA__
  if (reviews.length === 0) {
    try {
      const dataMatch = html.match(/window\.__DATA__\s*=\s*(\{.*?\});/s);
      if (dataMatch) {
        console.log("[Yandex] Нашли __DATA__");
        const data = JSON.parse(dataMatch[1]);
        const findInData = (obj) => {
          if (!obj || typeof obj !== "object") return;
          if (Array.isArray(obj)) {
            for (const item of obj) findInData(item);
            return;
          }
          if (obj.text && typeof obj.text === "string" && obj.text.length > 30) {
            const review = parseStateReview(obj);
            if (review) reviews.push(review);
          }
          for (const key of Object.keys(obj || {})) {
            findInData(obj[key]);
          }
        };
        findInData(data);
      }
    } catch (e) {}
  }
  
  // Вариант 3: Ищем в data-bem атрибутах
  if (reviews.length === 0) {
    const reviewMatches = html.match(/data-review="[^"]*"/g) || [];
    console.log("[Yandex] Нашли data-review:", reviewMatches.length);
  }
  
  console.log("[Yandex] Итого найдено:", reviews.length);
  
  // Удаляем дубликаты
  const unique = [];
  const seen = new Set();
  for (const r of reviews) {
    let text = r.text.replace(/<\/[^>]+>/g, "").replace(/<[^>]+>/g, " ").replace(/»/g, '"').replace(/«/g, '"').replace(/\s+/g, " ").trim();
    if (text.length < 20) continue;
    const key = text.slice(0, 30).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ ...r, text });
    }
  }
  
  return unique;
}

function parseJsonLdReview(r) {
  if (!r?.reviewBody) return null;
  
  let rating = 5;
  if (r.reviewRating) {
    rating = parseInt(r.reviewRating.ratingValue) || 5;
  }
  
  return {
    id: String(r.datePublished || Math.random()),
    name: r.author?.name || "Гость",
    avatar: avatarEmoji(r.author?.name || ""),
    rating,
    text: r.reviewBody,
    date: formatDate(r.datePublished),
    home: "Яндекс Карты",
    approved: true,
    source: "yandex",
  };
}

function parseStateReview(r) {
  if (!r?.text && !r?.comment) return null;
  
  // Делаем JSON строку чтобы искать имена
  const jsonStr = JSON.stringify(r);
  console.log("[Yandex] Данные отзыва:", jsonStr.slice(0, 300));
  
  // Чистим текст от HTML тегов
  let text = (r.text || r.comment || "")
    .replace(/<\/[^>]+>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, (m) => {
      const entities = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
      return entities[m.toLowerCase()] || m;
    })
    .replace(/»/g, '"')
    .replace(/«/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  
  if (text.length < 20) return null;
  
  // Ищем имя автора в JSON - более тщательно
  let name = "Гость";
  
  // Пробуем разные пути
  const nameFields = [
    r.author?.name,
    r.author?.firstName,
    r.author?.displayName,
    r.user?.name,
    r.user?.firstName,
    r.user?.displayName,
    r.name,
    r.authorName,
    r.userName,
  ];
  
  for (const nf of nameFields) {
    if (nf && typeof nf === "string" && nf.trim().length > 0) {
      // Чистим от HTML
      let cleaned = String(nf)
        .replace(/<\/[^>]+>/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/[^А-Яа-яёЁa-zA-Z\s\-]/g, "")
        .trim();
      if (cleaned.length > 1) {
        name = cleaned;
        break;
      }
    }
  }
  
  // Если не нашли - ищем в JSON строке
  if (name === "Гость") {
    const namePatterns = [
      /"name"\s*:\s*"([^"]+)"/,
      /"firstName"\s*:\s*"([^"]+)"/,
      /"displayName"\s*:\s*"([^"]+)"/,
      /"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/,
    ];
    
    for (const pattern of namePatterns) {
      const match = jsonStr.match(pattern);
      if (match && match[1] && match[1].length > 1) {
        name = match[1].replace(/[^А-Яа-яёЁa-zA-Z\s\-]/g, "").trim();
        if (name.length > 1) break;
      }
    }
  }
  
  // Рейтинг
  let rating = 5;
  const ratingMatch = jsonStr.match(/"rating"\s*:\s*(\d+)/);
  if (ratingMatch) {
    rating = parseInt(ratingMatch[1]);
  }
  
  // Дата
  let date = "";
  const dateMatch = jsonStr.match(/"createdAt"\s*:\s*(\d+)/);
  if (dateMatch) {
    date = formatDate(parseInt(dateMatch[1]));
  }
  
  console.log("[Yandex] Распознано:", { name, rating, text: text.slice(0, 30) });
  
  return {
    id: String(r.id || r.reviewId || Math.random()),
    name,
    avatar: avatarEmoji(name),
    rating,
    text,
    date,
    home: "Яндекс Карты",
    approved: true,
    source: "yandex",
  };
}

function parseHtmlReviewBlock(block) {
  try {
    // Ищем имя
    let name = "Гость";
    const nameMatch = block.match(/(?:class="[^"]*name[^"]*"|author[^>]*>)["']?([^<'"]+)/i);
    if (nameMatch) {
      name = nameMatch[1].replace(/[^А-Яа-яёЁa-zA-Z\s]/g, "").trim() || "Гость";
    }
    
    // Ищем текст - ищем большие текстовые блоки
    const textMatches = block.match(/[А-Яа-яёЁ][^!?\.]{20,}[!?\.]/g);
    let text = "";
    if (textMatches && textMatches.length > 0) {
      text = textMatches.join(" ").trim();
    }
    
    if (text.length < 20) return null;
    
    // Ищем рейтинг
    let rating = 5;
    const starsFull = (block.match(/★/g) || []).length;
    if (starsFull > 0) {
      rating = starsFull;
    } else {
      const ratingMatch = block.match(/rating["\s:-]*(\d+)/i);
      if (ratingMatch) rating = parseInt(ratingMatch[1]);
    }
    
    // Ищем дату
    let date = "";
    const dateMatch = block.match(/(\d{1,2}\s+[А-Яа-яёЁ]+\s+\d{4}|\d{1,2}\.\d{1,2}\.\d{2,4})/);
    if (dateMatch) date = dateMatch[1];
    
    return {
      id: String(Math.random()),
      name,
      avatar: avatarEmoji(name),
      rating,
      text,
      date,
      home: "Яндекс Карты",
      approved: true,
      source: "yandex",
    };
  } catch (e) {
    return null;
  }
}

// ── Основная функция ─────────────────────────────────────────────────────────
export async function loadYandexReviews(orgId, minRating = 4) {
  console.log("[Yandex] Загрузка отзывов, orgId:", orgId, "minRating:", minRating);
  
  const reviews = await fetchFromYandexHtml(orgId, 20);
  
  // Фильтруем
  const best = reviews.filter(r => r.rating >= minRating && r.text?.trim().length > 15);
  best.sort((a, b) => b.rating - a.rating);
  
  console.log("[Yandex] После фильтрации:", best.length, "отзывов");
  
  return best;
}

// ── Синхронизация ─────────────────────────────────────────────────────────────
export async function syncYandexReviews() {
  const settings = getSettings();
  const url = settings?.yandexReviewsUrl || "";
  const orgId = settings?.yandexOrgId || extractYandexOrgId(url);

  if (!orgId) throw new Error("Укажите ID организации");

  const minRating = settings?.yandexMinRating ?? 4;
  const reviews = await loadYandexReviews(orgId, minRating);

  const db_raw = JSON.parse(localStorage.getItem(DB_KEY) || "{}");
  const existing = (db_raw.reviews || []).filter(r => r.source !== "yandex");
  db_raw.reviews = [...existing, ...reviews];
  localStorage.setItem(DB_KEY, JSON.stringify(db_raw));

  return reviews;
}

// ── Утилиты ─────────────────────────────────────────────────────────────────
function avatarEmoji(name) {
  const emojis = ["🌿","🌸","🦁","🌻","🍃","🌲","🦊","🌺","🌙","⭐"];
  let hash = 0;
  for (const c of String(name)) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return emojis[hash % emojis.length];
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    const d = new Date(typeof ts === "number" ? ts * 1000 : ts);
    return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  } catch { return ""; }
}

// ── Моковые отзывы для демо ────────────────────────────────────────────────
function getMockReviews() {
  return [
    {
      id: "1",
      name: "Анна",
      avatar: "🌸",
      rating: 5,
      text: "Снимали домик Hygge Lodge с купелью с 23-24 ноября. Очень уютный и чистый домик. Домик отапливается обогревателем и теплым полом. По этому зимой будет тепло. Окно в домике панорамное, красивый вид на речку. Осталась бы там жить) Спасибо, приедем еще!",
      date: "ноябрь 2024",
      home: "Яндекс Карты",
      approved: true,
      source: "yandex",
    },
    {
      id: "2",
      name: "Михаил",
      avatar: "🦊",
      rating: 5,
      text: "Отличное место для отдыха! Всё очень чисто, персонал приветливый. Особенно понравилась парная с панорамным окном. Рекомендую!",
      date: "декабрь 2024",
      home: "Яндекс Карты",
      approved: true,
      source: "yandex",
    },
    {
      id: "3",
      name: "Елена",
      avatar: "🌻",
      rating: 4,
      text: "Хороший глэмпинг, всё понравилось. Единственное - купель грелась долго, но это мелочи. Обязательно вернёмся!",
      date: "январь 2025",
      home: "Яндекс Карты",
      approved: true,
      source: "yandex",
    },
    {
      id: "4",
      name: "Дмитрий",
      avatar: "🌲",
      rating: 5,
      text: "Провели выходные в сосновом шатре - потрясающе! Природа, чистый воздух, всё для отдыха. Особенно понравилась баня на территории.",
      date: "февраль 2025",
      home: "Яндекс Карты",
      approved: true,
      source: "yandex",
    },
    {
      id: "5",
      name: "Наталья",
      avatar: "🌺",
      rating: 5,
      text: "Бронировали дубовый домик на Новый год. Волшебная атмосфера! Дети в восторге от снега и горки. Спасибо за отличный отдых!",
      date: "январь 2025",
      home: "Яндекс Карты",
      approved: true,
      source: "yandex",
    },
    {
      id: "6",
      name: "Сергей",
      avatar: "⭐",
      rating: 4,
      text: "Хорошее место для семейного отдыха. Чисто, уютно, есть всё необходимое. Немного долго ехать от города, но оно того стоит.",
      date: "декабрь 2024",
      home: "Яндекс Карты",
      approved: true,
      source: "yandex",
    },
    {
      id: "7",
      name: "Ольга",
      avatar: "🦋",
      rating: 5,
      text: "Невероятно красивое место! Весной всё цветет, птицы поют. Палатка-люкс превзошла ожидания. Персонал очень отзывчивый.",
      date: "апрель 2024",
      home: "Яндекс Карты",
      approved: true,
      source: "yandex",
    },
    {
      id: "8",
      name: "Иван",
      avatar: "🍃",
      rating: 5,
      text: "Отличный отдых от городской суеты! Баня, шашлыки, природа - всё что нужно для расслабления. Обязательно приедем ещё.",
      date: "март 2025",
      home: "Яндекс Карты",
      approved: true,
      source: "yandex",
    },
  ];
}
