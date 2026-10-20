import type { Field, FieldValue } from './types';
import { MAX_DRAWER_NAME_LENGTH, MAX_FIELD_NAME_LENGTH } from './types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function cleanName(raw: string, label: string, max: number): string {
  const name = raw.trim();
  if (!name) throw new ValidationError(`${label} 이름을 입력해 주세요.`);
  if (name.length > max) throw new ValidationError(`${label} 이름은 ${max}자까지 입력할 수 있어요.`);
  return name;
}

export const cleanDrawerName = (raw: string) => cleanName(raw, '서랍', MAX_DRAWER_NAME_LENGTH);
export const cleanFieldName = (raw: string) => cleanName(raw, '서랍 칸', MAX_FIELD_NAME_LENGTH);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isEmptyValue(value: FieldValue | undefined): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/** Returns an error message for a bad value, or null when it is acceptable. */
export function validateValue(field: Field, value: FieldValue | undefined): string | null {
  // Photos are stored separately, never as a record value.
  if (field.kind === 'photo') return null;

  if (isEmptyValue(value)) {
    // A checkbox is never "empty": unchecked is a valid answer.
    if (field.required && field.kind !== 'check') return `'${field.name}'을(를) 입력해 주세요.`;
    return null;
  }

  switch (field.kind) {
    case 'text':
    case 'long_text':
    case 'link':
      return typeof value === 'string' ? null : `'${field.name}'에는 글자를 입력해 주세요.`;
    case 'number':
    case 'currency':
      if (typeof value !== 'number' || !Number.isFinite(value)) return `'${field.name}'에는 숫자를 입력해 주세요.`;
      if (field.kind === 'currency' && !Number.isInteger(value)) return `'${field.name}'은(는) 원 단위 정수로 입력해 주세요.`;
      return null;
    case 'date':
      return typeof value === 'string' && isRealDate(value) ? null : `'${field.name}'의 날짜를 확인해 주세요.`;
    case 'select':
      return typeof value === 'string' && field.options.includes(value) ? null : `'${field.name}'에서 목록에 있는 항목을 골라 주세요.`;
    case 'check':
      return typeof value === 'boolean' ? null : `'${field.name}'은(는) 켜기/끄기 값이어야 해요.`;
    case 'rating':
      return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5
        ? null
        : `'${field.name}'의 별점은 0~5 사이여야 해요.`;
  }
}

/** Throws ValidationError for the first problem found across all fields. */
export function validateRecordValues(fields: readonly Field[], values: Record<string, FieldValue>): void {
  const known = new Set(fields.map((f) => f.id));
  for (const key of Object.keys(values)) {
    if (!known.has(key)) throw new ValidationError('이 서랍에 없는 서랍 칸이에요.');
  }
  for (const field of fields) {
    const message = validateValue(field, values[field.id]);
    if (message) throw new ValidationError(message);
  }
}
