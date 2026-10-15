import './BackupProgressScreen.css';

/**
 * Drawary screen 47 — 백업 진행.
 * Visual based exclusively on the approved 11-4 design reference.
 * UI ONLY: The parent owns the actual backup operation, completion/error
 * navigation and any safe cancellation/back policy.
 * Do not show invented progress percentages or simulate a backup.
 */
export interface BackupProgressScreenProps {
  onBack: () => void;
}

export function BackupProgressScreen({ onBack }: BackupProgressScreenProps) {
  return (
    <main className="backup-progress-screen" aria-label="백업 진행 화면">
      <header className="backup-progress-header">
        <button
          className="backup-progress-back"
          type="button"
          aria-label="이전 화면으로"
          onClick={onBack}
        />
        <h1 className="backup-progress-title">백업 중</h1>
      </header>
      <div className="backup-progress-ring" role="status" aria-label="백업 진행 중" />
      <div className="backup-progress-status" aria-live="polite">
        <h2>백업하고 있어요</h2>
        <p>잠시만 기다려주세요.</p>
        <div className="backup-progress-sub">데이터를 안전하게 정리하고 있습니다.</div>
      </div>
    </main>
  );
}
