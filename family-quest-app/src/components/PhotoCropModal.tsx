import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ModalHeader } from './ModalHeader';

interface PhotoCropModalProps {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

const VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;

export function PhotoCropModal({ file, onCancel, onConfirm }: PhotoCropModalProps) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Covers the circular viewport at zoom=1 (like CSS object-fit: cover),
  // then scales further by the zoom slider on top of that.
  const baseScale = naturalSize ? VIEWPORT_SIZE / Math.min(naturalSize.w, naturalSize.h) : 1;
  const displayScale = baseScale * zoom;
  const dispW = naturalSize ? naturalSize.w * displayScale : 0;
  const dispH = naturalSize ? naturalSize.h * displayScale : 0;
  const maxOffsetX = Math.max(0, (dispW - VIEWPORT_SIZE) / 2);
  const maxOffsetY = Math.max(0, (dispH - VIEWPORT_SIZE) / 2);

  const clampOffset = (x: number, y: number, limitX: number, limitY: number) => ({
    x: Math.min(limitX, Math.max(-limitX, x)),
    y: Math.min(limitY, Math.max(-limitY, y)),
  });

  const handleImageLoad = () => {
    if (imgRef.current) {
      setNaturalSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  };

  // Re-clamp whenever zoom changes the allowed pan range (e.g. zooming back
  // out toward 1 would otherwise leave the pan stuck past the new, smaller
  // max offset, showing empty space at the viewport edge).
  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y, maxOffsetX, maxOffsetY));
  }, [maxOffsetX, maxOffsetY]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, startOffsetX: offset.x, startOffsetY: offset.y };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setOffset(
      clampOffset(dragRef.current.startOffsetX + dx, dragRef.current.startOffsetY + dy, maxOffsetX, maxOffsetY),
    );
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = () => {
    if (!naturalSize || !imgRef.current) return;
    setProcessing(true);

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setProcessing(false);
      return;
    }

    // Map the visible viewport square back to source-image pixel
    // coordinates: srcPerDisplay converts a display-space length to the
    // equivalent source-space length (uniform for both axes since aspect
    // ratio is preserved through displayScale).
    const srcPerDisplay = naturalSize.w / dispW;
    const left = VIEWPORT_SIZE / 2 - dispW / 2 + offset.x;
    const top = VIEWPORT_SIZE / 2 - dispH / 2 + offset.y;
    const srcX = -left * srcPerDisplay;
    const srcY = -top * srcPerDisplay;
    const srcSize = VIEWPORT_SIZE * srcPerDisplay;

    ctx.drawImage(imgRef.current, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob(
      (blob) => {
        setProcessing(false);
        if (blob) onConfirm(blob);
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={t('profile.cropHeading')} onClose={onCancel} />
        <p className="profile-crop-hint">{t('profile.cropHint')}</p>

        <div
          className="photo-crop-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {imageUrl && (
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              onLoad={handleImageLoad}
              className="photo-crop-image"
              style={
                naturalSize
                  ? {
                      width: dispW,
                      height: dispH,
                      left: VIEWPORT_SIZE / 2 - dispW / 2 + offset.x,
                      top: VIEWPORT_SIZE / 2 - dispH / 2 + offset.y,
                    }
                  : undefined
              }
              draggable={false}
            />
          )}
        </div>

        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="photo-crop-zoom"
          aria-label={t('profile.cropZoom')}
        />

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={!naturalSize || processing}>
            {processing ? t('profile.photoUploading') : t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
