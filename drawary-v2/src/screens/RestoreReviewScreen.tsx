import { useEffect, useState } from 'react';
import './RestoreReviewScreen.css';
import { t, tl } from '../i18n';

export interface RestoreReviewScreenProps {
  fileName: string;
  fileDetails: string;
  hasPhotos: boolean;
  recordSummary: string;
  photoSummary: string;
  onBack?: () => void;
  onConfirmRestore?: () => void;
}

/**
 * #50 복원 내용 확인. Ported from
 * `Drawary_50_LINEBREAK_REFINED_CANDIDATE`'s `index.html` -- the real
 * confirm-dialog logic (overlay, Escape to close, backdrop click to
 * close, focus management) ported 1:1. README.md: 개행만 조정, 기존
 * 화면/배치/에셋/문구 유지 -- matched. New `ui_grid.webp`/
 * `ui_settings.webp` assets copied in from this archive (visually
 * distinct from this app's existing `icon_grid.webp`, byte-different,
 * so kept as this screen's own approved files rather than substituted).
 * Reached from #49's file selection; "계속" in the confirm dialog -> #51.
 */
export function RestoreReviewScreen({
  fileName,
  fileDetails,
  hasPhotos,
  recordSummary,
  photoSummary,
  onBack,
  onConfirmRestore,
}: RestoreReviewScreenProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDialogOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialogOpen]);

  return (
    <section className="rr50-screen" aria-label={t('복원 내용 확인 화면')}>
      <header className="rr50-header">
        {onBack && <button className="rr50-back" type="button" onClick={onBack} aria-label={t('이전 화면')} />}
        <h1 className="rr50-title">{t('복원 내용 확인')}</h1>
      </header>
      <section className="rr50-panel" aria-label={t('백업 파일에 포함된 내용')}>
        <div className="rr50-file-card" aria-label={t('선택된 백업 파일')}>
          <div className="rr50-file-main">
            <strong className="rr50-file-name">{fileName}</strong>
            <div className="rr50-file-sub">{fileDetails}</div>
          </div>
          {hasPhotos && <span className="rr50-badge">{t('사진 포함')}</span>}
        </div>
        <h1 className="rr50-section-label">{t('복원할 내용')}</h1>
        <div className="rr50-summary" role="list" aria-label={t('복원 예정 항목')}>
          <div className="rr50-summary-row" role="listitem">
            <span className="rr50-image-wrap"><img src="/assets/ui-icons/ui_grid.webp" alt="" /></span>
            <div className="rr50-item-copy"><div className="rr50-item-name">{t('서랍과 기록')}</div></div>
            <span className="rr50-item-value">{recordSummary}</span>
          </div>
          <div className="rr50-summary-row" role="listitem">
            <span className="rr50-image-wrap rr50-photo-bg"><img className="rr50-photo" src="/assets/field-types/field_photo.webp" alt="" /></span>
            <div className="rr50-item-copy"><div className="rr50-item-name">{t('사진')}</div></div>
            <span className="rr50-item-value">{photoSummary}</span>
          </div>
          <div className="rr50-summary-row" role="listitem">
            <span className="rr50-image-wrap"><img src="/assets/ui-icons/ui_settings.webp" alt="" /></span>
            <div className="rr50-item-copy"><div className="rr50-item-name">{t('설정')}</div></div>
            <span className="rr50-item-value">{t('포함')}</span>
          </div>
        </div>
        <div className="rr50-info-box">
          <img className="rr50-info-icon" src="/assets/ui-icons/icon_info.webp" alt="" />
          <div><strong>{t('복원 전에 내용을 한 번 더 확인해 주세요')}</strong><span>{tl('중요한 기록이 있다면 복원 전에\n먼저 백업해 두면 안전해요.')}</span></div>
        </div>
        <button className="rr50-confirm" type="button" onClick={() => setDialogOpen(true)}>{t('복원 시작')}</button>
      </section>
      {dialogOpen && (
        <div className="rr50-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}>
          <div className="rr50-dialog" role="dialog" aria-modal="true">
            <h2>{t('복원을 시작할까요?')}</h2>
            <p>{tl('선택한 백업 파일의 내용을 불러와요.\n지금 있는 중요한 기록은 먼저 백업해 두세요.')}</p>
            <div className="rr50-dialog-buttons">
              <button className="rr50-cancel" type="button" onClick={() => setDialogOpen(false)}>{t('취소')}</button>
              <button className="rr50-proceed" type="button" onClick={() => { setDialogOpen(false); onConfirmRestore?.(); }}>{t('계속')}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
