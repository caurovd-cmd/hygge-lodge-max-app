export default async function handler(req, res) {
  const path = req.url.replace('/api/', '/');
  const backendUrl = `http://95.140.155.14:3000${path}`;
  
  try {
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}