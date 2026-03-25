import { useState, useEffect, useCallback } from "react";
import db from "../db/database.js";
import { changeHotelPassword } from "../db/hotelRegistry.js";
import { Sheet, Confirm, Badge } from "../components/UI.jsx";
import bridge from "../hooks/useBridge.js";
import amocrm from "../hooks/useAmocrm.js";
import { syncYandexReviews, extractYandexOrgId } from "../hooks/useYandexReviews.js";
import { sendTelegramMessage, testTelegramConnection } from "../hooks/useTelegram.js";

// ── TOGGLE SWITCH ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, labelOn, labelOff }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          position: "relative", width: 52, height: 28, borderRadius: 14, cursor: "pointer",
          background: value ? "var(--green)" : "#d1d5db",
          transition: "background .2s",
          flexShrink: 0,
          boxShadow: value ? "0 0 0 3px rgba(42,74,37,.18)" : "none",
        }}
      >
        <div style={{
          position: "absolute", top: 3, left: value ? 27 : 3,
          width: 22, height: 22, borderRadius: "50%",
          background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.25)",
          transition: "left .2s",
        }} />
      </div>
      {label && (
        <span style={{ fontSize: 14, fontWeight: 600, color: value ? "var(--green)" : "var(--t2)", transition: "color .2s", userSelect: "none", cursor: "pointer" }}
          onClick={() => onChange(!value)}>
          {value ? (labelOn || label) : (labelOff || label)}
        </span>
      )}
    </div>
  );
}

// ── ОБЩИЙ ХЕЛПЕР: ФОРМА-ШТОРКА ────────────────────────────────────────────────
function FormSheet({ title, children, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth: 540, margin: "0 auto" }}>
        <div className="sheet-handle" />
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ── ВЫБОР ФОТО ────────────────────────────────────────────────────────────────
function PhotoPicker({ value, onChange, label = "Фото" }) {
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
    // сбрасываем input чтобы можно было выбрать тот же файл повторно
    e.target.value = "";
  };

  return (
    <div className="field">
      <label>{label}</label>
      {/* превью */}
      {value && (
        <div style={{ position: "relative", marginBottom: 8, borderRadius: "var(--r-sm)", overflow: "hidden", height: 140 }}>
          <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => e.target.style.opacity = 0} />
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.55)", color: "#fff", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 12, cursor: "pointer" }}
          >✕ Удалить</button>
        </div>
      )}
      {/* кнопка выбора */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 6 }}>
        <span className="btn btn-sm" style={{ background: "var(--green-p)", color: "var(--green)", border: "1px solid var(--green)", fontWeight: 600, whiteSpace: "nowrap" }}>
          📁 Выбрать файл
        </span>
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        {!value && <span style={{ fontSize: 12, color: "var(--t3)" }}>или вставьте URL ниже</span>}
      </label>
      {/* URL как fallback */}
      <input
        className="inp"
        value={value?.startsWith("data:") ? "" : (value || "")}
        onChange={e => onChange(e.target.value)}
        placeholder="https://..."
        style={{ fontSize: 13 }}
      />
    </div>
  );
}

// ── ADMIN: ДАШБОРД ────────────────────────────────────────────────────────────
export function AdminDashboard() {
  const homes    = db.getActive("homes");
  const services = db.getActive("services");
  const promos   = db.getActive("promos");
  const reviews  = db.getAll("reviews");
  const pending  = (reviews || []).filter(r => !r.approved);

  const mockBookings = [
    { guest: "Иван К.",     home: "Hygge Lodge",     dates: "22–24 апр", sum: 24000, st: "ok" },
    { guest: "Семья Ли",    home: "Дубовый домик",   dates: "25–28 апр", sum: 58000, st: "up" },
    { guest: "Мария П.",    home: "Лофт на дереве",  dates: "1–3 мая",   sum: 32000, st: "ok" },
    { guest: "Роман Г.",    home: "Сосновый шатёр",  dates: "5–7 мая",   sum: 17000, st: "up" },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-title">Дашборд</div>
      <div className="stat-grid">
        {[
          { v: homes.length,    l: "Домиков",   n: "Активных позиций" },
          { v: services.length, l: "Услуг",     n: "В каталоге" },
          { v: promos.length,   l: "Акций",     n: "Активных" },
          { v: pending.length,  l: "Отзывов",   n: "На модерации" },
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="stat-value">{s.v}</div>
            <div className="stat-label">{s.l}</div>
            <div className="stat-note">{s.n}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Ближайшие заезды</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Гость</th><th>Домик</th><th>Даты</th><th>Сумма</th><th>Статус</th></tr></thead>
          <tbody>
            {mockBookings.map((b, i) => (
              <tr key={i}>
                <td><b>{b.guest}</b></td>
                <td>{b.home}</td>
                <td style={{ color: "var(--t2)" }}>{b.dates}</td>
                <td style={{ color: "var(--green)", fontWeight: 700 }}>{b.sum.toLocaleString("ru")} ₽</td>
                <td><span className={`badge badge-${b.st === "ok" ? "ok" : "up"}`}>{b.st === "ok" ? "Подтверждён" : "Ожидает"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ADMIN: ДОМИКИ ─────────────────────────────────────────────────────────────
export function AdminHomes({ showToast }) {
  const [homes, setHomes] = useState(() => db.getAll("homes") || []);
  const [services, setServices] = useState(() => db.getAll("services") || []);
  const [promos, setPromos] = useState(() => db.getAll("promos") || []);
  const [reviews, setReviews] = useState(() => db.getAll("reviews") || []);
  useEffect(() => { return db.subscribe("reviews", setReviews); }, []);

  const approve = (id) => { db.update("reviews", id, { approved: true }); showToast("Отзыв опубликован"); };
  const reject  = (id) => { db.delete("reviews", id); showToast("Отзыв удалён"); };

  return (
    <div className="admin-page">
      <div className="admin-page-title">Модерация отзывов</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Автор</th><th>Домик</th><th>Оценка</th><th>Отзыв</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.id}>
                <td><b>{r.name}</b><br /><span style={{ fontSize: 11, color: "var(--t2)" }}>{r.date}</span></td>
                <td>{r.home}</td>
                <td>{"★".repeat(r.rating)}</td>
                <td style={{ maxWidth: 240, fontSize: 12, color: "var(--t2)" }}>«{r.text.slice(0, 80)}{r.text.length > 80 ? "…" : ""}»</td>
                <td><span className={`badge badge-${r.approved ? "ok" : "up"}`}>{r.approved ? "Опубликован" : "На модерации"}</span></td>
                <td>
                  <div className="table-actions">
                    {!r.approved && <button className="btn btn-green btn-sm" onClick={() => approve(r.id)}>✓</button>}
                    <button className="btn btn-sm" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }} onClick={() => reject(r.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ADMIN: НАСТРОЙКИ ──────────────────────────────────────────────────────────
// ── СМЕНА ПАРОЛЯ АДМИНИСТРАТОРА ───────────────────────────────────────────────
function ChangePasswordBlock({ showToast }) {
  const [open, setOpen] = useState(false);
  const [cur, setCur]   = useState("");
  const [next, setNext] = useState("");
  const [rep, setRep]   = useState("");
  const [err, setErr]   = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setErr("");
    if (next.length < 6) { setErr("Новый пароль — минимум 6 символов"); return; }
    if (next !== rep) { setErr("Пароли не совпадают"); return; }
    setSaving(true);
    try {
      const hotelId = sessionStorage.getItem("h_ai") || sessionStorage.getItem("h_sh");
      if (hotelId) {
        await changeHotelPassword(hotelId, cur, next);
      }
      setCur(""); setNext(""); setRep("");
      setOpen(false);
      showToast("✅ Пароль успешно изменён");
    } catch (ex) {
      setErr(ex.message);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>🔑 Пароль администратора</div>
          <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 3 }}>Изменить пароль входа в панель</div>
        </div>
        <button className="btn btn-sm" onClick={() => { setOpen(v => !v); setErr(""); }}>
          {open ? "Отмена" : "Изменить"}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 16 }}>
          {[
            { label: "Текущий пароль", val: cur, set: setCur },
            { label: "Новый пароль",   val: next, set: setNext },
            { label: "Повторите новый пароль", val: rep, set: setRep },
          ].map(({ label, val, set }) => (
            <div key={label} className="field">
              <label>{label}</label>
              <input className="inp" type="password" value={val}
                onChange={e => { set(e.target.value); setErr(""); }}
                placeholder="••••••••"
              />
            </div>
          ))}
          {err && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>⚠️ {err}</div>}
          <button className="btn btn-green" onClick={save} disabled={saving}>
            {saving ? "⏳ Сохраняем..." : "Сохранить пароль"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── ADMIN: УСЛУГИ ───────────────────────────────────────────────────────────
export function AdminServices({ showToast }) {
  const [services, setServices] = useState(() => db.getAll("services") || []);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", duration: "", emoji: "✨", desc: "", cat: "SPA", active: true });

  useEffect(() => { return db.subscribe("services", setServices); }, []);

  const save = () => {
    if (!form.name) { showToast("Введите название"); return; }
    const item = { 
      ...form, 
      price: parseInt(form.price) || 0,
      id: edit?.id || Date.now()
    };
    if (edit) {
      db.update("services", edit.id, item);
      showToast("Услуга обновлена");
    } else {
      db.insert("services", item);
      showToast("Услуга добавлена");
    }
    setEdit(null);
    setForm({ name: "", price: "", duration: "", emoji: "✨", desc: "", cat: "SPA", active: true });
  };

  const del = (id) => { if (confirm("Удалить услугу?")) { db.delete("services", id); showToast("Удалено"); }};

  return (
    <div className="admin-page">
      <div className="admin-page-title">✨ Услуги</div>
      
      {/* Форма добавления/редактирования */}
      <div style={{ background: "linear-gradient(145deg, #1a1a1a 0%, #141414 100%)", borderRadius: 16, padding: 20, marginBottom: 16, border: "1px solid #2a2a2a" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#fff" }}>{edit ? "Редактировать" : "Добавить услугу"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input className="inp" placeholder="Название" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="inp" placeholder="Цена ₽" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <input className="inp" placeholder="Длительность (напр. 2 ч)" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          <select className="inp" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
            <option value="SPA">SPA</option>
            <option value="Питание">Питание</option>
            <option value="Активности">Активности</option>
          </select>
        </div>
        <textarea className="inp" placeholder="Описание" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} style={{ marginTop: 10, minHeight: 60 }} />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn btn-green" onClick={save} style={{ flex: 1 }}>{edit ? "Сохранить" : "Добавить"}</button>
          {edit && <button className="btn" style={{ background: "#444", color: "#fff" }} onClick={() => { setEdit(null); setForm({ name: "", price: "", duration: "", emoji: "✨", desc: "", cat: "SPA", active: true }); }}>Отмена</button>}
        </div>
      </div>

      {/* Список */}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Название</th><th>Цена</th><th>Категория</th><th></th></tr></thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id}>
                <td><b>{s.emoji} {s.name}</b><br /><span style={{ fontSize: 11, color: "#666" }}>{s.duration}</span></td>
                <td style={{ color: "#00d4aa", fontWeight: 700 }}>{s.price?.toLocaleString()} ₽</td>
                <td><span className="badge">{s.cat}</span></td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-sm" style={{ background: "#333", color: "#fff" }} onClick={() => { setEdit(s); setForm({ ...s, price: String(s.price) }); }}>✏️</button>
                    <button className="btn btn-sm" style={{ background: "#fef2f2", color: "#dc2626" }} onClick={() => del(s.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSettings({ showToast }) {
  const [contacts, setContacts] = useState(db.get("contacts") || {});
  const [settings, setSettings] = useState(db.get("settings") || {});
  const [slides, setSlides] = useState(() => db.getAll("slides") || []);
  const [newAdminId, setNewAdminId] = useState("");

  useEffect(() => { return db.subscribe("slides", setSlides); }, []);
  useEffect(() => { return db.subscribe("settings", setSettings); }, []);

  const [syncing, setSyncing] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);
  const [tgStatus, setTgStatus] = useState(null);

  const saveContacts = () => { db.set("contacts", contacts); showToast("Контакты сохранены"); };
  const saveSettings = (s = settings) => { db.set("settings", s); showToast("Настройки сохранены"); };

  // При изменении URL — автоматически извлекаем orgId
  const handleYandexUrl = (url) => {
    const orgId = extractYandexOrgId(url);
    const updated = { ...settings, yandexReviewsUrl: url, yandexOrgId: orgId || settings.yandexOrgId || "" };
    setSettings(updated);
  };

  const handleSyncYandex = async () => {
    setSyncing(true);
    try {
      // Сохраняем текущие настройки перед синхронизацией
      db.set("settings", settings);
      const reviews = await syncYandexReviews();
      // Перечитываем из localStorage и обновляем state через подписку
      showToast(`✅ Загружено ${reviews.length} отзывов с Яндекса`);
    } catch (e) {
      showToast(`❌ ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // ── Управление администраторами ─────────────────────────────────────────────
  const adminIds   = settings?.adminIds || [];
  const myId       = String(bridge.initDataUnsafe?.user?.id || "");

  const addAdmin = () => {
    const id = newAdminId.trim();
    if (!id) return;
    if (adminIds.includes(id)) { showToast("ID уже в списке"); return; }
    const updated = { ...settings, adminIds: [...adminIds, id] };
    db.set("settings", updated);
    setSettings(updated);
    setNewAdminId("");
    showToast(`✅ Администратор ${id} добавлен`);
  };

  const removeAdmin = (id) => {
    const updated = { ...settings, adminIds: adminIds.filter(x => x !== id) };
    db.set("settings", updated);
    setSettings(updated);
    showToast("Администратор удалён");
  };

  const addMeAsAdmin = () => {
    if (!myId) { showToast("Не удалось определить ваш Telegram ID"); return; }
    if (adminIds.includes(myId)) { showToast("Вы уже в списке"); return; }
    const updated = { ...settings, adminIds: [...adminIds, myId] };
    db.set("settings", updated);
    setSettings(updated);
    showToast(`✅ Вы (ID ${myId}) добавлены как администратор`);
  };

  const addSlide = () => {
    db.insert("slides", { title: "Новый слайд", sub: "Подзаголовок", bg: "", active: true });
  };
  const updateSlide = (id, patch) => db.update("slides", id, patch);
  const deleteSlide = (id) => { db.delete("slides", id); showToast("Слайд удалён"); };

  return (
    <div className="admin-page">
      <div className="admin-page-title">Настройки</div>

      {/* ССЫЛКИ НА ОТЕЛЬ */}
      {(() => {
        const params = new URLSearchParams(window.location.search);
        const hotelId = params.get("hotel") || sessionStorage.getItem("h_ai");
        if (!hotelId) return null;
        const appUrl = `${window.location.origin}/?hotel=${hotelId}`;
        return (
          <div style={{ 
            background: "linear-gradient(135deg, #1f1f1f 0%, #161616 100%)", 
            borderRadius: 16, padding: 20, marginBottom: 16,
            border: "1px solid #2a2a2a"
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#fff" }}>🔗 Мини-приложение отеля</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href={appUrl} target="_blank" rel="noopener noreferrer" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 20px", borderRadius: 10,
                background: "linear-gradient(135deg, #00d4aa 0%, #00a888 100%)",
                color: "#000", fontWeight: 600, fontSize: 13,
                textDecoration: "none",
                boxShadow: "0 4px 15px rgba(0,212,170,0.3)"
              }}>
                📱 Открыть мини-приложение
              </a>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
              Ссылка для клиентов: <code style={{ background: "#222", padding: "2px 6px", borderRadius: 4, color: "#00d4aa" }}>{appUrl}</code>
            </div>
          </div>
        );
      })()}

      {/* КОНТАКТЫ */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📞 Контактные данные</div>
        <div className="form-row">
          <div className="field"><label>Телефон</label><input className="inp" value={contacts.phone || ""} onChange={e => setContacts(c => ({ ...c, phone: e.target.value }))} /></div>
          <div className="field"><label>Email</label><input className="inp" value={contacts.email || ""} onChange={e => setContacts(c => ({ ...c, email: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>MAX username</label><input className="inp" value={contacts.maxUsername || ""} onChange={e => setContacts(c => ({ ...c, maxUsername: e.target.value }))} /></div>
          <div className="field"><label>Расстояние от города</label><input className="inp" value={contacts.distance || ""} onChange={e => setContacts(c => ({ ...c, distance: e.target.value }))} /></div>
        </div>
        <div className="field"><label>Адрес</label><input className="inp" value={contacts.address || ""} onChange={e => setContacts(c => ({ ...c, address: e.target.value }))} /></div>
        <div className="field">
          <label>🔗 URL виджета бронирования</label>
          <input className="inp" value={contacts.bookingUrl || ""} onChange={e => setContacts(c => ({ ...c, bookingUrl: e.target.value }))} placeholder="https://richlifevillage.ru/booking/?znms_widget_open=5101" />
          <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 4 }}>Кнопка «Забронировать» откроет именно этот URL</div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>❓ Ссылка «Помощь»</label>
            <input className="inp" value={contacts.helpUrl || ""} onChange={e => setContacts(c => ({ ...c, helpUrl: e.target.value }))} placeholder="https://t.me/support или https://..." />
          </div>
          <div className="field">
            <label>🔒 Политика конфиденциальности</label>
            <input className="inp" value={contacts.privacyUrl || ""} onChange={e => setContacts(c => ({ ...c, privacyUrl: e.target.value }))} placeholder="https://hygge.ru/privacy" />
          </div>
        </div>
        <button className="btn btn-green" onClick={saveContacts}>Сохранить контакты</button>
      </div>

      {/* СЛАЙДЕР */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>🖼 Слайдер на главной</div>
          <button className="btn btn-green btn-sm" onClick={addSlide}>+ Слайд</button>
        </div>
        {slides.map(s => (
          <div key={s.id} style={{ background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 12, marginBottom: 8 }}>
            <div className="form-row" style={{ marginBottom: 8 }}>
              <input className="inp" value={s.title} onChange={e => updateSlide(s.id, { title: e.target.value })} placeholder="Заголовок" />
              <input className="inp" value={s.sub} onChange={e => updateSlide(s.id, { sub: e.target.value })} placeholder="Подзаголовок" />
            </div>
            <PhotoPicker value={s.bg} onChange={v => updateSlide(s.id, { bg: v })} label="Фото слайда" />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`badge badge-${s.active ? "ok" : "red"}`} style={{ cursor: "pointer" }}
                onClick={() => updateSlide(s.id, { active: !s.active })}>
                {s.active ? "Активен" : "Скрыт"}
              </span>
              <button className="btn btn-sm" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", marginLeft: "auto" }}
                onClick={() => deleteSlide(s.id)}>🗑️ Удалить</button>
            </div>
          </div>
        ))}
      </div>

      {/* ЯНДЕКС ОТЗЫВЫ */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>⭐ Отзывы с Яндекс Карт</div>
        <p style={{ fontSize: 12, color: "var(--t2)", marginBottom: 14 }}>
          Вставьте ссылку на вашу организацию в Яндекс Картах. Будут загружены только лучшие отзывы (4–5 звёзд).
          <br />Пример: <span style={{ fontFamily: "monospace", fontSize: 11 }}>https://yandex.ru/maps/org/название/1234567890/reviews/</span>
        </p>

        <div className="field">
          <label>Ссылка на отзывы в Яндекс Картах</label>
          <input
            className="inp"
            placeholder="https://yandex.ru/maps/org/ваш-глэмпинг/1234567890/reviews/"
            value={settings.yandexReviewsUrl || ""}
            onChange={e => handleYandexUrl(e.target.value)}
          />
          {settings.yandexOrgId && (
            <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4 }}>
              ✓ ID организации: <b>{settings.yandexOrgId}</b>
            </div>
          )}
        </div>

        <div className="field">
          <label>Минимальный рейтинг для показа</label>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {[4, 5].map(n => (
              <button key={n}
                onClick={() => setSettings(s => ({ ...s, yandexMinRating: n }))}
                style={{
                  padding: "6px 20px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 14,
                  background: (settings.yandexMinRating ?? 4) === n ? "var(--green)" : "var(--bg)",
                  color:      (settings.yandexMinRating ?? 4) === n ? "#fff" : "var(--t2)",
                }}
              >{"★".repeat(n)}+</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>CORS-прокси для Яндекса (необязательно)</label>
          <input className="inp" placeholder="https://my-proxy.workers.dev"
            value={settings.yandexProxyUrl || ""}
            onChange={e => setSettings(s => ({ ...s, yandexProxyUrl: e.target.value.trim() }))} />
          <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 4 }}>
            Нужен только для работы в браузере. Тот же Cloudflare Worker что и для AmoCRM.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <button className="btn btn-green" onClick={() => saveSettings()}>Сохранить</button>
          <button
            className="btn btn-outline"
            onClick={handleSyncYandex}
            disabled={syncing || !settings.yandexOrgId}
          >
            {syncing ? "⏳ Загрузка…" : "🔄 Загрузить отзывы с Яндекса"}
          </button>
        </div>

        {!settings.yandexOrgId && settings.yandexReviewsUrl && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#dc2626" }}>
            Не удалось определить ID организации из URL. Проверьте ссылку или введите числовой ID вручную.
          </div>
        )}
      </div>

      {/* ПАРОЛЬ ГОСТЕВОГО ЛК */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>🔑 Пароль для ЛК гостя</div>
        <p style={{ fontSize: 12, color: "var(--t2)", marginBottom: 12 }}>
          Используется только если интеграция с AmoCRM выключена. Гость вводит этот пароль при первом входе.
        </p>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Пароль (выдаётся гостям при заселении)</label>
          <input
            className="inp"
            type="text"
            value={settings?.guestPassword || ""}
            onChange={e => setSettings(s => ({ ...s, guestPassword: e.target.value }))}
            placeholder="hygge2025"
          />
        </div>
        <button className="btn btn-green btn-sm" onClick={() => saveSettings()}>Сохранить</button>
      </div>

      {/* АДМИНИСТРАТОРЫ */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>🛡️ Администраторы бота</div>
        <p style={{ fontSize: 12, color: "var(--t2)", marginBottom: 14 }}>
          Только пользователи из этого списка видят кнопку «⚙️ Панель» в приложении.
          Если список пуст — кнопка доступна всем (первичная настройка).
        </p>

        {/* Мой ID */}
        {myId && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", background: "var(--bg)", borderRadius: "var(--r-sm)" }}>
            <span style={{ fontSize: 12, color: "var(--t2)", flex: 1 }}>Ваш Telegram ID: <b>{myId}</b></span>
            {!adminIds.includes(myId) && (
              <button className="btn btn-green btn-sm" onClick={addMeAsAdmin}>+ Добавить меня</button>
            )}
          </div>
        )}

        {/* Список */}
        {adminIds.length === 0
          ? <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 12 }}>Список пуст — доступ открыт всем.</div>
          : adminIds.map(id => (
            <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg)", borderRadius: "var(--r-sm)", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {id} {id === myId ? <span style={{ fontSize: 11, color: "var(--green)" }}>(вы)</span> : ""}
              </span>
              <button
                className="btn btn-sm"
                style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
                onClick={() => removeAdmin(id)}
              >✕</button>
            </div>
          ))
        }

        {/* Добавить вручную */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            className="inp"
            style={{ flex: 1 }}
            placeholder="Telegram user ID (числовой)"
            value={newAdminId}
            onChange={e => setNewAdminId(e.target.value.replace(/\D/g, ""))}
            onKeyDown={e => e.key === "Enter" && addAdmin()}
          />
          <button className="btn btn-green btn-sm" onClick={addAdmin}>Добавить</button>
        </div>
      </div>

      {/* ── СМЕНА ПАРОЛЯ ── */}
      <ChangePasswordBlock showToast={showToast} />

      {/* ── TELEGRAM УВЕДОМЛЕНИЯ ── */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>📬 Telegram уведомления</div>
        <p style={{ fontSize: 12, color: "var(--t2)", marginBottom: 14 }}>
          Уведомления о заказе сертификатов будут приходить в указанную группу или чат.
        </p>

        <Toggle
          value={!!settings.telegram?.enabled}
          onChange={v => setSettings(s => ({ ...s, telegram: { ...(s.telegram || {}), enabled: v } }))}
          label={settings.telegram?.enabled ? "Уведомления включены" : "Уведомления выключены"}
        />

        <div className="field">
          <label>Bot Token</label>
          <input className="inp" type="password"
            placeholder="1234567890:ABCdefGHI..."
            value={settings.telegram?.botToken || ""}
            onChange={e => setSettings(s => ({ ...s, telegram: { ...(s.telegram || {}), botToken: e.target.value.trim() } }))}
            style={{ fontFamily: "monospace" }}
          />
          <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 4 }}>
            Получите токен у <b>@BotFather</b> → /newbot. Добавьте бота в группу и дайте права администратора.
          </div>
        </div>

        <div className="field">
          <label>Chat ID группы</label>
          <input className="inp"
            placeholder="-1001234567890"
            value={settings.telegram?.chatId || ""}
            onChange={e => setSettings(s => ({ ...s, telegram: { ...(s.telegram || {}), chatId: e.target.value.trim() } }))}
          />
          <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 4 }}>
            Добавьте <b>@userinfobot</b> в группу чтобы узнать Chat ID.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-green" onClick={() => saveSettings()}>Сохранить</button>
          <button className="btn btn-outline" disabled={tgTesting}
            onClick={async () => {
              setTgTesting(true); setTgStatus(null);
              try {
                await testTelegramConnection(settings.telegram?.botToken, settings.telegram?.chatId);
                setTgStatus({ ok: true, msg: "✅ Тестовое сообщение отправлено!" });
              } catch (e) {
                setTgStatus({ ok: false, msg: `❌ ${e.message}` });
              } finally { setTgTesting(false); }
            }}
          >{tgTesting ? "Отправка…" : "🔔 Тест"}</button>
        </div>
        {tgStatus && (
          <div style={{ marginTop: 8, fontSize: 13, color: tgStatus.ok ? "var(--green)" : "#dc2626", fontWeight: 600 }}>
            {tgStatus.msg}
          </div>
        )}
      </div>

      {/* СБРОС БД */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#dc2626" }}>⚠️ Опасная зона</div>
        <p style={{ fontSize: 13, color: "var(--t2)", marginBottom: 14 }}>Сброс вернёт все данные к начальному состоянию. Это действие нельзя отменить.</p>
        <button className="btn btn-sm" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
          onClick={() => { if (window.confirm("Сбросить все данные?")) { db.reset(); showToast("База данных сброшена"); } }}>
          Сбросить базу данных
        </button>
      </div>
    </div>
  );
}

// ── ADMIN: AMO CRM ────────────────────────────────────────────────────────────
export function AdminAmoCRM({ showToast }) {
  const [settings, setSettings]   = useState(db.get("settings") || {});
  const [cfg, setCfg]             = useState(db.get("settings")?.amoCRM || {});
  const [pipelines, setPipelines]     = useState([]);
  const [leads, setLeads]             = useState([]);
  const [leadsTotal, setLeadsTotal]   = useState(0);
  const [contactFields, setContactFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [bonusSearch, setBonusSearch]   = useState("");
  const [nightsSearch, setNightsSearch] = useState("");
  const [testing, setTesting]         = useState(false);
  const [loadingPipe, setLoadingPipe] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [status, setStatus]           = useState(null); // {ok, msg}

  useEffect(() => { return db.subscribe("settings", s => { setSettings(s); setCfg(s?.amoCRM || {}); }); }, []);

  // Показываем нормализованный домен под полем ввода
  const displayDomain = cfg.domain
    ? (d => d.includes(".") ? d : d + ".amocrm.ru")(
        cfg.domain.replace(/^https?:\/\//, "").replace(/\/$/, "")
      )
    : "";

  const saveCfg = () => {
    const updated = { ...settings, amoCRM: cfg };
    db.set("settings", updated);
    showToast("⚙️ Настройки AmoCRM сохранены");
  };

  const testConnection = async () => {
    setTesting(true); setStatus(null);

    // Шаг 1: если задан прокси — проверяем что он отвечает
    const proxyUrl = (cfg.proxyUrl || "").trim().replace(/\/$/, "");
    if (proxyUrl) {
      try {
        // Прокси ожидает url параметр, проверяем с тестовым запросом
        const testUrl = `${proxyUrl}/?url=${encodeURIComponent("https://example.com")}`;
        const testRes = await fetch(testUrl, { 
          method: "GET", 
          mode: "cors",
        });
        // Worker может вернуть 400 если нет параметра, или другой статус — главное не network error
      } catch (e) {
        setStatus({ ok: false, msg: `❌ Прокси недоступен — ${e.message}` });
        setTesting(false); return;
      }
    }

    // Шаг 2: проверяем подключение к AmoCRM
    try {
      const acc = await amocrm.testConnection();
      const label = acc?.name || acc?.subdomain || cfg.domain || "аккаунт";
      setStatus({ ok: true, msg: `✅ Подключено: ${label}` });
      showToast("AmoCRM подключён!");
    } catch (e) {
      setStatus({ ok: false, msg: `❌ ${e.message}` });
    } finally { setTesting(false); }
  };

  const loadPipelines = async () => {
    setLoadingPipe(true);
    try {
      const list = await amocrm.getPipelines();
      setPipelines(list);
      if (!list.length) showToast("Воронки не найдены");
    } catch (e) { showToast(`Ошибка: ${e.message}`); }
    finally { setLoadingPipe(false); }
  };

  const loadContactFields = async () => {
    setLoadingFields(true);
    try {
      const fields = await amocrm.getContactFields();
      setContactFields(fields);
      showToast(`Загружено ${fields.length} полей`);
    } catch (e) { showToast(`Ошибка: ${e.message}`); }
    finally { setLoadingFields(false); }
  };

  const loadLeads = async () => {
    setLoadingLeads(true);
    try {
      const { leads: l, total } = await amocrm.getLeads(1, 20);
      setLeads(l); setLeadsTotal(total);
    } catch (e) { showToast(`Ошибка: ${e.message}`); }
    finally { setLoadingLeads(false); }
  };

  const statusColor = (s) => {
    if (!s?.id) return "up";
    return "ok";
  };

  return (
    <div className="admin-page">
      <div className="admin-page-title">AmoCRM</div>

      {/* ── НАСТРОЙКИ ПОДКЛЮЧЕНИЯ ── */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>🔌 Подключение</div>
        <p style={{ fontSize: 12, color: "var(--t2)", marginBottom: 14 }}>
          Долгосрочный токен: «Настройки аккаунта → Интеграции → Токены доступа» в вашем AmoCRM.
        </p>

        <Toggle
          value={!!cfg.enabled}
          onChange={v => setCfg(c => ({ ...c, enabled: v }))}
          label={cfg.enabled ? "Интеграция включена" : "Интеграция выключена"}
        />

        <div className="field">
          <label>Домен аккаунта</label>
          <input className="inp" placeholder="richlifevillage  или  richlifevillage.amocrm.ru" value={cfg.domain || ""}
            onChange={e => setCfg(c => ({ ...c, domain: e.target.value.trim() }))} />
          {displayDomain && (
            <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 4 }}>
              Будет использоваться: <b>{displayDomain}</b>
            </div>
          )}
        </div>
        <div className="field">
          <label>Долгосрочный токен (Bearer)</label>
          <input className="inp" type="password" placeholder="eyJ0eXAiOiJKV1QiLCJhbGci..." value={cfg.token || ""}
            onChange={e => setCfg(c => ({ ...c, token: e.target.value.trim() }))}
            style={{ fontFamily: "monospace" }} />
          <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 4 }}>
            Токен хранится локально в приложении. Никуда не передаётся, кроме запросов к вашему AmoCRM.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button className="btn btn-green" onClick={saveCfg}>Сохранить</button>
          <button className="btn btn-outline" onClick={testConnection} disabled={testing}>
            {testing ? "Проверка…" : "🔍 Проверить подключение"}
          </button>
        </div>

        <div className="field">
          <label>CORS-прокси (необязательно)</label>
          <input className="inp" placeholder="https://my-proxy.workers.dev" value={cfg.proxyUrl || ""}
            onChange={e => setCfg(c => ({ ...c, proxyUrl: e.target.value.trim() }))} />
          <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 4 }}>
            Нужен только для работы в браузере. Внутри MAX — не требуется.
          </div>
        </div>

        {/* Подсказка про CORS */}
        <details style={{ marginBottom: 12 }}>
          <summary style={{ fontSize: 12, color: "var(--green)", cursor: "pointer", fontWeight: 600 }}>
            💡 Как настроить CORS-прокси?
          </summary>
          <div style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 12, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", marginTop: 8, lineHeight: 1.6 }}>
            <b>Cloudflare Worker (бесплатно, ~2 минуты):</b><br />
            1. <b>workers.cloudflare.com</b> → «Create application» → «Create Worker»<br />
            2. Удалите весь код в редакторе, вставьте код ниже<br />
            3. Нажмите <b>Deploy</b><br />
            4. Скопируйте URL вида <code>https://xxx.workers.dev</code> в поле выше, сохраните<br /><br />
            <div style={{ background: "#fff", borderRadius: 6, padding: "8px 10px", fontFamily: "monospace", fontSize: 11, whiteSpace: "pre-wrap", userSelect: "all" }}>{`export default {
  async fetch(req) {
    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    };
    if (req.method === 'OPTIONS')
      return new Response(null, { headers: CORS });

    // Целевой URL берём из ?url=... (надёжнее пути)
    const target = new URL(req.url).searchParams.get('url');
    if (!target || !target.startsWith('https://'))
      return new Response('bad url', { status: 400 });

    const headers = new Headers();
    headers.set('Authorization', req.headers.get('Authorization') || '');
    headers.set('Content-Type', 'application/json');

    const res = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET','HEAD'].includes(req.method) ? undefined : req.body,
    });
    const h = new Headers(res.headers);
    Object.entries(CORS).forEach(([k, v]) => h.set(k, v));
    return new Response(res.body, { status: res.status, headers: h });
  }
}`}</div>
          </div>
        </details>

        {status && (
          <div style={{
            padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 600,
            background: status.ok ? "#f0fdf4" : "#fef2f2",
            color: status.ok ? "#166534" : "#dc2626",
            border: `1px solid ${status.ok ? "#bbf7d0" : "#fecaca"}`,
          }}>{status.msg}</div>
        )}
      </div>

      {/* ── ВОРОНКИ ── */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>🎯 Воронка для новых лидов</div>
          <button className="btn btn-outline btn-sm" onClick={loadPipelines} disabled={loadingPipe}>
            {loadingPipe ? "Загрузка…" : "Загрузить воронки"}
          </button>
        </div>

        {pipelines.length > 0 && (
          <div className="field">
            <label>Выберите воронку</label>
            <select className="inp" value={cfg.pipelineId || ""}
              onChange={e => {
                const pipe = pipelines.find(p => String(p.id) === e.target.value);
                const firstStatus = pipe?._embedded?.statuses?.[0];
                setCfg(c => ({ ...c, pipelineId: e.target.value, statusId: firstStatus?.id ? String(firstStatus.id) : "" }));
              }}>
              <option value="">— не выбрана —</option>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {cfg.pipelineId && pipelines.length > 0 && (() => {
          const pipe = pipelines.find(p => String(p.id) === String(cfg.pipelineId));
          const statuses = pipe?._embedded?.statuses || [];
          return statuses.length > 0 ? (
            <div className="field">
              <label>Начальный статус</label>
              <select className="inp" value={cfg.statusId || ""}
                onChange={e => setCfg(c => ({ ...c, statusId: e.target.value }))}>
                <option value="">— первый по умолчанию —</option>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          ) : null;
        })()}

        {(cfg.pipelineId || cfg.statusId) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {cfg.pipelineId && <span className="badge badge-ok">Pipeline ID: {cfg.pipelineId}</span>}
            {cfg.statusId   && <span className="badge badge-up">Status ID: {cfg.statusId}</span>}
          </div>
        )}

        <div className="field" style={{ marginTop: 12 }}>
          <label>Pipeline ID (вручную)</label>
          <input className="inp" placeholder="123456" value={cfg.pipelineId || ""}
            onChange={e => setCfg(c => ({ ...c, pipelineId: e.target.value.replace(/\D/g, "") }))} />
        </div>
        <button className="btn btn-green" onClick={saveCfg}>Сохранить</button>
      </div>

      {/* ── ПОЛЯ ЛОЯЛЬНОСТИ ── */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>🎁 Поля лояльности</div>
          <button className="btn btn-outline btn-sm" onClick={loadContactFields} disabled={loadingFields}>
            {loadingFields ? "Загрузка…" : "Загрузить поля"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--t2)", marginBottom: 14 }}>
          Укажите из каких полей контакта брать баллы и количество ночей.
        </p>

        {contactFields.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--t2)" }}>
            Нажмите «Загрузить поля» — подтянутся все кастомные поля ваших контактов в AmoCRM.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 10 }}>
              Найдено полей: <b>{contactFields.length}</b>
            </div>
            <div className="form-row">
              {/* ─ Бонусные баллы ─ */}
              <div className="field">
                <label>💰 Поле «Бонусные баллы»</label>
                <input
                  className="inp"
                  placeholder="🔍 Поиск поля…"
                  value={bonusSearch}
                  onChange={e => setBonusSearch(e.target.value)}
                  style={{ marginBottom: 4 }}
                />
                <select className="inp" value={cfg.bonusFieldId || ""}
                  onChange={e => setCfg(c => ({ ...c, bonusFieldId: e.target.value }))}>
                  <option value="">— не выбрано —</option>
                  {(contactFields || [])
                    .filter(f => !bonusSearch || ((f.name || "") + "").toLowerCase().includes(bonusSearch.toLowerCase()))
                    .map(f => (
                      <option key={f.id} value={String(f.id)}>
                        [{f.id}] {f.name} ({f.type})
                      </option>
                    ))}
                </select>
                {cfg.bonusFieldId && (() => {
                  const sel = (contactFields || []).find(f => String(f.id) === String(cfg.bonusFieldId));
                  return sel ? (
                    <div style={{ fontSize: 11, color: "var(--green)", marginTop: 3 }}>
                      ✓ {sel.name} (#{sel.id})
                    </div>
                  ) : null;
                })()}
              </div>

              {/* ─ Количество ночей ─ */}
              <div className="field">
                <label>🌙 Поле «Количество ночей»</label>
                <input
                  className="inp"
                  placeholder="🔍 Поиск поля…"
                  value={nightsSearch}
                  onChange={e => setNightsSearch(e.target.value)}
                  style={{ marginBottom: 4 }}
                />
                <select className="inp" value={cfg.nightsFieldId || ""}
                  onChange={e => setCfg(c => ({ ...c, nightsFieldId: e.target.value }))}>
                  <option value="">— не выбрано —</option>
                  {(contactFields || [])
                    .filter(f => !nightsSearch || ((f.name || "") + "").toLowerCase().includes(nightsSearch.toLowerCase()))
                    .map(f => (
                      <option key={f.id} value={String(f.id)}>
                        [{f.id}] {f.name} ({f.type})
                      </option>
                    ))}
                </select>
                {cfg.nightsFieldId && (() => {
                  const sel = (contactFields || []).find(f => String(f.id) === String(cfg.nightsFieldId));
                  return sel ? (
                    <div style={{ fontSize: 11, color: "var(--green)", marginTop: 3 }}>
                      ✓ {sel.name} (#{sel.id})
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btn-green" onClick={saveCfg}>Сохранить поля</button>
              {(cfg.bonusFieldId || cfg.nightsFieldId) && (
                <span style={{ fontSize: 11, color: "var(--t2)" }}>
                  Бонусы: #{cfg.bonusFieldId || "—"} · Ночи: #{cfg.nightsFieldId || "—"}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── ЛИДЫ ── */}
      <div style={{ background: "var(--white)", borderRadius: "var(--r)", padding: 20, boxShadow: "var(--sh)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>📋 Последние лиды</div>
            {leadsTotal > 0 && <div style={{ fontSize: 12, color: "var(--t2)" }}>Всего: {leadsTotal}</div>}
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadLeads} disabled={loadingLeads || !cfg.enabled}>
            {loadingLeads ? "Загрузка…" : "Обновить"}
          </button>
        </div>

        {!cfg.enabled
          ? <div style={{ fontSize: 13, color: "var(--t2)" }}>Включите интеграцию и сохраните настройки.</div>
          : leads.length === 0
            ? <div style={{ fontSize: 13, color: "var(--t2)" }}>Нажмите «Обновить» для загрузки лидов из AmoCRM.</div>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Лид</th><th>Контакт</th><th>Сумма</th><th>Статус</th><th>Дата</th></tr>
                  </thead>
                  <tbody>
                    {leads.map(l => {
                      const contact = l._embedded?.contacts?.[0];
                      const date    = l.created_at ? new Date(l.created_at * 1000).toLocaleDateString("ru-RU") : "—";
                      return (
                        <tr key={l.id}>
                          <td><b>{l.name || "Без названия"}</b><br /><span style={{ fontSize: 11, color: "var(--t2)" }}>#{l.id}</span></td>
                          <td style={{ fontSize: 12 }}>{contact?.name || "—"}</td>
                          <td style={{ color: "var(--green)", fontWeight: 700 }}>
                            {l.price ? `${l.price.toLocaleString("ru")} ₽` : "—"}
                          </td>
                          <td><span className="badge badge-up">{l._embedded?.status?.name || "—"}</span></td>
                          <td style={{ fontSize: 12, color: "var(--t2)" }}>{date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}

// ── ОБЁРТКА ВСЕЙ АДМИНКИ ──────────────────────────────────────────────────────
export function AdminPanel({ onExit, onLogout, isSuperAdmin = false, showToast }) {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("homes");
  const settings = db.get("settings");

  // Переключение на отель по URL параметру при загрузке
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotelId = params.get("hotel");
    if (hotelId) {
      sessionStorage.setItem("h_ai", hotelId);
      db.switchTo("hygge_db_" + hotelId);
    }
    // Даем время на инициализацию БД
    setTimeout(() => setLoading(false), 100);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "#0f0f0f", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "#666",
        fontSize: 14
      }}>
        Загрузка...
      </div>
    );
  }

  // Поддержка динамического обработчика выхода (для суперадмина)
  const handleLogout = () => {
    if (typeof window.__adminLogoutHandler === "function") {
      window.__adminLogoutHandler();
    } else if (onLogout) {
      onLogout();
    } else {
      sessionStorage.removeItem("h_as");
      sessionStorage.removeItem("h_ai");
      sessionStorage.removeItem("h_ss");
      sessionStorage.removeItem("h_sh");
      window.location.reload();
    }
  };

  const nav = [
    { id: "homes",     ico: "🏡", label: "Домики" },
    { id: "services",  ico: "✨", label: "Услуги" },
    { id: "promos",    ico: "🏷️", label: "Акции" },
    { id: "reviews",   ico: "⭐", label: "Отзывы" },
    { id: "amocrm",   ico: "🔗", label: "AmoCRM" },
    { id: "settings",  ico: "⚙️", label: "Настройки" },
  ];

  // Простые заглушки для promos и reviews (можно расширить)
  const AdminPromos = () => {
    const [promos, setPromos] = useState(() => db.getAll("promos") || []);
    const [form, setForm] = useState({ title: "", discount: "", code: "", until: "", emoji: "🏷️", desc: "", active: true });
    const [edit, setEdit] = useState(null);
    useEffect(() => { return db.subscribe("promos", setPromos); }, []);
    const save = () => {
      if (!form.title) { showToast("Введите название"); return; }
      const item = { ...form, id: edit?.id || Date.now() };
      if (edit) { db.update("promos", edit.id, item); showToast("Акция обновлена"); }
      else { db.insert("promos", item); showToast("Акция добавлена"); }
      setEdit(null);
      setForm({ title: "", discount: "", code: "", until: "", emoji: "🏷️", desc: "", active: true });
    };
    return (
      <div className="admin-page">
        <div className="admin-page-title">🏷️ Акции</div>
        <div style={{ background: "linear-gradient(145deg, #1a1a1a 0%, #141414 100%)", borderRadius: 16, padding: 20, marginBottom: 16, border: "1px solid #2a2a2a" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input className="inp" placeholder="Название" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <input className="inp" placeholder="Скидка ( напр. -20%)" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <input className="inp" placeholder="Промокод" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            <input className="inp" placeholder="Действителен до" value={form.until} onChange={e => setForm(f => ({ ...f, until: e.target.value }))} />
          </div>
          <textarea className="inp" placeholder="Описание" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} style={{ marginTop: 10 }} />
          <button className="btn btn-green" onClick={save} style={{ marginTop: 12 }}>{edit ? "Сохранить" : "Добавить акцию"}</button>
        </div>
        <div className="table-wrap">
          <table><thead><tr><th>Акция</th><th>Код</th><th></th></tr></thead>
            <tbody>{promos.map(p => (
              <tr key={p.id}><td><b>{p.emoji} {p.title}</b><br/><span style={{ fontSize: 11, color: "#666" }}>{p.discount}</span></td><td><code style={{ background: "#222", padding: "4px 8px", borderRadius: 4 }}>{p.code}</code></td><td><button className="btn btn-sm" style={{ background: "#333", color: "#fff" }} onClick={() => { setEdit(p); setForm(p); }}>✏️</button></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  };

  const AdminReviews = () => {
    const [reviews, setReviews] = useState(() => db.getAll("reviews") || []);
    useEffect(() => { return db.subscribe("reviews", setReviews); }, []);
    return (
      <div className="admin-page">
        <div className="admin-page-title">⭐ Отзывы</div>
        <div className="table-wrap">
          <table><thead><tr><th>Автор</th><th>Текст</th><th>Статус</th></tr></thead>
            <tbody>{reviews.map(r => (
              <tr key={r.id}><td><b>{r.name}</b></td><td style={{ maxWidth: 300 }}>{r.text?.slice(0, 60)}...</td><td><span className={`badge badge-${r.approved ? "ok" : "up"}`}>{r.approved ? "Опубликован" : "На модерации"}</span></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  };

  const pages = {
    homes:     <AdminHomes showToast={showToast} />,
    services:  <AdminServices showToast={showToast} />,
    promos:    <AdminPromos showToast={showToast} />,
    reviews:   <AdminReviews showToast={showToast} />,
    amocrm:   <AdminAmoCRM showToast={showToast} />,
    settings:  <AdminSettings showToast={showToast} />,
  };

  return (
    <div className="admin-layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <h2>🌿 {settings?.siteName || "Hygge Lodge"}</h2>
          <p>Панель управления</p>
          {isSuperAdmin && (
            <div style={{
              marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5,
              background: "rgba(234,179,8,.15)", border: "1px solid rgba(234,179,8,.3)",
              borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700,
              color: "rgba(234,179,8,.9)",
            }}>🛡️ Суперадмин</div>
          )}
          {/* Ссылка на мини-приложение */}
          {(() => {
            const params = new URLSearchParams(window.location.search);
            const hotelId = params.get("hotel") || sessionStorage.getItem("h_sh") || sessionStorage.getItem("h_ai");
            if (!hotelId) return null;
            const appUrl = `${window.location.origin}/?hotel=${hotelId}`;
            const adminUrl = `${window.location.origin}/admin.html?hotel=${hotelId}`;
            return (
              <div style={{ marginTop: 12, fontSize: 11 }}>
                <div style={{ color: "var(--t3)", marginBottom: 4 }}>🔗 Ссылки отеля:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <a href={appUrl} target="_blank" rel="noopener noreferrer" style={{ 
                    color: "var(--green)", textDecoration: "none", fontSize: 11 
                  }}>📱 Мини-приложение</a>
                  <a href={adminUrl} target="_blank" rel="noopener noreferrer" style={{ 
                    color: "var(--green)", textDecoration: "none", fontSize: 11 
                  }}>⚙️ Админ-панель</a>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: "var(--t3)" }}>
                  ID: <span style={{ fontFamily: "monospace" }}>{hotelId}</span>
                </div>
              </div>
            );
          })()}
        </div>
        <div className="sidebar-nav">
          {nav.map(n => (
            <div key={n.id} className={`sidebar-item${page === n.id ? " active" : ""}`} onClick={() => setPage(n.id)}>
              <span>{n.ico}</span>{n.label}
            </div>
          ))}
          {!isSuperAdmin && (
            <div className="sidebar-item" style={{ marginTop: 8, color: "var(--t3)" }} onClick={() => { onExit ? onExit() : window.location.href = "./"; }}>
              <span>◀️</span>В приложение
            </div>
          )}
          <div className="sidebar-item" style={{ color: isSuperAdmin ? "rgba(234,179,8,.85)" : "#dc2626" }} onClick={handleLogout}>
            <span>{isSuperAdmin ? "🛡️" : "🔒"}</span>
            {isSuperAdmin ? "← К списку отелей" : "Выйти из панели"}
          </div>
        </div>
      </div>

      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{nav.find(n => n.id === page)?.label}</div>
            <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 1 }}>
              {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge badge-ok">● Онлайн</span>
            <div style={{ width: 34, height: 34, background: "var(--green)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>А</div>
          </div>
        </div>
        {pages[page]}
      </div>
    </div>
  );
}
