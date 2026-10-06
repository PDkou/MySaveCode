import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { parseCsvForCategory, type CsvImportResult } from '../lib/csv';
import { getNativeBridge } from '../lib/native';
import type { Category } from '../types';
import { useI18n } from '../i18n';

interface CsvImportModalProps {
  category: Category;
  onImport: (valuesList: Record<string, string>[]) => void;
  onClose: () => void;
}

export function CsvImportModal({ category, onImport, onClose }: CsvImportModalProps) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const native = getNativeBridge();

  const handleContent = (content: string) => {
    try {
      const result = parseCsvForCategory(category, content);
      if (result.entries.length === 0) {
        setError(t('csv.emptyRows'));
        return;
      }
      setPreview(result);
      setError(null);
    } catch {
      setError(t('csv.readFailed'));
    }
  };

  // Same import-flow shape as BackupSheet.tsx's JSON import -- native
  // hands the file's raw text back through a window.* callback since a
  // bare WebView needs Android's Storage Access Framework to open a
  // file at all (see native.ts / MainActivity.java's importFile()).
  useEffect(() => {
    if (!native) return;
    window.onDrawaryFileImported = handleContent;
    window.onDrawaryFileImportFailed = () => setError(t('csv.importFailed'));
    return () => {
      window.onDrawaryFileImported = undefined;
      window.onDrawaryFileImportFailed = undefined;
    };
  }, [native]);

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => handleContent(String(reader.result));
    reader.onerror = () => setError(t('csv.fileReadFailed'));
    reader.readAsText(file);
  };

  return (
    <Modal title={t('csv.title')} onClose={onClose}>
      <p className="modal-hint">{t('csv.guide')}</p>
      {native ? (
        <button type="button" className="btn btn-secondary btn-block" onClick={() => native.importFile('text/csv')}>
          {t('csv.selectFile')}
        </button>
      ) : (
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      )}
      {error && <p className="error-hint">{error}</p>}

      {preview && (
        <ConfirmDialog
          title={t('csv.importData')}
          message={
            t('csv.preview', {
              matched: preview.matchedColumns,
              total: preview.totalColumns,
              items: preview.entries.length,
            }) +
            (preview.invalidCells > 0 ? t('csv.invalidCells', { count: preview.invalidCells }) : '') +
            t('csv.continue')
          }
          confirmLabel={t('csv.import')}
          onConfirm={() => {
            onImport(preview.entries);
            setPreview(null);
            onClose();
          }}
          onCancel={() => setPreview(null)}
        />
      )}
    </Modal>
  );
}
