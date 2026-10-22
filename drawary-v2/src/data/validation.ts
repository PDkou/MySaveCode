import type { Field, FieldValue } from './types';
import { MAX_DRAWER_NAME_LENGTH, MAX_FIELD_NAME_LENGTH } from './types';
import { t } from '../i18n';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function cleanName(raw: string, label: string, max: number): string {
  const name = raw.trim();
  if (!name) throw new ValidationError(t('{label} 이름을 입력해 주세요.', { label }));
  if (name.length > max) throw new ValidationError(t('{label} 이름은 {max}자까지 입력할 수 있어요.', { label, max }));
  return name;
}

export const cleanDrawerName = (raw: string) => cleanName(raw, t('서랍'), MAX_DRAWER_NAME_LENGTH);
export const cleanFieldName = (raw: string) => cleanName(raw, t('서랍 칸'), MAX_FIELD_NAME_LENGTH);

/** Two fields in one drawer may not share a name (they would be indistinguishable in the table and CSV). */
export function assertUniqueFieldName(siblings: readonly Pick<Field, 'id' | 'name'>[], name: string, exceptId?: string): void {
  const key = name.trim().toLowerCase();
  if (siblings.some((f) => f.id !== exceptId && f.name.trim().toLowerCase() === key)) {
    throw new ValidationError(t('\'{name}\' 서랍 칸이 이미 있어요.', { name }));
  }
}

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
export function validateValue(field: Field, value: FieldValue | undefined, ignoreRequired = false): string | null {
  // Photos are stored separately, never as a record value.
  if (field.kind === 'photo') return null;

  if (isEmptyValue(value)) {
    // A checkbox is never "empty": unchecked is a valid answer.
    if (field.required && field.kind !== 'check' && !ignoreRequired) return t('\'{name}\'을(를) 입력해 주세요.', { name: field.name });
    return null;
  }

  switch (field.kind) {
    case 'text':
    case 'long_text':
    case 'link':
      return typeof value === 'string' ? null : t('\'{name}\'에는 글자를 입력해 주세요.', { name: field.name });
    case 'number':
    case 'currency':
      if (typeof value !== 'number' || !Number.isFinite(value)) return t('\'{name}\'에는 숫자를 입력해 주세요.', { name: field.name });
      if (field.kind === 'currency' && !hasAtMostTwoDecimals(value)) return t('\'{name}\'은(는) 소수점 둘째 자리까지 입력할 수 있어요.', { name: field.name });
      return null;
    case 'date':
      return typeof value === 'string' && isRealDate(value) ? null : t('\'{name}\'의 날짜를 확인해 주세요.', { name: field.name });
    case 'select':
      return typeof value === 'string' && field.options.includes(value) ? null : t('\'{name}\'에서 목록에 있는 항목을 골라 주세요.', { name: field.name });
    case 'check':
      return typeof value === 'boolean' ? null : t('\'{name}\'은(는) 체크하거나 해제만 할 수 있어요.', { name: field.name });
    case 'rating':
      return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5
        ? null
        : t('\'{name}\'의 별점은 0~5 사이여야 해요.', { name: field.name });
  }
}

/** Throws ValidationError for the first problem found across all fields. `ignoreRequired` is for records the app makes itself (recurrence). */
export function validateRecordValues(fields: readonly Field[], values: Record<string, FieldValue>, ignoreRequired = false): void {
  const known = new Set(fields.map((f) => f.id));
  for (const key of Object.keys(values)) {
    if (!known.has(key)) throw new ValidationError(t('이 서랍에 없는 서랍 칸이에요.'));
  }
  for (const field of fields) {
    const message = validateValue(field, values[field.id], ignoreRequired);
    if (message) throw new ValidationError(message);
  }
}

/** Money has no unit of its own: whole amounts (yen, won) or up to two decimals (dollars, euros) are fine. */
export function hasAtMostTwoDecimals(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}
