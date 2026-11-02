// Display helpers shared by the React components.

// Formats a number as US dollars, or an em dash when there is no value.
export const money = (n) =>
  n == null ? '—' : n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

// The card's headline, e.g. "2023 Bowman Chrome". Missing parts are skipped.
export function cardTitle(c) {
  return [c.year, c.brand, c.set_name].filter(Boolean).join(' ');
}

// The card's variant line, e.g. "Purple Refractor · /75 · PSA 10".
// Only the print run is shown from the serial number ("12/75" -> "/75").
export function cardVariant(c) {
  return [c.parallel, c.serial_number && `/${c.serial_number.split('/').pop()}`, c.grade]
    .filter(Boolean)
    .join(' · ');
}

// Percent change between two prices, or null when there is no starting price
// (which would also mean dividing by zero) or no ending price.
export function pctChange(from, to) {
  if (!from || to == null) return null;
  return ((to - from) / from) * 100;
}
