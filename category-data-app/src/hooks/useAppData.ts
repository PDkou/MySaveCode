import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppData, Category, Entry, FieldDef, FieldType } from '../types';
import { loadData, saveData } from '../lib/storage';
import { newId } from '../lib/id';

export interface UseAppData {
  data: AppData;
  saveError: string | null;
  addCategory: (input: { name: string; emoji: string; color: string; fields: FieldDef[] }) => Category;
  updateCategory: (id: string, patch: Partial<Pick<Category, 'name' | 'emoji' | 'color'>>) => void;
  deleteCategory: (id: string) => void;
  addField: (categoryId: string, field: { name: string; type: FieldType; options?: string[]; required: boolean }) => void;
  updateField: (categoryId: string, fieldId: string, patch: Partial<Omit<FieldDef, 'id'>>) => void;
  removeField: (categoryId: string, fieldId: string) => void;
  moveField: (categoryId: string, fieldId: string, direction: -1 | 1) => void;
  togglePinCategory: (id: string) => void;
  moveCategory: (id: string, direction: -1 | 1) => void;
  addEntry: (categoryId: string, values: Record<string, string>, reminders?: Record<string, boolean>) => void;
  updateEntry: (entryId: string, values: Record<string, string>, reminders?: Record<string, boolean>) => void;
  deleteEntry: (entryId: string) => void;
  // Re-inserts an already-existing Entry object verbatim (same id/
  // createdAt) rather than minting a new one -- the undo half of the
  // delete-entry toast (see components/Toast.tsx / CategoryDetail.tsx).
  restoreEntry: (entry: Entry) => void;
  replaceAll: (next: AppData) => void;
}

export function useAppData(): UseAppData {
  const [data, setData] = useState<AppData>(() => loadData());
  const [saveError, setSaveError] = useState<string | null>(null);
  // Skip the very first effect run -- loadData() already reflects what's
  // on disk, no need to immediately write it straight back out.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      saveData(data);
      setSaveError(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했어요.');
    }
  }, [data]);

  const addCategory: UseAppData['addCategory'] = useCallback((input) => {
    const category: Category = {
      id: newId(),
      name: input.name,
      emoji: input.emoji,
      color: input.color,
      fields: input.fields,
      createdAt: Date.now(),
    };
    setData((d) => ({ ...d, categories: [...d.categories, category] }));
    return category;
  }, []);

  const updateCategory: UseAppData['updateCategory'] = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteCategory: UseAppData['deleteCategory'] = useCallback((id) => {
    setData((d) => ({
      categories: d.categories.filter((c) => c.id !== id),
      entries: d.entries.filter((e) => e.categoryId !== id),
      version: d.version,
    }));
  }, []);

  const addField: UseAppData['addField'] = useCallback((categoryId, field) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) =>
        c.id === categoryId ? { ...c, fields: [...c.fields, { id: newId(), ...field }] } : c,
      ),
    }));
  }, []);

  const updateField: UseAppData['updateField'] = useCallback((categoryId, fieldId, patch) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) =>
        c.id === categoryId
          ? { ...c, fields: c.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) }
          : c,
      ),
    }));
  }, []);

  const removeField: UseAppData['removeField'] = useCallback((categoryId, fieldId) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) =>
        c.id === categoryId ? { ...c, fields: c.fields.filter((f) => f.id !== fieldId) } : c,
      ),
      // The field's stored values become orphaned data inside each entry's
      // `values` map -- harmless (never rendered, since rendering is
      // driven by the category's current field list) so they're left in
      // place rather than scrubbed out of every entry.
    }));
  }, []);

  const moveField: UseAppData['moveField'] = useCallback((categoryId, fieldId, direction) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) => {
        if (c.id !== categoryId) return c;
        const idx = c.fields.findIndex((f) => f.id === fieldId);
        const targetIdx = idx + direction;
        if (idx === -1 || targetIdx < 0 || targetIdx >= c.fields.length) return c;
        const fields = c.fields.slice();
        [fields[idx], fields[targetIdx]] = [fields[targetIdx], fields[idx]];
        return { ...c, fields };
      }),
    }));
  }, []);

  const togglePinCategory: UseAppData['togglePinCategory'] = useCallback((id) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
    }));
  }, []);

  // Home renders pinned categories first (stable-partitioned, each group
  // keeping its own relative order -- see Home.tsx), so "move up/down"
  // only makes sense within the same pinned/unpinned group: this walks
  // past any different-group entries in between to find the next same-
  // group neighbor, same effect as reordering within Home's own displayed
  // grouping without Home having to know the storage order at all.
  const moveCategory: UseAppData['moveCategory'] = useCallback((id, direction) => {
    setData((d) => {
      const cats = d.categories;
      const idx = cats.findIndex((c) => c.id === id);
      if (idx === -1) return d;
      const pinned = !!cats[idx].pinned;
      let targetIdx = idx + direction;
      while (targetIdx >= 0 && targetIdx < cats.length && !!cats[targetIdx].pinned !== pinned) {
        targetIdx += direction;
      }
      if (targetIdx < 0 || targetIdx >= cats.length) return d;
      const next = cats.slice();
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return { ...d, categories: next };
    });
  }, []);

  const addEntry: UseAppData['addEntry'] = useCallback((categoryId, values, reminders) => {
    const now = Date.now();
    const entry: Entry = { id: newId(), categoryId, values, reminders, createdAt: now, updatedAt: now };
    setData((d) => ({ ...d, entries: [...d.entries, entry] }));
  }, []);

  const updateEntry: UseAppData['updateEntry'] = useCallback((entryId, values, reminders) => {
    setData((d) => ({
      ...d,
      entries: d.entries.map((e) => (e.id === entryId ? { ...e, values, reminders, updatedAt: Date.now() } : e)),
    }));
  }, []);

  const deleteEntry: UseAppData['deleteEntry'] = useCallback((entryId) => {
    setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entryId) }));
  }, []);

  const restoreEntry: UseAppData['restoreEntry'] = useCallback((entry) => {
    setData((d) => ({ ...d, entries: [...d.entries, entry] }));
  }, []);

  const replaceAll: UseAppData['replaceAll'] = useCallback((next) => {
    setData(next);
  }, []);

  return {
    data,
    saveError,
    addCategory,
    updateCategory,
    deleteCategory,
    addField,
    updateField,
    removeField,
    moveField,
    togglePinCategory,
    moveCategory,
    addEntry,
    updateEntry,
    deleteEntry,
    restoreEntry,
    replaceAll,
  };
}
