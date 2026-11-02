// Price checking: fetches current prices for every card, stores them, and
// raises alerts (with push notifications) when a for-sale card jumps in value.
import { query } from '../db.js';
import { describeCard } from '../describe.js';
import { notifyAll } from '../push.js';
import { FatalProviderError, getProvider } from './providers.js';

// Alert when a price rises this many percent; a card can override it with alert_threshold_pct.
const DEFAULT_THRESHOLD = Number(process.env.ALERT_THRESHOLD_PCT || 25);
// How many days back to look for the low price that rises are measured from.
const WINDOW_DAYS = parseInt(process.env.ALERT_WINDOW_DAYS || '7', 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Saves a new price for a card. If the card is for sale (not PC) and the price
// is up past its threshold from the lowest price in the window, raises an alert
// and sends a push notification. At most one alert per card per 24 hours.
// Returns the new alert row, or null if no alert was raised.
export async function recordPrice(card, price, { source, alert = true }) {
  // Look up the low before inserting, so the new price isn't compared with itself.
  const {
    rows: [{ low }],
  } = await query(
    `SELECT MIN(price) AS low FROM price_history
     WHERE card_id = $1 AND recorded_at >= now() - make_interval(days => $2)`,
    [card.id, WINDOW_DAYS],
  );

  await query('INSERT INTO price_history (card_id, price, source) VALUES ($1, $2, $3)', [card.id, price, source]);
  await query('UPDATE cards SET current_price = $2, price_updated_at = now() WHERE id = $1', [card.id, price]);

  // No alert for manual edits, personal collection cards, or cards with no price history yet.
  if (!alert || card.personal_collection || !low) return null;

  const pct = ((price - low) / low) * 100;
  if (pct < (card.alert_threshold_pct ?? DEFAULT_THRESHOLD)) return null;

  // Skip if this card already alerted in the last day, to avoid repeat notifications.
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
    // Clicking the notification opens the app on this card.
    url: `/?card=${card.id}`,
  });

  return created;
}

// Guards against two checks running at once (e.g. a manual check during a scheduled one).
let running = false;

// Checks the price of every card with the configured provider, one card at a time.
// Returns a summary of what happened, which the "check prices" endpoint sends back.
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
        // null means no price was found (e.g. no recent sales); keep the old price.
        if (price != null) {
          result.updated++;
          if (await recordPrice(card, price, { source: provider.name })) result.alerts++;
        }
      } catch (err) {
        // A bad API key or exhausted rate limit will fail for every card, so stop now.
        if (err instanceof FatalProviderError) {
          result.stopped = err.message;
          console.error('Price check stopped:', err.message);
          break;
        }
        // Otherwise log it and move on to the next card.
        result.errors++;
        console.error(`Price check failed for card ${card.id}:`, err.message);
      }
      // Pause between cards so we don't hammer the provider's API.
      if (provider.delayMs) await sleep(provider.delayMs);
    }
  } finally {
    // Always release the guard, even if the check crashed.
    running = false;
  }
  return result;
}

// Runs runPriceCheck() on a timer. PRICE_CHECK_INTERVAL_MINUTES sets how often
// (default every 6 hours); set it to 0 to turn scheduled checks off.
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
