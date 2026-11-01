import { query } from '../db.js';
import { describeCard } from '../describe.js';
import { notifyAll } from '../push.js';
import { FatalProviderError, getProvider } from './providers.js';

const DEFAULT_THRESHOLD = Number(process.env.ALERT_THRESHOLD_PCT || 25);
const WINDOW_DAYS = parseInt(process.env.ALERT_WINDOW_DAYS || '7', 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Saves a new price for a card. If the card is for sale (not PC) and the price
// is up past its threshold from the lowest price in the window, raises an alert
// and sends a push notification. At most one alert per card per 24 hours.
export async function recordPrice(card, price, { source, alert = true }) {
  const {
    rows: [{ low }],
  } = await query(
    `SELECT MIN(price) AS low FROM price_history
     WHERE card_id = $1 AND recorded_at >= now() - make_interval(days => $2)`,
    [card.id, WINDOW_DAYS],
  );

  await query('INSERT INTO price_history (card_id, price, source) VALUES ($1, $2, $3)', [card.id, price, source]);
  await query('UPDATE cards SET current_price = $2, price_updated_at = now() WHERE id = $1', [card.id, price]);

  if (!alert || card.personal_collection || !low) return null;

  const pct = ((price - low) / low) * 100;
  if (pct < (card.alert_threshold_pct ?? DEFAULT_THRESHOLD)) return null;

  const { rowCount: recent } = await query(
    `SELECT 1 FROM alerts WHERE card_id = $1 AND created_at >= now() - interval '24 hours'`,
    [card.id],
  );
  if (recent) return null;

  const {
    rows: [created],
  } = await query(
    'INSERT INTO alerts (card_id, old_price, new_price, pct_change) VALUES ($1, $2, $3, $4) RETURNING *',
    [card.id, low, price, pct],
  );

  await notifyAll({
    title: `${card.player} is up ${Math.round(pct)}%`,
    body: `${describeCard(card)}\n$${low.toFixed(2)} → $${price.toFixed(2)}`,
    url: `/?card=${card.id}`,
  });

  return created;
}

let running = false;

export async function runPriceCheck() {
  if (running) return { skipped: true };
  running = true;
  const result = { provider: null, checked: 0, updated: 0, alerts: 0, errors: 0 };
  try {
    const provider = getProvider();
    result.provider = provider.name;
    const { rows: cards } = await query('SELECT * FROM cards ORDER BY id');
    for (const card of cards) {
      result.checked++;
      try {
        const price = await provider.getPrice(card);
        if (price != null) {
          result.updated++;
          if (await recordPrice(card, price, { source: provider.name })) result.alerts++;
        }
      } catch (err) {
        if (err instanceof FatalProviderError) {
          result.stopped = err.message;
          console.error('Price check stopped:', err.message);
          break;
        }
        result.errors++;
        console.error(`Price check failed for card ${card.id}:`, err.message);
      }
      if (provider.delayMs) await sleep(provider.delayMs);
    }
  } finally {
    running = false;
  }
  return result;
}

export function startPriceScheduler() {
  const minutes = Number(process.env.PRICE_CHECK_INTERVAL_MINUTES ?? 360);
  if (!minutes) return;
  setInterval(() => {
    runPriceCheck()
      .then((r) => console.log('Scheduled price check:', r))
      .catch((err) => console.error('Scheduled price check failed:', err.message));
  }, minutes * 60_000);
  console.log(`Price checks scheduled every ${minutes} minutes`);
}
