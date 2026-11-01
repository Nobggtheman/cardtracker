async function request(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

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
