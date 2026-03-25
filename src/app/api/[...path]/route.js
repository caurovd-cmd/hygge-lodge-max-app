const API_BASE = 'http://95.140.155.14:3000/api';

export default async function handler(req, res) {
  const path = req.url?.replace('/api/', '') || '';
  const url = `${API_BASE}/${path}`;
  
  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}