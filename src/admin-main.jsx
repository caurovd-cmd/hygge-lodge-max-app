import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { AdminPanel } from "./admin/AdminPanel.jsx";
import { Toast } from "./components/UI.jsx";
import remoteDB from "./db/remoteDB.js";
import * as api from "./db/apiClient.js";

// ── SESSION KEYS ──────────────────────────────────────────────────────────────
const S = {
  session:    "h_as",  // обычная hotel-сессия
  hotelId:    "h_ai",  // id текущего отеля
  superSess:  "h_ss",  // суперадмин-сессия (устанавливается superadmin.html)
  superHotel: "h_sh",  // id отеля открытого суперадмином
};

// ── THEME ─────────────────────────────────────────────────────────────────────
const BG = "linear-gradient(160deg, #0f1f0e 0%, #1a2f1a 50%, #0d1a0d 100%)";

const card = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 20,
  boxShadow: "0 24px 60px rgba(0,0,0,.55)",
};

function inp(focused, padRight = false) {
  return {
    width: "100%", boxSizing: "border-box",
    padding: padRight ? "12px 44px 12px 14px" : "12px 14px",
    background: "rgba(255,255,255,.07)",
    border: `1.5px solid ${focused ? "rgba(90,180,70,.65)" : "rgba(255,255,255,.13)"}`,
    borderRadius: 10, fontSize: 15, color: "#fff", outline: "none",
    transition: "border-color .2s",
  };
}

const lbl = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "rgba(255,255,255,.45)", marginBottom: 7,
  textTransform: "uppercase", letterSpacing: .6,
};

function Btn({ children, disabled, type = "submit", style = {} }) {
  return (
    <button type={type} disabled={disabled} style={{
      width: "100%", padding: "13px 0", border: "none",
      borderRadius: 12, fontSize: 15, fontWeight: 700, color: "#fff",
      cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "rgba(90,180,70,.35)" : "linear-gradient(135deg,#5ab446,#3d8a2e)",
      boxShadow: disabled ? "none" : "0 4px 14px rgba(90,180,70,.35)",
      transition: "opacity .15s",
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

function PassField({ label, value, onChange, placeholder, onEnter }) {
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
        />
        <button type="button" onClick={() => setShow(v => !v)} style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          fontSize: 16, color: "rgba(255,255,255,.35)", padding: 4,
        }}>{show ? "🙈" : "👁️"}</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ЭКРАН ВХОДА / РЕГИСТРАЦИИ / ВОССТАНОВЛЕНИЯ ПАРОЛЯ
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  // mode: "login" | "register" | "reset_request" | "reset_otp"
  const [mode, setMode]           = useState("login");
  const [hotelName, setHotelName] = useState("");
  const [login, setLogin]         = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [otp, setOtp]             = useState("");
  const [newPass, setNewPass]     = useState("");
  const [newPassConf, setNewPassConf] = useState("");
  const [error, setError]         = useState("");
  const [info, setInfo]           = useState("");
  const [loading, setLoading]     = useState(false);

  const [fLogin, setFLogin]   = useState(false);
  const [fName, setFName]     = useState(false);
  const [fEmail, setFEmail]   = useState(false);
  const [fOtp, setFOtp]       = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [fResetEmail, setFResetEmail] = useState(false);
  // логин приходит с сервера после верификации OTP
  const [verifiedLogin, setVerifiedLogin] = useState("");

  useEffect(() => { setError(""); setInfo(""); setPassword(""); setConfirm(""); }, [mode]);

  // ── Вход ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!login.trim() || !password) { setError("Заполните все поля"); return; }
    setLoading(true); setError("");
    try {
      const hotel = await api.loginHotel(login.trim().toLowerCase(), password);
      remoteDB.loadHotel(hotel.id);
      sessionStorage.setItem(S.session, "1");
      sessionStorage.setItem(S.hotelId, hotel.id);
      onLogin(hotel);
    } catch (ex) {
      setError(ex.message); setPassword("");
    } finally { setLoading(false); }
  };

  // ── Регистрация ────────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e?.preventDefault();
    if (hotelName.trim().length < 2) { setError("Введите название (мин. 2 символа)"); return; }
    if (login.length < 3)             { setError("Логин — минимум 3 символа"); return; }
    if (!/^[a-z0-9_]+$/.test(login)) { setError("Логин: только строчные буквы, цифры, _"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Введите корректный email"); return; }
    if (password.length < 6)          { setError("Пароль — минимум 6 символов"); return; }
    if (password !== confirm)          { setError("Пароли не совпадают"); return; }
    setLoading(true); setError("");
    try {
      const hotel = await api.registerHotel({ name: hotelName.trim(), login: login.trim().toLowerCase(), password, email });
      remoteDB.loadHotel(hotel.id);
      sessionStorage.setItem(S.session, "1");
      sessionStorage.setItem(S.hotelId, hotel.id);
      onLogin(hotel);
    } catch (ex) {
      setError(ex.message);
    } finally { setLoading(false); }
  };

  // ── Запрос OTP ─────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const em = resetEmail.trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError("Введите корректный email"); return; }
    setLoading(true); setError(""); setInfo("");
    try {
      await api.sendResetOtp(em);
      setInfo("Если этот email зарегистрирован — код отправлен.");
      setMode("reset_otp");
    } catch (ex) {
      setError(ex.message);
    } finally { setLoading(false); }
  };

  // ── Проверка OTP + новый пароль ────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (!otp.trim() || otp.length !== 6) { setError("Введите 6-значный код"); return; }
    if (newPass.length < 6)              { setError("Новый пароль — минимум 6 символов"); return; }
    if (newPass !== newPassConf)         { setError("Пароли не совпадают"); return; }
    setLoading(true); setError("");
    try {
      const res = await api.verifyOtp(resetEmail.trim().toLowerCase(), otp.trim());
      const login = res.login || verifiedLogin;
      if (!login) throw new Error("Не удалось определить аккаунт. Запросите код повторно.");
      setVerifiedLogin(login);
      await api.resetPassword(login, newPass);
      setInfo("✅ Пароль успешно изменён");
      setTimeout(() => setMode("login"), 1500);
    } catch (ex) {
      setError(ex.message);
    } finally { setLoading(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...card, padding: "36px 28px", width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 10 }}>🌿</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -.5 }}>Hygge Lodge</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginTop: 4 }}>Панель управления</div>
        </div>

        {/* ── ВОССТАНОВЛЕНИЕ — запрос кода ── */}
        {mode === "reset_request" && (
          <>
            <button type="button" onClick={() => setMode("login")} style={{ background:"none",border:"none",color:"rgba(255,255,255,.4)",fontSize:13,cursor:"pointer",padding:"0 0 16px 0" }}>← Назад</button>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 6 }}>🔑 Восстановление пароля</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", marginBottom: 20 }}>Введите email — пришлём код для сброса пароля</div>
            <form onSubmit={handleSendOtp}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Email</label>
                <input type="email" value={resetEmail}
                  onChange={e => { setResetEmail(e.target.value); setError(""); }}
                  placeholder="admin@ecohotel.ru"
                  style={inp(fResetEmail)}
                  onFocus={() => setFResetEmail(true)} onBlur={() => setFResetEmail(false)}
                  autoFocus autoComplete="email"
                />
              </div>
              <ErrBox msg={error} />
              <Btn disabled={loading}>{loading ? "⏳ Отправляем..." : "Отправить код"}</Btn>
            </form>
          </>
        )}

        {/* ── ВОССТАНОВЛЕНИЕ — ввод кода + новый пароль ── */}
        {mode === "reset_otp" && (
          <>
            <button type="button" onClick={() => setMode("reset_request")} style={{ background:"none",border:"none",color:"rgba(255,255,255,.4)",fontSize:13,cursor:"pointer",padding:"0 0 16px 0" }}>← Назад</button>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 6 }}>📧 Введите код из письма</div>
            {info && <div style={{ background:"rgba(90,180,70,.12)",border:"1px solid rgba(90,180,70,.3)",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#86efac",marginBottom:14 }}>{info}</div>}
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>6-значный код</label>
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g,"")); setError(""); }}
                  placeholder="123456"
                  style={{ ...inp(fOtp), fontSize: 24, letterSpacing: 8, textAlign: "center" }}
                  onFocus={() => setFOtp(true)} onBlur={() => setFOtp(false)}
                  autoFocus
                />
              </div>
              <PassField label="Новый пароль" value={newPass} onChange={v => { setNewPass(v); setError(""); }} placeholder="Минимум 6 символов" />
              <PassField label="Повторите пароль" value={newPassConf} onChange={v => { setNewPassConf(v); setError(""); }} placeholder="Повторите пароль" />
              <ErrBox msg={error} />
              <Btn disabled={loading}>{loading ? "⏳ Проверяем..." : "Сменить пароль"}</Btn>
            </form>
            <div style={{ textAlign:"center",marginTop:14 }}>
              <button type="button" onClick={handleSendOtp} disabled={loading} style={{ background:"none",border:"none",color:"rgba(255,255,255,.3)",fontSize:12,cursor:"pointer" }}>
                Отправить код повторно
              </button>
            </div>
          </>
        )}

        {/* ── ВХОД / РЕГИСТРАЦИЯ ── */}
        {(mode === "login" || mode === "register") && (
          <>
            <div style={{ display: "flex", background: "rgba(255,255,255,.06)", borderRadius: 10, padding: 3, marginBottom: 22 }}>
              {[["login","Войти"],["register","Регистрация"]].map(([m, label]) => (
                <button key={m} type="button" onClick={() => setMode(m)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700, transition: "background .2s, color .2s",
                  background: mode === m ? "rgba(90,180,70,.25)" : "none",
                  color: mode === m ? "#5ab446" : "rgba(255,255,255,.4)",
                }}>{label}</button>
              ))}
            </div>

            <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
              {mode === "register" && (
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Название отеля</label>
                  <input type="text" value={hotelName} autoFocus
                    onChange={e => { setHotelName(e.target.value); setError(""); }}
                    placeholder="Eco Resort Лесной"
                    style={inp(fName)}
                    onFocus={() => setFName(true)} onBlur={() => setFName(false)}
                  />
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Логин</label>
                <input type="text" value={login}
                  onChange={e => { setLogin(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20)); setError(""); }}
                  placeholder="ecohotel"
                  style={inp(fLogin)}
                  onFocus={() => setFLogin(true)} onBlur={() => setFLogin(false)}
                  autoComplete="username"
                />
              </div>

              {mode === "register" && (
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Email <span style={{ color: "#5ab446" }}>*</span></label>
                  <input type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    placeholder="admin@ecohotel.ru"
                    style={inp(fEmail)}
                    onFocus={() => setFEmail(true)} onBlur={() => setFEmail(false)}
                    autoComplete="email"
                  />
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 5 }}>
                    Используется только для восстановления пароля
                  </div>
                </div>
              )}

              <PassField
                label="Пароль"
                value={password}
                onChange={v => { setPassword(v); setError(""); }}
                placeholder={mode === "register" ? "Минимум 6 символов" : "Введите пароль"}
                onEnter={mode === "login" ? handleLogin : undefined}
              />
              {mode === "register" && (
                <PassField
                  label="Повторите пароль"
                  value={confirm}
                  onChange={v => { setConfirm(v); setError(""); }}
                  placeholder="Повторите пароль"
                />
              )}

              <ErrBox msg={error} />
              <Btn disabled={loading}>
                {loading
                  ? (mode === "login" ? "⏳ Проверяем..." : "⏳ Создаём...")
                  : (mode === "login" ? "Войти" : "Зарегистрировать и войти")}
              </Btn>
            </form>

            {mode === "login" && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button type="button" onClick={() => setMode("reset_request")} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "rgba(255,255,255,.35)",
                }}>
                  Забыли пароль?
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
function AdminApp() {
  const [toast, setToast] = useState(null);

  // Определяем начальный экран
  const [authed, setAuthed] = useState(() => {
    // Суперадмин вошёл в отель через superadmin.html
    if (sessionStorage.getItem(S.superSess) === "1" && sessionStorage.getItem(S.superHotel)) return true;
    // Обычная сессия отеля
    if (sessionStorage.getItem(S.session) === "1" && sessionStorage.getItem(S.hotelId)) return true;
    return false;
  });

  const isSuperAdmin = sessionStorage.getItem(S.superSess) === "1" && !!sessionStorage.getItem(S.superHotel);

  // Восстанавливаем db namespace при загрузке
  useEffect(() => {
    // Проверяем URL параметр hotel
    const params = new URLSearchParams(window.location.search);
    const urlHotelId = params.get("hotel");
    
    // Если есть URL параметр - используем его
    if (urlHotelId) {
      sessionStorage.setItem(S.hotelId, urlHotelId);
      remoteDB.loadHotel(urlHotelId);
    } else {
      // Иначе восстанавливаем из sessionStorage
      const hotelId = sessionStorage.getItem(S.superHotel) || sessionStorage.getItem(S.hotelId);
      if (hotelId) remoteDB.loadHotel(hotelId);
    }
  }, []);

  // Обработчик выхода
  const handleLogout = () => {
    if (isSuperAdmin) {
      // Суперадмин → возврат в суперадминку
      sessionStorage.removeItem(S.superHotel);
      sessionStorage.removeItem(S.superSess);
      window.location.href = "./superadmin.html";
    } else {
      sessionStorage.removeItem(S.session);
      sessionStorage.removeItem(S.hotelId);
      setAuthed(false);
    }
  };

  // Регистрируем глобально для AdminPanel
  useEffect(() => {
    window.__adminLogoutHandler = handleLogout;
    return () => { delete window.__adminLogoutHandler; };
  });

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      {!authed
        ? <AuthScreen onLogin={() => setAuthed(true)} />
        : <AdminPanel
            onExit={() => { window.location.href = "./"; }}
            onLogout={handleLogout}
            isSuperAdmin={isSuperAdmin}
            showToast={msg => setToast(msg)}
          />
      }
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><AdminApp /></React.StrictMode>
);
