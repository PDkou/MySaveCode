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
