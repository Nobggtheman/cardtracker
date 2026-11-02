// Thin wrapper around fetch() for talking to the CardTracker server.

// Sends a request and returns the parsed JSON body. Throws an Error carrying
// the server's error message (or the status code) when the response isn't 2xx.
async function request(url, options = {}) {
  const res = await fetch(url, options);
  // 204 No Content has no body to parse.
  if (res.status === 204) return null;
  // Tolerate empty or non-JSON bodies instead of failing on the parse.
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

// Builds fetch options for a JSON request. The body is left out when not given.
const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

// One function per server endpoint. Creating and updating a card send FormData
// (not JSON) because they can include a photo; the browser sets the multipart
// Content-Type header itself.
export const api = {
  listCards: (params) => request(`/api/cards?${new URLSearchParams(params)}`),
  stats: () => request('/api/cards/stats'),
  getCard: (id) => request(`/api/cards/${id}`),
  createCard: (formData) => request('/api/cards', { method: 'POST', body: formData }),
  updateCard: (id, formData) => request(`/api/cards/${id}`, { method: 'PUT', body: formData }),
  deleteCard: (id) => request(`/api/cards/${id}`, { method: 'DELETE' }),
  checkPrices: () => request('/api/prices/check', json('POST')),
  alerts: () => request('/api/alerts'),
  markAlertsRead: () => request('/api/alerts/read', json('POST')),
  pushPublicKey: () => request('/api/push/public-key'),
  pushSubscribe: (sub) => request('/api/push/subscribe', json('POST', sub)),
  pushTest: () => request('/api/push/test', json('POST')),
};
