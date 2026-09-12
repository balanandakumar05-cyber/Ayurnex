const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export async function askAyurnex({ question, country, language }) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      country,
      language,
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Keep a useful error below when the server did not return JSON.
  }

  if (!response.ok) {
    throw new Error(data?.detail || `AYURNEX backend returned HTTP ${response.status}.`);
  }

  return data;
}

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error('Backend health check failed.');
  return response.json();
}
