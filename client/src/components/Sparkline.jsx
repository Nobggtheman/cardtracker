export default function Sparkline({ history }) {
  if (history.length < 2) return null;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const w = 300;
  const h = 60;
  const points = prices
    .map((p, i) => `${(i / (prices.length - 1)) * w},${h - 4 - ((p - min) / (max - min || 1)) * (h - 8)}`)
    .join(' ');
  const rising = prices.at(-1) >= prices[0];

  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Price history">
      <polyline points={points} fill="none" stroke={rising ? 'var(--up)' : 'var(--down)'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
