const API_BASE = 'http://95.140.155.14:3000/api';

export async function GET(request, { params }) {
  const path = params.path ? params.path.join('/') : '';
  const url = `${API_BASE}/${path}`;
  
  try {
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const path = params.path ? params.path.join('/') : '';
  const url = `${API_BASE}/${path}`;
  const body = await request.json();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const path = params.path ? params.path.join('/') : '';
  const url = `${API_BASE}/${path}`;
  const body = await request.json();
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}