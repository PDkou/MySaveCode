import { cleanFieldName, assertUniqueFieldName, ValidationError } from '../data/validation';
import type { FieldKind } from '../data/types';
import { t } from '../i18n';

/** A field while the create-drawer flow (#8-#12) is still in progress; nothing here is saved yet. */
export interface DraftField {
  id: string;
  name: string;
  kind: FieldKind;
  required: boolean;
  options: string[];
}

/**
 * The four fields the approved #9 screen starts with. Stable ids so the
 * list renders the same before any edit.
 */
export const defaultDraftFields = (): DraftField[] => [
  { id: 'draft-product-name', name: t('제품명'), kind: 'text', required: false, options: [] },
  { id: 'draft-purchase-date', name: t('구매일'), kind: 'date', required: false, options: [] },
  { id: 'draft-price', name: t('가격'), kind: 'currency', required: false, options: [] },
  { id: 'draft-memo', name: t('메모'), kind: 'text', required: false, options: [] },
];

/** What kind of field each of #9's "이런 항목은 어때요?" chips creates. */
export const QUICK_ADD_KINDS: Readonly<Record<string, FieldKind>> = {
  브랜드: 'text', 구매처: 'text', 별점: 'rating', 사용기한: 'date',
  카테고리: 'text', 색상: 'text', 용량: 'text', 한줄평: 'text',
};

let counter = 0;
const draftId = () => `draft-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function addDraftField(list: readonly DraftField[], input: Omit<DraftField, 'id'>): DraftField[] {
  const name = cleanFieldName(input.name);
  assertUniqueFieldName(list, name);
  const options = input.options.map((o) => o.trim()).filter(Boolean);
  if (input.kind === 'select' && options.length < 2) throw new ValidationError(t('선택 항목은 2개 이상 필요해요.'));
  if (input.kind === 'select' && new Set(options).size !== options.length) throw new ValidationError(t('같은 선택 항목이 여러 개 있어요.'));
  return [...list, { id: draftId(), name, kind: input.kind, required: input.required, options: input.kind === 'select' ? options : [] }];
}

export function updateDraftField(list: readonly DraftField[], id: string, patch: Pick<DraftField, 'name' | 'required' | 'options'>): DraftField[] {
  const current = list.find((f) => f.id === id);
  if (!current) throw new ValidationError(t('서랍 칸을 찾을 수 없어요.'));
  const name = cleanFieldName(patch.name);
  assertUniqueFieldName(list, name, id);
  const options = patch.options.map((o) => o.trim()).filter(Boolean);
  if (current.kind === 'select' && options.length < 2) throw new ValidationError(t('선택 항목은 2개 이상 필요해요.'));
  if (current.kind === 'select' && new Set(options).size !== options.length) throw new ValidationError(t('같은 선택 항목이 여러 개 있어요.'));
  return list.map((f) => (f.id === id ? { ...f, name, required: patch.required, options: f.kind === 'select' ? options : [] } : f));
}

export const removeDraftField = (list: readonly DraftField[], id: string): DraftField[] => list.filter((f) => f.id !== id);

export function moveDraftField(list: readonly DraftField[], from: number, to: number): DraftField[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
