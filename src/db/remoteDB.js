// ─── REMOTE DATABASE ───────────────────────────────────────────────────────
// Server-based database using API

import * as api from './apiClient.js';

const CACHE_KEY = '_remote_cache';
const CACHE_TTL = 5000; // 5 seconds

let currentHotelId = null;
let dataCache = { settings: null, data: null, timestamp: 0 };
let listeners = {};

function cacheGet(key) {
  if (Date.now() - dataCache.timestamp > CACHE_TTL) return null;
  return dataCache[key];
}

function cacheSet(key, value) {
  dataCache[key] = value;
  dataCache.timestamp = Date.now();
}

function emit(table, value) {
  if (listeners[table]) {
    listeners[table].forEach(fn => fn(value));
  }
  if (listeners['*']) {
    listeners['*'].forEach(fn => fn({ [table]: value }));
  }
}

export function setHotelId(id) {
  currentHotelId = id;
  dataCache = { settings: null, data: null, timestamp: 0 };
  if (id) {
    loadFromServer();
  }
}

async function loadFromServer() {
  if (!currentHotelId) return;
  try {
    const [settings, data] = await Promise.all([
      api.getHotelSettings(currentHotelId),
      api.getHotelData(currentHotelId),
    ]);
    cacheSet('settings', settings || {});
    cacheSet('data', data);
    emit('settings', settings || {});
    emit('*', data);
  } catch (e) {
    console.error('Failed to load from server:', e);
  }
}

export async function saveToServer() {
  if (!currentHotelId) return;
  const settings = dataCache.settings || {};
  const data = dataCache.data || {};
  try {
    await Promise.all([
      api.saveHotelSettings(currentHotelId, settings),
      api.saveHotelData(currentHotelId, data),
    ]);
  } catch (e) {
    console.error('Failed to save to server:', e);
  }
}

export const remoteDB = {
  subscribe(table, fn) {
    if (!listeners[table]) listeners[table] = [];
    listeners[table].push(fn);
    
    // Send current value if available
    const cached = cacheGet(table === 'settings' ? 'settings' : 'data');
    if (cached) {
      setTimeout(() => fn(table === 'settings' ? cached : cached[table]), 0);
    }
    
    return () => {
      listeners[table] = listeners[table].filter(f => f !== fn);
    };
  },

  get(key) {
    const cached = cacheGet(key);
    if (cached) return cached;
    
    // Fallback to data object
    const data = cacheGet('data');
    return data ? data[key] : null;
  },

  set(key, value) {
    if (key === 'settings') {
      cacheSet('settings', value);
    } else {
      const data = cacheGet('data') || {};
      data[key] = value;
      cacheSet('data', data);
    }
    saveToServer(); // debounced in real implementation
    emit(key, value);
    return value;
  },

  getAll(table) {
    const data = cacheGet('data');
    if (!data) return [];
    return data[table] || [];
  },

  getActive(table) {
    return this.getAll(table).filter(i => i.active !== false);
  },

  insert(table, item) {
    const data = cacheGet('data') || {};
    const list = data[table] || [];
    const newItem = { ...item, id: Date.now() };
    list.push(newItem);
    data[table] = list;
    cacheSet('data', data);
    saveToServer();
    emit(table, list);
    return newItem;
  },

  update(table, id, patch) {
    const data = cacheGet('data') || {};
    const list = data[table] || [];
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    data[table] = list;
    cacheSet('data', data);
    saveToServer();
    emit(table, list);
    return list[idx];
  },

  delete(table, id) {
    const data = cacheGet('data') || {};
    const list = (data[table] || []).filter(i => i.id !== id);
    data[table] = list;
    cacheSet('data', data);
    saveToServer();
    emit(table, list);
  },

  switchTo(key, initName) {
    // Extract hotel ID from key like "hygge_db_123456789"
    const id = key.replace('hygge_db_', '');
    setHotelId(id);
  },

  // For loading initially
  loadHotel(id) {
    setHotelId(id);
  },
};

export default remoteDB;