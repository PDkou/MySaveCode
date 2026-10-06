import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import type { AppData } from '../types';
import { parseImportedData } from '../lib/storage';
import { getNativeBridge } from '../lib/native';
import { useI18n } from '../i18n';

interface BackupSheetProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onMerge: (data: AppData) => void;
  onClose: () => void;
}

function backupFilename(prefix: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
}

export function BackupSheet({ data, onImport, onMerge, onClose }: BackupSheetProps) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const [pendingData, setPendingData] = useState<AppData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canShareFiles =
    typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator;
  const native = getNativeBridge();

  // Inside the native Android wrapper, exportBackup/importBackup hand off
  // to Android's Storage Access Framework (a real save/open file dialog --
  // blob: downloads via <a download> aren't reliably saved to disk from a
  // bare WebView) and call back into these window.* hooks. See
  // drawary-app/README.md and src/lib/native.ts.
  useEffect(() => {
    if (!native) return;
    window.onDrawaryBackupExported = () => setError(null);
    window.onDrawaryBackupExportFailed = () => setError(t('backup.saveFailed'));
    window.onDrawaryBackupImported = (json: string) => {
      try {
        setPendingData(parseImportedData(json));
        setError(null);
      } catch {
        setError(t('backup.invalidFile'));
      }
    };
    window.onDrawaryBackupImportFailed = () => setError(t('backup.readFailed'));
    return () => {
      window.onDrawaryBackupExported = undefined;
      window.onDrawaryBackupExportFailed = undefined;
      window.onDrawaryBackupImported = undefined;
      window.onDrawaryBackupImportFailed = undefined;
    };
  }, [native]);

  const buildBlob = () => new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

  const downloadBackup = () => {
    if (native) {
      native.exportBackup(JSON.stringify(data, null, 2));
      return;
    }
    const url = URL.createObjectURL(buildBlob());
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename(t('backup.filenamePrefix'));
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const shareBackup = async () => {
    try {
      const file = new File([buildBlob()], backupFilename(t('backup.filenamePrefix')), { type: 'application/json' });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t('backup.shareTitle') });
      } else {
        downloadBackup();
      }
    } catch {
      // Share can be cancelled by the user -- not an error worth surfacing.
    }
  };

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = parseImportedData(String(reader.result));
        setPendingData(next);
      } catch {
        setError('올바른 백업 파일이 아니에요. 이 앱에서 내보낸 JSON 파일을 선택해 주세요.');
      }
    };
    reader.onerror = () => setError(t('csv.fileReadFailed'));
    reader.readAsText(file);
  };

  return (
    <Modal title={t('backup.title')} onClose={onClose}>
      <section className="backup-section">
        <h3>{t('backup.exportTitle')}</h3>
        <p className="modal-hint">{t('backup.exportDesc')}</p>
        <div className="backup-actions">
          <button type="button" className="btn btn-primary" onClick={downloadBackup}>
            {t('backup.saveFile')}
          </button>
          {!native && canShareFiles && (
            <button type="button" className="btn btn-secondary" onClick={shareBackup}>
              {t('backup.share')}
            </button>
          )}
        </div>
      </section>

      <section className="backup-section">
        <h3>{t('backup.importTitle')}</h3>
        <p className="modal-hint">{t('backup.importDesc')}</p>
        {native ? (
          <button type="button" className="btn btn-secondary" onClick={() => native.importBackup()}>
            {t('backup.selectFile')}
          </button>
        ) : (
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="file-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        )}
        {imported && <p className="success-hint">{t('backup.importComplete')}</p>}
        {error && <p className="error-hint">{error}</p>}
      </section>

      {pendingData && (
        <Modal title={t('backup.importDialog')} onClose={() => setPendingData(null)}>
          <p className="confirm-message">
            {t('backup.importSummary', { drawers: pendingData.categories.length, items: pendingData.entries.length })}
            <br />
            {t('backup.mergeDesc')}
          </p>
          <div className="confirm-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                onMerge(pendingData);
                setPendingData(null);
                setImported(true);
              }}
            >
              {t('backup.merge')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                onImport(pendingData);
                setPendingData(null);
                setImported(true);
              }}
            >
              {t('backup.replace')}
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
