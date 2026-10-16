import { useEffect } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './RestoreProgressScreen.css';

export interface RestoreProgressScreenProps {
  onBack?: () => void;
  onComplete?: () => void;
}

/**
 * #51 복원 진행. Ported from
 * `Drawary_51_RESTORE_PROGRESS_CANDIDATE_2026-10-14`'s `index.html` --
 * same CSS-only rotating spinner (not an image), `prefers-reduced-
 * motion` support, no mock percentage, matching README.md exactly.
 * The archive's own comment: "Existing restore engine calls onComplete
 * ... No mock progress percentage" -- there is no real restore engine
 * here, so `onComplete` fires after a fixed demo delay instead of
 * staying permanently static (same pattern added to #47's
 * BackupProgressScreen in this same batch), disclosed rather than
 * claimed as a real restore. Reached from #50's confirm dialog;
 * completes -> #52.
 */
export function RestoreProgressScreen({ onBack, onComplete }: RestoreProgressScreenProps) {
  useEffect(() => {
    if (!onComplete) return;
    const timer = setTimeout(onComplete, 1600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <main className="rp51-screen" aria-label="복원 진행 화면">
      <ScreenHeader title="복원 중" onBack={onBack} height={88} />
      <section className="rp51-panel" aria-live="polite" aria-label="복원 진행 상태">
        <div className="rp51-progress-content">
          <img className="rp51-illustration" src="/assets/states/backup/state_restore_downloading.webp" alt="파일 복원을 안내하는 Drawary 마스코트" />
          <div className="rp51-spinner" role="status" aria-label="복원 진행 중" />
          <div className="rp51-copy">
            <h1>복원하고 있어요</h1>
            <p className="rp51-wait">잠시만 기다려주세요.</p>
            <p className="rp51-detail">백업 내용을 불러오고 있습니다.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
