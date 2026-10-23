/**
 * @fileoverview Pure inline SVG chart renderers for the LifeBridge Clinical Dashboard.
 * Generates responsive, accessible, zero-dependency SVG markup for urgency breakdown
 * and 7-day incident timeline.
 * @module dashboard/dashboardCharts
 */

/**
 * Palette matching LifeBridge editorial design tokens.
 */
const PALETTE = {
  CRITICAL: '#b33927', // Rust pigment
  HIGH: '#d97706',     // Amber
  MEDIUM: '#4b6b75',   // Slate teal
  LOW: '#3f6212',      // Deep sage
  MUTED: '#736f68',    // Editorial muted
  BACKGROUND: '#fcfbf8',
  BORDER: '#e6e2da'
};

/**
 * Generates an accessible, responsive inline SVG donut chart for urgency breakdown.
 *
 * @param {Object} breakdown - Result from computeUrgencyBreakdown.
 * @param {Object} [options]
 * @param {number} [options.size=220] - Dimensions.
 * @returns {string} Raw SVG HTML string.
 */
export function renderUrgencyBreakdownSvg(breakdown, { size = 220 } = {}) {
  const { counts, total } = breakdown;
  const radius = 70;
  const strokeWidth = 24;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="chart-svg" role="img" aria-label="Urgency breakdown chart: no data available">
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${PALETTE.BORDER}" stroke-width="${strokeWidth}" />
        <text x="${center}" y="${center + 4}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="${PALETTE.MUTED}">0 Cases</text>
      </svg>
    `;
  }

  const tiers = [
    { key: 'CRITICAL', label: 'Critical', count: counts.CRITICAL || 0, color: PALETTE.CRITICAL },
    { key: 'HIGH', label: 'High', count: counts.HIGH || 0, color: PALETTE.HIGH },
    { key: 'MEDIUM', label: 'Medium', count: counts.MEDIUM || 0, color: PALETTE.MEDIUM },
    { key: 'LOW', label: 'Low', count: counts.LOW || 0, color: PALETTE.LOW }
  ];

  let currentOffset = 0;
  const circles = tiers.map(tier => {
    const fraction = tier.count / total;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += fraction * circumference;

    if (tier.count === 0) return '';

    return `
      <circle
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="none"
        stroke="${tier.color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDasharray}"
        stroke-dashoffset="${strokeDashoffset}"
        stroke-linecap="butt"
      >
        <title>${tier.label}: ${tier.count} (${Math.round(fraction * 100)}%)</title>
      </circle>
    `;
  }).join('');

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="chart-svg urgency-donut-svg" role="img" aria-label="Urgency breakdown donut chart showing ${total} total emergency analyses">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${PALETTE.BORDER}" stroke-width="${strokeWidth}" />
      <g transform="rotate(-90 ${center} ${center})">
        ${circles}
      </g>
      <text x="${center}" y="${center - 6}" text-anchor="middle" font-family="Fraunces, serif" font-size="28" font-weight="600" fill="#1f1e1c">${total}</text>
      <text x="${center}" y="${center + 14}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" letter-spacing="0.1em" fill="${PALETTE.MUTED}">TOTAL CASES</text>
    </svg>
  `;
}

/**
 * Generates an accessible, responsive inline SVG column chart for 7-day emergency volume.
 *
 * @param {Array<Object>} trend - Result from computeLast7DaysTrend.
 * @param {Object} [options]
 * @param {number} [options.width=440]
 * @param {number} [options.height=200]
 * @returns {string} Raw SVG HTML string.
 */
export function renderLast7DaysSvg(trend = [], { width = 440, height = 200 } = {}) {
  const padding = { top: 25, right: 20, bottom: 35, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(4, ...trend.map(d => d.total));
  const colW = Math.max(16, Math.min(32, (chartW / trend.length) * 0.55));
  const stepX = chartW / trend.length;

  // Background grid lines (3 horizontal ticks)
  const gridLines = [0, Math.round(maxVal / 2), maxVal].map(val => {
    const y = padding.top + chartH - (val / maxVal) * chartH;
    return `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${PALETTE.BORDER}" stroke-width="1" stroke-dasharray="3,3" />
      <text x="${padding.left - 6}" y="${y + 3}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="9" fill="${PALETTE.MUTED}">${val}</text>
    `;
  }).join('');

  // Bars for each of the 7 days
  const bars = trend.map((day, idx) => {
    const x = padding.left + idx * stepX + (stepX - colW) / 2;
    const barHeight = day.total > 0 ? (day.total / maxVal) * chartH : 0;
    const y = padding.top + chartH - barHeight;

    const critHeight = day.critical > 0 ? (day.critical / maxVal) * chartH : 0;
    const critY = padding.top + chartH - critHeight;

    return `
      <g class="chart-col-group">
        <!-- Total bar -->
        ${day.total > 0 ? `
          <rect
            x="${x}"
            y="${y}"
            width="${colW}"
            height="${barHeight}"
            fill="${PALETTE.MEDIUM}"
            rx="2"
          >
            <title>${day.dayLabel}: ${day.total} total cases (${day.critical} critical)</title>
          </rect>
        ` : ''}

        <!-- Critical overlay bar -->
        ${day.critical > 0 ? `
          <rect
            x="${x}"
            y="${critY}"
            width="${colW}"
            height="${critHeight}"
            fill="${PALETTE.CRITICAL}"
            rx="2"
          >
            <title>${day.dayLabel}: ${day.critical} Critical</title>
          </rect>
        ` : ''}

        <!-- Count on top if > 0 -->
        ${day.total > 0 ? `
          <text
            x="${x + colW / 2}"
            y="${y - 4}"
            text-anchor="middle"
            font-family="JetBrains Mono, monospace"
            font-size="9"
            font-weight="600"
            fill="#1f1e1c"
          >${day.total}</text>
        ` : ''}

        <!-- Date label on bottom -->
        <text
          x="${x + colW / 2}"
          y="${height - 12}"
          text-anchor="middle"
          font-family="JetBrains Mono, monospace"
          font-size="9"
          fill="${PALETTE.MUTED}"
        >${day.dayLabel.split(' ')[0]}</text>
      </g>
    `;
  }).join('');

  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="chart-svg trend-chart-svg" role="img" aria-label="7-day emergency case activity bar chart">
      ${gridLines}
      <!-- Baseline -->
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#1f1e1c" stroke-width="1.2" />
      ${bars}
    </svg>
  `;
}
