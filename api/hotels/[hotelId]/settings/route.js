const API_BASE = 'http://95.140.155.14:3000/api';

export async function GET(request, { params }) {
  const hotelId = params.hotelId;
  const url = `${API_BASE}/hotels/${hotelId}/settings`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const hotelId = params.hotelId;
  const body = await request.json();
  const url = `${API_BASE}/hotels/${hotelId}/settings`;
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}