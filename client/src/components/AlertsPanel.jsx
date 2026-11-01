import { cardTitle, money } from '../format.js';

export default function AlertsPanel({ alerts, onOpen, onClose }) {
  return (
    <div className="alerts-panel">
      <div className="alerts-head">
        <strong>Price alerts</strong>
        <button className="link" onClick={onClose}>Close</button>
      </div>
      {alerts.length === 0 ? (
        <p className="muted">
          No alerts yet. You'll be alerted when a card that isn't in your personal collection jumps in price.
        </p>
      ) : (
        <ul>
          {alerts.map((a) => (
            <li key={a.id} className={a.read ? '' : 'unread'}>
              <button onClick={() => onOpen(a.card_id)}>
                <span>
                  <strong>{a.player}</strong> <span className="up">▲ {Math.round(a.pct_change)}%</span>
                  <br />
                  <span className="muted">
                    {cardTitle(a)} {a.parallel} {a.serial_number}
                    {a.location && ` · 📦 ${a.location}`}
                  </span>
                </span>
                <span className="alert-price">
                  {money(a.old_price)} → {money(a.new_price)}
                  <br />
                  <span className="muted">{new Date(a.created_at).toLocaleString()}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
