import { cardTitle, cardVariant, money, pctChange } from '../format.js';

export default function CardTile({ card, onClick }) {
  const change = pctChange(card.price_7d_ago, card.current_price);

  return (
    <button className="tile" onClick={onClick}>
      <div className="tile-photo">
        {card.photo_url ? <img src={card.photo_url} alt={card.player} loading="lazy" /> : <span>No photo</span>}
        {card.personal_collection && <span className="pc-tag">PC</span>}
      </div>
      <div className="tile-body">
        <strong>{card.player}</strong>
        <span className="muted">{cardTitle(card)}</span>
        {cardVariant(card) && <span className="variant">{cardVariant(card)}</span>}
        <div className="tile-foot">
          <span className="price">
            {money(card.current_price)}
            {card.quantity > 1 && <span className="muted"> ×{card.quantity}</span>}
          </span>
          {change != null && Math.abs(change) >= 0.5 && (
            <span className={change > 0 ? 'up' : 'down'}>
              {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(0)}%
            </span>
          )}
        </div>
        {card.location && <span className="location">📦 {card.location}</span>}
      </div>
    </button>
  );
}
