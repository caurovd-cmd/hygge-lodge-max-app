const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hygge_lodge',
  user: 'hygge',
  password: 'hygge_secure_pass_2024',
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

function query(text, params) {
  return pool.query(text, params);
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS hotels (
      id VARCHAR(20) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      login VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(64) NOT NULL,
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_settings (
      hotel_id VARCHAR(20) PRIMARY KEY,
      settings JSONB DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);
  
  await query(`
    CREATE TABLE IF NOT EXISTS hotel_data (
      hotel_id VARCHAR(20) PRIMARY KEY,
      data JSONB DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);
  
  console.log('Database initialized');
}

initDb().catch(console.error);

// GET /api/hotels - list all hotels
app.get('/api/hotels', async (req, res) => {
  try {
    const result = await query('SELECT id, name, login, email, created_at FROM hotels ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/hotels - create new hotel
app.post('/api/hotels', async (req, res) => {
  try {
    const { name, login, password, email } = req.body;
    if (!name || name.length < 2) throw new Error('Название отеля — минимум 2 символа');
    if (!login || login.length < 3) throw new Error('Логин — минимум 3 символа');
    if (!/^[a-z0-9_]+$/.test(login)) throw new Error('Логин: только строчные буквы, цифры, _');
    if (!password || password.length < 6) throw new Error('Пароль — минимум 6 символов');

    const existing = await query('SELECT id FROM hotels WHERE login = $1', [login]);
    if (existing.rows.length > 0) throw new Error(`Логин «${login}» уже занят`);

    const id = Date.now().toString().slice(-9);
    const passwordHash = hashPassword(password);

    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO hotels (id, name, login, password_hash, email) VALUES ($1, $2, $3, $4, $5)',
        [id, name, login, passwordHash, email || '']
      );
    } finally {
      client.release();
    }

    await query('INSERT INTO hotel_settings (hotel_id, settings) VALUES ($1, $2)', [id, JSON.stringify({})]);
    await query('INSERT INTO hotel_data (hotel_id, data) VALUES ($1, $2)', [id, JSON.stringify({})]);

    res.json({ id, name, login, email, createdAt: new Date().toISOString() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/hotels/login - login hotel
app.post('/api/hotels/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const passwordHash = hashPassword(password);
    
    const result = await query('SELECT id, name, login, created_at FROM hotels WHERE login = $1 AND password_hash = $2', [login, passwordHash]);
    
    if (result.rows.length === 0) throw new Error('Логин или пароль неверны');
    
    const hotel = result.rows[0];
    res.json({ id: hotel.id, name: hotel.name, login: hotel.login, createdAt: hotel.created_at });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// GET /api/hotels/:id/settings
app.get('/api/hotels/:id/settings', async (req, res) => {
  try {
    const result = await query('SELECT settings FROM hotel_settings WHERE hotel_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.json({});
    res.json(result.rows[0].settings || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/hotels/:id/settings
app.put('/api/hotels/:id/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    await query(
      'INSERT INTO hotel_settings (hotel_id, settings, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (hotel_id) DO UPDATE SET settings = $2, updated_at = NOW()',
      [req.params.id, JSON.stringify(settings)]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/hotels/:id/data
app.get('/api/hotels/:id/data', async (req, res) => {
  try {
    const result = await query('SELECT data FROM hotel_data WHERE hotel_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.json({});
    res.json(result.rows[0].data || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/hotels/:id/data
app.put('/api/hotels/:id/data', async (req, res) => {
  try {
    const { data } = req.body;
    await query(
      'INSERT INTO hotel_data (hotel_id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (hotel_id) DO UPDATE SET data = $2, updated_at = NOW()',
      [req.params.id, JSON.stringify(data)]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Password reset endpoints (simplified - stores in memory for demo)
const resetCodes = new Map();

app.post('/api/hotels/reset-request', async (req, res) => {
  const { email } = req.body;
  const result = await query('SELECT login FROM hotels WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    return res.json({ success: true }); // Don't reveal if email exists
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  resetCodes.set(email, { code, login: result.rows[0].login, expires: Date.now() + 3600000 });
  console.log(`Reset code for ${email}: ${code}`);
  res.json({ success: true });
});

app.post('/api/hotels/reset-verify', async (req, res) => {
  const { email, otp } = req.body;
  const stored = resetCodes.get(email);
  if (!stored || stored.code !== otp || stored.expires < Date.now()) {
    return res.status(400).json({ error: 'Неверный или истёкший код' });
  }
  res.json({ login: stored.login });
});

app.post('/api/hotels/reset-password', async (req, res) => {
  const { login, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Пароль — минимум 6 символов' });
  }
  const passwordHash = hashPassword(newPassword);
  await query('UPDATE hotels SET password_hash = $1 WHERE login = $2', [passwordHash, login]);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hygge Backend running on port ${PORT}`);
});