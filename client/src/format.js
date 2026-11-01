export const money = (n) =>
  n == null ? '—' : n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

export function cardTitle(c) {
  return [c.year, c.brand, c.set_name].filter(Boolean).join(' ');
}

export function cardVariant(c) {
  return [c.parallel, c.serial_number && `/${c.serial_number.split('/').pop()}`, c.grade]
    .filter(Boolean)
    .join(' · ');
}

export function pctChange(from, to) {
  if (!from || to == null) return null;
  return ((to - from) / from) * 100;
}
