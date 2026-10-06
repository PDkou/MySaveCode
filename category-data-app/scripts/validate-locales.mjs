import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const baseDir = path.resolve('src/locales');
const localeFiles = ['ko.json', 'ja.json', 'en.json'];
const baseLocale = 'ko.json';

function readJson(file) {
  const fullPath = path.join(baseDir, file);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function flatten(obj, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, next, out);
    } else {
      out.set(next, value);
    }
  }
  return out;
}

function placeholders(value) {
  if (typeof value !== 'string') return [];
  return [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
}

const parsed = Object.fromEntries(localeFiles.map((file) => [file, readJson(file)]));
const flattened = Object.fromEntries(localeFiles.map((file) => [file, flatten(parsed[file])]));
const base = flattened[baseLocale];

let hasError = false;

for (const file of localeFiles) {
  if (file === baseLocale) continue;
  const current = flattened[file];

  const missing = [...base.keys()].filter((key) => !current.has(key));
  const extra = [...current.keys()].filter((key) => !base.has(key));

  if (missing.length) {
    hasError = true;
    console.error(`\n[${file}] Missing translation keys:`);
    for (const key of missing) console.error(`  - ${key}`);
  }

  if (extra.length) {
    hasError = true;
    console.error(`\n[${file}] Extra translation keys not present in ${baseLocale}:`);
    for (const key of extra) console.error(`  - ${key}`);
  }

  for (const key of base.keys()) {
    if (!current.has(key)) continue;

    const baseValue = base.get(key);
    const currentValue = current.get(key);

    if (typeof baseValue !== typeof currentValue) {
      hasError = true;
      console.error(
        `\n[${file}] Type mismatch for "${key}": expected ${typeof baseValue}, got ${typeof currentValue}`,
      );
      continue;
    }

    const basePlaceholders = placeholders(baseValue);
    const currentPlaceholders = placeholders(currentValue);

    if (basePlaceholders.join('|') !== currentPlaceholders.join('|')) {
      hasError = true;
      console.error(
        `\n[${file}] Placeholder mismatch for "${key}": expected {{${basePlaceholders.join('}}, {{')}}}, got {{${currentPlaceholders.join('}}, {{')}}}`,
      );
    }
  }
}

if (hasError) {
  console.error('\nLocale validation failed.');
  process.exit(1);
}

console.log(`Locale validation passed for: ${localeFiles.join(', ')}`);
