// Price providers: where card prices come from. Each provider has a name,
// a delay to wait between cards, and getPrice(card), which resolves to a price
// in dollars or null when none could be found.

// Errors that make further requests pointless (bad key, daily limit reached).
// The price checker stops the run when it sees one.
export class FatalProviderError extends Error {}

// Fake prices for development: a small random drift, with an occasional spike
// so the alert and push notification flow can be exercised end to end.
const mock = {
  name: 'mock',
  delayMs: 0,
  async getPrice(card) {
    const base = card.current_price ?? card.purchase_price ?? 5;
    // 5% of the time, jump 40–140%; otherwise drift up or down by up to 5%.
    const factor = Math.random() < 0.05 ? 1.4 + Math.random() : 1 + (Math.random() - 0.5) * 0.1;
    // Round to cents, with a 50-cent floor.
    return Math.max(0.5, Math.round(base * factor * 100) / 100);
  },
};

// The Card API sales endpoint: https://thecardapi.com/docs#getsales
// A card's price is the median of its most recent confirmed sales.
const cardApi = {
  name: 'cardapi',
  delayMs: 250,
  async getPrice(card) {
    const limit = parseInt(process.env.CARD_API_SALES_LIMIT || '10', 10);
    const filters = saleFilters(card);

    // Try the specific search first, then a looser one if nothing sold.
    for (const q of searchQueries(card)) {
      const sales = await fetchSales({ ...filters, q, limit, sort: 'date_desc' });
      const prices = sales.filter((s) => s.price_confirmed && s.price != null).map((s) => s.price);
      // The median ignores one-off outliers better than an average would.
      if (prices.length) return Math.round(median(prices) * 100) / 100;
    }
    return null;
  },
};

// Calls GET {CARD_API_BASE_URL}/sales with the given query parameters and
// returns the list of sales.
async function fetchSales(params) {
  // Strip a trailing slash from the base URL so we don't end up with "//sales".
  const url = new URL(`${process.env.CARD_API_BASE_URL.replace(/\/$/, '')}/sales`);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: { 'x-market-api-key': process.env.CARD_API_KEY } });
  if (res.status === 401) throw new FatalProviderError('The Card API rejected the API key (401)');
  if (res.status === 429) throw new FatalProviderError('The Card API daily row limit reached (429); resets at midnight UTC');
  if (!res.ok) throw new Error(`The Card API responded ${res.status}`);
  const body = await res.json();
  return body.data || [];
}

// Search strings to try, most specific first:
// "2023 Bowman Chrome Joshua Baez Purple Refractor", then "2023 Joshua Baez".
function searchQueries(card) {
  const specific = [card.year, card.brand, card.set_name, card.player, card.parallel].filter(Boolean).join(' ');
  const loose = [card.year, card.player].filter(Boolean).join(' ');
  // The Set removes the duplicate when both strings come out the same.
  // The API needs at least 4 characters.
  return [...new Set([specific, loose])].filter((q) => q.length >= 4);
}

// Maps our card fields onto the API's structured filters.
function saleFilters(card) {
  const filters = { category: 'sports' };

  // "PSA 10", "BGS 9.5", "Raw"
  const grade = (card.grade || '').trim();
  const graded = grade.match(/^([a-z]+)\s*([\d.]+)$/i);
  if (graded) Object.assign(filters, { graded: true, grader: graded[1].toUpperCase(), grade: graded[2] });
  else if (/^raw$/i.test(grade)) filters.graded = false;

  // "12/75" -> print run 75
  const printRun = parseInt((card.serial_number || '').split('/').pop(), 10);
  if (Number.isFinite(printRun) && printRun > 0) Object.assign(filters, { print_run_min: printRun, print_run_max: printRun });

  return filters;
}

// The middle value of a list, or the average of the two middle values when the count is even.
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Picks the provider: PRICE_PROVIDER if set, otherwise The Card API when an
// API key is configured, otherwise the mock.
export function getProvider() {
  const name = process.env.PRICE_PROVIDER || (process.env.CARD_API_KEY ? 'cardapi' : 'mock');
  if (name === 'cardapi') {
    if (!process.env.CARD_API_BASE_URL) throw new Error('CARD_API_BASE_URL is not set');
    if (!process.env.CARD_API_KEY) throw new Error('CARD_API_KEY is not set');
    return cardApi;
  }
  return mock;
}
