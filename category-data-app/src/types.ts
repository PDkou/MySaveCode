// Core data model. Kept deliberately flat and ID-keyed (rather than
// nesting entries inside categories) so this can later be mirrored 1:1
// into Supabase tables (categories / fields / entries) without a reshape
// -- see the discussion in the PR this shipped with for why local-only
// storage was chosen for the first version.

export type FieldType = 'text' | 'number' | 'currency' | 'date' | 'select';

export interface FieldDef {
  id: string;
  name: string;
  type: FieldType;
  /** Only meaningful for type === 'select'. */
  options?: string[];
  required: boolean;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  fields: FieldDef[];
  createdAt: number;
}

// Field values are always stored as strings (including numbers/dates) --
// this keeps the entry form <-> table <-> print view <-> JSON backup path
// uniform. Numeric parsing happens only where a value is actually used as
// a number (sorting, sum totals).
export interface Entry {
  id: string;
  categoryId: string;
  values: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  version: 1;
  categories: Category[];
  entries: Entry[];
}
