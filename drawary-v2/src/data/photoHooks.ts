import { useEffect, useState } from 'react';
import { getPhotos } from './repository';

/** Object URLs for some blobs, revoked when the blobs change or the component goes away. */
export function useObjectUrls(blobs: readonly Blob[] | null): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    if (!blobs || blobs.length === 0) { setUrls([]); return; }
    const made = blobs.map((b) => URL.createObjectURL(b));
    setUrls(made);
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, [blobs]);
  return urls;
}

/**
 * The saved photos of one record. `version` lets a caller force a reload
 * after it changed them. `blobs` is null until the first read finishes, so a
 * screen can tell "still loading" from "has none".
 */
export function useRecordPhotos(recordId: string | null, version = 0): { blobs: Blob[] | null; urls: string[] } {
  const [loaded, setLoaded] = useState<{ id: string; v: number; blobs: Blob[] } | null>(null);
  useEffect(() => {
    if (!recordId) return;
    let cancelled = false;
    getPhotos(recordId).then((b) => { if (!cancelled) setLoaded({ id: recordId, v: version, blobs: b ?? [] }); })
      .catch((e: unknown) => console.error('사진을 불러오지 못했어요', e));
    return () => { cancelled = true; };
  }, [recordId, version]);
  const blobs = loaded && loaded.id === recordId && loaded.v === version ? loaded.blobs : null;
  return { blobs, urls: useObjectUrls(blobs) };
}

/** First photo of each record, for list thumbnails. Keyed by record id. */
export function useFirstPhotoUrls(recordIds: readonly string[], version = 0): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = recordIds.join('|');
  useEffect(() => {
    let cancelled = false;
    const made: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const id of recordIds) {
        try {
          const photos = await getPhotos(id);
          if (photos && photos[0]) { const u = URL.createObjectURL(photos[0]); made.push(u); next[id] = u; }
        } catch (e) { console.error('사진을 불러오지 못했어요', e); }
        if (cancelled) { made.forEach((u) => URL.revokeObjectURL(u)); return; }
      }
      setUrls(next);
    })();
    return () => { cancelled = true; made.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);
  return urls;
}

/** How many photos each record has (for the table's 사진 column and filter). */
export function usePhotoCounts(recordIds: readonly string[], version = 0): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const key = recordIds.join('|');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, number> = {};
      for (const id of recordIds) {
        try { next[id] = (await getPhotos(id))?.length ?? 0; } catch { next[id] = 0; }
      }
      if (!cancelled) setCounts(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);
  return counts;
}
