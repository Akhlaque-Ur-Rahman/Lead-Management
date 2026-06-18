#!/usr/bin/env node
/**
 * Static accessibility checks for feature components.
 * Usage: node scripts/check-a11y-static.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const componentsDir = join(root, 'src/components');

function walkTsx(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'ui') continue;
      walkTsx(full, files);
    } else if (name.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];

// Skip-link check in App shell
const appTsx = join(root, 'src/App.tsx');
if (existsSync(appTsx)) {
  const appContent = readFileSync(appTsx, 'utf8');
  const hasSkipLink =
    appContent.includes('skip-link') || appContent.includes('#main-content');
  if (!hasSkipLink) {
    violations.push({
      file: 'src/App.tsx',
      line: 1,
      rule: 'skip-link',
      message: 'App must include skip-link or #main-content target',
    });
  }
}

for (const file of walkTsx(componentsDir)) {
  const rel = relative(root, file);
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');

  if (content.includes('DialogContent')) {
    if (!content.includes('DialogTitle')) {
      violations.push({
        file: rel,
        line: lines.findIndex((l) => l.includes('DialogContent')) + 1,
        rule: 'dialog-title',
        message: 'File uses DialogContent but has no DialogTitle',
      });
    }
  }

  lines.forEach((line, idx) => {
    if (!/<img\b/.test(line)) return;
    const block = lines.slice(idx, Math.min(idx + 3, lines.length)).join('\n');
    if (!/\balt=/.test(block)) {
      violations.push({
        file: rel,
        line: idx + 1,
        rule: 'img-alt',
        message: '<img> missing alt attribute',
      });
    }
  });

  lines.forEach((line, idx) => {
    if (!/<Button\b/.test(line) || !/size=["']icon["']/.test(line)) return;
    const block = lines.slice(idx, Math.min(idx + 8, lines.length)).join('\n');
    const hasLabel =
      /aria-label=/.test(block) ||
      /<span className="sr-only">/.test(block);
    if (!hasLabel) {
      violations.push({
        file: rel,
        line: idx + 1,
        rule: 'icon-button-label',
        message: 'Icon Button missing aria-label or sr-only text',
      });
    }
  });
}

if (violations.length > 0) {
  console.error(`Found ${violations.length} accessibility issue(s):\n`);
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}:${v.line} — ${v.message}`);
  }
  process.exit(1);
}

console.log('Static a11y checks passed.');
