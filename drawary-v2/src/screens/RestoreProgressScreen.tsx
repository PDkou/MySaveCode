import { useEffect } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './RestoreProgressScreen.css';
import { t } from '../i18n';

export interface RestoreProgressScreenProps {
  onBack?: () => void;
  onComplete?: () => void;
}

/**
 * #51 복원 진행. Ported from
 * `Drawary_51_RESTORE_PROGRESS_CANDIDATE_2026-10-14`'s `index.html` --
 * same CSS-only rotating spinner (not an image), `prefers-reduced-
 * motion` support, no mock percentage, matching README.md exactly.
 * V2-12 step 5: the real restore runs in App.tsx (one all-or-nothing write) and moves on to #52 itself, so this
 * screen is just the waiting view; `onComplete` is no longer used by the app (kept for the standalone QA route's demo
 * delay). Reached from #50's confirm dialog.
 */
export function RestoreProgressScreen({ onBack, onComplete }: RestoreProgressScreenProps) {
  useEffect(() => {
    if (!onComplete) return;
    const timer = setTimeout(onComplete, 1600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <section className="rp51-screen" aria-label={t('복원 진행 화면')}>
      <ScreenHeader title={t('복원 중')} onBack={onBack} height={91} />
      <section className="rp51-panel" aria-live="polite" aria-label={t('복원 진행 상태')}>
        <div className="rp51-progress-content">
          <img className="rp51-illustration" src="/assets/states/backup/state_restore_downloading.webp" alt={t('파일 복원을 안내하는 Drawary 마스코트')} />
          <div className="rp51-spinner" role="status" aria-label={t('복원 진행 중')} />
          <div className="rp51-copy">
            <h1>{t('복원하고 있어요')}</h1>
            <p className="rp51-wait">{t('잠시만 기다려주세요.')}</p>
            <p className="rp51-detail">{t('백업 내용을 불러오고 있습니다.')}</p>
          </div>
        </div>
      </section>
    </section>
  );
}
