// ─── AMO CRM SERVICE ─────────────────────────────────────────────────────────
// Интеграция с AmoCRM через долгосрочный токен доступа (Bearer Token)
// Используется API v4: https://{subdomain}.amocrm.ru/api/v4/
//
// ВАЖНО: Долгосрочный токен выдаётся в разделе
// "Настройки → Интеграции → Токены доступа" в вашем аккаунте AmoCRM.

function getAmoCfg() {
  try {
    // Получаем текущий ключ БД из db
    const dbKey = window.__db_key || "hygge_lodge_db";
    const raw = localStorage.getItem(dbKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.settings?.amoCRM || null;
  } catch { return null; }
}

class AmoCRMService {
  // ── ПРОВЕРКИ ────────────────────────────────────────────────────────────────
  get isEnabled() {
    const cfg = getAmoCfg();
    return !!(cfg?.enabled && cfg?.domain && cfg?.token);
  }

  get config() { return getAmoCfg(); }

  // ── Нормализация домена ───────────────────────────────────────────────────────
  static normalizeDomain(raw) {
    if (!raw) return "";
    let d = raw.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    // Если введён только субдомен без точки — добавляем .amocrm.ru
    if (d && !d.includes(".")) d = `${d}.amocrm.ru`;
    return d;
  }

  // ── HTTP СЛОЙ ────────────────────────────────────────────────────────────────
  async _req(method, path, body = null) {
    const cfg = getAmoCfg();
    if (!cfg?.domain || !cfg?.token) throw new Error("AmoCRM: не настроен домен или токен");

    const domain = AmoCRMService.normalizeDomain(cfg.domain);
    const targetUrl = `https://${domain}/api/v4/${path}`;

    // Если задан CORS-прокси — пропускаем запрос через него
    // Формат: https://my-proxy.com/?url=ENCODED_TARGET
    const proxyBase = (cfg.proxyUrl || "").trim().replace(/\/$/, "");
    const url = proxyBase
      ? `${proxyBase}/?url=${encodeURIComponent(targetUrl)}`
      : targetUrl;

    const opts = {
      method,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
    };
    if (body !== null) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(url, opts);
    } catch (networkErr) {
      // Failed to fetch / CORS
      const isCors = networkErr instanceof TypeError;
      if (isCors && !proxyBase) {
        throw new Error(
          `Браузер заблокировал запрос (CORS). ` +
          `Укажите CORS-прокси в поле выше и нажмите «Сохранить».`
        );
      }
      if (isCors && proxyBase) {
        throw new Error(
          `Воркер доступен, но не может проксировать запрос. ` +
          `Обновите код воркера — скопируйте новый код из подсказки и задеплойте заново.`
        );
      }
      throw new Error(`Ошибка сети: ${networkErr.message}`);
    }

    if (res.status === 204) return {};
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.detail || json?.title || res.statusText;
      if (res.status === 401) throw new Error("AmoCRM 401: неверный токен или токен истёк");
      if (res.status === 404) throw new Error("AmoCRM 404: организация не найдена, проверьте домен");
      throw new Error(`AmoCRM ${res.status}: ${msg}`);
    }
    return json;
  }

  // ── АККАУНТ / ТЕСТ ПОДКЛЮЧЕНИЯ ───────────────────────────────────────────────
  async testConnection() {
    return this._req("GET", "account");
  }

  // ── КОНТАКТЫ ─────────────────────────────────────────────────────────────────
  /**
   * Создаёт контакт в AmoCRM.
   * @param {object} p
   * @param {string} p.name         — ФИО
   * @param {string} [p.phone]      — телефон
   * @param {string} [p.email]      — email
   * @param {string|number} [p.telegramId] — Telegram user ID
   * @param {string} [p.username]   — Telegram username
   */
  async createContact({ name, phone, email, telegramId, username }) {
    const customFields = [];
    if (phone)      customFields.push({ field_code: "PHONE", values: [{ value: phone, enum_code: "WORK" }] });
    if (email)      customFields.push({ field_code: "EMAIL", values: [{ value: email, enum_code: "WORK" }] });
    if (telegramId) customFields.push({ field_code: "IM",    values: [{ value: String(telegramId), enum_code: "TELEGRAM" }] });

    const body = [{ name, custom_fields_values: customFields }];
    const res  = await this._req("POST", "contacts", body);
    return res._embedded?.contacts?.[0] ?? null;
  }

  // ── ЛИДЫ ─────────────────────────────────────────────────────────────────────
  /**
   * Создаёт лид в AmoCRM.
   * @param {object} p
   * @param {string} p.name         — название лида
   * @param {number} [p.price]      — бюджет лида
   * @param {number} [p.contactId]  — ID контакта в AmoCRM
   * @param {string[]} [p.tags]     — теги
   * @param {string} [p.note]       — примечание к лиду
   */
  async createLead({ name, price = 0, contactId, tags = [], note }) {
    const cfg = getAmoCfg();
    const body = {
      name,
      price,
      ...(cfg?.pipelineId ? { pipeline_id: +cfg.pipelineId } : {}),
      ...(cfg?.statusId   ? { status_id:   +cfg.statusId   } : {}),
    };

    // Теги
    if (tags.length) body._embedded = { tags: tags.map(t => ({ name: t })) };

    // Контакт
    if (contactId) {
      body._embedded = { ...body._embedded, contacts: [{ id: contactId }] };
    }

    const res  = await this._req("POST", "leads", [body]);
    const lead = res._embedded?.leads?.[0] ?? null;

    // Примечание к лиду
    if (lead?.id && note) {
      await this._req("POST", `leads/${lead.id}/notes`, [{
        note_type: "common",
        params: { text: note },
      }]).catch(() => {}); // не критично
    }

    return lead;
  }

  /**
   * Создаёт контакт + лид в одном вызове (удобный метод).
   * @param {object} p
   * @param {string} p.contactName
   * @param {string} [p.phone]
   * @param {string} [p.email]
   * @param {string|number} [p.telegramId]
   * @param {string} p.leadName
   * @param {number} [p.price]
   * @param {string[]} [p.tags]
   * @param {string} [p.note]
   */
  async createContactAndLead({ contactName, phone, email, telegramId, username, leadName, price, tags, note }) {
    const contact = await this.createContact({ name: contactName, phone, email, telegramId, username });
    const lead    = await this.createLead({ name: leadName, price, contactId: contact?.id, tags, note });
    return { contact, lead };
  }

  // ── ПОИСК КОНТАКТА ПО ТЕЛЕФОНУ ───────────────────────────────────────────────
  /**
   * Ищет контакт по номеру телефона.
   * Возвращает первый подходящий контакт или null.
   */
  async findContactByPhone(phone) {
    const clean = phone.replace(/\D/g, "");
    // Ищем по последним 10 цифрам (без кода страны)
    const query = clean.slice(-10);
    const res = await this._req("GET", `contacts?query=${encodeURIComponent(query)}&with=custom_fields_values&limit=5`);
    const contacts = res._embedded?.contacts ?? [];
    // Дополнительная фильтрация: номер телефона реально совпадает
    const found = contacts.find(c => {
      const phoneField = (c.custom_fields_values ?? []).find(f => f.field_code === "PHONE");
      return phoneField?.values?.some(v => {
        const digits = (v.value || "").replace(/\D/g, "");
        return digits.endsWith(query);
      });
    });
    return found ?? null;
  }

  /**
   * Извлекает данные лояльности из custom_fields_values контакта.
   * Ищет поля с "бонус" или "ночь/night" в имени/коде.
   * @returns {{ bonuses: number, totalNights: number }}
   */
  extractLoyaltyData(contact) {
    const fields = contact?.custom_fields_values ?? [];
    const cfg = getAmoCfg();
    const bonusFieldId  = cfg?.bonusFieldId  ? String(cfg.bonusFieldId)  : null;
    const nightsFieldId = cfg?.nightsFieldId ? String(cfg.nightsFieldId) : null;

    let bonuses = 0;
    let totalNights = 0;

    for (const f of fields) {
      const id  = String(f.field_id ?? "");
      const nm  = (f.field_name || "").toLowerCase();
      const cd  = (f.field_code || "").toLowerCase();
      const val = parseInt(f.values?.[0]?.value) || 0;

      // Приоритет — явно выбранные поля
      if (bonusFieldId  && id === bonusFieldId)  { bonuses = val; continue; }
      if (nightsFieldId && id === nightsFieldId) { totalNights = val; continue; }

      // Fallback по названию если поля не выбраны
      if (!bonusFieldId  && (nm.includes("бонус") || cd.includes("bonus")))  bonuses = val;
      if (!nightsFieldId && (nm.includes("ноч")   || cd.includes("night")))  totalNights = val;
    }
    return { bonuses, totalNights };
  }

  // ── КАСТОМНЫЕ ПОЛЯ КОНТАКТОВ ─────────────────────────────────────────────────
  async getContactFields() {
    const res = await this._req("GET", "contacts/custom_fields");
    return res._embedded?.custom_fields ?? [];
  }

  // ── ВОРОНКИ ─────────────────────────────────────────────────────────────────
  async getPipelines() {
    const res = await this._req("GET", "leads/pipelines?with=statuses");
    return res._embedded?.pipelines ?? [];
  }

  // ── СПИСОК ЛИДОВ ────────────────────────────────────────────────────────────
  async getLeads(page = 1, limit = 20) {
    const res = await this._req("GET", `leads?page=${page}&limit=${limit}&with=contacts,tags`);
    return {
      leads: res._embedded?.leads ?? [],
      total: res._total_items ?? 0,
    };
  }
}

export const amocrm = new AmoCRMService();
export default amocrm;
