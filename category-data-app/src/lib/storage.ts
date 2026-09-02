import type { AppData } from '../types';
import { newId } from './id';

const STORAGE_KEY = 'category-data-app:v1';

function seedData(): AppData {
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
        name: '가계부 (예시)',
        emoji: '💰',
        color: '#4f46e5',
        createdAt: now,
        fields: [
          { id: dateFieldId, name: '날짜', type: 'date', required: true },
          { id: typeFieldId, name: '구분', type: 'select', options: ['수입', '지출'], required: true },
          { id: itemFieldId, name: '항목', type: 'text', required: true },
          { id: amountFieldId, name: '금액', type: 'currency', required: true },
          { id: memoFieldId, name: '메모', type: 'text', required: false },
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
          [typeFieldId]: '지출',
          [itemFieldId]: '점심 식사',
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
          [typeFieldId]: '수입',
          [itemFieldId]: '용돈',
          [amountFieldId]: '50000',
          [memoFieldId]: '이번 달 용돈',
        },
      },
    ],
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData();
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.categories) || !Array.isArray(parsed.entries)) {
      return seedData();
    }
    return parsed;
  } catch {
    return seedData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // Most likely quota exceeded (localStorage is usually capped around
    // 5MB) -- surfaced to the user rather than silently dropping writes.
    console.error('Failed to save data', err);
    throw new Error('저장 공간이 부족하거나 저장에 실패했어요. 백업 후 오래된 데이터를 정리해 주세요.');
  }
}

export function parseImportedData(raw: string): AppData {
  const parsed = JSON.parse(raw) as AppData;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.categories) || !Array.isArray(parsed.entries)) {
    throw new Error('올바른 백업 파일이 아니에요.');
  }
  return parsed;
}
