import type { AppData } from '../types';
import { newId } from './id';

const STORAGE_KEY = 'category-data-app:v1';

type Translate = (key: string, variables?: Record<string, string | number>) => string;

function seedData(t: Translate): AppData {
  // A single worked example (household ledger) so a first-time user lands
  // on something populated rather than a blank screen -- see the fields
  // this mirrors in lib/templates.ts's "ledger" template.
  const now = Date.now();
  const dateFieldId = newId();
  const typeFieldId = newId();
  const itemFieldId = newId();
  const amountFieldId = newId();
  const memoFieldId = newId();
  const categoryId = newId();

  const today = new Date(now);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return {
    version: 1,
    categories: [
      {
        id: categoryId,
        name: `${t('templates.ledger.name')} (${t('seed.example')})`,
        emoji: '💰',
        color: '#6F5499',
        createdAt: now,
        fields: [
          { id: dateFieldId, name: t('templates.ledger.date'), type: 'date', required: true },
          { id: typeFieldId, name: t('templates.ledger.kind'), type: 'select', options: [t('templates.ledger.income'), t('templates.ledger.expense')], required: true },
          { id: itemFieldId, name: t('templates.ledger.item'), type: 'text', required: true },
          { id: amountFieldId, name: t('templates.ledger.amount'), type: 'currency', required: true },
          { id: memoFieldId, name: t('templates.ledger.memo'), type: 'text', required: false },
        ],
      },
    ],
    entries: [
      {
        id: newId(),
        categoryId,
        createdAt: now,
        updatedAt: now,
        values: {
          [dateFieldId]: iso(today),
          [typeFieldId]: t('templates.ledger.expense'),
          [itemFieldId]: t('seed.lunch'),
          [amountFieldId]: '9500',
          [memoFieldId]: '',
        },
      },
      {
        id: newId(),
        categoryId,
        createdAt: now,
        updatedAt: now,
        values: {
          [dateFieldId]: iso(today),
          [typeFieldId]: t('templates.ledger.income'),
          [itemFieldId]: t('seed.allowance'),
          [amountFieldId]: '50000',
          [memoFieldId]: t('seed.monthlyAllowance'),
        },
      },
    ],
  };
}

export function loadData(t: Translate): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData(t);
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.categories) || !Array.isArray(parsed.entries)) {
      return seedData(t);
    }
    return parsed;
  } catch {
    return seedData(t);
  }
}

export function saveData(data: AppData, t: Translate): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // Most likely quota exceeded (localStorage is usually capped around
    // 5MB) -- surfaced to the user rather than silently dropping writes.
    console.error('Failed to save data', err);
    throw new Error(t('storage.saveFailed'));
  }
}

export function parseImportedData(raw: string): AppData {
  const parsed = JSON.parse(raw) as AppData;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.categories) || !Array.isArray(parsed.entries)) {
    throw new Error('INVALID_BACKUP');
  }
  return parsed;
}
