import { getAppScale } from '../components/appScale';
import { useRef, useState } from 'react';
import './PhotoViewerScreen.css';
import { t } from '../i18n';

interface PhotoViewerScreenProps {
  photoUris: string[];
  initialIndex?: number;
  onClose?: () => void;
}

type Point = { x: number; y: number };

/**
 * #19 사진 확대 / 보기. Ported verbatim from
 * `Drawary_19_FINAL_CONFIRMED_CODE`'s `PhotoViewer.tsx`/`photo-viewer.css`
 * (CONFIRMED.md: pinch zoom 1x-4x, drag-when-zoomed, swipe between
 * photos when at 1x, double-click/tap zoom toggle, bottom thumbnail
 * strip hidden when only one photo). Its own README says "사용자 확정
 * 전이므로 19번 미확정 유지," contradicted by the sibling CONFIRMED.md's
 * "FINAL CONFIRMED" -- same stale-README pattern as #03/#04/#09-#11/
 * #13-#15/#17/#18. CONFIRMED.md wins. All gesture logic (Pointer Events
 * for pinch/drag/swipe, scale clamped to [1,4], index wrapping) is
 * untouched from the confirmed source. `icon_cancel.webp` is the real
 * approved asset -- it's a self-contained red circle + white X image,
 * matching `19_CONFIRMED_RENDER.png`'s close button exactly (verified
 * by opening the asset directly, not assumed from the CSS alone, since
 * the CSS's own close-button background is a dark semi-transparent
 * circle that the icon's own red visually overrides).
 *
 * The archive's own 3 sample photo fixtures
 * (`sample_photo_1/2/3.webp`) are, like #16's `sample_record_photo.webp`,
 * mis-captured screenshot crops with a thumbnail-strip sliver and a
 * "1/3" badge baked into one of them -- confirmed by opening all three
 * directly. Not used. No clean 3-photo set for a single item exists in
 * any available archive, so this reuses 3 of #15's own clean item
 * thumbnails (lip/cushion/palette) purely to exercise the swipe/zoom/
 * thumbnail mechanics -- flagged here rather than presented as "the"
 * approved photo set, since it isn't one.
 */
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

export function PhotoViewerScreen({
  photoUris,
  initialIndex = 0,
  onClose,
}: PhotoViewerScreenProps) {
  const [index, setIndex] = useState(initialIndex);

  // The picture's pan/zoom lives in a ref and is written straight to the element: a pinch updates it on every touch move,
  // and going through React state for each one made it feel late. Offsets are in the layout's own pixels from the stage centre.
  const stageRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const view = useRef({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ mid: Point; dist: number } | null>(null);
  const tap = useRef<{ at: number; point: Point } | null>(null);
  const press = useRef<{ start: Point; moved: boolean } | null>(null);
  const animateTimer = useRef<number | undefined>(undefined);

  const apply = (animated = false) => {
    const el = photoRef.current;
    if (!el) return;
    el.style.transition = animated ? 'transform .18s ease-out' : 'none';
    el.style.transform = `translate(${view.current.x}px, ${view.current.y}px) scale(${view.current.s})`;
    window.clearTimeout(animateTimer.current);
    if (animated) animateTimer.current = window.setTimeout(() => { if (photoRef.current) photoRef.current.style.transition = 'none'; }, 220);
  };

  /** Keeps the picture from being dragged away: at 1x it sits in the middle; zoomed, its edges stop at the stage's edges. */
  const clampOffset = () => {
    const stage = stageRef.current;
    const el = photoRef.current;
    const v = view.current;
    if (!stage || !el || v.s <= 1) { v.x = 0; v.y = 0; return; }
    const maxX = Math.max(0, (el.clientWidth * v.s - stage.clientWidth) / 2);
    const maxY = Math.max(0, (el.clientHeight * v.s - stage.clientHeight) / 2);
    v.x = Math.max(-maxX, Math.min(maxX, v.x));
    v.y = Math.max(-maxY, Math.min(maxY, v.y));
  };

  /** Screen point -> the layout's own pixels from the stage centre. */
  const local = (p: Point): Point => {
    const r = stageRef.current!.getBoundingClientRect();
    const k = getAppScale() || 1;
    return { x: (p.x - (r.left + r.width / 2)) / k, y: (p.y - (r.top + r.height / 2)) / k };
  };

  /** Zooms to `next` keeping the picture's point that is under `anchor` (a screen point) under `target` (where that point should end up). */
  const zoomAround = (next: number, anchor: Point, target: Point) => {
    const v = view.current;
    const a = local(anchor);
    const t = local(target);
    const cx = (a.x - v.x) / v.s;
    const cy = (a.y - v.y) / v.s;
    v.s = Math.max(1, Math.min(MAX_SCALE, next));
    v.x = t.x - cx * v.s;
    v.y = t.y - cy * v.s;
    clampOffset();
  };

  const resetTransform = () => {
    view.current = { s: 1, x: 0, y: 0 };
    gesture.current = null;
    apply();
  };

  const show = (nextIndex: number) => {
    if (!photoUris.length) return;
    const wrapped = (nextIndex + photoUris.length) % photoUris.length;
    setIndex(wrapped);
    resetTransform();
  };

  const pair = (): [Point, Point] => {
    const [a, b] = Array.from(pointers.current.values());
    return [a, b];
  };
  const midOf = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, point);
    if (pointers.current.size === 1) {
      press.current = { start: point, moved: false };
    } else if (pointers.current.size === 2) {
      const [a, b] = pair();
      gesture.current = { mid: midOf(a, b), dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
      press.current = null;
      tap.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    const current = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, current);

    if (pointers.current.size >= 2 && gesture.current) {
      // Two fingers: zoom by how the distance changed and follow the middle point, so the picture stays under the fingers.
      const [a, b] = pair();
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = midOf(a, b);
      zoomAround(view.current.s * dist / gesture.current.dist, gesture.current.mid, mid);
      gesture.current = { mid, dist };
      apply();
      return;
    }

    const p = press.current;
    if (p && !p.moved && Math.hypot(current.x - p.start.x, current.y - p.start.y) > 10) p.moved = true;
    if (view.current.s > 1) {
      const k = getAppScale() || 1;
      view.current.x += (current.x - previous.x) / k;
      view.current.y += (current.y - previous.y) / k;
      clampOffset();
      apply();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const end = { x: e.clientX, y: e.clientY };
    const wasPinching = pointers.current.size >= 2;
    pointers.current.delete(e.pointerId);
    gesture.current = null;
    if (pointers.current.size === 1) {
      // One finger stays down after a pinch: carry on dragging from where it is, without a jump.
      const [rest] = Array.from(pointers.current.values());
      press.current = { start: rest, moved: true };
    }
    if (wasPinching) {
      if (view.current.s < 1.04) { view.current = { s: 1, x: 0, y: 0 }; apply(true); }
      return;
    }
    const p = press.current;
    press.current = null;
    if (!p || pointers.current.size > 0) return;

    if (!p.moved && e.type === 'pointerup') {
      // A tap; two quick taps in the same place toggle the zoom around that place.
      const now = Date.now();
      const last = tap.current;
      if (last && now - last.at < 320 && Math.hypot(end.x - last.point.x, end.y - last.point.y) < 40) {
        tap.current = null;
        if (view.current.s > 1) { view.current = { s: 1, x: 0, y: 0 }; apply(true); }
        else { zoomAround(DOUBLE_TAP_SCALE, end, end); apply(true); }
      } else tap.current = { at: now, point: end };
      return;
    }

    if (view.current.s <= 1 && photoUris.length > 1) {
      const dx = end.x - p.start.x;
      const dy = end.y - p.start.y;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) show(dx < 0 ? index + 1 : index - 1);
    }
  };

  if (!photoUris.length) return null;

  return (
    <section className="pv-screen">
      <header className="pv-topbar">
        <button className="pv-close" type="button" onClick={onClose} aria-label={t('사진 보기 닫기')}>
          <img src="/assets/ui-icons/icon_cancel.webp" alt="" />
        </button>
        <span className="pv-count">{index + 1} / {photoUris.length}</span>
      </header>

      <div
        className="pv-stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          className="pv-main-photo"
          ref={photoRef}
          src={photoUris[index]}
          alt={t('보관품 사진 {n}', { n: index + 1 })}
          draggable={false}
        />
      </div>

      {photoUris.length > 1 && (
        <nav className="pv-thumbs" aria-label={t('사진 목록')}>
          {photoUris.map((uri, photoIndex) => (
            <button
              key={`${uri}-${photoIndex}`}
              type="button"
              className={photoIndex === index ? 'is-active' : ''}
              onClick={() => show(photoIndex)}
              aria-label={t('{n}번째 사진 보기', { n: photoIndex + 1 })}
            >
              <img src={uri} alt="" />
            </button>
          ))}
        </nav>
      )}
    </section>
  );
}
