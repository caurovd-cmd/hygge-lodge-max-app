import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { Toast } from "./components/UI.jsx";
import db from "./db/database.js";
import { getHotels, registerHotel } from "./db/hotelRegistry.js";
import { getSuperAdmin, setupSuperAdmin, loginSuperAdmin, changeSuperAdminPassword } from "./db/superAdmin.js";

// ── SESSION ───────────────────────────────────────────────────────────────────
const SS = "h_sa_sess"; // superadmin session key (отдельный от hotel admin)

// ── THEME ─────────────────────────────────────────────────────────────────────
const BG = "linear-gradient(160deg, #0a1509 0%, #111e10 50%, #0a1509 100%)";
const GOLD = "rgba(234,179,8,1)";
const GOLD_DIM = "rgba(234,179,8,.7)";

const card = (extra = {}) => ({
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 18,
  boxShadow: "0 20px 50px rgba(0,0,0,.55)",
  ...extra,
});

function inp(focused, padRight = false) {
  return {
    width: "100%", boxSizing: "border-box",
    padding: padRight ? "12px 44px 12px 14px" : "12px 14px",
    background: "rgba(255,255,255,.06)",
    border: `1.5px solid ${focused ? "rgba(234,179,8,.5)" : "rgba(255,255,255,.12)"}`,
    borderRadius: 10, fontSize: 15, color: "#fff", outline: "none",
    transition: "border-color .2s",
  };
}

const lbl = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "rgba(255,255,255,.4)", marginBottom: 7,
  textTransform: "uppercase", letterSpacing: .6,
};

function GoldBtn({ children, disabled, onClick, type = "submit", outline = false, danger = false, style = {} }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{
      width: "100%", padding: "13px 0", border: "none",
      borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      transition: "opacity .15s",
      ...(danger
        ? { background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", boxShadow: "0 4px 14px rgba(220,38,38,.3)" }
        : outline
          ? { background: "none", border: `1.5px solid rgba(234,179,8,.4)`, color: GOLD_DIM }
          : { background: disabled ? "rgba(234,179,8,.25)" : "linear-gradient(135deg,#d97706,#92400e)", color: "#fff", boxShadow: disabled ? "none" : "0 4px 14px rgba(217,119,6,.35)" }
      ),
      ...style,
    }}>
      {children}
    </button>
  );
}

function GreenBtn({ children, disabled, onClick, type = "submit", style = {} }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{
      padding: "10px 20px", border: "none", borderRadius: 10,
      fontSize: 13, fontWeight: 700, color: "#fff", cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "rgba(90,180,70,.3)" : "linear-gradient(135deg,#5ab446,#3d8a2e)",
      boxShadow: disabled ? "none" : "0 3px 10px rgba(90,180,70,.3)",
      ...style,
    }}>{children}</button>
  );
}

function ErrBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background: "rgba(220,38,38,.12)", border: "1px solid rgba(220,38,38,.28)",
      borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#fca5a5",
      marginBottom: 14, textAlign: "center",
    }}>⚠️ {msg}</div>
  );
}

function PassField({ label, value, onChange, placeholder, onEnter, autoFocus }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={lbl}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "••••••••"}
          style={inp(focused, true)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === "Enter" && onEnter?.()}
          autoComplete="off"
          autoFocus={autoFocus}
        />
        <button type="button" onClick={() => setShow(v => !v)} style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          fontSize: 16, color: "rgba(255,255,255,.3)", padding: 4,
        }}>{show ? "🙈" : "👁️"}</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ЭКРАН: ВХОД / ПЕРВИЧНАЯ НАСТРОЙКА СУПЕРАДМИНА
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({ onSuccess }) {
  const isSetup = !getSuperAdmin();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (!password) { setError("Введите пароль"); return; }
    if (isSetup) {
      if (password.length < 8) { setError("Пароль — минимум 8 символов"); return; }
      if (password !== confirm) { setError("Пароли не совпадают"); return; }
    }
    setLoading(true);
    try {
      if (isSetup) await setupSuperAdmin(password);
      else await loginSuperAdmin(password);
      sessionStorage.setItem(SS, "1");
      onSuccess();
    } catch (ex) {
      setError(ex.message);
      setPassword(""); setConfirm("");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100dvh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...card(), padding: "40px 30px", width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: GOLD }}>Суперадмин</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 5 }}>
            Hygge Lodge Platform
          </div>
        </div>

        {isSetup && (
          <div style={{
            background: "rgba(234,179,8,.07)", border: "1px solid rgba(234,179,8,.2)",
            borderRadius: 10, padding: "11px 14px", fontSize: 12,
            color: "rgba(234,179,8,.75)", marginBottom: 22, lineHeight: 1.6,
          }}>
            ⚠️ Первый запуск. Придумайте надёжный мастер-пароль (мин. 8 символов). Запишите его — автовосстановление невозможно.
          </div>
        )}

        <form onSubmit={submit}>
          <PassField
            label={isSetup ? "Мастер-пароль" : "Пароль"}
            value={password}
            onChange={v => { setPassword(v); setError(""); }}
            placeholder={isSetup ? "Минимум 8 символов" : "Мастер-пароль"}
            onEnter={!isSetup ? submit : undefined}
            autoFocus
          />
          {isSetup && (
            <PassField
              label="Повторите пароль"
              value={confirm}
              onChange={v => { setConfirm(v); setError(""); }}
              placeholder="Повторите пароль"
            />
          )}
          <ErrBox msg={error} />
          <GoldBtn disabled={loading}>
            {loading ? "⏳ Проверяем..." : isSetup ? "Создать и войти" : "Войти"}
          </GoldBtn>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href="./" style={{ fontSize: 12, color: "rgba(255,255,255,.2)", textDecoration: "none" }}>
            ← Вернуться
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// МОДАЛЬНОЕ ОКНО: СОЗДАТЬ ОТЕЛЬ
// ─────────────────────────────────────────────────────────────────────────────
function CreateHotelModal({ onClose, onCreated }) {
  const [name, setName]         = useState("");
  const [login, setLogin]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [focusName, setFocusName] = useState(false);
  const [focusLogin, setFocusLogin] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (name.trim().length < 2) { setError("Название — минимум 2 символа"); return; }
    if (login.length < 3) { setError("Логин — минимум 3 символа"); return; }
    if (!/^[a-z0-9_]+$/.test(login)) { setError("Логин: только строчные буквы, цифры, _"); return; }
    if (password.length < 6) { setError("Пароль — минимум 6 символов"); return; }
    if (password !== confirm) { setError("Пароли не совпадают"); return; }
    setLoading(true);
    try {
      const hotel = await registerHotel({ name: name.trim(), login, password });
      // Инициализируем базу нового отеля с его именем
      db.switchTo("hygge_db_" + hotel.id, hotel.name);
      onCreated(hotel);
    } catch (ex) {
      setError(ex.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card(), padding: "32px 26px", width: "100%", maxWidth: 420, position: "relative" }}>
        {/* Close */}
        <button type="button" onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(255,255,255,.08)", border: "none", borderRadius: 8,
          width: 30, height: 30, color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 16,
        }}>✕</button>

        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>🏕️ Новый отель</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 22 }}>
          Создание учётной записи для эко-отеля
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Название отеля</label>
            <input type="text" value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
              placeholder="Eco Resort Лесной"
              style={inp(focusName)}
              onFocus={() => setFocusName(true)} onBlur={() => setFocusName(false)}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Логин администратора</label>
            <input type="text" value={login}
              onChange={e => {
                setLogin(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20));
                setError("");
              }}
              placeholder="eco_resort"
              style={inp(focusLogin)}
              onFocus={() => setFocusLogin(true)} onBlur={() => setFocusLogin(false)}
            />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 5 }}>
              Только a–z, 0–9, _ · макс. 20 символов
            </div>
          </div>

          <PassField
            label="Пароль для администратора отеля"
            value={password}
            onChange={v => { setPassword(v); setError(""); }}
            placeholder="Минимум 6 символов"
          />
          <PassField
            label="Повторите пароль"
            value={confirm}
            onChange={v => { setConfirm(v); setError(""); }}
            placeholder="Повторите пароль"
          />

          <ErrBox msg={error} />
          <GreenBtn disabled={loading} type="submit" style={{ width: "100%" }}>
            {loading ? "⏳ Создаём..." : "✅ Создать отель"}
          </GreenBtn>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// МОДАЛЬНОЕ ОКНО: СМЕНА ПАРОЛЯ СУПЕРАДМИНА
// ─────────────────────────────────────────────────────────────────────────────
function ChangePasswordModal({ onClose, showToast }) {
  const [cur, setCur]   = useState("");
  const [next, setNext] = useState("");
  const [rep, setRep]   = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (next.length < 8) { setError("Новый пароль — минимум 8 символов"); return; }
    if (next !== rep) { setError("Пароли не совпадают"); return; }
    setLoading(true);
    try {
      const { changeSuperAdminPassword } = await import("./db/superAdmin.js");
      await changeSuperAdminPassword(cur, next);
      showToast("✅ Мастер-пароль изменён");
      onClose();
    } catch (ex) {
      setError(ex.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card(), padding: "32px 26px", width: "100%", maxWidth: 380, position: "relative" }}>
        <button type="button" onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(255,255,255,.08)", border: "none", borderRadius: 8,
          width: 30, height: 30, color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 16,
        }}>✕</button>

        <div style={{ fontSize: 18, fontWeight: 800, color: GOLD, marginBottom: 6 }}>🔑 Смена мастер-пароля</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 22 }}>Пароль суперадминистратора</div>

        <form onSubmit={submit}>
          <PassField label="Текущий пароль" value={cur} onChange={v => { setCur(v); setError(""); }} autoFocus />
          <PassField label="Новый пароль (мин. 8 символов)" value={next} onChange={v => { setNext(v); setError(""); }} />
          <PassField label="Повторите новый пароль" value={rep} onChange={v => { setRep(v); setError(""); }} />
          <ErrBox msg={error} />
          <GoldBtn disabled={loading}>
            {loading ? "⏳ Сохраняем..." : "Сохранить пароль"}
          </GoldBtn>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ПАНЕЛЬ СУПЕРАДМИНА
// ─────────────────────────────────────────────────────────────────────────────
function SuperPanel({ onLogout, showToast }) {
  const [hotels, setHotels]     = useState(() => getHotels());
  const [showCreate, setShowCreate] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const refreshHotels = () => setHotels(getHotels());

  const handleCreated = (hotel) => {
    setShowCreate(false);
    refreshHotels();
    showToast(`✅ Отель «${hotel.name}» создан`);
  };

  const handleEnterHotel = (hotel) => {
    // Передаём суперадмин-контекст в admin.html через sessionStorage
    sessionStorage.setItem("h_ss", "1");
    sessionStorage.setItem("h_sh", hotel.id);
    // Сбрасываем обычную гостевую сессию если есть
    sessionStorage.removeItem("h_as");
    sessionStorage.removeItem("h_ai");
    window.location.href = "./admin.html";
  };

  return (
    <div style={{ minHeight: "100dvh", background: BG, boxSizing: "border-box" }}>
      {showCreate && <CreateHotelModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {showPass && <ChangePasswordModal onClose={() => setShowPass(false)} showToast={showToast} />}

      {/* Topbar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,21,9,.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,.07)",
        padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 60,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🛡️</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: GOLD, lineHeight: 1.1 }}>Суперадмин</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>Hygge Lodge Platform</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setShowPass(true)} style={{
            background: "rgba(234,179,8,.1)", border: "1px solid rgba(234,179,8,.25)",
            borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600,
            color: GOLD_DIM, cursor: "pointer",
          }}>🔑 Пароль</button>
          <button type="button" onClick={onLogout} style={{
            background: "rgba(220,38,38,.1)", border: "1px solid rgba(220,38,38,.25)",
            borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600,
            color: "#fca5a5", cursor: "pointer",
          }}>Выйти</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px" }}>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { ico: "🏕️", val: hotels.length, label: "Отелей зарегистрировано" },
            { ico: "🌿", val: hotels.filter(h => {
              const d = new Date(h.createdAt);
              const now = new Date();
              return now - d < 30 * 24 * 3600 * 1000;
            }).length, label: "Новых за 30 дней" },
          ].map(s => (
            <div key={s.label} style={{
              ...card({ borderRadius: 14 }), padding: "16px 20px",
              display: "flex", alignItems: "center", gap: 14, flex: "1 1 180px",
            }}>
              <div style={{ fontSize: 28 }}>{s.ico}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: GOLD, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 3 }}>{s.label}</div>
              </div>
            </div>
          ))}

          {/* Кнопка создать */}
          <button type="button" onClick={() => setShowCreate(true)} style={{
            ...card({ borderRadius: 14 }),
            padding: "16px 20px", flex: "1 1 180px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            border: "1.5px dashed rgba(90,180,70,.35)", cursor: "pointer",
            fontSize: 14, fontWeight: 700, color: "#5ab446",
            transition: "border-color .2s, background .2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(90,180,70,.7)"; e.currentTarget.style.background = "rgba(90,180,70,.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(90,180,70,.35)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          >
            <span style={{ fontSize: 22 }}>＋</span> Создать отель
          </button>
        </div>

        {/* Hotels list */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.4)", marginBottom: 14, textTransform: "uppercase", letterSpacing: .5 }}>
          Зарегистрированные отели
        </div>

        {hotels.length === 0 ? (
          <div style={{ ...card({ borderRadius: 16 }), padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,.4)", marginBottom: 20 }}>
              Нет зарегистрированных отелей
            </div>
            <button type="button" onClick={() => setShowCreate(true)} style={{
              padding: "12px 24px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#5ab446,#3d8a2e)", color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>
              🏕️ Создать первый отель
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hotels.map(hotel => (
              <div key={hotel.id} style={{
                ...card({ borderRadius: 14 }), padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 16,
              }}>
                {/* Иконка */}
                <div style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  background: "rgba(90,180,70,.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>🏕️</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {hotel.name}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>@{hotel.login}</span>
                    <span>ID: {hotel.id}</span>
                    <span>📅 {new Date(hotel.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  {/* Ссылки на отель */}
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a href={`?hotel=${hotel.id}`} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 11, color: "var(--green)", textDecoration: "none",
                      background: "rgba(90,180,70,.1)", padding: "3px 8px", borderRadius: 4,
                    }}>📱 Мини-приложение</a>
                    <a href={`admin.html?hotel=${hotel.id}`} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 11, color: "var(--green)", textDecoration: "none",
                      background: "rgba(90,180,70,.1)", padding: "3px 8px", borderRadius: 4,
                    }}>⚙️ Админ-панель</a>
                  </div>
                </div>

                {/* Action */}
                <button type="button" onClick={() => handleEnterHotel(hotel)} style={{
                  flexShrink: 0,
                  background: "linear-gradient(135deg,#5ab446,#3d8a2e)",
                  border: "none", borderRadius: 10, padding: "9px 18px",
                  fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
                  boxShadow: "0 3px 10px rgba(90,180,70,.3)", whiteSpace: "nowrap",
                }}>
                  Открыть панель →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────

function SuperAdminApp() {
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState(() => {
    try {
      return sessionStorage.getItem(SS) === "1" ? "panel" : "auth";
    } catch {
      return "auth";
    }
  });

  // Логируем ошибки для отладки
  useEffect(() => {
    window.onerror = (msg, url, line) => {
      console.error("SuperAdmin Error:", msg, "line:", line);
      setError(msg);
    };
  }, []);

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SS);
    } catch {}
    setScreen("auth");
  };

  if (error) {
    return (
      <div style={{ minHeight: "100dvh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ ...card(), padding: 40, textAlign: "center", color: "#fca5a5" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 16 }}>Ошибка загрузки</div>
          <div style={{ fontSize: 12, marginTop: 8, color: "#888" }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      {screen === "auth" && <AuthScreen onSuccess={() => setScreen("panel")} />}
      {screen === "panel" && (
        <SuperPanel onLogout={handleLogout} showToast={msg => setToast(msg)} />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><SuperAdminApp /></React.StrictMode>
);
