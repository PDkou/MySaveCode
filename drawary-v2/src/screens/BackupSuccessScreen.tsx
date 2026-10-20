import { ScreenHeader } from '../components/ScreenHeader';
import './BackupSuccessScreen.css';
import { t, tx } from '../i18n';

export interface BackupSuccessScreenProps {
  fileName: string;
  location: string;
  description: string;
  onConfirm?: () => void;
}

/**
 * #48 백업 완료. Ported from
 * `Drawary_48_BACKUP_SUCCESS_CANDIDATE_2026-10-14`'s `index.html`.
 * The back arrow in the source is a plain `aria-hidden="true"` `<div>`,
 * not a button -- decorative only, no `onBack` wired, matching the
 * source exactly rather than inventing a navigation it never had.
 * Reached from #47's auto-complete; "확인" -> #44.
 */
export function BackupSuccessScreen({ fileName, location, description, onConfirm }: BackupSuccessScreenProps) {
  return (
    <main className="bks48-screen" aria-label={t('백업 완료 화면')}>
      <ScreenHeader title={t('완료')} height={91} />
      <span className="bks48-back" aria-hidden="true" />
      <section className="bks48-panel" aria-label={t('백업 완료 내용')}>
        <div className="bks48-content">
          <img className="bks48-art" src="/assets/states/backup/state_backup_success.webp" alt={t('백업을 완료하고 확인 표시를 든 서랍장 마스코트')} />
          <h1 className="bks48-heading">{t('백업이 완료됐어요!')}</h1>
          <div className="bks48-destination">{tx('저장 위치: {place}', { place: <strong>{location}</strong> })}</div>
          <div className="bks48-file-card">
            <div className="bks48-filename">{fileName}</div>
            <div className="bks48-details">{description}</div>
          </div>
        </div>
        <button className="bks48-confirm" type="button" onClick={onConfirm}>{t('확인')}</button>
      </section>
    </main>
  );
}
