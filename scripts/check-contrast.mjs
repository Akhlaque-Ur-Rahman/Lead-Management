#!/usr/bin/env node
/**
 * WCAG 2.1 contrast checker for semantic token pairs in globals.css
 * Usage: node scripts/check-contrast.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = join(__dirname, '../src/styles/globals.css');
const css = readFileSync(cssPath, 'utf8');

function parseBlock(selector) {
  const regex = new RegExp(`${selector}\\s*\\{([^}]+)\\}`, 's');
  const match = css.match(regex);
  if (!match) return {};
  const vars = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^\s*(--[\w-]+):\s*(#[0-9a-fA-F]{3,8}|[^;]+);/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(hexToRgb(fg));
  const l2 = relativeLuminance(hexToRgb(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const light = parseBlock(':root');
const dark = parseBlock('\\.dark');

const PAIRS = [
  { name: 'Body text', fg: 'foreground', bg: 'background', min: 4.5 },
  { name: 'Card text', fg: 'card-foreground', bg: 'card', min: 4.5 },
  { name: 'Muted text', fg: 'muted-foreground', bg: 'background', min: 4.5 },
  { name: 'Muted on card', fg: 'muted-foreground', bg: 'card', min: 4.5 },
  { name: 'Placeholder', fg: 'placeholder-foreground', bg: 'card', min: 4.5 },
  { name: 'Primary button', fg: 'primary-foreground', bg: 'primary', min: 4.5 },
  { name: 'Primary link on bg', fg: 'primary', bg: 'background', min: 4.5 },
  { name: 'Primary on card', fg: 'primary', bg: 'card', min: 4.5 },
  { name: 'Secondary', fg: 'secondary-foreground', bg: 'secondary', min: 4.5 },
  { name: 'Accent', fg: 'accent-foreground', bg: 'accent', min: 4.5 },
  { name: 'Destructive', fg: 'destructive-foreground', bg: 'destructive', min: 4.5 },
  { name: 'Popover text', fg: 'popover-foreground', bg: 'popover', min: 4.5 },
  { name: 'Sidebar text', fg: 'sidebar-foreground', bg: 'sidebar', min: 4.5 },
  { name: 'Sidebar muted', fg: 'sidebar-foreground-muted', bg: 'sidebar', min: 4.5 },
  { name: 'Sidebar subtle', fg: 'sidebar-foreground-subtle', bg: 'sidebar', min: 3 },
  { name: 'Sidebar primary btn', fg: 'sidebar-primary-foreground', bg: 'sidebar-primary', min: 4.5 },
  { name: 'Badge neutral', fg: 'badge-neutral-fg', bg: 'badge-neutral-bg', min: 4.5 },
  { name: 'Badge success', fg: 'badge-success-fg', bg: 'badge-success-bg', min: 4.5 },
  { name: 'Status hot', fg: 'status-hot-fg', bg: 'status-hot-bg', min: 4.5 },
  { name: 'Status warm', fg: 'status-warm-fg', bg: 'status-warm-bg', min: 4.5 },
  { name: 'Status cold', fg: 'status-cold-fg', bg: 'status-cold-bg', min: 4.5 },
  { name: 'Status converted', fg: 'status-converted-fg', bg: 'status-converted-bg', min: 4.5 },
  { name: 'Status lost', fg: 'status-lost-fg', bg: 'status-lost-bg', min: 4.5 },
  { name: 'Status updated', fg: 'status-updated-fg', bg: 'status-updated-bg', min: 4.5 },
  { name: 'Status info', fg: 'status-info-fg', bg: 'status-info-bg', min: 4.5 },
  { name: 'Stat hot surface', fg: 'stat-hot-surface-fg', bg: 'stat-hot-surface', min: 4.5 },
  { name: 'Stat hot muted', fg: 'stat-hot-surface-muted', bg: 'stat-hot-surface', min: 4.5 },
  { name: 'Stat warm surface', fg: 'stat-warm-surface-fg', bg: 'stat-warm-surface', min: 4.5 },
  { name: 'Stat warm muted', fg: 'stat-warm-surface-muted', bg: 'stat-warm-surface', min: 4.5 },
  { name: 'Stat cold surface', fg: 'stat-cold-surface-fg', bg: 'stat-cold-surface', min: 4.5 },
  { name: 'Stat cold muted', fg: 'stat-cold-surface-muted', bg: 'stat-cold-surface', min: 4.5 },
  { name: 'Stat converted fg', fg: 'stat-converted-surface-fg', bg: 'stat-converted-surface', min: 4.5 },
  { name: 'Stat converted muted', fg: 'stat-converted-surface-muted', bg: 'stat-converted-surface', min: 4.5 },
  { name: 'Stat primary fg', fg: 'stat-primary-surface-fg', bg: 'stat-primary-surface', min: 4.5 },
  { name: 'Stat primary muted', fg: 'stat-primary-surface-muted', bg: 'stat-primary-surface', min: 4.5 },
  { name: 'Icon success on card', fg: 'icon-success', bg: 'card', min: 3 },
  { name: 'Icon warning on card', fg: 'icon-warning', bg: 'card', min: 3 },
  { name: 'Icon info on card', fg: 'icon-info', bg: 'card', min: 3 },
  { name: 'Icon muted on card', fg: 'icon-muted', bg: 'card', min: 3 },
];

/** Hero card + trend pill pairs sourced from CSS custom properties */
const HERO_TREND_PAIRS = [
  { name: 'Hero foreground', fg: 'hero-foreground', bg: 'hero-gradient-start', min: 4.5 },
  { name: 'Hero muted text', fg: 'hero-foreground-muted', bg: 'hero-gradient-start', min: 4.5 },
  { name: 'Trend up pill', fg: 'stat-trend-up-fg', bg: 'stat-trend-up-bg', min: 4.5 },
  { name: 'Trend down pill', fg: 'stat-trend-down-fg', bg: 'stat-trend-down-bg', min: 4.5 },
];

function checkTheme(name, tokens) {
  let failed = 0;
  console.log(`\n=== ${name} ===`);
  console.log('Pair'.padEnd(24), 'Ratio'.padStart(6), 'Min'.padStart(5), 'Status');
  console.log('-'.repeat(50));
  for (const pair of PAIRS) {
    const fg = tokens[`--${pair.fg}`];
    const bg = tokens[`--${pair.bg}`];
    if (!fg || !bg || !fg.startsWith('#') || !bg.startsWith('#')) {
      console.log(pair.name.padEnd(24), '  n/a'.padStart(6), String(pair.min).padStart(5), 'SKIP');
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    const pass = ratio >= pair.min;
    if (!pass) failed++;
    console.log(
      pair.name.padEnd(24),
      ratio.toFixed(2).padStart(6),
      String(pair.min).padStart(5),
      pass ? 'PASS' : 'FAIL'
    );
  }
  return failed;
}

function checkHeroTrend(name, tokens) {
  let failed = 0;
  console.log(`\n=== ${name} (hero & trends) ===`);
  console.log('Pair'.padEnd(24), 'Ratio'.padStart(6), 'Min'.padStart(5), 'Status');
  console.log('-'.repeat(50));
  for (const pair of HERO_TREND_PAIRS) {
    const fg = tokens[`--${pair.fg}`];
    const bg = tokens[`--${pair.bg}`];
    if (!fg || !bg || !fg.startsWith('#') || !bg.startsWith('#')) {
      console.log(pair.name.padEnd(24), '  n/a'.padStart(6), String(pair.min).padStart(5), 'SKIP');
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    const pass = ratio >= pair.min;
    if (!pass) failed++;
    console.log(
      pair.name.padEnd(24),
      ratio.toFixed(2).padStart(6),
      String(pair.min).padStart(5),
      pass ? 'PASS' : 'FAIL'
    );
  }
  return failed;
}

const lightTokens = Object.fromEntries(Object.entries(light).map(([k, v]) => [k, v]));
const darkTokens = Object.fromEntries(Object.entries(dark).map(([k, v]) => [k, v]));

const lightFail = checkTheme('Light mode', lightTokens);
const darkFail = checkTheme('Dark mode', darkTokens);
const lightHeroFail = checkHeroTrend('Light mode', lightTokens);
const darkHeroFail = checkHeroTrend('Dark mode', darkTokens);

const total = lightFail + darkFail + lightHeroFail + darkHeroFail;
if (total > 0) {
  console.log(`\n${total} pair(s) below WCAG AA threshold.`);
  process.exit(1);
}
console.log('\nAll semantic pairs pass WCAG AA.');
