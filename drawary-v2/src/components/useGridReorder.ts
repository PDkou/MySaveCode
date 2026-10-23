import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Drag-to-reorder for a grid of cards (the home's drawer cards in edit mode, on the phone and in the wide window).
 *
 * The dragged card follows the finger: it is translated from the cell the grid would put it in to where the finger is (minus the
 * spot it was grabbed at). The cell it is over is found from the cards' own positions, so any number of columns works. While
 * dragging, the other cards shuffle (the shown order changes); the order is passed to `onCommit` when the finger is lifted.
 *
 * Screen pixels are used for the measuring; `scale` turns them into the layout's own pixels for the CSS translate (a tablet
 * magnifies the whole app, and a narrow phone scales the home down).
 */
export function useGridReorder({ ids, scale, onCommit }: {
  ids: readonly string[];
  /** Screen pixels per layout pixel at the grid. */
  scale: () => number;
  onCommit?: (order: string[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const orderRef = useRef<string[] | null>(null);
  orderRef.current = dragOrder;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const wraps = useRef(new Map<string, HTMLElement>());
  const pointer = useRef({ x: 0, y: 0 });
  const grab = useRef({ x: 0, y: 0 });
  const shift = useRef({ x: 0, y: 0 });

  /** The shown order: the dragged one while dragging, otherwise the real one. */
  const order = dragOrder ?? ids;

  const follow = (id: string) => {
    const el = wraps.current.get(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = pointer.current.x - grab.current.x - (rect.left - shift.current.x);
    const y = pointer.current.y - grab.current.y - (rect.top - shift.current.y);
    shift.current = { x, y };
    const k = scaleRef.current() || 1;
    el.style.transform = `translate(${x / k}px, ${y / k}px)`;
  };

  /** Which place in the current order the finger is over: the card whose own cell holds it, else the nearest cell. */
  const targetIndex = (current: readonly string[], dragged: string, x: number, y: number): number => {
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < current.length; i += 1) {
      const el = wraps.current.get(current[i]);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const left = r.left - (current[i] === dragged ? shift.current.x : 0);
      const top = r.top - (current[i] === dragged ? shift.current.y : 0);
      if (x >= left && x <= left + r.width && y >= top && y <= top + r.height) return i;
      const distance = Math.hypot(x - (left + r.width / 2), y - (top + r.height / 2));
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    }
    return best;
  };

  // When the other cards shuffle, the dragged one's cell changes: recompute so it stays under the finger.
  useLayoutEffect(() => { if (dragId) follow(dragId); });

  useEffect(() => {
    if (!dragId) return;
    // The dragged card's DOM node moves while the others shuffle, which drops element-level pointer capture: follow the window.
    const move = (event: PointerEvent) => {
      const current = orderRef.current;
      if (!current) return;
      pointer.current = { x: event.clientX, y: event.clientY };
      follow(dragId);
      const target = targetIndex(current, dragId, event.clientX, event.clientY);
      if (target === current.indexOf(dragId)) return;
      const next = current.filter((id) => id !== dragId);
      next.splice(target, 0, dragId);
      orderRef.current = next;
      setDragOrder(next);
    };
    const end = () => {
      const el = wraps.current.get(dragId);
      if (el) el.style.transform = '';
      shift.current = { x: 0, y: 0 };
      const done = orderRef.current;
      if (done && done.some((id, i) => id !== idsRef.current[i])) commitRef.current?.(done);
      setDragId(null);
      setDragOrder(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId]);

  const start = (id: string) => (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    const rect = wraps.current.get(id)?.getBoundingClientRect();
    pointer.current = { x: event.clientX, y: event.clientY };
    grab.current = { x: event.clientX - (rect?.left ?? event.clientX), y: event.clientY - (rect?.top ?? event.clientY) };
    shift.current = { x: 0, y: 0 };
    setDragId(id);
    setDragOrder([...idsRef.current]);
  };

  /** `ref` for each card's wrapper element. */
  const wrapRef = (id: string) => (el: HTMLElement | null) => {
    if (el) wraps.current.set(id, el); else wraps.current.delete(id);
  };

  return { dragId, order, start, wrapRef };
}
