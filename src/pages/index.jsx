import { useState, useEffect, useCallback } from "react";
import db from "../db/database.js";
import bridge, { openUrl, requestPhone } from "../hooks/useBridge.js";
import amocrm from "../hooks/useAmocrm.js";
import { Stars, Pills, Sheet, Empty } from "../components/UI.jsx";
import { syncYandexReviews } from "../hooks/useYandexReviews.js";
import { sendTelegramMessage } from "../hooks/useTelegram.js";

// ── PAGE: ГЛАВНАЯ ─────────────────────────────────────────────────────────────
export function PageMain({ goTo }) {
  const [slide, setSlide] = useState(0);
  const slides = db.getActive("slides");
  const homes  = db.getActive("homes");
  const promos = db.getActive("promos");
  const contacts = db.get("contacts");

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setSlide(s => (s + 1) % slides.length), 3500);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <>
      {/* SLIDER */}
      {slides.length > 0 && (
        <>
          <div className="slider">
            {slides.map((s, i) => (
              <div
                key={s.id}
                className={`slide${i === slide ? " active" : ""}`}
                style={{ backgroundImage: `url(${s.bg})` }}
              >
                <div className="slide-ov" />
                <div className="slide-ct">
                  <div className="slide-title">{s.title}</div>
                  <div className="slide-sub">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="dots">
            {slides.map((_, i) => (
              <div key={i} className={`dot${i === slide ? " active" : ""}`} onClick={() => setSlide(i)} />
            ))}
          </div>
        </>
      )}

      {/* МЕНЮ — ПРОФИЛЬ + КОШЕЛЁК */}
      <div style={{ margin: "4px 16px 0" }}>
        <div className="mlist">
          <div className="mi" onClick={() => goTo("account")}>
            <div className="mi-ico">👤</div>
            <div className="mi-tx"><div className="mi-nm">Мой профиль</div></div>
            <span className="mi-arr" />
          </div>
          <div className="mi" onClick={() => goTo("wallet")}>
            <div className="mi-ico">💳</div>
            <div className="mi-tx"><div className="mi-nm">Кошелёк</div><div className="mi-sb">Бонусы и сертификаты</div></div>
            <span className="mi-arr" />
          </div>
        </div>
      </div>

      {/* МЕНЮ — РАЗДЕЛЫ */}
      <div style={{ margin: "10px 16px 0" }}>
        <div className="mlist">
          {[
            { page: "homes",    ico: "🏡", nm: "Номерной фонд",          sb: `${homes.length} домика` },
            { page: "services", ico: "✨", nm: "Услуги",                  sb: "SPA, активности, питание" },
            { page: "promos",   ico: "🏷️", nm: "Акции",                  sb: `${promos.length} активных предложения` },
            { page: "certs",    ico: "🎁", nm: "Подарочный сертификат",   sb: null },
            { page: "howtoget", ico: "📍", nm: "Как добраться",           sb: contacts?.distance || "" },
            { page: "reviews",  ico: "⭐", nm: "Отзывы гостей",           sb: "Средняя оценка 4.9" },
            { page: "contacts", ico: "📞", nm: "Контакты",                sb: null },
          ].map(item => (
            <div key={item.page} className="mi" onClick={() => goTo(item.page)}>
              <div className="mi-ico">{item.ico}</div>
              <div className="mi-tx">
                <div className="mi-nm">{item.nm}</div>
                {item.sb && <div className="mi-sb">{item.sb}</div>}
              </div>
              <span className="mi-arr" />
            </div>
          ))}
        </div>
      </div>

      {/* ДОМИКИ — БЫСТРЫЙ ДОСТУП */}
      <div style={{ padding: "16px 16px 0" }}>
        <div className="sec-header">
          <span className="sec-title">Домики</span>
          <span className="sec-link" onClick={() => goTo("homes")}>Все →</span>
        </div>
      </div>
      <div className="hscroll">
        {homes.map(h => (
          <div key={h.id} className="hcard" onClick={() => goTo("home-detail", h)}>
            <div className="hcard-img">
              <img src={h.photo} alt={h.name} onError={e => e.target.style.display = "none"} />
              <span className="hcard-badge">{h.type}</span>
            </div>
            <div className="hcard-body">
              <div className="hcard-name">{h.name}</div>
              <div className="hcard-row">
                <div className="hcard-price">от {Number(h.price).toLocaleString("ru")} ₽<small>/ночь</small></div>
                <div className="hcard-rating">⭐ {h.rating}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 8 }} />
    </>
  );
}

// ── PAGE: СПИСОК ДОМИКОВ ──────────────────────────────────────────────────────
export function PageHomes({ goTo }) {
  const homes = db.getActive("homes");
  const types = ["Все", ...new Set(homes.map(h => h.type))];
  const [filter, setFilter] = useState("Все");
  const list = filter === "Все" ? homes : homes.filter(h => h.type === filter);

  return (
    <div style={{ padding: "0 16px" }}>
      <div className="sec-title" style={{ padding: "16px 0 12px" }}>Номерной фонд</div>
      <Pills items={types} active={filter} onChange={setFilter} />
      {list.map(h => (
        <div
          key={h.id}
          style={{ background: "var(--white)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: 12, boxShadow: "var(--sh)", cursor: "pointer" }}
          onClick={() => goTo("home-detail", h)}
        >
          <div style={{ height: 180, overflow: "hidden", position: "relative" }}>
            <img src={h.photo} alt={h.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
            <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(255,255,255,.92)", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: "var(--green)" }}>{h.type}</span>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{h.name}</div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 8 }}>
              👥 до {h.capacity} чел. · 📐 {h.area} м² · ⭐ {h.rating} ({h.reviews})
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {(h.amenities || []).slice(0, 4).map(a => <span key={a} className="badge">{a}</span>)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>
                от {Number(h.price).toLocaleString("ru")} ₽
                <span style={{ fontSize: 12, color: "var(--t2)", fontWeight: 400 }}>/ночь</span>
              </span>
              <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>Подробнее ›</span>
            </div>
          </div>
        </div>
      ))}
      <div style={{ height: 16 }} />
    </div>
  );
}

// ── PAGE: ДЕТАЛИ ДОМИКА ───────────────────────────────────────────────────────
export function PageHomeDetail({ home, onBack }) {
  const contacts = db.get("contacts");
  // URL бронирования: сначала индивидуальный для домика, потом глобальный из Настроек
  const bookingUrl = home.bookingUrl || contacts?.bookingUrl || "";

  const openBooking = () => openUrl(bookingUrl);

  const minPrice = home.priceWeekend
    ? Math.min(Number(home.price), Number(home.priceWeekend))
    : Number(home.price);

  return (
    <>
      <div className="det-photo">
        <img src={home.photo} alt={home.name} onError={e => e.target.style.display = "none"} />
        <button className="det-back" onClick={onBack}>←</button>
      </div>
      <div className="det-body">
        <div className="det-type">{home.type}</div>
        <div className="det-name">{home.name}</div>
        <div className="det-meta">
          <span className="meta-chip">⭐ {home.rating} ({home.reviews} отз.)</span>
          <span className="meta-chip">👥 до {home.capacity} чел.</span>
          <span className="meta-chip">📐 {home.area} м²</span>
        </div>
        <p className="det-desc">{home.desc}</p>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Удобства</div>
        <div className="amenities">
          {(home.amenities || []).map(a => <div key={a} className="amenity">{a}</div>)}
        </div>
        <div className="price-card">
          {home.price && (
            <div className="price-row">
              <span className="price-label">Будни (Пн–Чт)</span>
              <span className="price-value">от {Number(home.price).toLocaleString("ru")} ₽</span>
            </div>
          )}
          {home.priceWeekend && (
            <div className="price-row">
              <span className="price-label">Выходные (Пт–Вс)</span>
              <span className="price-value">от {Number(home.priceWeekend).toLocaleString("ru")} ₽</span>
            </div>
          )}
          <div className="price-note">Стоимость за ночь, включая все сборы</div>
        </div>
        {/* КНОПКА БРОНИРОВАНИЯ — переходит на внешний виджет */}
        {bookingUrl ? (
          <>
            <button className="btn btn-green" onClick={openBooking}>
              🗓 Забронировать — от {minPrice.toLocaleString("ru")} ₽/ночь
            </button>
            <div style={{ textAlign: "center", fontSize: 11, color: "var(--t3)", marginTop: 8 }}>
              Вы будете перенаправлены на страницу бронирования
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", fontSize: 13, color: "var(--t2)", padding: "16px", background: "var(--bg)", borderRadius: "var(--r-sm)" }}>
            Для бронирования свяжитесь с нами по телефону
          </div>
        )}
      </div>
    </>
  );
}

// ── PAGE: УСЛУГИ ──────────────────────────────────────────────────────────────
export function PageServices({ showToast }) {
  const services = db.getActive("services");
  const cats = ["Все", ...new Set(services.map(s => s.cat))];
  const [cat, setCat] = useState("Все");
  const list = cat === "Все" ? services : services.filter(s => s.cat === cat);

  return (
    <div style={{ padding: "0 16px" }}>
      <div className="sec-title" style={{ padding: "16px 0 4px" }}>Услуги</div>
      <p className="sec-intro">Дополните отдых — SPA, гастрономия, активности на природе.</p>
      <Pills items={cats} active={cat} onChange={setCat} />
      {list.length === 0 && <Empty icon="✨" title="Услуги не найдены" />}
      {list.map(s => (
        <div key={s.id} className="svc">
          <div className="svc-ico">{s.emoji}</div>
          <div style={{ flex: 1 }}>
            <div className="svc-name">{s.name}</div>
            <div className="svc-desc">{s.desc}</div>
            <div className="svc-row">
              <span className="svc-price">{Number(s.price).toLocaleString("ru")} ₽</span>
              {s.duration !== "—" && <span className="svc-dur">· {s.duration}</span>}
              <button className="svc-btn" onClick={() => showToast(`${s.emoji} Добавлено к запросу`)}>
                + Добавить
              </button>
            </div>
          </div>
        </div>
      ))}
      <div style={{ height: 16 }} />
    </div>
  );
}

// ── PAGE: КОШЕЛЁК / СЕРТИФИКАТЫ ───────────────────────────────────────────────
export function PageWallet({ showToast }) {
  const certs = db.getActive("certs");
  const [modal, setModal] = useState(null);
  const [guestProfile, setGuestProfile] = useState(() => db.get("guestProfile") || { bonuses: 0 });
  const [certName, setCertName] = useState("");
  const [certWish, setCertWish] = useState("");
  const [certDelivery, setCertDelivery] = useState("Электронный (e-mail)");
  const [customAmount, setCustomAmount] = useState("");
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    return db.subscribe("guestProfile", setGuestProfile);
  }, []);

  const settings = db.get("settings");
  const amoOn = !!(settings?.amoCRM?.enabled && settings?.amoCRM?.domain && settings?.amoCRM?.token);

  const orderCert = async (cert) => {
    setOrdering(true);
    const s = db.get("settings");
    const tg = s?.telegram;
    const gp = db.get("guestProfile");

    if (tg?.enabled && tg?.botToken && tg?.chatId) {
      const amount = cert?.value ? `${Number(cert.value).toLocaleString("ru")} ₽` : `${Number(customAmount).toLocaleString("ru")} ₽`;
      const buyer = gp?.name || gp?.phone || "Гость";
      const phone = gp?.phone || "не указан";
      const text = [
        `🎁 <b>Новый заказ сертификата</b>`,
        ``,
        `💰 Номинал: <b>${amount}</b>`,
        cert?.label ? `📦 Тип: ${cert.label}` : null,
        `👤 Покупатель: ${buyer}`,
        `📞 Телефон: ${phone}`,
        certName ? `🎯 Кому: ${certName}` : null,
        certWish ? `💬 Пожелание: ${certWish}` : null,
        `📬 Доставка: ${certDelivery}`,
        ``,
        `🕐 ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (МСК)`,
      ].filter(Boolean).join("\n");

      try {
        await sendTelegramMessage(tg.botToken, tg.chatId, text);
      } catch (e) {
        console.error("[TG] Ошибка отправки:", e);
      }
    }

    setOrdering(false);
    setModal(null);
    setCertName(""); setCertWish(""); setCertDelivery("Электронный (e-mail)");
    showToast("🎁 Заявка принята! Свяжемся в ближайшее время.");
  };

  useEffect(() => {
    if (!amoOn || !guestProfile?.phone) return;
    (async () => {
      try {
        let contact = null;
        if (guestProfile.amoContactId) {
          const res = await amocrm._req("GET", `contacts/${guestProfile.amoContactId}?with=custom_fields_values`);
          contact = res ?? null;
        } else {
          contact = await amocrm.findContactByPhone(guestProfile.phone);
        }
        if (!contact) return;
        const { bonuses, totalNights } = amocrm.extractLoyaltyData(contact);
        const updated = {
          ...db.get("guestProfile"),
          bonuses,
          totalNights,
          amoContactId: contact.id ?? guestProfile.amoContactId,
          name: contact.name || guestProfile.name || "",
        };
        db.set("guestProfile", updated);
        setGuestProfile(updated);
      } catch (e) { console.error("[AmoCRM] Ошибка в кош:", e); }
    })();
  }, [amoOn, guestProfile?.phone]);

  return (
    <div style={{ padding: "0 16px" }}>
      <div className="sec-title" style={{ padding: "16px 0 4px" }}>Кошелёк</div>

      {/* БОНУСНЫЙ БАЛАНС */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Бонусный баланс</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: "var(--green)" }}>{(guestProfile?.bonuses || 0).toLocaleString("ru")} ₽</div>
        <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 4 }}>Доступно к использованию при бронировании</div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Подарочные сертификаты</div>
      <div className="cert-grid">
        {certs.map(c => (
          <div key={c.id} className="cert-card" onClick={() => setModal(c)}>
            <div className="cert-emoji">{c.emoji}</div>
            <div className="cert-value">{Number(c.value).toLocaleString("ru")} ₽</div>
            <div className="cert-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* СВОЙ НОМИНАЛ */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 16, boxShadow: "var(--sh)", marginTop: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Свой номинал</div>
        <p style={{ fontSize: 12, color: "var(--t2)", marginBottom: 12 }}>Введите любую сумму от 1 000 ₽</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="inp" placeholder="Сумма в рублях" type="number" min="1000" style={{ flex: 1 }}
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)} />
          <button className="btn btn-green" style={{ width: "auto", padding: "0 16px" }}
            disabled={ordering}
            onClick={() => orderCert(null)}>Купить</button>
        </div>
      </div>

      {/* МОДАЛКА ОФОРМЛЕНИЯ */}
      {modal && (
        <Sheet onClose={() => setModal(null)}>
          <div className="sheet-handle" />
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>{modal.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--green)" }}>{Number(modal.value).toLocaleString("ru")} ₽</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{modal.label}</div>
          </div>
          <div className="field"><label>Кому (имя)</label><input className="inp" placeholder="Имя получателя"
            value={certName} onChange={e => setCertName(e.target.value)} /></div>
          <div className="field"><label>Пожелание</label><textarea className="inp" placeholder="Текст поздравления..."
            value={certWish} onChange={e => setCertWish(e.target.value)} /></div>
          <div className="field"><label>Способ получения</label>
            <select className="inp" value={certDelivery} onChange={e => setCertDelivery(e.target.value)}>
              <option>Электронный (e-mail)</option>
              <option>Печатный (самовывоз)</option>
            </select>
          </div>
          <button className="btn btn-green" disabled={ordering} onClick={() => orderCert(modal)}>
            {ordering ? "Отправка…" : "Оформить сертификат"}
          </button>
        </Sheet>
      )}
      <div style={{ height: 16 }} />
    </div>
  );
}

// ── PAGE: АКЦИИ ───────────────────────────────────────────────────────────────
export function PagePromos({ showToast }) {
  const promos = db.getActive("promos");
  return (
    <div style={{ padding: "0 16px" }}>
      <div className="sec-title" style={{ padding: "16px 0 12px" }}>Акции и скидки</div>
      {promos.length === 0 && <Empty icon="🏷️" title="Нет активных акций" />}
      {promos.map(p => (
        <div key={p.id} className="promo-card" style={{ background: p.color }}
          onClick={() => showToast(`✓ Промокод скопирован: ${p.code}`)}>
          <div className="promo-badge">{p.discount}</div>
          <div className="promo-title">{p.emoji} {p.title}</div>
          <div className="promo-desc">{p.desc}</div>
          <div className="promo-code-row">
            <span className="promo-code">{p.code}</span>
            <span className="promo-until">до {p.until}</span>
          </div>
        </div>
      ))}
      <div style={{ height: 8 }} />
    </div>
  );
}

// ── PAGE: КАК ДОБРАТЬСЯ ───────────────────────────────────────────────────────
export function PageHowToGet() {
  const c = db.get("contacts") || {};
  const routes = [
    { i: "🚗", t: "На автомобиле", s: "М8 «Холмогоры», съезд на 72-м км → с. Хотьково. Бесплатная парковка." },
    { i: "🚂", t: "На электричке", s: "Ярославский вокзал → Хотьково (55 мин). Встречаем по запросу." },
    { i: "🚌", t: "Трансфер",      s: "Трансфер из Москвы от 2 500 ₽. Уточните при бронировании." },
  ];
  return (
    <div style={{ padding: "0 16px" }}>
      <div className="sec-title" style={{ padding: "16px 0 12px" }}>Как добраться</div>
      <div className="map-box" style={{ marginBottom: 12 }}>
        <div className="map-ph">🗺️</div>
        <div className="map-body">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            📍 {c.address || "Московская область"} · {c.distance || ""}
          </div>
          {routes.map(r => (
            <div key={r.t} className="route">
              <span className="route-ico">{r.i}</span>
              <div><div className="route-title">{r.t}</div><div className="route-sub">{r.s}</div></div>
            </div>
          ))}
        </div>
      </div>
      <button className="btn btn-green" onClick={() => bridge.openLink(`https://yandex.ru/maps/?text=${encodeURIComponent(c.address || "Hygge Lodge")}`)}>
        Открыть в Яндекс Картах
      </button>
      <div style={{ height: 16 }} />
    </div>
  );
}

// ── PAGE: ОТЗЫВЫ ──────────────────────────────────────────────────────────────
export function PageReviews({ showToast }) {
  const [allReviews, setAllReviews] = useState(() => (db.getAll("reviews") || []).filter(r => r.approved));
  const [form,    setForm]    = useState(false);
  const [loading, setLoading] = useState(false);

  const settings = db.get("settings") || {};
  const yandexUrl = settings.yandexReviewsUrl || "";
  const yandexOrgId = settings.yandexOrgId || "";
  const minRating = settings.yandexMinRating ?? 4;

  // Подписка на обновления БД (после синхронизации с Яндексом)
  useEffect(() => {
    return db.subscribe("reviews", updated => {
      setAllReviews((updated || []).filter(r => r.approved));
    });
  }, []);

  // Автозагрузка с Яндекса при первом открытии, если настроено
  useEffect(() => {
    if (!yandexOrgId || allReviews.some(r => r.source === "yandex")) return;
    setLoading(true);
    syncYandexReviews()
      .then(() => setAllReviews((db.getAll("reviews") || []).filter(r => r.approved)))
      .catch(() => {}) // тихий фейл — покажем кэш
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yandexOrgId]);

  // Показываем только лучшие отзывы (с Яндекса — уже отфильтрованы, ручные — все)
  const reviews = allReviews.filter(r => r.source === "yandex" ? r.rating >= minRating : true);
  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const handleRefresh = async () => {
    if (!yandexOrgId) { showToast("Укажите ссылку на Яндекс Карты в настройках"); return; }
    setLoading(true);
    try {
      const loaded = await syncYandexReviews();
      setAllReviews((db.getAll("reviews") || []).filter(r => r.approved));
      showToast(`✅ Обновлено: ${loaded.length} отзывов с Яндекса`);
    } catch (e) {
      showToast(`❌ ${e.message}`);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 12px" }}>
        <div className="sec-title" style={{ padding: 0 }}>Отзывы</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {yandexOrgId && (
            <button
              className="btn btn-sm btn-outline"
              onClick={handleRefresh}
              disabled={loading}
              style={{ fontSize: 12 }}
            >{loading ? "⏳" : "🔄"} Обновить</button>
          )}
          {yandexUrl && (
            <button
              className="btn btn-sm"
              style={{ background: "#fc3f1d", color: "#fff", border: "none", fontSize: 12 }}
              onClick={() => bridge.openLink(yandexUrl)}
            >Все на Я.Картах ↗</button>
          )}
        </div>
      </div>

      {/* РЕЙТИНГ */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 16, boxShadow: "var(--sh)", marginBottom: 14, display: "flex", gap: 20, alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: "var(--green)", lineHeight: 1 }}>{avg}</div>
          <Stars n={5} />
          <div style={{ fontSize: 11, color: "var(--t2)" }}>{reviews.length} отзывов</div>
          {yandexOrgId && (
            <div style={{ fontSize: 10, color: "#fc3f1d", marginTop: 3, fontWeight: 600 }}>Яндекс Карты</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map(n => {
            const cnt = reviews.filter(r => r.rating === n).length;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: "var(--t2)", width: 16 }}>{n}★</span>
                <div style={{ flex: 1, height: 6, background: "var(--bg)", borderRadius: 3 }}>
                  <div style={{ width: reviews.length ? `${Math.round(cnt / reviews.length * 100)}%` : "0%", height: "100%", background: "var(--green)", borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* СОСТОЯНИЕ ЗАГРУЗКИ */}
      {loading && (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--t2)", fontSize: 13 }}>
          ⏳ Загружаем лучшие отзывы с Яндекс Карт…
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <Empty icon="⭐" title="Пока нет отзывов"
          sub={yandexOrgId ? "Нажмите «Обновить» для загрузки с Яндекса" : "Будьте первым!"} />
      )}

      {reviews.map(r => (
        <div key={r.id} className="review">
          <div className="review-head">
            <div className="review-av">{r.avatar || "🌿"}</div>
            <div>
              <div className="review-name">{r.name}</div>
              <div className="review-meta">
                {r.home} · {r.date}
                {r.source === "yandex" && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: "#fc3f1d", fontWeight: 600 }}>Яндекс</span>
                )}
              </div>
            </div>
          </div>
          <Stars n={r.rating} />
          <div className="review-text">«{r.text}»</div>
        </div>
      ))}

      <button className="btn btn-green" style={{ marginTop: 8 }} onClick={() => setForm(true)}>
        ✍️ Оставить отзыв
      </button>
      {form && (
        <Sheet onClose={() => setForm(false)}>
          <div className="sheet-handle" />
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Ваш отзыв</div>
          <div className="field"><label>Домик</label>
            <select className="inp">
              {db.getActive("homes").map(h => <option key={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Отзыв</label><textarea className="inp" placeholder="Поделитесь впечатлениями..." /></div>
          <button className="btn btn-green" onClick={() => { setForm(false); showToast("🌿 Спасибо! Отзыв на модерации"); }}>
            Отправить
          </button>
        </Sheet>
      )}
      <div style={{ height: 16 }} />
    </div>
  );
}

// ── PAGE: КОНТАКТЫ ────────────────────────────────────────────────────────────
export function PageContacts({ showToast }) {
  const c = db.get("contacts") || {};
  const [callName, setCallName] = useState("");
  const [callPhone, setCallPhone] = useState("");
  const [sending, setSending] = useState(false);

  const handleCallRequest = async () => {
    if (!callName.trim() || !callPhone.trim()) {
      showToast("Заполните имя и телефон");
      return;
    }
    setSending(true);
    try {
      if (amocrm.isEnabled) {
        const user = bridge.initDataUnsafe?.user;
        await amocrm.createContactAndLead({
          contactName: callName.trim(),
          phone: callPhone.trim(),
          telegramId: user?.id,
          username: user?.username,
          leadName: `Обратный звонок — ${callName.trim()}`,
          tags: ["обратный звонок"],
          note: `Заявка из MAX-приложения Hygge Lodge\nИмя: ${callName.trim()}\nТелефон: ${callPhone.trim()}`,
        });
      }
      showToast("📞 Перезвоним в ближайшее время!");
      setCallName(""); setCallPhone("");
    } catch (e) {
      showToast(`Ошибка: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const items = [
    { i: "📞", n: "Телефон", s: c.phone, a: () => bridge.openLink(`tel:${c.phone}`) },
    { i: "💬", n: "Написать в MAX", s: c.maxUsername, a: () => bridge.openLink(`https://max.ru/${c.maxUsername?.replace("@", "")}`) },
    { i: "📧", n: "Email", s: c.email, a: () => bridge.openLink(`mailto:${c.email}`) },
    { i: "📍", n: "Адрес", s: c.address, a: () => bridge.openLink(`https://yandex.ru/maps/?text=${encodeURIComponent(c.address)}`) },
  ];
  return (
    <div style={{ padding: "0 16px" }}>
      <div className="sec-title" style={{ padding: "16px 0 12px" }}>Контакты</div>
      <div className="mlist" style={{ marginBottom: 12 }}>
        {items.map(item => (
          <div key={item.n} className="mi" onClick={item.a}>
            <div className="mi-ico">{item.i}</div>
            <div className="mi-tx">
              <div className="mi-nm">{item.n}</div>
              <div className="mi-sb" style={{ color: "var(--green)" }}>{item.s}</div>
            </div>
            <span className="mi-arr" />
          </div>
        ))}
      </div>
      {/* ФОРМА ОБРАТНОГО ЗВОНКА */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 16, boxShadow: "var(--sh)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Заказать звонок</div>
        <div className="field"><label>Имя</label><input className="inp" placeholder="Ваше имя" value={callName} onChange={e => setCallName(e.target.value)} /></div>
        <div className="field"><label>Телефон</label><input className="inp" placeholder="+7 (___) ___-__-__" type="tel" value={callPhone} onChange={e => setCallPhone(e.target.value)} /></div>
        <button className="btn btn-green" onClick={handleCallRequest} disabled={sending}>
          {sending ? "Отправка…" : "Заказать звонок"}
        </button>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}

// ── ЭКРАН АВТОРИЗАЦИИ / РЕГИСТРАЦИИ ───────────────────────────────────────────
// step: "phone" → "looking" → "found" | "notfound"
// AmoCRM выключен: телефон сразу открывает ЛК
function AuthScreen({ onAuth }) {
  const [step, setStep]           = useState("phone");
  const [phone, setPhone]         = useState("");
  const [name, setName]           = useState("");
  const [error, setError]         = useState("");
  const [amoContact, setAmoContact] = useState(null);
  const [busy, setBusy]           = useState(false);

  const [settings, setSettings]   = useState(db.get("settings"));

  useEffect(() => {
    return db.subscribe("settings", setSettings);
  }, []);

  const amoEnabled = !!(settings?.amoCRM?.enabled && settings?.amoCRM?.domain && settings?.amoCRM?.token);

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";
    let r = "+7";
    if (digits.length > 1) r += " (" + digits.slice(1, 4);
    if (digits.length > 4) r += ") " + digits.slice(4, 7);
    if (digits.length > 7) r += "-" + digits.slice(7, 9);
    if (digits.length > 9) r += "-" + digits.slice(9, 11);
    return r;
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setPhone(formatPhone(raw.startsWith("7") ? raw : "7" + raw));
    setError("");
  };

  // Шаг 1: введён телефон
  const submitPhone = async () => {
    if (phone.replace(/\D/g, "").length < 11) { setError("Введите номер телефона"); return; }
    // AmoCRM выключен → сразу в ЛК
    if (!amoEnabled) { onAuth(phone, "", null, null); return; }

    setBusy(true);
    setError("");
    setStep("looking");
    try {
      const contact = await amocrm.findContactByPhone(phone);
      if (contact) {
        setAmoContact(contact);
        setName(contact.name || "");
        setStep("found");
      } else {
        setStep("notfound");
      }
    } catch (e) {
      // Показываем ошибку — не молча пропускаем
      setStep("phone");
      setError(
        e?.message?.includes("CORS") || e?.message?.includes("fetch")
          ? "Нет связи с CRM. Проверьте прокси в настройках или повторите позже."
          : `Ошибка CRM: ${e?.message || "неизвестная ошибка"}`
      );
    } finally {
      setBusy(false);
    }
  };

  // Шаг: найден в AmoCRM → войти
  const loginFound = () => {
    const loyalty = amocrm.extractLoyaltyData(amoContact);
    onAuth(phone, amoContact.name || name, amoContact.id ?? null, loyalty);
  };

  // Шаг: не найден → регистрация
  const register = async () => {
    if (!name.trim()) { setError("Введите имя"); return; }
    setBusy(true);
    setError("");
    try {
      const contact = await amocrm.createContact({ name: name.trim(), phone });
      onAuth(phone, name.trim(), contact?.id ?? null, { bonuses: 0, totalNights: 0 });
    } catch {
      onAuth(phone, name.trim(), null, { bonuses: 0, totalNights: 0 });
    } finally {
      setBusy(false);
    }
  };

  const wrap = (children, hint) => (
    <div style={{ minHeight: "calc(100vh - 120px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 24px 32px" }}>
      <div style={{ width: 72, height: 72, background: "var(--green)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 20, boxShadow: "0 4px 20px rgba(42,74,37,0.25)" }}>
        🌿
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, textAlign: "center" }}>Личный кабинет</div>
      <div style={{ width: "100%", maxWidth: 320 }}>
        {children}
      </div>
      {hint && <div style={{ fontSize: 11, color: "var(--t3)", textAlign: "center", marginTop: 20, maxWidth: 260, lineHeight: 1.6 }}>{hint}</div>}
    </div>
  );

  const ErrorMsg = () => error ? <div style={{ fontSize: 13, color: "#dc2626", textAlign: "center", marginBottom: 12, fontWeight: 600 }}>{error}</div> : null;

  // ── ШАГИ ──
  if (step === "looking") return wrap(
    <div style={{ textAlign: "center", padding: "32px 0", color: "var(--t2)" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
      <div style={{ fontWeight: 600 }}>Ищем вас в базе…</div>
    </div>
  );

  if (step === "found") return wrap(
    <>
      <div style={{ background: "var(--green-p)", borderRadius: "var(--r)", padding: "16px", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{amoContact?.name}</div>
        <div style={{ fontSize: 13, color: "var(--t2)" }}>{phone}</div>
        {(() => { const l = amocrm.extractLoyaltyData(amoContact); return (l.bonuses || l.totalNights) ? (
          <div style={{ marginTop: 10, fontSize: 12, display: "flex", gap: 12, justifyContent: "center" }}>
            {l.totalNights > 0 && <span>🌙 {l.totalNights} ночей</span>}
            {l.bonuses > 0 && <span>⭐ {l.bonuses.toLocaleString("ru")} бонусов</span>}
          </div>
        ) : null; })()}
      </div>
      <ErrorMsg />
      <button className="btn btn-green" onClick={loginFound} style={{ width: "100%", fontSize: 16, padding: "14px", marginBottom: 10 }}>
        Войти
      </button>
      <button className="btn btn-outline" onClick={() => { setStep("phone"); setAmoContact(null); }} style={{ width: "100%", fontSize: 14, padding: "10px" }}>
        Это не я
      </button>
    </>,
    null
  );

  if (step === "notfound") return wrap(
    <>
      <div style={{ fontSize: 14, color: "var(--t2)", textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
        Номер <b>{phone}</b> не найден.<br />Зарегистрируйтесь, чтобы получить доступ к бонусам и бронированиям.
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ваше имя</label>
        <input
          className="inp"
          type="text"
          placeholder="Иван Иванов"
          value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && register()}
          style={{ fontSize: 16 }}
          autoFocus
        />
      </div>
      <div className="field" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Телефон</label>
        <div style={{ fontSize: 14, padding: "10px 12px", background: "var(--bg)", borderRadius: "var(--r-sm)", color: "var(--t2)" }}>{phone}</div>
      </div>
      <ErrorMsg />
      <button className="btn btn-green" onClick={register} disabled={busy} style={{ width: "100%", fontSize: 16, padding: "14px", marginBottom: 10 }}>
        {busy ? "⏳ Создаём профиль…" : "Зарегистрироваться"}
      </button>
      <button className="btn btn-outline" onClick={() => { setStep("phone"); setError(""); }} style={{ width: "100%", fontSize: 14, padding: "10px" }}>
        Изменить номер
      </button>
    </>,
    null
  );

  // step === "phone" (default)
  return wrap(
    <>
      <div style={{ fontSize: 14, color: "var(--t2)", textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>
        Введите номер телефона для доступа к бронированиям и бонусам
      </div>
      <div className="field" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Номер телефона</label>
        <input
          className="inp"
          type="tel"
          placeholder="+7 (___) ___-__-__"
          value={phone}
          onChange={handlePhoneChange}
          onKeyDown={e => e.key === "Enter" && submitPhone()}
          style={{ fontSize: 16, textAlign: "center" }}
          autoFocus
        />
      </div>
      <ErrorMsg />
      <button
        className="btn btn-green"
        onClick={submitPhone}
        disabled={busy}
        style={{ width: "100%", fontSize: 16, padding: "14px", marginBottom: error ? 10 : 0 }}
      >
        {busy ? "⏳ Проверяем…" : "Продолжить"}
      </button>
      {error && (
        <button
          className="btn btn-outline"
          onClick={() => onAuth(phone, "", null, null)}
          style={{ width: "100%", fontSize: 14, padding: "10px" }}
        >
          Войти без проверки CRM
        </button>
      )}
    </>,
    null
  );
}

// ── PAGE: ЛИЧНЫЙ КАБИНЕТ ──────────────────────────────────────────────────────
const DEFAULT_LOYALTY_LEVELS = [
  { name: "Новичок",    emoji: "🌱", minNights: 0,  discount: 0,  perks: ["Добро пожаловать в Hygge Lodge!"] },
  { name: "Постоянный", emoji: "🏕️", minNights: 3,  discount: 5,  perks: ["Скидка 5% на все домики", "Приоритетный ранний заезд"] },
  { name: "VIP",        emoji: "🌟", minNights: 10, discount: 10, perks: ["Скидка 10% на всё", "Поздний выезд бесплатно", "Приветственный набор при заезде"] },
];

export function PageAccount({ goTo, showToast }) {
  const user = bridge.initDataUnsafe?.user;
  const [tab, setTab] = useState("bookings");
  const [guestProfile, setGuestProfile] = useState(() => db.get("guestProfile") || { bonuses: 0, totalNights: 0, totalVisits: 0, phone: "", name: "", amoContactId: null, favorites: [] });
  const [amoSyncing, setAmoSyncing] = useState(false);
  const contacts = db.get("contacts");

  // ── Попытка получить телефон из MAX при первом открытии ─────────────────────
  // Используем MAX Bridge API: requestContact() + событие WebAppRequestPhone
  // Документация: https://dev.max.ru/docs/webapps/bridge
  useEffect(() => {
    const gp = db.get("guestProfile");
    if (gp?.phone) return;

    // requestPhone работает только внутри настоящего MAX (window.WebApp с onEvent)
    const inMAX = typeof window !== "undefined" &&
      typeof window.WebApp?.onEvent === "function" &&
      typeof window.WebApp.initData === "string" &&
      window.WebApp.initData.length > 0;
    if (!inMAX) return;

    requestPhone((phone) => {
      if (!phone) return;
      // Нормализуем номер в формат +7 (XXX) XXX-XX-XX
      const digits = phone.replace(/\D/g, "");
      const d = (digits.startsWith("7") ? digits : "7" + digits.slice(-10)).slice(0, 11);
      let r = "+7";
      if (d.length > 1) r += " (" + d.slice(1, 4);
      if (d.length > 4) r += ") " + d.slice(4, 7);
      if (d.length > 7) r += "-" + d.slice(7, 9);
      if (d.length > 9) r += "-" + d.slice(9, 11);

      const updated = { ...db.get("guestProfile"), phone: r };
      db.set("guestProfile", updated);
      setGuestProfile(updated);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Синхронизация лояльности из AmoCRM ─────────────────────────────────────
  const syncAmoLoyalty = useCallback(async (phone, amoContactId, silent = false) => {
    const settings = db.get("settings");
    const amoOn = !!(settings?.amoCRM?.enabled && settings?.amoCRM?.domain && settings?.amoCRM?.token);
    if (!amoOn || !phone) return;

    setAmoSyncing(true);
    try {
      let contact = null;
      if (amoContactId) {
        const res = await amocrm._req("GET", `contacts/${amoContactId}?with=custom_fields_values`);
        contact = res ?? null;
      } else {
        contact = await amocrm.findContactByPhone(phone);
      }

      if (!contact) {
        if (!silent) showToast("Контакт не найден в AmoCRM");
        return;
      }

      const { bonuses, totalNights } = amocrm.extractLoyaltyData(contact);
      const updated = {
        ...db.get("guestProfile"),
        bonuses,
        totalNights,
        amoContactId: contact.id ?? amoContactId,
        name: contact.name || db.get("guestProfile")?.name || "",
      };
      db.set("guestProfile", updated);
      setGuestProfile(updated);
      if (!silent) showToast(`✅ Данные обновлены: ${bonuses} бонусов, ${totalNights} ночей`);
    } catch (e) {
      console.error("[AmoCRM] Ошибка синхронизации:", e);
      if (!silent) showToast(`❌ CRM: ${e?.message?.includes("CORS") || e?.message?.includes("fetch") ? "Проверьте CORS-прокси в настройках" : e?.message || "ошибка соединения"}`);
    } finally {
      setAmoSyncing(false);
    }
  }, [showToast]);

  // Запускаем синхронизацию при каждом заходе в профиль (если телефон уже есть)
  useEffect(() => {
    const gp = db.get("guestProfile");
    if (gp?.phone) syncAmoLoyalty(gp.phone, gp.amoContactId, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Следим за изменением настроек AmoCRM — при включении сразу тянем данные
  useEffect(() => {
    return db.subscribe("settings", (newSettings) => {
      const amoOn = !!(newSettings?.amoCRM?.enabled && newSettings?.amoCRM?.domain && newSettings?.amoCRM?.token);
      if (!amoOn) return;
      const gp = db.get("guestProfile");
      if (!gp?.phone) return;
      syncAmoLoyalty(gp.phone, gp.amoContactId, false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncAmoLoyalty]);

  // Авторизация: если телефон не сохранён — показываем экран входа/регистрации
  if (!guestProfile.phone) {
    return (
      <AuthScreen onAuth={(confirmedPhone, confirmedName, amoContactId, loyaltyData) => {
        const updated = {
          ...guestProfile,
          phone: confirmedPhone,
          name: confirmedName || guestProfile.name || "",
          amoContactId: amoContactId ?? guestProfile.amoContactId ?? null,
          ...(loyaltyData ? { bonuses: loyaltyData.bonuses ?? guestProfile.bonuses, totalNights: loyaltyData.totalNights ?? guestProfile.totalNights } : {}),
        };
        db.set("guestProfile", updated);
        setGuestProfile(updated);
        showToast("Добро пожаловать!");
        // Сразу после входа — тянем актуальные данные из AmoCRM
        syncAmoLoyalty(confirmedPhone, amoContactId ?? null);
      }} />
    );
  }

  const settings = db.get("settings");
  const homes = db.getActive("homes");
  const levels = settings?.loyalty?.levels || DEFAULT_LOYALTY_LEVELS;
  const bonusPercent = settings?.loyalty?.bonusPercent || 5;

  // Текущий уровень лояльности
  const currentLevel = [...levels].reverse().find(l => guestProfile.totalNights >= l.minNights) || levels[0];
  const levelIdx = levels.findIndex(l => l.name === currentLevel.name);
  const nextLevel = levels[levelIdx + 1];
  const progress = nextLevel ? Math.min(100, Math.round((guestProfile.totalNights / nextLevel.minNights) * 100)) : 100;
  const nightsToNext = nextLevel ? nextLevel.minNights - guestProfile.totalNights : 0;

  const toggleFavorite = (homeId) => {
    const favs = guestProfile.favorites || [];
    const updated = { ...guestProfile, favorites: favs.includes(homeId) ? favs.filter(f => f !== homeId) : [...favs, homeId] };
    db.set("guestProfile", updated);
    setGuestProfile(updated);
  };

  // Отображаемое имя: из AmoCRM/регистрации или из MAX
  const displayName = guestProfile.name || (user?.first_name ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}` : null);
  const displayUsername = user?.username ? `@${user.username}` : guestProfile.phone;

  const TAB_LABELS = ["Лояльность", "Домики", "Настройки"];
  const TAB_KEYS   = ["loyalty", "homes", "settings"];

  return (
    <>
      {/* ── ШАПКА ПРОФИЛЯ ── */}
      <div style={{ padding: "16px 16px 0" }}>
        <div className="profile-card">
          <div className="profile-av" style={{ fontSize: 28, lineHeight: "56px" }}>
            {displayName?.[0]?.toUpperCase() || "🌿"}
          </div>
          <div className="profile-name">{displayName || "Гость"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: "var(--t2)" }}>{displayUsername}</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--t3)" }} />
            <span style={{ fontSize: 12, background: "var(--green-p)", color: "var(--green)", padding: "2px 10px", borderRadius: 12, fontWeight: 700 }}>
              {currentLevel.emoji} {currentLevel.name}
            </span>
          </div>
          <div className="profile-stats">
            <div className="pstat">
              <div className="pstat-v">{guestProfile.totalVisits}</div>
              <div className="pstat-l">Визитов</div>
            </div>
            <div className="pstat">
              <div className="pstat-v">{guestProfile.totalNights}</div>
              <div className="pstat-l">Ночей</div>
            </div>
            <div className="pstat">
              <div className="pstat-v" style={{ fontSize: 16 }}>{guestProfile.bonuses.toLocaleString("ru")}</div>
              <div className="pstat-l">Бонусов</div>
            </div>
          </div>
          {/* Кнопка ручного обновления из AmoCRM */}
          {!!(db.get("settings")?.amoCRM?.enabled) && (
            <button
              onClick={() => syncAmoLoyalty(guestProfile.phone, guestProfile.amoContactId, false)}
              disabled={amoSyncing}
              style={{ marginTop: 12, background: "none", border: "1px solid var(--border)", borderRadius: 20, padding: "5px 16px", fontSize: 12, color: "var(--t2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, margin: "12px auto 0" }}
            >
              {amoSyncing ? "⏳ Обновление…" : "🔄 Обновить из CRM"}
            </button>
          )}
        </div>
      </div>

      {/* ── ТАБЫ ── */}
      <div style={{ padding: "14px 16px 0" }}>
        <Pills
          items={TAB_LABELS}
          active={TAB_LABELS[TAB_KEYS.indexOf(tab)]}
          onChange={v => setTab(TAB_KEYS[TAB_LABELS.indexOf(v)])}
        />

        {/* ── ТАБ: ЛОЯЛЬНОСТЬ ── */}
        {tab === "loyalty" && (
          <div style={{ paddingBottom: 8 }}>
            {/* Карточка текущего уровня */}
            <div style={{ background: "var(--green)", borderRadius: "var(--r)", padding: 20, color: "#fff", marginBottom: 12, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{currentLevel.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{currentLevel.name}</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                {guestProfile.bonuses.toLocaleString("ru")}
                <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 6 }}>бонусов</span>
              </div>
              {currentLevel.discount > 0 && (
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Скидка {currentLevel.discount}% на всё</div>
              )}
            </div>

            {/* Прогресс до следующего уровня */}
            {nextLevel && (
              <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 16, boxShadow: "var(--sh)", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>До уровня {nextLevel.emoji} {nextLevel.name}</span>
                  <span style={{ fontSize: 12, color: "var(--t2)" }}>ещё {nightsToNext} {nightsToNext === 1 ? "ночь" : nightsToNext < 5 ? "ночи" : "ночей"}</span>
                </div>
                <div style={{ height: 8, background: "var(--green-p)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "var(--green)", borderRadius: 4, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--t2)" }}>
                  <span>{guestProfile.totalNights} ночей</span>
                  <span>{nextLevel.minNights} ночей</span>
                </div>
              </div>
            )}

            {/* Все уровни */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Уровни программы</div>
            {levels.map(lvl => {
              const isActive = lvl.name === currentLevel.name;
              const isUnlocked = guestProfile.totalNights >= lvl.minNights;
              return (
                <div key={lvl.name} style={{
                  background: "var(--white)", borderRadius: "var(--r)", padding: "14px 16px",
                  boxShadow: "var(--sh)", marginBottom: 8,
                  border: isActive ? "2px solid var(--green)" : "2px solid transparent",
                  opacity: isUnlocked ? 1 : 0.55,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 26 }}>{lvl.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{lvl.name}</div>
                      <div style={{ fontSize: 11, color: "var(--t2)" }}>от {lvl.minNights} ночей{lvl.discount > 0 ? ` · скидка ${lvl.discount}%` : ""}</div>
                    </div>
                    {isActive && (
                      <span style={{ fontSize: 11, background: "var(--green-p)", color: "var(--green)", padding: "3px 10px", borderRadius: 12, fontWeight: 700 }}>Ваш</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--t2)", paddingLeft: 38 }}>
                    {lvl.perks.map(p => <div key={p} style={{ marginBottom: 2 }}>✓ {p}</div>)}
                  </div>
                </div>
              );
            })}

            <div style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", marginTop: 8 }}>
              За каждую бронь начисляется {bonusPercent}% от суммы бонусами
            </div>
          </div>
        )}

        {/* ── ТАБ: ДОМИКИ ── */}
        {tab === "homes" && (
          <div style={{ paddingBottom: 8 }}>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 12 }}>
              Все домики глэмпинга. Сохраняйте любимые, нажав ♡.
            </div>
            {homes.map(h => {
              const visited = bookings.some(b => b.homeId === h.id && b.status === "done");
              const fav = (guestProfile.favorites || []).includes(h.id);
              return (
                <div key={h.id} style={{ background: "var(--white)", borderRadius: "var(--r)", boxShadow: "var(--sh)", marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ position: "relative", cursor: "pointer" }} onClick={() => goTo("home-detail", h)}>
                    <img src={h.photo} alt={h.name} style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                    {visited && (
                      <span style={{ position: "absolute", top: 8, left: 8, fontSize: 11, background: "var(--green)", color: "#fff", padding: "3px 10px", borderRadius: 12, fontWeight: 700 }}>
                        ✓ Я здесь был
                      </span>
                    )}
                    <span style={{ position: "absolute", top: 8, right: 8, fontSize: 12, background: "rgba(0,0,0,0.45)", color: "#fff", padding: "3px 8px", borderRadius: 10 }}>
                      ⭐ {h.rating}
                    </span>
                  </div>
                  <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{h.name}</div>
                      <div style={{ fontSize: 12, color: "var(--t2)" }}>{h.type} · от {h.price.toLocaleString("ru")} ₽/ночь</div>
                    </div>
                    <button onClick={() => toggleFavorite(h.id)}
                      style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1 }}>
                      {fav ? "❤️" : "🤍"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ТАБ: НАСТРОЙКИ ── */}
        {tab === "settings" && (
          <>
            <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 16, boxShadow: "var(--sh)", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📱 Номер телефона</div>
              <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 10 }}>{guestProfile.phone}</div>
              <button className="btn btn-outline btn-sm" onClick={() => {
                const updated = { ...guestProfile, phone: "" };
                db.set("guestProfile", updated);
                setGuestProfile(updated);
                setPhone("");
              }}>Изменить номер</button>
            </div>
            <div className="mlist">
              {/* Уведомления — запрос разрешения через MAX */}
              <div className="mi" onClick={() => {
                if (window.WebApp?.requestWriteAccess) {
                  window.WebApp.requestWriteAccess(() => showToast("✅ Уведомления включены"));
                } else {
                  showToast("Уведомления доступны внутри MAX");
                }
              }}>
                <div className="mi-ico">🔔</div>
                <div className="mi-tx"><div className="mi-nm">Уведомления</div></div>
                <span className="mi-arr" />
              </div>
              {/* Политика конфиденциальности */}
              <div className="mi" onClick={() => {
                const url = contacts?.privacyUrl;
                if (url) openUrl(url);
                else showToast("Ссылка не указана в настройках");
              }}>
                <div className="mi-ico">🔒</div>
                <div className="mi-tx"><div className="mi-nm">Конфиденциальность</div></div>
                <span className="mi-arr" />
              </div>
              {/* Помощь */}
              <div className="mi" onClick={() => {
                const url = contacts?.helpUrl;
                if (url) openUrl(url);
                else showToast("Ссылка не указана в настройках");
              }}>
                <div className="mi-ico">❓</div>
                <div className="mi-tx"><div className="mi-nm">Помощь</div></div>
                <span className="mi-arr" />
              </div>
              {/* Позвонить */}
              {contacts?.phone && (
                <div className="mi" onClick={() => {
                  const tel = `tel:${contacts.phone.replace(/\D/g, "")}`;
                  // tel: ссылки открываем через location (не через bridge — может заблокировать)
                  try { window.location.href = tel; } catch { openUrl(tel); }
                }}>
                  <div className="mi-ico">📞</div>
                  <div className="mi-tx">
                    <div className="mi-nm">Позвонить в глэмпинг</div>
                    <div className="mi-sb">{contacts.phone}</div>
                  </div>
                  <span className="mi-arr" />
                </div>
              )}
              {/* Выйти из профиля */}
              <div className="mi" onClick={() => {
                const empty = { bonuses: 0, totalNights: 0, totalVisits: 0, phone: "", name: "", amoContactId: null, favorites: [] };
                db.set("guestProfile", empty);
                setGuestProfile(empty);
                showToast("Вы вышли из профиля");
              }}>
                <div className="mi-ico">↩️</div>
                <div className="mi-tx"><div className="mi-nm" style={{ color: "#dc2626" }}>Выйти из профиля</div></div>
              </div>
              {/* Закрыть */}
              <div className="mi" onClick={() => {
                try { bridge.close(); } catch { window.close(); }
              }}>
                <div className="mi-ico">🚪</div>
                <div className="mi-tx"><div className="mi-nm" style={{ color: "#dc2626" }}>Закрыть приложение</div></div>
              </div>
            </div>
          </>
        )}
      </div>
      <div style={{ height: 16 }} />
    </>
  );
}
