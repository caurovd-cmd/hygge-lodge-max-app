# 🌿 Hygge Lodge — MAX Mini-App

Полноценное мини-приложение для глэмпинга в мессенджере MAX с административной панелью.

## Структура проекта

```
glamping/
├── index.html              # Точка входа (MAX Bridge подключён здесь)
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx            # React точка монтирования
    ├── App.jsx             # Корневой компонент, роутинг
    ├── styles.css          # Глобальные стили
    ├── db/
    │   └── database.js     # 📦 База данных (localStorage)
    ├── hooks/
    │   └── useBridge.js    # MAX Bridge с fallback
    ├── components/
    │   └── UI.jsx          # Toast, Stars, Pills, Sheet, Empty, Confirm
    ├── pages/
    │   └── index.jsx       # Все страницы приложения
    └── admin/
        └── AdminPanel.jsx  # Полная админ-панель
```

## Разделы приложения

| Страница        | Описание |
|-----------------|----------|
| `main`          | Главная — слайдер + меню + домики |
| `homes`         | Каталог домиков с фильтрами |
| `home-detail`   | Детальная страница + кнопка бронирования |
| `services`      | Услуги: SPA, питание, активности |
| `wallet`        | Кошелёк: бонусы + сертификаты |
| `promos`        | Акции и промокоды |
| `howtoget`      | Как добраться, маршруты |
| `reviews`       | Отзывы + форма с модерацией |
| `contacts`      | Контакты + форма обратного звонка |
| `account`       | Личный кабинет + история броней |

## Кнопка «Забронировать»

Кнопка **не открывает встроенную форму** — она перенаправляет на внешний виджет бронирования. URL настраивается в Админ → Настройки → URL виджета бронирования.

По умолчанию: `https://richlifevillage.ru/booking/?znms_widget_open=5101`

## Запуск

```bash
npm install
npm run dev
```

Приложение откроется на `http://localhost:3000`

## Деплой

```bash
npm run build
# Содержимое папки dist/ выложить на хостинг
```

## Подключение к MAX

1. Зарегистрировать организацию на [business.max.ru](https://business.max.ru)
2. Создать мини-приложение в панели партнёра
3. Указать URL вашего задеплоенного приложения
4. Скрипт `https://st.max.ru/js/max-web-app.js` уже подключён в `index.html`

## База данных

Используется `localStorage` — все данные сохраняются между сессиями.

**Таблицы:**
- `homes` — домики
- `services` — услуги
- `promos` — акции
- `certs` — сертификаты
- `reviews` — отзывы (с флагом `approved`)
- `slides` — слайды главной
- `contacts` — контакты и настройки бронирования
- `settings` — настройки приложения

**API базы данных:**
```js
import db from "./src/db/database.js";

db.getAll("homes")           // все записи
db.getActive("homes")        // только active: true
db.getById("homes", id)      // по ID
db.insert("homes", data)     // создать (id генерируется автоматически)
db.update("homes", id, patch) // обновить поля
db.delete("homes", id)       // удалить
db.subscribe("homes", fn)    // подписка на изменения
db.reset()                   // сброс к начальным данным
```
