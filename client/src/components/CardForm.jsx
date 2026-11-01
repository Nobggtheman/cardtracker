import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { money } from '../format.js';
import Sparkline from './Sparkline.jsx';

const EMPTY = {
  player: '', year: '', brand: '', set_name: '', card_number: '', parallel: '', serial_number: '',
  sport: '', grade: '', quantity: 1, purchase_price: '', current_price: '', location: '',
  personal_collection: false, alert_threshold_pct: '', notes: '',
};

export default function CardForm({ cardId, onClose, onSaved }) {
  const [card, setCard] = useState(cardId ? null : EMPTY);
  const [history, setHistory] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cardId) return;
    api
      .getCard(cardId)
      .then(({ history, ...c }) => {
        // Inputs need '' rather than null.
        setCard(Object.fromEntries(Object.entries({ ...EMPTY, ...c }).map(([k, v]) => [k, v ?? ''])));
        setHistory(history);
        setPreview(c.photo_url);
      })
      .catch((e) => setError(e.message));
  }, [cardId]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const set = (field) => (e) =>
    setCard((c) => ({ ...c, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData();
    for (const k of Object.keys(EMPTY)) fd.set(k, String(card[k] ?? ''));
    if (photo) fd.set('photo', photo);
    try {
      if (cardId) await api.updateCard(cardId, fd);
      else await api.createCard(fd);
      onSaved(cardId ? 'Card updated.' : `Added ${card.player}.`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${card.player}? This can't be undone.`)) return;
    try {
      await api.deleteCard(cardId);
      onSaved('Card deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{cardId ? 'Edit card' : 'Add card'}</h2>
          <button className="link" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {!card ? (
          <p className="muted">{error || 'Loading…'}</p>
        ) : (
          <form onSubmit={submit} className="card-form">
            <div className="photo-col">
              <label className="photo-drop">
                {preview ? <img src={preview} alt="Card" /> : <span>Add photo</span>}
                <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => setPhoto(e.target.files[0] || null)} />
              </label>
              {history.length > 0 && (
                <div className="history">
                  <span className="muted">Price history</span>
                  <Sparkline history={history} />
                  <span className="muted small">
                    {history.length} checks · low {money(Math.min(...history.map((h) => h.price)))} · high{' '}
                    {money(Math.max(...history.map((h) => h.price)))}
                  </span>
                </div>
              )}
            </div>

            <div className="fields">
              <label className="wide">Player *<input value={card.player} onChange={set('player')} required autoFocus /></label>
              <label>Year<input type="number" value={card.year} onChange={set('year')} placeholder="2024" /></label>
              <label>Sport<input value={card.sport} onChange={set('sport')} placeholder="Baseball" list="sports" /></label>
              <label>Brand<input value={card.brand} onChange={set('brand')} placeholder="Bowman" /></label>
              <label>Set<input value={card.set_name} onChange={set('set_name')} placeholder="Chrome Prospects" /></label>
              <label>Card #<input value={card.card_number} onChange={set('card_number')} placeholder="BCP-50" /></label>
              <label>Parallel<input value={card.parallel} onChange={set('parallel')} placeholder="Purple Refractor" /></label>
              <label>Serial #<input value={card.serial_number} onChange={set('serial_number')} placeholder="12/75" /></label>
              <label>Grade<input value={card.grade} onChange={set('grade')} placeholder="Raw / PSA 10" /></label>
              <label>Quantity<input type="number" min="1" value={card.quantity} onChange={set('quantity')} /></label>
              <label>Location<input value={card.location} onChange={set('location')} placeholder="Box 12 / Binder A" /></label>
              <label>Paid ($)<input type="number" min="0" step="0.01" value={card.purchase_price} onChange={set('purchase_price')} /></label>
              <label>Current value ($)<input type="number" min="0" step="0.01" value={card.current_price} onChange={set('current_price')} /></label>
              <label className="check wide">
                <input type="checkbox" checked={card.personal_collection} onChange={set('personal_collection')} />
                Personal collection (not for sale, so no sell alerts)
              </label>
              <label>Alert at +%<input type="number" min="1" step="1" value={card.alert_threshold_pct} onChange={set('alert_threshold_pct')} placeholder="Default" /></label>
              <label className="wide">Notes<textarea rows="2" value={card.notes} onChange={set('notes')} /></label>
              <datalist id="sports">
                <option>Baseball</option><option>Basketball</option><option>Football</option>
                <option>Hockey</option><option>Soccer</option>
              </datalist>
            </div>

            {error && <p className="error">{error}</p>}

            <div className="modal-actions">
              {cardId && <button type="button" className="danger" onClick={remove}>Delete</button>}
              <span className="spacer" />
              <button type="button" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
