import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './BackupDestinationScreen.css';
import { t, tl } from '../i18n';

export type BackupDestination = 'device' | 'drive';

export interface BackupDestinationScreenProps {
  initialDestination?: BackupDestination;
  onBack?: () => void;
  onNext?: (destination: BackupDestination) => void;
}

/**
 * #46 저장 위치 선택. Ported from `CONFIRMED_MERGED_LAYOUT`'s
 * `index.html` -- a pure static mockup with no JS at all (no click
 * handlers anywhere, not even on the back button), so the radio
 * selection, back and "다음" behavior are all new, built from the
 * markup/CSS structure + `render_390x844.png`. Reached from #45's
 * "다음"; "다음" here -> #47 (backup progress, already integrated,
 * now actually chained into this flow instead of being a standalone
 * QA route).
 *
 * The archive's own `assets/drive_logo_from_11-3_exact.png` (the original
 * Google Drive logo) is not in any handoff package. The Drive row uses
 * `public/assets/ui/google_drive_2026.png` (128px), added upstream in commit
 * bb69c5a ("match approved #46 Drive logo"). It has NOT been checked against
 * the original approval (2026-10-20 resource package says the same), so treat
 * it as a stand-in until the original file turns up. Google Drive backup
 * itself is not implemented anywhere in this app yet.
 */
export function BackupDestinationScreen({ initialDestination = 'device', onBack, onNext }: BackupDestinationScreenProps) {
  const [destination, setDestination] = useState<BackupDestination>(initialDestination);

  return (
    <div className="bkd46-screen">
      <ScreenHeader title={t('백업하기')} onBack={onBack} backLabel={t('백업 종류 선택으로 돌아가기')} height={88} />
      <section className="bkd46-panel">
        <h2 className="bkd46-section-title">{t('저장 위치 선택')}</h2>
        <section className="bkd46-hero">
          <img src="/assets/states/permissions/state_permission_storage.webp" alt="" />
          <div className="bkd46-copy"><strong>{tl('백업 파일을\n어디에 보관할까요?')}</strong><span>{tl('원하는 저장 위치를\n선택해 주세요.')}</span></div>
        </section>
        <div className="bkd46-label">{t('저장할 곳')}</div>
        <button
          type="button"
          className={`bkd46-option${destination === 'device' ? ' selected' : ''}`}
          role="radio"
          aria-checked={destination === 'device'}
          onClick={() => setDestination('device')}
        >
          <span className="bkd46-icon-wrap"><img className="bkd46-device" src="/assets/ui-icons/icon_save.webp" alt="" /></span>
          <span className="bkd46-text"><strong>{t('이 기기에 저장')}</strong><span>{tl('원하는 폴더에\n백업 파일을 저장해요.')}</span></span>
          <span className="bkd46-radio" />
        </button>
        <button
          type="button"
          className={`bkd46-option${destination === 'drive' ? ' selected' : ''}`}
          role="radio"
          aria-checked={destination === 'drive'}
          onClick={() => setDestination('drive')}
        >
          <span className="bkd46-icon-wrap"><img className="bkd46-drive" src="/assets/ui/google_drive_2026.png" alt="" /></span>
          <span className="bkd46-text"><strong>Google Drive</strong><span>{tl('Google Drive에\n백업 파일을 보관해요.')}</span></span>
          <span className="bkd46-radio" />
        </button>
        <div className="bkd46-notice"><img src="/assets/ui-icons/icon_info.webp" alt="" /><span>{tl('다음 단계에서 저장할 폴더를\n고를 수 있어요.')}</span></div>
        <button type="button" className="bkd46-btn" onClick={() => onNext?.(destination)}>{t('다음')}</button>
      </section>
    </div>
  );
}
