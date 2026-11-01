import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { enableNotifications, pushSupported } from './push.js';
import { money } from './format.js';
import CardTile from './components/CardTile.jsx';
import CardForm from './components/CardForm.jsx';
import AlertsPanel from './components/AlertsPanel.jsx';

export default function App() {
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [editing, setEditing] = useState(null); // null | 'new' | card id
  const [showAlerts, setShowAlerts] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const [list, s, a] = await Promise.all([api.listCards({ q, filter, sort }), api.stats(), api.alerts()]);
    setCards(list);
    setStats(s);
    setAlerts(a);
  }, [q, filter, sort]);

  useEffect(() => {
    const t = setTimeout(() => refresh().catch((e) => setMessage(e.message)), 200);
    return () => clearTimeout(t);
  }, [refresh]);

  // Opened from a push notification: /?card=123
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('card');
    if (id) {
      setEditing(Number(id));
      window.history.replaceState(null, '', '/');
    }
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  async function checkPrices() {
    setChecking(true);
    try {
      const r = await api.checkPrices();
      setMessage(
        r.skipped
          ? 'A price check is already running.'
          : `Checked ${r.checked} cards (${r.provider}). ${r.updated} priced, ${r.alerts} new alert${r.alerts === 1 ? '' : 's'}${r.errors ? `, ${r.errors} errors` : ''}.${r.stopped ? ` Stopped early: ${r.stopped}` : ''}`,
      );
      await refresh();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setChecking(false);
    }
  }

  async function turnOnNotifications() {
    try {
      await enableNotifications();
      await api.pushTest();
      setMessage('Notifications enabled. A test notification was sent.');
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function openAlerts() {
    setShowAlerts((v) => !v);
    if (alerts.some((a) => !a.read)) {
      await api.markAlertsRead().catch(() => {});
    }
  }

  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div className="app">
      <header className="topbar">
        <h1>CardTracker</h1>
        <div className="topbar-actions">
          {pushSupported && (
            <button onClick={turnOnNotifications} title="Get browser alerts when a card rises">
              Enable alerts
            </button>
          )}
          <button onClick={checkPrices} disabled={checking}>
            {checking ? 'Checking…' : 'Check prices'}
          </button>
          <button className="bell" onClick={openAlerts} aria-label="Price alerts">
            🔔{unread > 0 && <span className="badge">{unread}</span>}
          </button>
          <button className="primary" onClick={() => setEditing('new')}>
            + Add card
          </button>
        </div>
      </header>

      {showAlerts && (
        <AlertsPanel
          alerts={alerts}
          onOpen={(id) => {
            setShowAlerts(false);
            setEditing(id);
          }}
          onClose={() => {
            setShowAlerts(false);
            refresh().catch(() => {});
          }}
        />
      )}

      {stats && (
        <section className="stats">
          <div><b>{stats.unique_cards.toLocaleString()}</b><span>Cards logged</span></div>
          <div><b>{stats.total_cards.toLocaleString()}</b><span>Total copies</span></div>
          <div><b>{money(stats.total_value)}</b><span>Collection value</span></div>
          <div><b>{money(stats.for_sale_value)}</b><span>Sellable (non-PC)</span></div>
        </section>
      )}

      <section className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search player, set, parallel, serial, box…  e.g. “anunoby purple 75”"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All cards</option>
          <option value="sale">Sellable only</option>
          <option value="pc">Personal collection</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="player">Player A–Z</option>
          <option value="value">Highest value</option>
          <option value="movers">Biggest 7-day risers</option>
        </select>
      </section>

      {cards.length ? (
        <section className="grid">
          {cards.map((c) => (
            <CardTile key={c.id} card={c} onClick={() => setEditing(c.id)} />
          ))}
        </section>
      ) : (
        <p className="empty">
          {q ? `No cards match “${q}”.` : 'No cards yet. Click “+ Add card” to log your first one.'}
        </p>
      )}

      {editing != null && (
        <CardForm
          cardId={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setMessage(msg);
            refresh().catch((e) => setMessage(e.message));
          }}
        />
      )}

      {message && <div className="toast">{message}</div>}
    </div>
  );
}
