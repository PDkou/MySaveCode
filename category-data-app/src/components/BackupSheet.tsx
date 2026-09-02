import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import type { AppData } from '../types';
import { parseImportedData } from '../lib/storage';
import { getNativeBridge } from '../lib/native';

interface BackupSheetProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onClose: () => void;
}

function backupFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `서랍장-백업-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
}

export function BackupSheet({ data, onImport, onClose }: BackupSheetProps) {
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
    window.onDrawaryBackupExportFailed = () => setError('백업 파일을 저장하지 못했어요.');
    window.onDrawaryBackupImported = (json: string) => {
      try {
        setPendingData(parseImportedData(json));
        setError(null);
      } catch {
        setError('올바른 백업 파일이 아니에요. 이 앱에서 내보낸 JSON 파일을 선택해 주세요.');
      }
    };
    window.onDrawaryBackupImportFailed = () => setError('백업 파일을 읽지 못했어요.');
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
    a.download = backupFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const shareBackup = async () => {
    try {
      const file = new File([buildBlob()], backupFilename(), { type: 'application/json' });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '나만의 서랍장 백업' });
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
    reader.onerror = () => setError('파일을 읽는 데 실패했어요.');
    reader.readAsText(file);
  };

  return (
    <Modal title="백업 / 복원" onClose={onClose}>
      <section className="backup-section">
        <h3>내보내기</h3>
        <p className="modal-hint">모든 카테고리와 데이터를 하나의 파일로 저장해요. 다른 기기로 옮길 때 사용하세요.</p>
        <div className="backup-actions">
          <button type="button" className="btn btn-primary" onClick={downloadBackup}>
            파일로 저장
          </button>
          {!native && canShareFiles && (
            <button type="button" className="btn btn-secondary" onClick={shareBackup}>
              공유하기
            </button>
          )}
        </div>
      </section>

      <section className="backup-section">
        <h3>가져오기</h3>
        <p className="modal-hint">백업 파일을 선택하면 현재 데이터를 <strong>모두 대체</strong>해요.</p>
        {native ? (
          <button type="button" className="btn btn-secondary" onClick={() => native.importBackup()}>
            파일 선택
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
        {imported && <p className="success-hint">가져오기가 완료됐어요.</p>}
        {error && <p className="error-hint">{error}</p>}
      </section>

      {pendingData && (
        <ConfirmDialog
          title="데이터 가져오기"
          message={`현재 기기의 카테고리 ${pendingData.categories.length}개, 데이터 ${pendingData.entries.length}건으로 모두 대체돼요. 지금 있는 데이터는 사라져요. 계속할까요?`}
          confirmLabel="대체하기"
          danger
          onConfirm={() => {
            onImport(pendingData);
            setPendingData(null);
            setImported(true);
          }}
          onCancel={() => setPendingData(null)}
        />
      )}
    </Modal>
  );
}
