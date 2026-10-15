import { useEffect } from 'react';
import './BackupProgressScreen.css';

interface BackupProgressScreenProps {
  onBack: () => void;
  onComplete?: () => void;
}

/** #47 백업 진행. Ported verbatim from the user-confirmed standalone source
 * at `reference/screen-47/index.html` (see docs/V2_07_SCREEN47_QA.md) --
 * same markup/CSS structure, same fixed Korean copy, same SVG+CSS rotating
 * ring (not a static image). The only change from that standalone file is
 * swapping its missing local `assets/approved_character_cutout.png` for
 * the approved mascot binary now committed to this repo at
 * `public/assets/mascot/mascot_backup_progress.webp` (commit 7f5574e).
 *
 * `onComplete` is new, added when this screen was wired into the real
 * #45->#46->#47->#48 backup flow (V2-10-45~53 batch): there is no real
 * backup engine to call it, so it fires after a fixed demo delay instead
 * of staying permanently static -- disclosed, not a claim that backup
 * actually runs. */
export function BackupProgressScreen({ onBack, onComplete }: BackupProgressScreenProps) {
  useEffect(() => {
    if (!onComplete) return;
    const timer = setTimeout(onComplete, 1600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <main className="backup-progress-app">
      <header className="backup-progress-toolbar">
        <button type="button" className="backup-progress-back" aria-label="뒤로 가기" onClick={onBack} />
        <h1>백업하기</h1>
      </header>
      <section className="backup-progress-panel" aria-label="백업 진행 상태">
        <img
          className="backup-progress-illustration"
          src="/assets/mascot/mascot_backup_progress.webp"
          alt="노란 폴더를 든 Drawary 마스코트"
        />
        <svg className="backup-progress-ring" viewBox="0 0 50 50" role="status" aria-label="백업 진행 중">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#e5dcfb" strokeWidth="7" />
          <circle
            cx="25" cy="25" r="20" fill="none" stroke="#9260f3" strokeWidth="7"
            strokeLinecap="round" strokeDasharray="24 126" transform="rotate(-125 25 25)"
          />
        </svg>
        <div className="backup-progress-copy" aria-live="polite">
          <h2>백업하고 있어요</h2>
          <p>잠시만 기다려주세요.</p>
          <p>데이터를 안전하게 정리하고 있습니다.</p>
        </div>
      </section>
    </main>
  );
}
