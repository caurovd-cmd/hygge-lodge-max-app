"use client";
import { useEffect, useState } from "react";
import "../styles.css";
import bridge from "../hooks/useBridge.js";
import remoteDB from "../db/remoteDB.js";
import * as api from "../db/apiClient.js";
import { Toast } from "../components/UI.jsx";
import {
  PageMain, PageHomes, PageHomeDetail, PageServices,
  PageWallet, PagePromos, PageHowToGet, PageReviews,
  PageContacts, PageAccount,
} from "../app-pages/index.jsx";

const NAV_ITEMS = [
  { id: "main", icon: "⛺", label: "Главная" },
  { id: "wallet", icon: "💳", label: "Кошелёк" },
  { id: "services", icon: "🔖", label: "Услуги" },
  { id: "account", icon: "👤", label: "Профиль" },
];

const NAV_PAGES = new Set(NAV_ITEMS.map(n => n.id));

export default function App() {
  const [page, setPage] = useState("main");
  const [pageData, setPageData] = useState(null);
  const [navTab, setNavTab] = useState("main");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const hotelId = params.get("hotel");
    if (hotelId) {
      remoteDB.loadHotel(hotelId);
    }
  }, []);

  useEffect(() => { 
    bridge.ready(); 
  }, []);

  useEffect(() => {
    const unsubscribe = remoteDB.subscribe("settings", (s) => {
      setSettings(s || {});
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const showToast = (msg, type = "info") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const navigateTo = (p, data) => {
    setPage(p);
    setPageData(data);
    if (!NAV_PAGES.has(p)) setNavTab("");
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  const PageComponent = {
    main: PageMain,
    homes: PageHomes,
    homeDetail: PageHomeDetail,
    services: PageServices,
    wallet: PageWallet,
    promos: PagePromos,
    howtoget: PageHowToGet,
    reviews: PageReviews,
    contacts: PageContacts,
    account: PageAccount,
  }[page];

  return (
    <div className="app">
      {PageComponent && <PageComponent {...pageData} navigate={navigateTo} settings={settings} showToast={showToast} />}
      {navTab && (
        <nav className="bottom-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.id} className={`nav-btn ${navTab === item.id ? "active" : ""}`} onClick={() => navigateTo(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}