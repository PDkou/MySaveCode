import { useRef, useState } from 'react';
import './PhotoViewerScreen.css';

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
export function PhotoViewerScreen({
  photoUris,
  initialIndex = 0,
  onClose,
}: PhotoViewerScreenProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  const pointers = useRef(new Map<number, Point>());
  const lastDistance = useRef<number | null>(null);
  const dragStart = useRef<Point | null>(null);
  const swipeStart = useRef<Point | null>(null);

  const clampScale = (value: number) => Math.max(1, Math.min(4, value));

  const resetTransform = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    lastDistance.current = null;
  };

  const show = (nextIndex: number) => {
    if (!photoUris.length) return;
    const wrapped = (nextIndex + photoUris.length) % photoUris.length;
    setIndex(wrapped);
    resetTransform();
  };

  const distance = (a: Point, b: Point) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, point);

    if (pointers.current.size === 1) {
      dragStart.current = point;
      swipeStart.current = point;
    } else if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      lastDistance.current = distance(a, b);
      dragStart.current = null;
      swipeStart.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const previous = pointers.current.get(e.pointerId)!;
    const current = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, current);

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const nextDistance = distance(a, b);
      if (lastDistance.current) {
        setScale((currentScale) =>
          clampScale(currentScale * (nextDistance / lastDistance.current!))
        );
      }
      lastDistance.current = nextDistance;
      return;
    }

    if (scale > 1) {
      setOffset((currentOffset) => ({
        x: currentOffset.x + (current.x - previous.x),
        y: currentOffset.y + (current.y - previous.y),
      }));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const end = { x: e.clientX, y: e.clientY };
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) {
      lastDistance.current = null;
    }

    if (scale === 1 && swipeStart.current) {
      const dx = end.x - swipeStart.current.x;
      if (Math.abs(dx) > 55 && photoUris.length > 1) {
        show(dx < 0 ? index + 1 : index - 1);
      }
    }
    dragStart.current = null;
    swipeStart.current = null;
  };

  const toggleZoom = () => {
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2);
    }
  };

  if (!photoUris.length) return null;

  return (
    <main className="pv-screen">
      <header className="pv-topbar">
        <button className="pv-close" type="button" onClick={onClose} aria-label="사진 보기 닫기">
          <img src="/assets/ui-icons/icon_cancel.webp" alt="" />
        </button>
        <span className="pv-count">{index + 1} / {photoUris.length}</span>
      </header>

      <div
        className="pv-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={toggleZoom}
      >
        <img
          className="pv-main-photo"
          src={photoUris[index]}
          alt={`보관품 사진 ${index + 1}`}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        />
      </div>

      {photoUris.length > 1 && (
        <nav className="pv-thumbs" aria-label="사진 목록">
          {photoUris.map((uri, photoIndex) => (
            <button
              key={`${uri}-${photoIndex}`}
              type="button"
              className={photoIndex === index ? 'is-active' : ''}
              onClick={() => show(photoIndex)}
              aria-label={`${photoIndex + 1}번째 사진 보기`}
            >
              <img src={uri} alt="" />
            </button>
          ))}
        </nav>
      )}
    </main>
  );
}
