import { useState, useEffect, useCallback } from "react";
import "./styles.css";
import bridge from "./hooks/useBridge.js";
import db from "./db/database.js";
import { Toast } from "./components/UI.jsx";
import {
  PageMain, PageHomes, PageHomeDetail, PageServices,
  PageWallet, PagePromos, PageHowToGet, PageReviews,
  PageContacts, PageAccount,
} from "./pages/index.jsx";

// ── BOTTOM NAV CONFIG ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "main",     icon: "⛺", label: "Главная" },
  { id: "wallet",   icon: "💳", label: "Кошелёк" },
  { id: "services", icon: "🔖", label: "Услуги"  },
  { id: "account",  icon: "👤", label: "Профиль" },
];

const NAV_PAGES = new Set(NAV_ITEMS.map(n => n.id));

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]       = useState("main");
  const [pageData, setPageData] = useState(null);
  const [navTab, setNavTab]   = useState("main");
  const [toast, setToast]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  // Переключение на отель по URL параметру
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hotelId = params.get("hotel");
      if (hotelId) {
        db.switchTo("hygge_db_" + hotelId);
      }
      setTimeout(() => {
        try {
          setSettings(db.get("settings"));
        } catch (e) {
          console.error("Error getting settings:", e);
        }
        setLoading(false);
      }, 300);
    } catch (e) {
      console.error("Error in useEffect:", e);
      setLoading(false);
    }
  }, []);

  useEffect(() => { bridge.ready(); }, []);
  useEffect(() => { return db.subscribe("settings", setSettings); }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Загрузка...
      </div>
    );
  }

  const showToast = useCallback((msg) => setToast(msg), []);

  const goTo = useCallback((p, data = null) => {
    setPage(p);
    setPageData(data);
    if (NAV_PAGES.has(p)) setNavTab(p);
  }, []);

  const renderPage = () => {
    switch (page) {
      case "main":        return <PageMain goTo={goTo} />;
      case "homes":       return <PageHomes goTo={goTo} />;
      case "home-detail": return <PageHomeDetail home={pageData} onBack={() => goTo("homes")} />;
      case "services":    return <PageServices showToast={showToast} />;
      case "wallet":
      case "certs":       return <PageWallet showToast={showToast} />;
      case "promos":      return <PagePromos showToast={showToast} />;
      case "howtoget":    return <PageHowToGet />;
      case "reviews":     return <PageReviews showToast={showToast} />;
      case "contacts":    return <PageContacts showToast={showToast} />;
      case "account":     return <PageAccount goTo={goTo} showToast={showToast} />;
      default:            return <PageMain goTo={goTo} />;
    }
  };

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      <div className="app">

        {/* ШАПКА */}
        {page !== "home-detail" && (
          <div className="topbar">
            <div className="topbar-logo">🌿</div>
            <div style={{ flex: 1 }}>
              <div className="topbar-name">{settings?.siteName || "Hygge Lodge"}</div>
              <div className="topbar-sub">{settings?.siteSubtitle || "Глэмпинг"} · MAX</div>
            </div>
          </div>
        )}

        {/* КОНТЕНТ */}
        <div className="content">{renderPage()}</div>

        {/* НИЖНЯЯ НАВИГАЦИЯ */}
        {page !== "home-detail" && (
          <div className="bnav">
            {NAV_ITEMS.map(n => (
              <button
                key={n.id}
                className={`bni${navTab === n.id ? " active" : ""}`}
                onClick={() => goTo(n.id)}
              >
                <span className="bni-ico">{n.icon}</span>
                <span className="bni-lbl">{n.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
