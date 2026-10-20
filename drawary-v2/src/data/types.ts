/**
 * Drawary V2 data model. Everything lives on this device only (IndexedDB);
 * there is no server, account, or sync.
 *
 * Vocabulary follows the app's user-facing terms: 서랍 = Drawer,
 * 서랍 칸 = Field, 보관품 = RecordItem.
 */

export type FieldKind =
  | 'text' | 'long_text' | 'number' | 'currency' | 'date'
  | 'photo' | 'select' | 'check' | 'rating' | 'link';

/**
 * Stored value per field kind. Dates are ISO `YYYY-MM-DD` strings, money is
 * an integer in KRW, check is boolean, rating is 0-5. Photos are NOT stored
 * here -- they live in the `photos` store keyed by record id.
 */
export type FieldValue = string | number | boolean | null;

export interface Drawer {
  id: string;
  name: string;
  /** Key into the approved drawer-icon set (e.g. 'cosmetics'). */
  iconKey: string;
  /** Key into the approved six-swatch palette (e.g. 'pink'). */
  colorKey: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Field {
  id: string;
  drawerId: string;
  name: string;
  kind: FieldKind;
  required: boolean;
  /** Only meaningful for kind === 'select'. */
  options: string[];
  order: number;
}

export interface RecordItem {
  id: string;
  drawerId: string;
  /** fieldId -> value. A missing key means "never filled in". */
  values: Record<string, FieldValue>;
  createdAt: number;
  updatedAt: number;
}

export interface PhotoSet {
  recordId: string;
  photos: Blob[];
}

export type DrawerInput = Pick<Drawer, 'name' | 'iconKey' | 'colorKey'>;
export type FieldInput = Pick<Field, 'name' | 'kind'> & Partial<Pick<Field, 'required' | 'options'>>;

export const MAX_RECORD_PHOTOS = 3;
export const MAX_FIELD_NAME_LENGTH = 20;
export const MAX_DRAWER_NAME_LENGTH = 20;

// ------------------------------------------------- notifications & recurrence

/**
 * "Tell me N days before the date in this field, at this time" (#29-#32).
 * One rule covers every record of the drawer that has a date in that field.
 * Notifications are separate from recurrence: they only read dates.
 */
export interface NotificationRule {
  id: string;
  drawerId: string;
  /** A field of kind `date` in this drawer. */
  fieldId: string;
  /** 0 = the day itself. */
  daysBefore: number;
  /** Local time, `HH:MM`. */
  time: string;
  createdAt: number;
}

export type RecurrenceCycle = 'weekly' | 'monthly' | 'yearly';
export type RecurrenceEnd =
  | { kind: 'never' }
  /** Number of NEW records to create (the original is not counted). */
  | { kind: 'count'; count: number }
  /** Create new records only up to this date (`YYYY-MM-DD`, inclusive). */
  | { kind: 'date'; endDate: string };

/**
 * "Make a new 보관품 every N weeks/months/years" (#33-#37). A rule never
 * edits the record it was made from: each due period adds a NEW record
 * copied from it, with the chosen date field moved to that period.
 */
export interface RecurrenceRule {
  id: string;
  drawerId: string;
  /** The date field the periods are counted from (kind `date`). */
  fieldId: string;
  /** The record that is copied. Its values are kept in `template` in case it is deleted. */
  targetRecordId: string;
  targetLabel: string;
  template: Record<string, FieldValue>;
  /** The target's date when the rule was made (`YYYY-MM-DD`); fixed so later edits do not shift the series. */
  baseDate: string;
  cycle: RecurrenceCycle;
  interval: number;
  end: RecurrenceEnd;
  /** Period number (1 = one interval after baseDate) of the first record this rule makes. */
  startIndex: number;
  /** Period number of the next record to make. */
  nextIndex: number;
  /** How many records it has made so far. */
  createdCount: number;
  /** True once the end condition is reached (or its date field is gone). */
  finished: boolean;
  createdAt: number;
}

export const MAX_NOTIFY_DAYS_BEFORE = 90;
