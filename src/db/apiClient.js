// ─── API CLIENT ─────────────────────────────────────────────────────────────
// Server API integration for hotel data

const API_BASE = 'http://95.140.155.14:3000/api';

async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'API error');
  }
  return response.json();
}

// Hotels
export async function getHotels() {
  return fetchAPI('/hotels');
}

export async function registerHotel({ name, login, password, email }) {
  return fetchAPI('/hotels', {
    method: 'POST',
    body: JSON.stringify({ name, login, password, email }),
  });
}

export async function loginHotel(login, password) {
  return fetchAPI('/hotels/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
}

export async function getHotelById(id) {
  const hotels = await getHotels();
  return hotels.find(h => h.id === id) || null;
}

// Settings
export async function getHotelSettings(hotelId) {
  return fetchAPI(`/hotels/${hotelId}/settings`);
}

export async function saveHotelSettings(hotelId, settings) {
  return fetchAPI(`/hotels/${hotelId}/settings`, {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
}

// Hotel Data (homes, services, promos, etc)
export async function getHotelData(hotelId) {
  return fetchAPI(`/hotels/${hotelId}/data`);
}

export async function saveHotelData(hotelId, data) {
  return fetchAPI(`/hotels/${hotelId}/data`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

// Password reset
export async function sendResetOtp(email) {
  return fetchAPI('/hotels/reset-request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyOtp(email, otp) {
  return fetchAPI('/hotels/reset-verify', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function resetPassword(login, newPassword) {
  return fetchAPI('/hotels/reset-password', {
    method: 'POST',
    body: JSON.stringify({ login, newPassword }),
  });
}