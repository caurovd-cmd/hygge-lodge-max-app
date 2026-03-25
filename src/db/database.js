// ─── GLAMPING DATABASE LAYER ─────────────────────────────────────────────────
// Персистентная база данных на основе localStorage
// Автоматически инициализируется при первом запуске

const DB_KEY = "hygge_lodge_db";
const DB_VERSION = "1.0.0";

// ── НАЧАЛЬНЫЕ ДАННЫЕ ──────────────────────────────────────────────────────────
const SEED_DATA = {
  version: DB_VERSION,
  homes: [
    {
      id: 1, name: "Hygge Lodge", type: "Геодом",
      price: 12000, priceWeekend: 15000,
      capacity: 2, area: 25, rating: 4.9, reviews: 47,
      active: true,
      desc: "Уютный геодом в окружении берёз. Панорамные окна, скандинавский интерьер, джакузи на террасе. Идеально для романтического отдыха.",
      amenities: ["🛁 Джакузи", "🔥 Камин", "📶 Wi-Fi", "🍽️ Кухня", "🌿 Терраса", "🅿️ Парковка"],
      photo: "https://images.unsplash.com/photo-1586375300773-8384e3e4916f?w=800&q=80",
    },
    {
      id: 2, name: "Сосновый шатёр", type: "Шатёр",
      price: 8500, priceWeekend: 11000,
      capacity: 4, area: 35, rating: 4.7, reviews: 31,
      active: true,
      desc: "Просторный шатёр для компании или семьи. Запах хвои, мягкий свет гирлянд и живой огонь костра — вечер, который запомнится.",
      amenities: ["🔥 Мангал", "📶 Wi-Fi", "🚿 Душ", "🪑 Веранда"],
      photo: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
    },
    {
      id: 3, name: "Дубовый домик", type: "Бревенчатый",
      price: 14500, priceWeekend: 18000,
      capacity: 2, area: 40, rating: 5.0, reviews: 23,
      active: true,
      desc: "Дубовый сруб с каменным камином. Ванна с травами, тёплая атмосфера, абсолютная тишина леса.",
      amenities: ["🔥 Камин", "🛁 Ванна с травами", "🍽️ Кухня", "📶 Wi-Fi", "🌿 Терраса", "🔥 Мангал"],
      photo: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    },
    {
      id: 4, name: "Лофт на дереве", type: "Трибэй",
      price: 16000, priceWeekend: 21000,
      capacity: 2, area: 20, rating: 4.8, reviews: 18,
      active: true,
      desc: "Парящий над лесом лофт на высоте 6 метров. Гамак на террасе, рассветы над кронами — непередаваемый опыт.",
      amenities: ["📶 Wi-Fi", "☕ Мини-кухня", "🌿 Терраса", "🌴 Гамак"],
      photo: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    },
  ],
  services: [
    { id: 1, name: "SPA «Лесная фея»", price: 4500, duration: "2 ч", emoji: "✨", desc: "Обёртывание травами, аромамассаж, чайная церемония", cat: "SPA", active: true },
    { id: 2, name: "Романтический ужин у костра", price: 6800, duration: "3 ч", emoji: "🕯️", desc: "Авторское меню шефа, дрова, оформление, шампанское", cat: "Питание", active: true },
    { id: 3, name: "Лесная баня с травами", price: 3200, duration: "3 ч", emoji: "🧖", desc: "Дровяная баня, веники, берёзовый квас, купель", cat: "SPA", active: true },
    { id: 4, name: "Конная прогулка", price: 2800, duration: "1.5 ч", emoji: "🐎", desc: "Верховая прогулка по лесным тропам с инструктором", cat: "Активности", active: true },
    { id: 5, name: "Авторский завтрак в домике", price: 1900, duration: "—", emoji: "🍳", desc: "Деревенские яйца, блины, ягоды, травяной чай", cat: "Питание", active: true },
    { id: 6, name: "Йога на рассвете", price: 1200, duration: "1 ч", emoji: "🧘", desc: "Групповая практика на лесной поляне", cat: "Активности", active: true },
  ],
  promos: [
    { id: 1, title: "Будни — тишина и скидка", discount: "−20%", code: "WEEKDAY20", until: "30 апреля 2025", emoji: "🌙", desc: "Бронирование с понедельника по четверг — минус 20% на все домики.", color: "#1e3a1e", active: true },
    { id: 2, title: "Раннее бронирование", discount: "−15%", code: "EARLY15", until: "1 июня 2025", emoji: "🌅", desc: "Забронируйте за 30 дней и сэкономьте 15%.", color: "#2a3020", active: true },
    { id: 3, title: "Подарок паре", discount: "Бесплатно", code: "COUPLE", until: "14 мая 2025", emoji: "💚", desc: "При бронировании на 2 ночи — романтический ужин в подарок!", color: "#1a2f2f", active: true },
  ],
  certs: [
    { id: 1, value: 5000, label: "Маленький лесной подарок", emoji: "🌿", active: true },
    { id: 2, value: 10000, label: "Лесной выходной", emoji: "🌲", active: true },
    { id: 3, value: 20000, label: "Романтический уикенд", emoji: "🌕", active: true },
    { id: 4, value: 50000, label: "Недельное уединение", emoji: "✨", active: true },
  ],
  reviews: [
    { id: 1, name: "Ольга М.", home: "Hygge Lodge", rating: 5, text: "Восхитительное место! Джакузи под звёздным небом — незабываемо. Вернёмся обязательно.", date: "Март 2025", avatar: "🌸", approved: true },
    { id: 2, name: "Андрей К.", home: "Дубовый домик", rating: 5, text: "Идеальный отдых вдвоём. Камин, тишина, потрясающий завтрак.", date: "Февраль 2025", avatar: "🦁", approved: true },
    { id: 3, name: "Марина Д.", home: "Лофт на дереве", rating: 5, text: "Просыпаться выше крон деревьев, слышать птиц... Это магия.", date: "Март 2025", avatar: "🌻", approved: true },
    { id: 4, name: "Семья Петровых", home: "Сосновый шатёр", rating: 4, text: "Дети в восторге от бани и мангала. Отдохнули на 100%!", date: "Январь 2025", avatar: "🌿", approved: true },
  ],
  bookings: [
    { id: 1, homeId: 1, homeName: "Hygge Lodge",    dateFrom: "14 мар 2025", dateTo: "16 мар 2025", nights: 2, price: 24000, status: "done"     },
    { id: 2, homeId: 3, homeName: "Дубовый домик",  dateFrom: "31 янв 2025", dateTo: "2 фев 2025",  nights: 2, price: 29000, status: "done"     },
    { id: 3, homeId: 2, homeName: "Сосновый шатёр", dateFrom: "22 апр 2025", dateTo: "24 апр 2025", nights: 2, price: 17000, status: "upcoming" },
  ],
  guestProfile: {
    bonuses: 2650,
    totalNights: 4,
    totalVisits: 2,
    phone: "",           // пусто → показывается экран авторизации
    name: "",
    amoContactId: null,
    favorites: [],
  },
  contacts: {
    phone: "+7 (916) 123-45-67",
    email: "hello@hygge-lodge.ru",
    maxUsername: "@hygge_lodge",
    address: "МО, Сергиево-Посадский р-н, урочище «Еловый ключ»",
    coords: "56.4123, 38.1456",
    distance: "78 км от Москвы",
    workHours: "Ежедневно 9:00–21:00",
    bookingUrl: "https://richlifevillage.ru/booking/?znms_widget_open=5101",
  },
  slides: [
    { id: 1, title: "Hygge Lodge", sub: "открыл двери для гостей!", bg: "https://images.unsplash.com/photo-1586375300773-8384e3e4916f?w=800&q=80", active: true },
    { id: 2, title: "Берёзовая сфера", sub: "джакузи под звёздами ✨", bg: "https://images.unsplash.com/photo-1618245318763-453825cd2d83?w=800&q=80", active: true },
    { id: 3, title: "Лесная баня", sub: "дровяная баня и купель 🌿", bg: "https://images.unsplash.com/photo-1544476915-ed1370594142?w=800&q=80", active: true },
  ],
  settings: {
    siteName: "Hygge Lodge",
    siteSubtitle: "Глэмпинг",
    adminPassword: "admin123",
    guestPassword: "hygge2025",  // пароль для входа в ЛК гостя (когда AmoCRM выключен)
    // Список Telegram user ID, которым разрешён вход в админку.
    // Пустой массив = первый запуск, кнопка доступна всем для первоначальной настройки.
    adminIds: [],
    // Яндекс Карты — отзывы
    yandexReviewsUrl: "", // ссылка на страницу отзывов вашей организации
    yandexOrgId:      "", // числовой ID организации (извлекается из URL автоматически)
    yandexMinRating:  4,  // минимальный рейтинг для показа (4 или 5)
    // Программа лояльности
    loyalty: {
      source: "internal", // "internal" | "amocrm"
      bonusPercent: 5,    // % от суммы брони начисляется бонусами
      levels: [
        { name: "Новичок",    emoji: "🌱", minNights: 0,  discount: 0,  perks: ["Добро пожаловать в Hygge Lodge!"] },
        { name: "Постоянный", emoji: "🏕️", minNights: 3,  discount: 5,  perks: ["Скидка 5% на все домики", "Приоритетный ранний заезд"] },
        { name: "VIP",        emoji: "🌟", minNights: 10, discount: 10, perks: ["Скидка 10% на всё", "Поздний выезд бесплатно", "Приветственный набор при заезде"] },
      ],
    },
    // Настройки интеграции с AmoCRM
    amoCRM: {
      enabled: false,
      domain: "",       // например: yourcompany.amocrm.ru
      token: "",        // долгосрочный токен (Bearer)
      pipelineId: "",   // ID воронки для новых лидов
      statusId: "",     // ID статуса в воронке (необязательно)
    },
    telegram: {
      enabled: false,
      botToken: "",   // Bot token from @BotFather
      chatId: "",     // Group chat ID (e.g. -1001234567890)
    },
  },
};

// ── DATABASE API ──────────────────────────────────────────────────────────────
class Database {
  constructor() {
    this._key = DB_KEY;
    this._data = null;
    this._listeners = {};
    this._init();
  }

  _init() {
    try {
      const raw = localStorage.getItem(this._key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version === DB_VERSION) {
          // Версия совпадает — используем сохранённые данные,
          // но подтягиваем новые поля настроек (если их ещё нет)
          this._data = parsed;
          // Устанавливаем глобальный ключ
          if (typeof window !== "undefined") {
            window.__db_key = this._key;
          }
          this._migrateSettings();
          this._migrateData();
          return;
        }
      }
    } catch (e) {}
    // Первый запуск — seed
    this._data = JSON.parse(JSON.stringify(SEED_DATA));
    // Устанавливаем глобальный ключ
    if (typeof window !== "undefined") {
      window.__db_key = this._key;
    }
    this._persist();
  }

  // Добавляет отсутствующие поля из SEED_DATA.settings не затирая уже сохранённые
  _migrateSettings() {
    const seed = SEED_DATA.settings;
    const cur  = this._data.settings || {};
    let changed = false;
    for (const [k, v] of Object.entries(seed)) {
      if (!(k in cur)) { cur[k] = v; changed = true; }
      else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        // Вложенный объект — аналогично подтягиваем новые ключи
        for (const [sk, sv] of Object.entries(v)) {
          if (!(sk in (cur[k] || {}))) {
            cur[k] = cur[k] || {};
            cur[k][sk] = sv;
            changed = true;
          }
        }
      }
    }
    if (changed) { this._data.settings = cur; this._persist(); }
  }

  // Добавляет новые таблицы/ключи из SEED_DATA (не затирает существующие)
  _migrateData() {
    let changed = false;
    if (!this._data.bookings)      { this._data.bookings = SEED_DATA.bookings;           changed = true; }
    if (!this._data.guestProfile)  { this._data.guestProfile = SEED_DATA.guestProfile;   changed = true; }
    if (changed) this._persist();
  }

  _persist() {
    try {
      localStorage.setItem(this._key, JSON.stringify(this._data));
    } catch (e) {
      console.error("DB persist error:", e);
    }
  }

  _emit(table) {
    (this._listeners[table] || []).forEach(fn => fn(this._data[table]));
    (this._listeners["*"] || []).forEach(fn => fn(this._data));
  }

  subscribe(table, fn) {
    if (!this._listeners[table]) this._listeners[table] = [];
    this._listeners[table].push(fn);
    return () => { this._listeners[table] = this._listeners[table].filter(f => f !== fn); };
  }

  // ── CRUD ──────────────────────────────────────────
  getAll(table) {
    return JSON.parse(JSON.stringify(this._data?.[table] || []));
  }

  getById(table, id) {
    const list = this._data?.[table] || [];
    const item = list.find(i => i.id === id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  getActive(table) {
    return this.getAll(table).filter(i => i.active !== false);
  }

  get(key) {
    return JSON.parse(JSON.stringify(this._data?.[key] || null));
  }

  set(key, value) {
    if (!this._data) this._data = {};
    this._data[key] = value;
    this._persist();
    this._emit(key);
    return value;
  }

  insert(table, item) {
    if (!this._data) this._data = {};
    if (!this._data[table]) this._data[table] = [];
    const newItem = { ...item, id: Date.now() };
    this._data[table].push(newItem);
    this._persist();
    this._emit(table);
    return newItem;
  }

  update(table, id, patch) {
    if (!this._data?.[table]) return null;
    const idx = this._data[table].findIndex(i => i.id === id);
    if (idx === -1) return null;
    this._data[table][idx] = { ...this._data[table][idx], ...patch };
    this._persist();
    this._emit(table);
    return this._data[table][idx];
  }

  delete(table, id) {
    if (!this._data?.[table]) return;
    this._data[table] = this._data[table].filter(i => i.id !== id);
    this._persist();
    this._emit(table);
  }

  reset() {
    this._data = JSON.parse(JSON.stringify(SEED_DATA));
    this._persist();
    Object.keys(this._listeners).forEach(k => this._emit(k));
  }

  // Переключает базу на namespace нового отеля.
  // initName — если передан и база создаётся впервые,
  // используется как siteName вместо дефолтного "Hygge Lodge".
  switchTo(key, initName) {
    this._key = key;
    this._data = null;
    this._listeners = {};
    // Устанавливаем глобальный ключ для использования в сервисах
    if (typeof window !== "undefined") {
      window.__db_key = key;
    }
    this._init();
    // Если пространство создалось впервые (нет сохранённого имени) и передано имя — применяем
    if (initName && this._data?.settings?.siteName === SEED_DATA.settings.siteName) {
      this._data.settings.siteName = initName;
      this._data.settings.siteSubtitle = "Эко-отель";
      // Очищаем дефолтные объекты — у нового отеля своя база
      this._data.homes = [];
      this._data.services = [];
      this._data.promos = [];
      this._data.certs = SEED_DATA.certs;   // шаблоны сертификатов оставляем
      this._data.reviews = [];
      this._data.bookings = [];
      this._data.slides = [];
      this._persist();
    }
  }
}

// Синглтон
export const db = new Database();
export default db;
