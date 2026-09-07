import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { parseCsvForCategory, type CsvImportResult } from '../lib/csv';
import { getNativeBridge } from '../lib/native';
import type { Category } from '../types';

interface CsvImportModalProps {
  category: Category;
  onImport: (valuesList: Record<string, string>[]) => void;
  onClose: () => void;
}

export function CsvImportModal({ category, onImport, onClose }: CsvImportModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const native = getNativeBridge();

  const handleContent = (content: string) => {
    try {
      const result = parseCsvForCategory(category, content);
      if (result.entries.length === 0) {
        setError('가져올 수 있는 행이 없어요. 첫 줄이 항목 이름과 같은 CSV인지 확인해 주세요.');
        return;
      }
      setPreview(result);
      setError(null);
    } catch {
      setError('CSV 파일을 읽지 못했어요.');
    }
  };

  // Same import-flow shape as BackupSheet.tsx's JSON import -- native
  // hands the file's raw text back through a window.* callback since a
  // bare WebView needs Android's Storage Access Framework to open a
  // file at all (see native.ts / MainActivity.java's importFile()).
  useEffect(() => {
    if (!native) return;
    window.onDrawaryFileImported = handleContent;
    window.onDrawaryFileImportFailed = () => setError('파일을 가져오지 못했어요.');
    return () => {
      window.onDrawaryFileImported = undefined;
      window.onDrawaryFileImportFailed = undefined;
    };
  }, [native]);

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => handleContent(String(reader.result));
    reader.onerror = () => setError('파일을 읽는 데 실패했어요.');
    reader.readAsText(file);
  };

  return (
    <Modal title="CSV 가져오기" onClose={onClose}>
      <p className="modal-hint">
        첫 줄이 이 카테고리의 항목 이름과 같은 CSV 파일을 선택하면, 이름이 일치하는 열의 값으로 데이터를 새로 추가해요.
        일치하지 않는 열은 무시돼요.
      </p>
      {native ? (
        <button type="button" className="btn btn-secondary btn-block" onClick={() => native.importFile('text/csv')}>
          파일 선택
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
          title="데이터 가져오기"
          message={`항목 ${preview.matchedColumns}/${preview.totalColumns}개가 일치했고, ${preview.entries.length}건을 새로 추가해요. 계속할까요?`}
          confirmLabel="가져오기"
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
